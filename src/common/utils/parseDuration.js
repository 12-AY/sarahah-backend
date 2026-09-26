/**
 * Converts a duration string like "15m", "7d", "30s", "1h" into seconds.
 * Used to align Redis key TTLs with JWT expiresIn values so a session
 * key expires at the same time the refresh token it backs would anyway.
 */
export const parseDurationToSeconds = (durationStr, fallbackSeconds = 604800) => {
  const match = /^(\d+)\s*(s|m|h|d)$/i.exec(String(durationStr).trim());
  if (!match) return fallbackSeconds;

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1, m: 60, h: 3600, d: 86400 };

  return value * multipliers[unit];
};
