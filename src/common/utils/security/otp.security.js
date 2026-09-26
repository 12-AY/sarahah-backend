import crypto from "crypto";
import redis from "../../../DB/redis/redis.service.js";
import { config } from "../../../../config/config.service.js";
import { hash, compareHash } from "./hash.security.js";

const codeKey = (purpose, email) => `otp:code:${purpose}:${email}`;
const attemptsKey = (purpose, email) => `otp:attempts:${purpose}:${email}`;
const cooldownKey = (purpose, email) => `otp:cooldown:${purpose}:${email}`;

/**
 * Generates a 6-digit OTP, stores its bcrypt hash in Redis with a TTL
 * (the key expiring IS the expiry — no manual date comparison needed),
 * resets the attempt counter, and starts the resend cooldown window.
 * Returns the plain code so the caller can email it.
 */
export const generateAndStoreOtp = async (email, purpose) => {
  const code = crypto.randomInt(100000, 1000000).toString();
  const codeHash = await hash(code);
  const ttlSeconds = config.otp.expiresInMinutes * 60;

  await redis.set(codeKey(purpose, email), codeHash, "EX", ttlSeconds);
  await redis.del(attemptsKey(purpose, email));
  await redis.set(cooldownKey(purpose, email), "1", "EX", config.otp.resendCooldownSeconds);

  return code;
};

/**
 * Returns remaining cooldown seconds (0 if not in cooldown).
 */
export const getResendCooldownRemaining = async (email, purpose) => {
  const ttl = await redis.ttl(cooldownKey(purpose, email));
  return ttl > 0 ? ttl : 0;
};

/**
 * Verifies a submitted OTP against the Redis-stored hash. Handles the
 * attempt counter itself (increment on mismatch, reuse the code's own
 * TTL so the counter expires alongside the code).
 */
export const verifyStoredOtp = async (email, purpose, submittedCode) => {
  const codeHash = await redis.get(codeKey(purpose, email));
  if (!codeHash) {
    return { valid: false, reason: "EXPIRED_OR_NOT_FOUND" };
  }

  const attempts = Number((await redis.get(attemptsKey(purpose, email))) || 0);
  if (attempts >= config.otp.maxAttempts) {
    return { valid: false, reason: "MAX_ATTEMPTS" };
  }

  const matches = await compareHash(submittedCode, codeHash);
  if (!matches) {
    const remainingTtl = await redis.ttl(codeKey(purpose, email));
    await redis.set(
      attemptsKey(purpose, email),
      attempts + 1,
      "EX",
      remainingTtl > 0 ? remainingTtl : config.otp.expiresInMinutes * 60
    );
    return {
      valid: false,
      reason: "MISMATCH",
      attemptsLeft: Math.max(config.otp.maxAttempts - (attempts + 1), 0),
    };
  }

  await clearOtp(email, purpose);
  return { valid: true };
};

export const clearOtp = async (email, purpose) => {
  await redis.del(codeKey(purpose, email), attemptsKey(purpose, email));
};
