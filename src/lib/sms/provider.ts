/**
 * SMS Provider Abstraction Layer (Phase 5.1 & IPPanel Integration)
 * ================================================================
 *
 * Per the architecture document (Section 8) + Phase 5.1 directive,
 * Samik sends two kinds of SMS:
 *
 *   1. **OTP codes** (login verification) — sent synchronously during
 *      `/api/v1/auth/otp`. Uses VOTP or a dedicated OTP pattern.
 *   2. **Absence notifications** (to guardians) — sent in bulk via the
 *      `/api/v1/notifications/outbox/send-bulk` background job. Uses a
 *      dedicated absence-alert pattern with structured variables.
 *
 * ── Arta Payamak / IPPanel Pattern-Based (Fast Send) API ────────
 *
 * Arta Payamak is powered by IPPanel infrastructure. For fast delivery
 * bypassing blacklists, approved patterns are used.
 *
 *   1. Modern REST API (Default when ARTA_API_KEY is configured):
 *      Endpoint: POST https://edge.ippanel.com/v1/api/send
 *      Headers:
 *        Authorization: <ARTA_API_KEY>
 *        Content-Type: application/json
 *      Payload (Pattern):
 *        {
 *          "from_number": "+983000505",
 *          "recipients": ["09123456789"],
 *          "code": "na8zey3ygzfejiz",
 *          "params": {
 *            "name": "نام دانش‌آموز",
 *            "date": "۱۴۰۵/۰۷/۲۲",
 *            "lesson": "ریاضی",
 *            "school": "نام مدرسه"
 *          },
 *          "sending_type": "pattern"
 *        }
 *
 *   2. Legacy SOAP/Form API (Fallback if only username/password provided):
 *      Endpoint: POST https://api.payamak-panel.com/post/Send.asmx/SendByBaseNumber2
 *
 * Selection (auto via env vars):
 *   - If `ARTA_API_KEY` or (`ARTA_USERNAME` + `ARTA_PASSWORD`) is set → ArtaPayamakSmsProvider
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
   * Send an OTP code via VOTP or the OTP pattern.
   *
   * @param phone  Recipient phone "09XXXXXXXXX"
   * @param code   6-digit OTP code (e.g. "123456")
   */
  sendOtp(phone: string, code: string): Promise<SmsSendResult>;

  /**
   * Send an absence alert via the absence pattern.
   *
   * @param phone         Recipient (guardian) phone "09XXXXXXXXX"
   * @param studentName   Student's full name (pattern var: name)
   * @param date          Absence date (pattern var: date)
   * @param subject       Subject title (pattern var: lesson)
   * @param schoolName    School name (pattern var: school)
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
 *   - If `ARTA_API_KEY` or `ARTA_USERNAME` is set → ArtaPayamakSmsProvider
 *   - Otherwise → SimulatedSmsProvider (dev mode)
 *
 * The result is cached (singleton) so we don't re-evaluate on every call.
 */
