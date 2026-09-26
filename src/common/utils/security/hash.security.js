import bcrypt from "bcrypt";
import { config } from "../../../../config/config.service.js";

/**
 * Hash a plain string (password or OTP code) using bcrypt.
 */
export const hash = async (plainText) => {
  return bcrypt.hash(plainText, config.bcrypt.saltRounds);
};

/**
 * Compare a plain string against a bcrypt hash.
 */
export const compareHash = async (plainText, hashedText) => {
  if (!plainText || !hashedText) return false;
  return bcrypt.compare(plainText, hashedText);
};
