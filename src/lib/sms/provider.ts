/**
 * SMS Provider Abstraction Layer (Phase 5.1)
 * ========================================
 *
 * Per the architecture document (Section 8) + Phase 5.1 directive,
 * Samik sends two kinds of SMS:
 *
 *   1. **OTP codes** (login verification) — sent synchronously during
 *      `/api/v1/auth/otp`. Uses a dedicated OTP pattern.
 *   2. **Absence notifications** (to guardians) — sent in bulk via the
 *      `/api/v1/notifications/outbox/send-bulk` background job. Uses a
 *      dedicated absence-alert pattern with structured variables.
 *
 * ── Arta Payamak Pattern-Based (Fast Send) API ─────────────────
 *
 * Arta Payamak uses "Pattern" messages for fast delivery + bypassing
 * blacklist filters. Each pattern is pre-approved in the Arta Payamak
 * panel and has a `bodyId` (pattern code). The message variables are
 * sent as a semicolon-separated `text` field.
 *
 *   Endpoint: POST https://api.payamak-panel.com/post/Send.asmx/SendByBaseNumber2
 *   Content-Type: application/x-www-form-urlencoded (Arta Payamak
 *     expects form data, not JSON, for this legacy SOAP-style endpoint)
 *
 *   Body (form-encoded):
 *     username=<ARTA_USERNAME>
 *     password=<ARTA_PASSWORD>
 *     text=<var1;var2;var3>        ← pattern variables, ;-separated
 *     to=<09123456789>             ← recipient phone
 *     bodyId=<pattern-code>        ← integer pattern ID
 *
 *   Response (JSON):
 *     { "Value": "12345678", "RetStatus": 1, "StrRetStatus": "Ok" }
 *     - RetStatus 1 = success, 0 = failure
 *     - Value = the SMS message ID (string)
 *
 * This module provides a unified `SmsProvider` interface with two
 * specialized methods (`sendOtp` + `sendAbsenceAlert`) so call sites
 * don't need to know about patterns or variable ordering.
 *
 * Selection (auto via env vars):
 *   - If `ARTA_USERNAME` is set → ArtaPayamakSmsProvider (production)
 *   - Otherwise → SimulatedSmsProvider (dev mode — logs to console)
 */

export interface SmsSendResult {
  success: boolean;
  /** Provider-specific message ID (for tracking). */
  messageId?: string;
  /** Error description on failure. */
  error?: string;
}

/**
 * Structured absence data — stored in `NotificationOutbox.metadataJson`
 * so the background job can reconstruct the pattern variables without
 * re-fetching from the DB.
 */
export interface AbsenceAlertData {
  studentName: string;
  /** ISO date string or Persian-formatted date. */
  date: string;
  subject: string;
  schoolName: string;
}

export interface SmsProvider {
  /** Provider name for logging. */
  name: string;

  /**
   * Send an OTP code via the OTP pattern.
   *
   * @param phone  Recipient phone "09XXXXXXXXX"
   * @param code   6-digit OTP code (e.g. "123456")
   */
  sendOtp(phone: string, code: string): Promise<SmsSendResult>;

  /**
   * Send an absence alert via the absence pattern.
   *
   * @param phone         Recipient (guardian) phone "09XXXXXXXXX"
   * @param studentName   Student's full name (pattern var 1)
   * @param date          Absence date (pattern var 2)
   * @param subject       Subject title (pattern var 3)
   * @param schoolName    School name (pattern var 4)
   */
  sendAbsenceAlert(
    phone: string,
    studentName: string,
    date: string,
    subject: string,
    schoolName: string
  ): Promise<SmsSendResult>;
}

// ── Singleton instance ─────────────────────────────────────────
let _provider: SmsProvider | null = null;

/**
 * Get the active SMS provider based on env vars.
 *
 * Selection logic:
 *   - If `ARTA_USERNAME` + `ARTA_PASSWORD` are set → ArtaPayamakSmsProvider
 *   - Otherwise → SimulatedSmsProvider (dev mode)
 *
 * The result is cached (singleton) so we don't re-evaluate on every call.
 */
export function getSmsProvider(): SmsProvider {
  if (_provider) return _provider;

  const username = process.env.ARTA_USERNAME;
  const password = process.env.ARTA_PASSWORD;

  if (username && password && username.length > 0 && password.length > 0) {
    _provider = new ArtaPayamakSmsProvider({
      username,
      password,
      apiUrl:
        process.env.ARTA_API_URL ??
        "https://api.payamak-panel.com/post/Send.asmx/SendByBaseNumber2",
      otpPatternCode: process.env.ARTA_OTP_PATTERN_CODE ?? "",
      absencePatternCode: process.env.ARTA_ABSENCE_PATTERN_CODE ?? "",
    });
    console.log("[sms] Using ArtaPayamakSmsProvider (production — pattern API)");
  } else {
    _provider = new SimulatedSmsProvider();
    console.log("[sms] Using SimulatedSmsProvider (dev mode — no real SMS sent)");
  }
  return _provider;
}

// ── Simulated Provider (dev) ───────────────────────────────────

