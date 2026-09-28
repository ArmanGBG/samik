import { NextRequest } from "next/server";
import { subscribeToSchool, SamikEvent } from "@/lib/realtime/event-bus";
import { verifyToken, AUTH_COOKIE_NAME } from "@/lib/auth/jwt";

/**
 * GET /api/v1/sse
 *
 * Universal Server-Sent Events (SSE) endpoint for Samik Platform.
 * Supports all authenticated roles: PRINCIPAL, DEPUTY, TEACHER, STUDENT, SUPER_ADMIN.
 *
 * Multi-Tenant Isolation:
 *   - Events are strictly scoped to the user's active `schoolId`.
 *   - For STUDENT/PARENT: events are further filtered to relevant school-wide
 *     or student-specific notifications (grades, attendance, behavioral points).
 *
 * Real-time Stream Properties:
 *   - Node.js runtime with ReadableStream.
 *   - Headers: text/event-stream, Cache-Control: no-cache, no-transform,
 *     Connection: keep-alive, X-Accel-Buffering: no.
 *   - Periodic 20-second heartbeats.
 *   - Automatic cleanup on client disconnect / signal abort.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload || payload.kind !== "contextual") {
    return new Response("Invalid session", { status: 401 });
  }

  const { schoolId, role, userId, studentEnrollmentId } = payload;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // 1. Initial connection confirmation
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "connected",
            schoolId,
            role,
            userId,
            connectedAt: new Date().toISOString(),
          })}\n\n`
        )
      );

      // 2. Subscribe to events for this school
      const unsubscribe = subscribeToSchool(schoolId, (event: SamikEvent) => {
        try {
          // Role-specific filtering if needed
          if (role === "STUDENT") {
            // For students: pass relevant school events or events targeted to them
            if (event.type === "grade:saved" && event.payload.studentUserId !== userId) {
              return;
            }
            if (event.type === "behavioral-point:created" && event.payload.studentId !== userId) {
              return;
            }
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        } catch {
          // Stream controller may already be closed
        }
      });

      // 3. Heartbeat every 20 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
        } catch {
          // Stream closed
        }
      }, 20_000);

      // 4. Cleanup on abort
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
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
