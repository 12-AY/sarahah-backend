import Redis from "ioredis";
import { config } from "../../../config/config.service.js";

/**
 * Single shared Redis client for sessions, OTP state, and any other
 * TTL-based data. `config.redis.url` works unchanged whether it points
 * at a local redis:// instance or a hosted rediss:// (TLS) endpoint
 * like Upstash — only the env var needs to change later.
 */
const redis = new Redis(config.redis.url, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("error", (err) => console.error("❌ Redis error:", err.message));

export default redis;