class SimulatedSmsProvider implements SmsProvider {
  name = "simulated";

  async sendOtp(phone: string, code: string): Promise<SmsSendResult> {
    await new Promise((r) => setTimeout(r, 300));
    console.log(`[sms:sim] OTP → ${phone}: code=${code}`);
    return {
      success: true,
      messageId: `sim_otp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };
  }

  async sendAbsenceAlert(
    phone: string,
    studentName: string,
    date: string,
    subject: string,
    schoolName: string
  ): Promise<SmsSendResult> {
    await new Promise((r) => setTimeout(r, 500));
    console.log(
      `[sms:sim] ABSENCE → ${phone}: student=${studentName}, date=${date}, subject=${subject}, school=${schoolName}`
    );
    return {
      success: true,
      messageId: `sim_abs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };
  }
}

// ── Arta Payamak Provider (production — Pattern API) ───────────

interface ArtaPayamakConfig {
  username: string;
  password: string;
  apiUrl: string;
  /** Pattern code for OTP messages (bodyId). */
  otpPatternCode: string;
  /** Pattern code for absence alerts (bodyId). */
  absencePatternCode: string;
}

class ArtaPayamakSmsProvider implements SmsProvider {
  name = "arta-payamak";
  private config: ArtaPayamakConfig;

  constructor(config: ArtaPayamakConfig) {
    this.config = config;
  }

  async sendOtp(phone: string, code: string): Promise<SmsSendResult> {
    // OTP pattern has a single variable: the code.
    // The `text` field is just the code itself (no semicolon needed
    // for a single-variable pattern, but Arta Payamak accepts it either way).
    return this.sendPattern({
      to: phone,
      bodyId: this.config.otpPatternCode,
      text: code,
      contextLabel: "OTP",
    });
  }

  async sendAbsenceAlert(
    phone: string,
    studentName: string,
    date: string,
    subject: string,
    schoolName: string
  ): Promise<SmsSendResult> {
    // Absence pattern has 4 variables in order:
    //   studentName;date;subject;schoolName
    // Per the architect's directive: "Values separated by semicolon,
    // exactly matching the order in the Arta pattern."
    const text = [studentName, date, subject, schoolName].join(";");
    return this.sendPattern({
      to: phone,
      bodyId: this.config.absencePatternCode,
      text,
      contextLabel: "ABSENCE",
    });
  }

  /**
   * Core pattern-sending method. Posts to the Arta Payamak
   * SendByBaseNumber2 endpoint with form-encoded data.
   *
   * Retries:
   *   - 2 retries on network errors / 5xx with exponential backoff.
   *   - NO retry on 4xx (invalid credentials, bad pattern code, etc.).
   */
  private async sendPattern(params: {
    to: string;
    bodyId: string;
    text: string;
    contextLabel: string;
  }): Promise<SmsSendResult> {
    if (!this.config.otpPatternCode && params.contextLabel === "OTP") {
      return {
        success: false,
        error: "ARTA_OTP_PATTERN_CODE env var is not set",
      };
    }
    if (!this.config.absencePatternCode && params.contextLabel === "ABSENCE") {
      return {
        success: false,
        error: "ARTA_ABSENCE_PATTERN_CODE env var is not set",
      };
    }
    if (!params.bodyId) {
      return { success: false, error: `Missing pattern code for ${params.contextLabel}` };
    }

    const maxRetries = 2;
    let lastError: string | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // 10s timeout via AbortController (SMS gateways can be slow)
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);

        // Arta Payamak's SendByBaseNumber2 expects form-encoded data
        // (legacy SOAP-style .asmx endpoint), NOT JSON.
        const formData = new URLSearchParams();
        formData.append("username", this.config.username);
        formData.append("password", this.config.password);
        formData.append("text", params.text);
        formData.append("to", params.to);
        formData.append("bodyId", params.bodyId);

        const res = await fetch(this.config.apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        // Parse response — Arta Payamak returns JSON for this endpoint
        const data = (await res.json().catch(() => null)) as
          | { Value?: string; RetStatus?: number; StrRetStatus?: string }
          | null;

        if (res.ok && data && data.RetStatus === 1) {
          return {
            success: true,
            messageId: data.Value ?? undefined,
          };
        }

        // 4xx = client error — don't retry
        if (res.status >= 400 && res.status < 500) {
          const errMsg = data?.StrRetStatus
            ? `Arta Payamak: ${data.StrRetStatus}`
            : `Arta Payamak ${res.status}`;
          return { success: false, error: errMsg };
        }

        // RetStatus 0 = failure (e.g. insufficient balance) — check if retryable
        if (data && data.RetStatus === 0) {
          // Most RetStatus=0 failures are NOT retryable (balance, bad pattern)
          return {
            success: false,
            error: `Arta Payamak rejected: ${data.StrRetStatus ?? "RetStatus=0"}`,
          };
        }

        // 5xx or unparseable response — retry
        lastError = `Arta Payamak ${res.status}`;
      } catch (err) {
        // Network error or timeout — retry
        lastError =
          (err as Error).name === "AbortError"
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
