import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";

dotenv.config({ path: path.join(__dirname, envFile) });

const required = ["DB_URI", "ACCESS_TOKEN_SECRET", "REFRESH_TOKEN_SECRET"];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const config = {
  env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 3000,
  baseUrl: process.env.BASE_URL,
  clientUrl: process.env.CLIENT_URL,

  db: {
    uri: process.env.DB_URI,
  },

  redis: {
    // Works as-is with a local redis:// URL now, and an Upstash rediss://
    // (TLS) URL later — ioredis picks the right transport from the scheme,
    // so switching providers is just an env var change, no code change.
    url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  },

  google: {
    // OAuth 2.0 Client ID from Google Cloud Console. Not in `required`
    // below since it's being added later — /auth/google will fail
    // clearly at call time until it's set, rather than blocking boot.
    clientId: process.env.GOOGLE_CLIENT_ID || null,
  },

  jwt: {
    accessSecret: process.env.ACCESS_TOKEN_SECRET,
    accessExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
    refreshSecret: process.env.REFRESH_TOKEN_SECRET,
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
  },

  bcrypt: {
    saltRounds: Number(process.env.SALT_ROUNDS) || 10,
  },

  otp: {
    expiresInMinutes: Number(process.env.OTP_EXPIRES_IN_MINUTES) || 10,
    maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS) || 5,
    resendCooldownSeconds: Number(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 60,
  },

  mail: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.MAIL_FROM,
  },
};
