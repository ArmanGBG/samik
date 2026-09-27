import { NextRequest } from "next/server";
import { subscribeToSchool, SamikEvent } from "@/lib/realtime/event-bus";
import { verifyToken, AUTH_COOKIE_NAME } from "@/lib/auth/jwt";

/**
 * GET /api/v1/sse/deputy
 *
 * Server-Sent Events endpoint for the Deputy's Live Dashboard
 * (Section 6 of architecture doc).
 *
 * Opens a long-lived HTTP connection and pushes events as they happen:
 *   - attendance:submitted — teacher committed a roll-call (with absentees)
 *   - behavioral-point:created — quick +/- registered
 *
 * Per Section 6:
 *   > "For the scenario where data flows mostly server → client (one-way
 *   >  to the deputy's dashboard), SSE is much lighter and more stable
 *   >  than WebSockets."
 *
 * Implementation:
 *   - Uses Next.js Route Handler with ReadableStream (no body parsing).
 *   - Sets headers: Content-Type: text/event-stream, Cache-Control: no-cache,
 *     Connection: keep-alive.
 *   - Filters events by the deputy's active schoolId (from the JWT cookie).
 *   - Sends a heartbeat every 25s to keep the connection alive through
 *     proxies that may close idle connections.
 *
 * NOTE: Edge runtime does NOT support SSE streams (no ReadableStream in
 * the same way). We explicitly use the Node.js runtime.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Verify auth from cookie (SSE doesn't allow custom headers from EventSource)
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }
  const payload = await verifyToken(token);
  if (!payload || payload.kind !== "contextual") {
    return new Response("Invalid session", { status: 401 });
  }
  if (payload.role !== "DEPUTY" && payload.role !== "PRINCIPAL") {
    return new Response("Forbidden — deputy role required", { status: 403 });
  }
  const schoolId = payload.schoolId;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Initial connection confirmation
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "connected", schoolId })}\n\n`
        )
      );

      // Subscribe to events for this school
      const unsubscribe = subscribeToSchool(schoolId, (event: SamikEvent) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        } catch {
          // Controller may already be closed
        }
      });

      // Heartbeat — keep the connection alive through proxies
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(`: heartbeat ${Date.now()}\n\n`)
          );
        } catch {
          // Closed
        }
      }, 25_000);

      // Cleanup on abort (client disconnects)
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Disable Nagle's algorithm for lower latency
      "X-Accel-Buffering": "no",
    },
  });
}
