import jwt from "jsonwebtoken";
import crypto from "crypto";
import { config } from "../../../../config/config.service.js";

/**
 * Signs a short-lived access token. Payload should be minimal
 * (user id + a version/role if needed) — never put secrets in it.
 */
export const signAccessToken = (payload) => {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  });
};

/**
 * Signs a longer-lived refresh token. Always embeds a random `jti` so
 * two tokens signed with an identical payload in the same second (e.g.
 * back-to-back rotations) are still guaranteed to be distinct strings —
 * JWT signing is otherwise deterministic (HMAC of identical payload +
 * second-precision `iat`), which would silently break rotation and
 * reuse-detection.
 */
export const signRefreshToken = (payload) => {
  return jwt.sign({ ...payload, jti: crypto.randomUUID() }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, config.jwt.accessSecret);
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, config.jwt.refreshSecret);
};

/**
 * Convenience: issue an access token and a refresh token carrying the
 * given sessionId (the sessionId is what session.security.js uses as
 * the Redis key — Redis session existence is now the source of truth
 * for validity, not a version counter on the user document).
 */
export const issueTokenPair = (userId, sessionId) => {
  const accessToken = signAccessToken({ id: userId });
  const refreshToken = signRefreshToken({ id: userId, sessionId });
  return { accessToken, refreshToken };
};
