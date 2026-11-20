/**
 * Generic In-Memory Sliding-Window Rate Limiter
 *
 * Pinned to globalThis so it survives HMR in Next.js development.
 * In a multi-instance cluster, this can be swapped with Redis.
 */

interface RateLimitEntry {
  timestamps: number[];
}

const _g = globalThis as unknown as {
  __samikRateLimitStore?: Map<string, RateLimitEntry>;
};

if (!_g.__samikRateLimitStore) {
  _g.__samikRateLimitStore = new Map();
}

const store: Map<string, RateLimitEntry> = _g.__samikRateLimitStore;

export function checkRateLimit(
  key: string,
  options: { max: number; windowMs: number }
): { limited: boolean; retryAfterMs: number } {
  const now = Date.now();
  const entry = store.get(key) ?? { timestamps: [] };

  // Remove timestamps outside the sliding window
  const windowStart = now - options.windowMs;
  entry.timestamps = entry.timestamps.filter((t) => t >= windowStart);

  if (entry.timestamps.length >= options.max) {
    const oldest = entry.timestamps[0];
    const retryAfterMs = Math.max(0, options.windowMs - (now - oldest));
    return { limited: true, retryAfterMs };
  }

  // Record this request
  entry.timestamps.push(now);
  store.set(key, entry);

  return { limited: false, retryAfterMs: 0 };
}
