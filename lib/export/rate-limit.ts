import { EXPORT_LIMITS } from "./types";

type RateBucket = {
  count: number;
  resetAt: number;
};

/**
 * In-memory per-user export rate limiter.
 * Suitable for single-process deployments; for multi-instance, replace with Redis.
 */
const buckets = new Map<string, RateBucket>();

export function checkExportRateLimit(userId: string): {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
} {
  const now = Date.now();
  let bucket = buckets.get(userId);

  if (!bucket || now >= bucket.resetAt) {
    bucket = {
      count: 0,
      resetAt: now + EXPORT_LIMITS.RATE_LIMIT_WINDOW_MS,
    };
    buckets.set(userId, bucket);
  }

  if (bucket.count >= EXPORT_LIMITS.RATE_LIMIT_MAX) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(0, bucket.resetAt - now),
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: EXPORT_LIMITS.RATE_LIMIT_MAX - bucket.count,
    retryAfterMs: 0,
  };
}

/** Test helper — clear all buckets. */
export function _resetExportRateLimits() {
  buckets.clear();
}
