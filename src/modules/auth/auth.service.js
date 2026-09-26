import crypto from "crypto";
import User from "../../DB/models/user.model.js";
import DBService from "../../DB/db.service.js";
import AppError from "../../common/utils/errors/AppError.js";
import { hash, compareHash } from "../../common/utils/security/hash.security.js";
import {
  generateAndStoreOtp,
  verifyStoredOtp,
  getResendCooldownRemaining,
} from "../../common/utils/security/otp.security.js";
import {
  issueTokenPair,
  verifyRefreshToken,
} from "../../common/utils/security/token.service.js";
import {
  generateSessionId,
  createSession,
  validateSession,
  rotateSession,
  revokeSession,
  revokeAllSessions,
  listSessions,
} from "../../common/utils/security/session.security.js";
import { sendMail } from "../../common/utils/mail/mailer.service.js";
import { otpEmailTemplate } from "../../common/utils/mail/templates/otp.template.js";
import { OTP_PURPOSE } from "../../common/enum/otp.enum.js";
import { config } from "../../../config/config.service.js";
import { verifyGoogleIdToken } from "../../common/utils/security/google.security.js";

const userDB = new DBService(User);

export const register = async ({ email, password, username, displayName }) => {
  const existing = await userDB.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    throw AppError.conflict(
      existing.email === email ? "Email already registered" : "Username already taken"
    );
  }

  const hashedPassword = await hash(password);

  const user = await userDB.create({
    email,
    password: hashedPassword,
    username,
    displayName: displayName || username,
  });

  const code = await generateAndStoreOtp(user.email, OTP_PURPOSE.VERIFY_EMAIL);
  await sendMail({
    to: user.email,
    subject: "Verify your email",
    html: otpEmailTemplate(code, config.otp.expiresInMinutes),
  });

  return { email: user.email, username: user.username };
};

export const verifyOtp = async ({ email, otp }, meta = {}) => {
  const user = await userDB.findOne({ email });
  if (!user) throw AppError.notFound("User not found");
  if (user.isVerified) throw AppError.badRequest("Account already verified");

  const result = await verifyStoredOtp(email, OTP_PURPOSE.VERIFY_EMAIL, otp);

  if (!result.valid) {
    if (result.reason === "MAX_ATTEMPTS") {
      throw AppError.tooManyRequests("Too many attempts. Please request a new code.");
    }
    if (result.reason === "EXPIRED_OR_NOT_FOUND") {
      throw AppError.badRequest("OTP expired or not found. Please request a new code.");
    }
    throw AppError.badRequest(`Invalid code. ${result.attemptsLeft} attempt(s) remaining.`);
  }

  user.isVerified = true;
  await user.save();

  const tokens = await issueAndPersistSession(user, meta);
  return { user: sanitizeUser(user), ...tokens };
};

export const resendOtp = async ({ email }) => {
  const user = await userDB.findOne({ email });
  if (!user) throw AppError.notFound("User not found");
  if (user.isVerified) throw AppError.badRequest("Account already verified");

  const remaining = await getResendCooldownRemaining(email, OTP_PURPOSE.VERIFY_EMAIL);
  if (remaining > 0) {
    throw AppError.tooManyRequests(`Please wait ${remaining}s before requesting another code.`);
  }

  const code = await generateAndStoreOtp(email, OTP_PURPOSE.VERIFY_EMAIL);
  await sendMail({
    to: email,
    subject: "Verify your email",
    html: otpEmailTemplate(code, config.otp.expiresInMinutes),
  });

  return { email };
};

export const login = async ({ email, password }, meta = {}) => {
  const user = await userDB.findOne({ email }, { select: "+password" });
  if (!user) throw AppError.unauthorized("Invalid email or password");

  if (user.provider !== "local") {
    throw AppError.badRequest(`This account uses ${user.provider} sign-in. Please use that instead.`);
  }

  const matches = await compareHash(password, user.password);
  if (!matches) throw AppError.unauthorized("Invalid email or password");

  if (!user.isVerified) {
    throw AppError.forbidden("Please verify your email before logging in");
  }

  const tokens = await issueAndPersistSession(user, meta);
  return { user: sanitizeUser(user), ...tokens };
};