export function getSmsProvider(): SmsProvider {
  if (_provider) return _provider;

  const apiKey = process.env.ARTA_API_KEY;
  const username = process.env.ARTA_USERNAME;
  const password = process.env.ARTA_PASSWORD;

  if (apiKey || (username && password)) {
    _provider = new ArtaPayamakSmsProvider({
      apiKey,
      username,
      password,
      apiUrl:
        process.env.ARTA_API_URL ??
        (apiKey
          ? "https://edge.ippanel.com/v1/api/send"
          : "https://api.payamak-panel.com/post/Send.asmx/SendByBaseNumber2"),
      senderNumber: process.env.ARTA_SENDER_NUMBER ?? "+983000505",
      otpPatternCode: process.env.ARTA_OTP_PATTERN_CODE ?? "m316akrctl3xjvc",
      absencePatternCode: process.env.ARTA_ABSENCE_PATTERN_CODE ?? "na8zey3ygzfejiz",
    });
    console.log(
      `[sms] Using ArtaPayamakSmsProvider (${apiKey ? "IPPanel REST API" : "Legacy SOAP API"})`
    );
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

// ── Arta Payamak / IPPanel Provider ────────────────────────────

interface ArtaPayamakConfig {
  apiKey?: string;
  username?: string;
  password?: string;
  apiUrl: string;
  senderNumber: string;
  otpPatternCode: string;
  absencePatternCode: string;
}

class ArtaPayamakSmsProvider implements SmsProvider {
  name = "arta-payamak";
  private config: ArtaPayamakConfig;

  constructor(config: ArtaPayamakConfig) {
    this.config = config;
  }

  async sendOtp(phone: string, code: string): Promise<SmsSendResult> {
    if (this.config.apiKey) {
      if (this.config.otpPatternCode) {
        return this.sendEdgePattern({
          to: phone,
          code: this.config.otpPatternCode,
          params: { code },
          contextLabel: "OTP",
        });
      }
      // VOTP (Verification OTP) built into IPPanel
      return this.sendEdgeVotp(phone, code);
    }

    // Legacy SOAP
    return this.sendSoapPattern({
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
    if (this.config.apiKey) {
      return this.sendEdgePattern({
        to: phone,
        code: this.config.absencePatternCode,
        params: {
          name: studentName,
          date,
          lesson: subject,
          school: schoolName,
        },
        contextLabel: "ABSENCE",
      });
    }

    // Legacy SOAP: semicolon-separated variables
    const text = [studentName, date, subject, schoolName].join(";");
    return this.sendSoapPattern({
      to: phone,
      bodyId: this.config.absencePatternCode,
      text,
      contextLabel: "ABSENCE",
    });
  }

  /**
   * Modern IPPanel Edge REST Pattern Sending
   */
  private async sendEdgePattern(options: {
    to: string;
    code: string;
    params: Record<string, string>;
    contextLabel: string;
  }): Promise<SmsSendResult> {
    if (!options.code) {
      return { success: false, error: `Missing pattern code for ${options.contextLabel}` };
    }

    const payload = {
      from_number: this.config.senderNumber || "+983000505",
      recipients: [options.to],
      code: options.code,
      params: options.params,
      sending_type: "pattern",
    };

    return this.postToEdgeApi(payload, options.contextLabel);
  }

  /**
   * Modern IPPanel Edge REST VOTP (Fast Verification OTP)
   */
  private async sendEdgeVotp(phone: string, code: string): Promise<SmsSendResult> {
    const payload = {
      message: code.toString(),
      sending_type: "votp",
      params: {
        recipients: [phone],
      },
    };

    return this.postToEdgeApi(payload, "OTP (VOTP)");
  }

  /**
   * HTTP POST with retry logic for IPPanel Edge API
   */
  private async postToEdgeApi(
    payload: Record<string, unknown>,
    contextLabel: string
  ): Promise<SmsSendResult> {
    const maxRetries = 2;
    let lastError: string | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);

        const res = await fetch(this.config.apiUrl, {
          method: "POST",
          headers: {
            "Authorization": this.config.apiKey!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        const data = (await res.json().catch(() => null)) as {
          data?: { message_outbox_ids?: number[] };
          meta?: { status?: boolean; message?: string };
        } | null;

        if (res.ok && data?.meta?.status) {
          const messageId = data.data?.message_outbox_ids?.[0]?.toString();
          return {
            success: true,
            messageId,
          };
        }

        if (res.status >= 400 && res.status < 500) {
          const errMsg = data?.meta?.message
            ? `Arta Payamak: ${data.meta.message}`
            : `Arta Payamak HTTP ${res.status}`;
          return { success: false, error: errMsg };
        }

        lastError = data?.meta?.message || `Arta Payamak HTTP ${res.status}`;
      } catch (err) {
        lastError =
          (err as Error).name === "AbortError"
            ? "Arta Payamak timeout (10s)"
            : (err as Error).message;
      }

      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
      }
    }

    return {
      success: false,
      error: `Failed to send ${contextLabel}: ${lastError ?? "Unknown SMS error"}`,
    };
  }

  /**
   * Legacy SOAP / Form-encoded Pattern Sending
   */
  private async sendSoapPattern(params: {
    to: string;
    bodyId: string;
    text: string;
    contextLabel: string;
  }): Promise<SmsSendResult> {
    if (!this.config.username || !this.config.password) {
      return { success: false, error: "ARTA_USERNAME and ARTA_PASSWORD are required for SOAP API" };
    }
    if (!params.bodyId) {
      return { success: false, error: `Missing pattern code for ${params.contextLabel}` };
    }

    const maxRetries = 2;
    let lastError: string | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);

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

        const data = (await res.json().catch(() => null)) as
          | { Value?: string; RetStatus?: number; StrRetStatus?: string }
          | null;

        if (res.ok && data && data.RetStatus === 1) {
          return {
            success: true,
            messageId: data.Value ?? undefined,
          };
        }

        if (res.status >= 400 && res.status < 500) {
          const errMsg = data?.StrRetStatus
            ? `Arta Payamak: ${data.StrRetStatus}`
            : `Arta Payamak ${res.status}`;
          return { success: false, error: errMsg };
        }

        if (data && data.RetStatus === 0) {
          return {
            success: false,
            error: `Arta Payamak rejected: ${data.StrRetStatus ?? "RetStatus=0"}`,
          };
        }

        lastError = `Arta Payamak ${res.status}`;
      } catch (err) {
        lastError =
          (err as Error).name === "AbortError"
            ? "Arta Payamak timeout (10s)"
            : (err as Error).message;
      }

      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
      }
    }

    return { success: false, error: lastError ?? "Unknown SMS error" };
  }
}
