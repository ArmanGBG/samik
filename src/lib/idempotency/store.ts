/**
 * Idempotency Key Store (Section 10 of architecture doc).
 *
 * Per Section 6 — "جلوگیری از ثبت تکراری (Idempotency)":
 *   > "POST /api/attendance/submit must be Idempotent. If the teacher
 *   >  presses the button twice due to slow internet, the server must
 *   >  NOT create two ClassSession records for the same bell; instead,
 *   >  ignore or update the second request."
 *
 * Per Section 10 — "Idempotency Keys":
 *   > "The frontend generates a unique random UUID for each operation
 *   >  and sends it in the X-Idempotency-Key header. The server checks
 *   >  this key in the cache (Redis) BEFORE processing."
 *
 * Implementation:
 *   - In dev: in-memory Map pinned to globalThis (survives HMR).
 *   - In prod: replace with Redis (same interface).
 *
 * The Map stores the full JSON response + timestamp. Entries expire
 * after IDEMPOTENCY_TTL_MS (1 hour). A periodic sweep cleans up
 * expired entries (lazy on read).
 */

const IDEMPOTENCY_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CachedResponse {
  status: number;
  body: unknown;
  storedAt: number;
}

interface IdempotencyStore {
  cache: Map<string, CachedResponse>;
  /** Pending keys — work in progress, used to dedupe concurrent requests. */
  pending: Map<string, Promise<CachedResponse>>;
}

const _g = globalThis as unknown as { __samikIdempotencyStore?: IdempotencyStore };
if (!_g.__samikIdempotencyStore) {
  _g.__samikIdempotencyStore = { cache: new Map(), pending: new Map() };
}
const store: IdempotencyStore = _g.__samikIdempotencyStore!;

function sweepExpired() {
  const now = Date.now();
  for (const [key, val] of store.cache) {
    if (now - val.storedAt > IDEMPOTENCY_TTL_MS) {
      store.cache.delete(key);
    }
  }
}

/**
 * Execute `work` exactly once per idempotency key. If the same key is
 * sent again (e.g. duplicate request due to slow network), return the
 * cached response without re-running `work`.
 *
 * Concurrent duplicates (sent while the first is still processing)
 * will await the same in-flight Promise and return its result.
 */
export async function withIdempotency<T>(
  key: string | null | undefined,
  work: () => Promise<{ status: number; body: T }>
): Promise<{ status: number; body: T }> {
  if (!key) {
    // No key provided — just run the work (no idempotency guarantee)
    return work();
  }

  sweepExpired();

  // 1. Already cached? Return immediately.
  const cached = store.cache.get(key);
  if (cached) {
    return cached as { status: number; body: T };
  }

  // 2. In-flight? Await the existing promise.
  const pending = store.pending.get(key);
  if (pending) {
    return (await pending) as { status: number; body: T };
  }

  // 3. New key — run the work.
  const workPromise = (async () => {
    try {
      const result = await work();
      // Cache the result for future duplicate requests
      store.cache.set(key, {
        status: result.status,
        body: result.body,
        storedAt: Date.now(),
      });
      return {
        status: result.status,
        body: result.body as unknown as CachedResponse["body"],
      } as CachedResponse;
    } finally {
      // Remove from pending regardless of success/failure
      store.pending.delete(key);
    }
  })();

  store.pending.set(key, workPromise);
  return (await workPromise) as { status: number; body: T };
}

/**
 * Get stats for debugging / monitoring.
 */
export function getIdempotencyStats() {
  return {
    cachedKeys: store.cache.size,
    pendingKeys: store.pending.size,
    ttlMs: IDEMPOTENCY_TTL_MS,
  };
}