/**
 * Google Sign-In. The frontend obtains a Google ID token (via Google
 * Identity Services / One Tap / etc.) and sends it here. Google has
 * already verified the email, so there's no OTP step — find-or-create
 * the user and log them straight in.
 */
export const loginWithGoogle = async ({ idToken }, meta = {}) => {
  const { googleId, email, name, picture } = await verifyGoogleIdToken(idToken);

  let user = await userDB.findOne({ email });

  if (user && user.provider === "local") {
    throw AppError.badRequest(
      "An account with this email already exists using email/password sign-in. Please log in that way instead."
    );
  }

  if (!user) {
    const username = await generateUniqueUsername(email);
    user = await userDB.create({
      email,
      username,
      displayName: name || username,
      profilePhoto: picture || null,
      provider: "google",
      providerId: googleId,
      isVerified: true, // Google already verified the email
    });
  }

  const tokens = await issueAndPersistSession(user, meta);
  return { user: sanitizeUser(user), ...tokens };
};

export const refresh = async (refreshToken) => {
  if (!refreshToken) throw AppError.unauthorized("Refresh token missing");

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    throw AppError.unauthorized("Invalid or expired refresh token");
  }

  const { id: userId, sessionId } = decoded;
  const result = await validateSession(userId, sessionId, refreshToken);

  if (!result.valid) {
    if (result.reason === "REUSE_DETECTED") {
      // An old, already-rotated refresh token was replayed — treat as
      // possible theft and kill the whole session, forcing re-login.
      await revokeSession(userId, sessionId);
    }
    throw AppError.unauthorized("Refresh token has been revoked. Please log in again.");
  }

  const user = await userDB.findById(userId);
  if (!user || user.isDeleted) {
    await revokeSession(userId, sessionId);
    throw AppError.unauthorized("User no longer exists");
  }

  // Rotation: same sessionId, new token pair, new stored hash + TTL.
  const { accessToken, refreshToken: newRefreshToken } = issueTokenPair(userId, sessionId);
  await rotateSession(userId, sessionId, newRefreshToken);

  return { accessToken, refreshToken: newRefreshToken };
};

export const logout = async (refreshToken) => {
  if (!refreshToken) return;
  try {
    const decoded = verifyRefreshToken(refreshToken);
    await revokeSession(decoded.id, decoded.sessionId);
  } catch {
    // Already invalid/expired — nothing to revoke.
  }
};

export const logoutAll = async (userId) => {
  await revokeAllSessions(userId);
};

export const getSessions = async (userId) => {
  return listSessions(userId);
};

export const revokeOneSession = async (userId, sessionId) => {
  await revokeSession(userId, sessionId);
};

// --- helpers ---

/**
 * Derives a username from the local part of an email (e.g. "john.doe99"
 * from "john.doe99@gmail.com"), sanitized to match the username rules,
 * and appends a short random suffix on collision until it's unique.
 */
const generateUniqueUsername = async (email) => {
  let base = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);

  if (!base || base.length < 3) {
    base = `user${base}`;
  }

  let candidate = base;
  let attempts = 0;

  while (await userDB.exists({ username: candidate })) {
    attempts += 1;
    const suffix = Math.floor(1000 + Math.random() * 9000);
    candidate = `${base}${suffix}`;
    if (attempts > 10) {
      candidate = `${base}${crypto.randomUUID().slice(0, 6)}`;
      break;
    }
  }

  return candidate;
};

const issueAndPersistSession = async (user, meta = {}) => {
  const userId = user._id.toString();
  const sessionId = generateSessionId();
  const { accessToken, refreshToken } = issueTokenPair(userId, sessionId);
  await createSession(userId, sessionId, refreshToken, meta);
  return { accessToken, refreshToken };
};

const sanitizeUser = (user) => ({
  id: user._id,
  email: user.email,
  username: user.username,
  displayName: user.displayName,
  isVerified: user.isVerified,
});
