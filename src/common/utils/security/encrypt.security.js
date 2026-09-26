import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
// In production, load this from an env var (32-byte key, e.g. base64-encoded).
const SECRET_KEY = crypto.scryptSync(
  process.env.ENCRYPTION_SECRET || "dev_only_fallback_secret",
  "salt",
  32
);

/**
 * Reversible encryption — use only for data you must read back later
 * (e.g. a stored OAuth refresh token). For passwords/OTPs use hash.security.js
 * (one-way) instead.
 */
export const encrypt = (text) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
};

export const decrypt = (payload) => {
  const [ivHex, encryptedHex] = payload.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encryptedText = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
  const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
  return decrypted.toString("utf8");
};
