import crypto from "crypto";
import redis from "../../../DB/redis/redis.service.js";
import { config } from "../../../../config/config.service.js";
import { parseDurationToSeconds } from "../parseDuration.js";

/**
 * SHA-256 (not bcrypt) for hashing refresh tokens. bcrypt truncates
 * input at 72 bytes, so two different JWTs sharing the same first 72
 * bytes (header + start of payload) would bcrypt-hash identically —
 * silently breaking rotation/reuse-detection. Refresh tokens are
 * already high-entropy random strings, not low-entropy secrets typed
 * by a human, so a fast non-salted digest is appropriate here; bcrypt's
 * deliberate slowness stays reserved for passwords and OTPs.
 */
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const REFRESH_TTL_SECONDS = parseDurationToSeconds(config.jwt.refreshExpiresIn, 604800);

const sessionKey = (userId, sessionId) => `session:${userId}:${sessionId}`;
const sessionPattern = (userId) => `session:${userId}:*`;

/**
 * Generates a session ID. Callers sign this INTO the refresh JWT payload
 * before calling createSession, so the token itself carries the key
 * used to look it up in Redis.
 */
export const generateSessionId = () => crypto.randomUUID();

/**
 * Persists a session record in Redis, keyed by userId + sessionId
 * (the same sessionId already embedded in the refresh JWT), with a TTL
 * matching the refresh token's lifespan. Only a hash of the refresh
 * token is stored, never the raw token — same principle as passwords/OTPs.
 */
export const createSession = async (userId, sessionId, refreshToken, meta = {}) => {
  const tokenHash = hashToken(refreshToken);

  const record = {
    tokenHash,
    userAgent: meta.userAgent || null,
    ip: meta.ip || null,
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
  };

  await redis.set(sessionKey(userId, sessionId), JSON.stringify(record), "EX", REFRESH_TTL_SECONDS);
};

/**
 * Validates a refresh token against its session record.
 * Returns { valid: true } or { valid: false, reason }.
 * reason "REUSE_DETECTED" means the session exists but the token hash
 * doesn't match — i.e. this is an old, already-rotated token being
 * replayed, which is a signal of possible theft.
 */
export const validateSession = async (userId, sessionId, refreshToken) => {
  const raw = await redis.get(sessionKey(userId, sessionId));
  if (!raw) return { valid: false, reason: "NOT_FOUND" };

  const record = JSON.parse(raw);
  const matches = hashToken(refreshToken) === record.tokenHash;
  if (!matches) return { valid: false, reason: "REUSE_DETECTED" };

  return { valid: true, record };
};

/**
 * Rotates a session: replaces the stored token hash with the new
 * refresh token's hash and resets the TTL. Keeps the same sessionId,
 * so "active sessions" stays a stable, human-meaningful list across
 * silent refreshes rather than growing a new entry every 15 minutes.
 */
export const rotateSession = async (userId, sessionId, newRefreshToken) => {
  const tokenHash = hashToken(newRefreshToken);
  const raw = await redis.get(sessionKey(userId, sessionId));
  const previous = raw ? JSON.parse(raw) : {};

  const record = {
    ...previous,
    tokenHash,
    lastUsedAt: new Date().toISOString(),
  };

  await redis.set(sessionKey(userId, sessionId), JSON.stringify(record), "EX", REFRESH_TTL_SECONDS);
};

export const revokeSession = async (userId, sessionId) => {
  await redis.del(sessionKey(userId, sessionId));
};

export const revokeAllSessions = async (userId) => {
  const keys = await redis.keys(sessionPattern(userId));
  if (keys.length) await redis.del(...keys);
};

/**
 * Lists a user's active sessions without exposing the token hash —
 * powers a "manage devices / logged-in sessions" screen.
 */
export const listSessions = async (userId) => {
  const keys = await redis.keys(sessionPattern(userId));
  if (!keys.length) return [];

  const values = await redis.mget(...keys);
  return keys.map((key, i) => {
    const sessionId = key.split(":").pop();
    const record = values[i] ? JSON.parse(values[i]) : {};
    return {
      sessionId,
      userAgent: record.userAgent,
      createdAt: record.createdAt,
      lastUsedAt: record.lastUsedAt,
    };
  });
};
