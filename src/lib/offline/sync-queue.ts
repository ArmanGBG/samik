"use client";

import { offlineDB, type PendingMutation } from "./db";
import { v4 as uuidv4 } from "uuid";

/**
 * Background Sync Queue (Section 10 of architecture doc).
 *
 * Per Section 10 — "صف همگام‌سازی پس‌زمینه (Background Sync Queue)":
 *   > "درخواستِ معلم (Mutation) به صورت یک Task در صفی در داخل دستگاه
 *   >  ذخیره می‌شود.
 *   >  - اگر اینترنت وصل باشد: Task بلافاصله در بک‌گراند به سرور ارسال می‌شود.
 *   >  - اگر اینترنت قطع باشد: Task در صف می‌ماند. به محض اینکه سیستم‌عامل
 *   >    تشخیص داد اینترنت وصل شده است، کلاینت تمام Taskهای تلنبار شده را
 *   >    به صورت دسته‌ای (Batch) به سرور می‌فرستد."
 *
 * Per Section 10 — "کلیدهای Idempotency (ضد تکرار)":
 *   > "فرانت‌اند برای هر عملیات یک شناسه یکتای تصادفی (UUID) تولید کرده
 *   >  و در هدر درخواست (X-Idempotency-Key) به سرور می‌فرستد."
 *
 * Implementation:
 *   - Each enqueue() generates a UUID idempotency key.
 *   - The mutation is stored in Dexie with status=pending.
 *   - flushQueue() attempts to send all pending mutations; on success the
 *     row is deleted, on failure attempts++ and status=failed.
 *   - The queue is flushed:
 *       (a) immediately after enqueue() if navigator.onLine,
 *       (b) on the browser 'online' event,
 *       (c) every 30 seconds via a polling fallback (for cases where
 *           'online' event doesn't fire).
 */

const MAX_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 30_000;

let pollInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Enqueue a mutation. Returns the idempotency key so the caller can
 * show it to the user (e.g. " queued with key abc-123") for debugging.
 *
 * If online, immediately triggers flushQueue() in the background.
 */
export async function enqueueMutation(input: {
  endpoint: string;
  method: "POST" | "PATCH" | "DELETE";
  body: unknown;
}): Promise<{ idempotencyKey: string; mutationId: number | undefined }> {
  const idempotencyKey = uuidv4();
  const bodyStr = JSON.stringify(input.body);

  let mutationId: number | undefined;
  if (offlineDB) {
    const id = await offlineDB.pendingMutations.add({
      idempotencyKey,
      endpoint: input.endpoint,
      method: input.method,
      body: bodyStr,
      status: "pending",
      attempts: 0,
      createdAt: Date.now(),
    });
    mutationId = id as number;
  }

  // Try to flush immediately if online
  if (typeof navigator !== "undefined" && navigator.onLine) {
    void flushQueue();
  }

  return { idempotencyKey, mutationId };
}

/**
 * Attempt to send all pending mutations to the server.
 * On success: delete the row.
 * On failure: increment attempts; if attempts >= MAX_ATTEMPTS, mark as failed.
 *
 * Per Section 10 — "رفتار بک‌اند": if the idempotency key was already
 * processed, the server returns the cached response (no duplicate work).
 * This means even if a mutation was actually sent but the response was
 * lost (network drop), re-sending is safe.
 */
export async function flushQueue(): Promise<{
  synced: number;
  failed: number;
  remaining: number;
}> {
  if (!offlineDB) return { synced: 0, failed: 0, remaining: 0 };

  const pending = await offlineDB.pendingMutations
    .where("status")
    .anyOf(["pending", "failed"])
    .toArray();

  // Sort by createdAt (oldest first)
  pending.sort((a, b) => a.createdAt - b.createdAt);

  let synced = 0;
  let failed = 0;

  for (const mutation of pending) {
    if (mutation.attempts >= MAX_ATTEMPTS) {
      // Already exhausted — skip
      failed++;
      continue;
    }

    // Mark as syncing
    await offlineDB.pendingMutations.update(mutation.id!, {
      status: "syncing",
      lastAttemptAt: Date.now(),
      attempts: mutation.attempts + 1,
    });

    try {
      const res = await fetch(mutation.endpoint, {
        method: mutation.method,
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": mutation.idempotencyKey,
        },
        body: mutation.method === "DELETE" ? undefined : mutation.body,
      });

      if (res.ok) {
        await offlineDB.pendingMutations.delete(mutation.id!);
        synced++;
      } else if (res.status >= 400 && res.status < 500) {
        // 4xx — client error (e.g. validation). Don't retry.
        await offlineDB.pendingMutations.update(mutation.id!, {
          status: "failed",
          errorMessage: `HTTP ${res.status}: ${await res.text().catch(() => "")}`.slice(0, 200),
        });
        failed++;
      } else {
        // 5xx — server error. Retry later.
        await offlineDB.pendingMutations.update(mutation.id!, {
          status: "failed",
          errorMessage: `HTTP ${res.status}`,
        });
        failed++;
      }
    } catch (err) {
      // Network error. Retry later.
      await offlineDB.pendingMutations.update(mutation.id!, {
        status: "failed",
        errorMessage: (err as Error).message.slice(0, 200),
      });
      failed++;
    }
  }

  const remaining = await offlineDB.pendingMutations.count();
  return { synced, failed, remaining };
}

/**
 * Initialize the Background Sync Queue. Call this once on app mount
 * (e.g. in the Teacher dashboard layout).
 *
 * Wires up:
 *   - Initial flush (in case there are leftover pending mutations)
 *   - 'online' event listener (flush when connection restored)
 *   - 30-second polling fallback (in case 'online' doesn't fire)
 */
export function initBackgroundSync() {
  if (typeof window === "undefined") return;

  // Initial flush
  void flushQueue();

  // Flush when connection is restored
  window.addEventListener("online", () => {
    void flushQueue();
  });

  // Polling fallback (for browsers that don't fire 'online' reliably)
  if (pollInterval) clearInterval(pollInterval);
  pollInterval = setInterval(() => {
    if (navigator.onLine) {
      void flushQueue();
    }
  }, POLL_INTERVAL_MS);
}

/**
 * Get the current queue status for UI display.
 */
export async function getQueueStatus(): Promise<{
  pending: number;
  failed: number;
  syncing: number;
}> {
  if (!offlineDB) return { pending: 0, failed: 0, syncing: 0 };
  const [pending, failed, syncing] = await Promise.all([
    offlineDB.pendingMutations.where("status").equals("pending").count(),
    offlineDB.pendingMutations.where("status").equals("failed").count(),
    offlineDB.pendingMutations.where("status").equals("syncing").count(),
  ]);
  return { pending, failed, syncing };
}

/**
 * Subscribe to queue changes. Returns an unsubscribe function.
 * The callback is called with the new status whenever the queue changes
 * (after a flush or after enqueue).
 */
export function subscribeToQueue(
  callback: (status: { pending: number; failed: number; syncing: number }) => void
): () => void {
  if (!offlineDB) return () => {};
  // Use Dexie's liveQuery for reactive updates
  return offlineDB.pendingMutations.hook("creating", () => {
    void getQueueStatus().then(callback);
  }) as unknown as () => void;
}
