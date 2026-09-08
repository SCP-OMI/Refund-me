import { redis } from "./redis";

interface RateLimitConfig {
  limit: number;
  window: number; // in seconds
}

export async function rateLimit(
  identifier: string,
  config: RateLimitConfig = { limit: 10, window: 60 },
) {
  const key = `rate_limit:${identifier}`;

  // Use a simple fixed window counter with atomic increment and expiry
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, config.window);
  }

  return {
    success: current <= config.limit,
    limit: config.limit,
    remaining: Math.max(0, config.limit - current),
  };
}
