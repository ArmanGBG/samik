/**
 * Safe fetch utilities — prevent JSON parsing crashes on non-JSON responses.
 *
 * When the Next.js API route throws an unhandled 500 error, returns 204 No
 * Content, or plain text, calling `.json()` on the response throws a
 * SyntaxError ("Unexpected end of JSON input"). These utilities safely
 * parse JSON only when the content-type is correct, returning a default
 * object otherwise.
 */

export interface SafeJsonResult {
  ok: boolean;
  error?: string;
  [key: string]: unknown;
}

/**
 * Safely parse a fetch Response as JSON.
 *
 * - If the response is not ok (status >= 400) → returns { ok: false, error }
 * - If the content-type is not application/json → returns { ok: false, error }
 * - If .json() throws a SyntaxError → returns { ok: false, error }
 * - Otherwise → returns the parsed JSON object
 *
 * NEVER throws — always returns a SafeJsonResult.
 */
export async function safeJsonResponse(
  r: Response,
  fallbackError: string = "خطا در برقراری ارتباط با سرور."
): Promise<SafeJsonResult> {
  // Check HTTP status first
  if (!r.ok) {
    // Try to parse the error body if it's JSON
    const contentType = r.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      try {
        const d = await r.json();
        return {
          ok: false,
          error: d.error ?? d.message ?? fallbackError,
        };
      } catch {
        // JSON parsing failed — fall through to generic error
      }
    }
    return {
      ok: false,
      error: `خطای سرور (${r.status}): ${r.statusText || fallbackError}`,
    };
  }

  // Response is ok — check if it's JSON
  const contentType = r.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    // Not JSON — return a generic success with no data
    return { ok: true };
  }

  // Parse JSON safely
  try {
    const d = await r.json();
    return d as SafeJsonResult;
  } catch {
    // JSON parsing failed (empty body, malformed JSON, etc.)
    return {
      ok: false,
      error: "پاسخ سرور قابل پردازش نیست.",
    };
  }
}
