/**
 * SMS Provider Abstraction Layer
 * ========================================
 *
 * Per the architecture document (Section 8), Samik sends two kinds of SMS:
 *
 *   1. **OTP codes** (login verification) — short, time-sensitive, sent
 *      synchronously during the `/api/v1/auth/otp` request.
 *   2. **Absence notifications** (to guardians) — longer, sent in bulk
 *      via the `/api/v1/notifications/outbox/send-bulk` background job.
 *
 * This module provides a unified `SmsProvider` interface so we can swap
 * the implementation between:
 *
 *   - `SimulatedSmsProvider` — dev mode: logs to console, 500ms delay,
 *     always "succeeds". Used when no real gateway env vars are set.
 *   - `ArtaPayamakSmsProvider` — production: calls the Arta Payamak
 *     REST API. Activated when `ARTA_PAYAMAK_API_KEY` is set.
 *
 * The `getSmsProvider()` factory reads env vars and returns the right
 * implementation. All call sites use the SAME interface, so switching
 * from simulation to real gateway requires ZERO code changes — just
 * setting env vars on Liara.
 *
 * ── Arta Payamak Integration Notes ─────────────────────────────
 * Arta Payamak (artapayamak.com) is a popular Iranian SMS gateway.
 * Typical API contract (verify with their latest docs):
 *
 *   POST {ARTA_PAYAMAK_API_URL}
 *   Headers: { "Content-Type": "application/json" }
 *   Body: {
 *     "ApiKey":   ARTA_PAYAMAK_API_KEY,
 *     "Sender":   ARTA_PAYAMAK_SENDER_NUMBER,
 *     "Receiver": recipientPhone,   // e.g. "09123456789"
 *     "Message":  messageBody       // UTF-8 Persian text
 *   }
 *   Response: { "Code": 200, "MessageId": "..." } on success
 *
 * The `ArtaPayamakSmsProvider.send()` method:
 *   - Uses `fetch()` with a 10s timeout (SMS gateways can be slow).
 *   - Retries up to 2 times on network errors (NOT on 4xx — those are
 *     validation errors like invalid number).
 *   - Returns a normalized `SmsSendResult` regardless of provider.
 */

export interface SmsSendResult {
  success: boolean;
  /** Provider-specific message ID (for tracking). */
  messageId?: string;
  /** Error description on failure. */
  error?: string;
}

export interface SmsProvider {
  /** Provider name for logging. */
  name: string;
  /**
   * Send an SMS. Should NOT throw — return `{ success: false }` on failure
   * so the caller (background job) can mark the record as FAILED.
   *
   * @param recipientPhone  Iranian mobile format "09XXXXXXXXX"
   * @param messageBody     UTF-8 Persian text (max 500 chars)
   */
  send(recipientPhone: string, messageBody: string): Promise<SmsSendResult>;
}

// ── Singleton instance ─────────────────────────────────────────
let _provider: SmsProvider | null = null;

/**
 * Get the active SMS provider based on env vars.
 *
 * Selection logic:
 *   - If `ARTA_PAYAMAK_API_KEY` is set → ArtaPayamakSmsProvider (production)
 *   - Otherwise → SimulatedSmsProvider (dev mode)
 *
 * The result is cached (singleton) so we don't re-evaluate on every call.
 */
export function getSmsProvider(): SmsProvider {
  if (_provider) return _provider;

  const apiKey = process.env.ARTA_PAYAMAK_API_KEY;
  if (apiKey && apiKey.length > 0) {
    _provider = new ArtaPayamakSmsProvider({
      apiUrl: process.env.ARTA_PAYAMAK_API_URL ?? "https://api.artapayamak.com/api/v1/sms/send",
      apiKey,
      senderNumber: process.env.ARTA_PAYAMAK_SENDER_NUMBER ?? "",
    });
    console.log("[sms] Using ArtaPayamakSmsProvider (production gateway)");
  } else {
    _provider = new SimulatedSmsProvider();
    console.log("[sms] Using SimulatedSmsProvider (dev mode — no real SMS sent)");
  }
  return _provider;
}

// ── Simulated Provider (dev) ───────────────────────────────────

class SimulatedSmsProvider implements SmsProvider {
  name = "simulated";

  async send(recipientPhone: string, messageBody: string): Promise<SmsSendResult> {
    // Simulate network latency (per the architecture doc — 500ms per SMS)
    await new Promise((r) => setTimeout(r, 500));
    // Log to console so devs can see what would be sent
    console.log(`[sms:simulated] → ${recipientPhone}: ${messageBody}`);
    return {
      success: true,
      messageId: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };
  }
}

// ── Arta Payamak Provider (production) ─────────────────────────

interface ArtaPayamakConfig {
  apiUrl: string;
  apiKey: string;
  senderNumber: string;
}

class ArtaPayamakSmsProvider implements SmsProvider {
  name = "arta-payamak";
  private config: ArtaPayamakConfig;

  constructor(config: ArtaPayamakConfig) {
    this.config = config;
  }

  async send(recipientPhone: string, messageBody: string): Promise<SmsSendResult> {
    const maxRetries = 2;
    let lastError: string | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // 10s timeout via AbortController (SMS gateways can be slow)
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);

        const res = await fetch(this.config.apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ApiKey: this.config.apiKey,
            Sender: this.config.senderNumber,
            Receiver: recipientPhone,
            Message: messageBody,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          return {
            success: true,
            messageId: (data as Record<string, unknown>).MessageId as string | undefined,
          };
        }

        // 4xx = client error (invalid number, bad API key) — don't retry
        if (res.status >= 400 && res.status < 500) {
          return {
            success: false,
            error: `Arta Payamak ${res.status}: ${await res.text().catch(() => "unknown")}`,
          };
        }

        // 5xx = server error — retry
        lastError = `Arta Payamak ${res.status}`;
      } catch (err) {
        // Network error or timeout — retry
        lastError = (err as Error).name === "AbortError"
          ? "Arta Payamak timeout (10s)"
          : (err as Error).message;
      }

      if (attempt < maxRetries) {
        // Exponential backoff: 500ms, 1000ms
        await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
      }
    }

    return { success: false, error: lastError ?? "Unknown SMS error" };
  }
}
