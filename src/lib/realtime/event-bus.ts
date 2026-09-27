import { EventEmitter } from "node:events";

/**
 * Real-time Event Bus (Section 6 of architecture doc).
 *
 * Per Section 6 — "معماری رویداد محور (Event-Driven) برای داشبورد ناظم":
 *   > "برای اینکه داشبورد ناظم در لحظه آپدیت شود، بک‌اند نباید از روش
 *   >  منسوخ و سنگینِ Polling استفاده کند. برنامه‌نویس باید از
 *   >  Server-Sent Events (SSE) یا WebSockets برای پوش کردن داده‌ها
 *   >  به پنل ناظم استفاده کند."
 *
 * Per Section 10 — "جریان داده":
 *   > "به محض اینکه Background Sync معلم به سرور رسید و تایید شد، سرور
 *   >  از طریق اتصال SSE، یک رویداد به داشبورد ناظم پوش (Push) می‌کند."
 *
 * Implementation:
 *   - Singleton EventEmitter pinned to globalThis (survives HMR + shared
 *     across all route handler instances in the same Node process).
 *   - Each event carries a `schoolId` so the SSE endpoint can filter
 *     by the deputy's active school (no cross-tenant leak).
 *   - In prod: replace with Redis Pub/Sub for multi-instance fanout.
 *
 * Event types:
 *   - "attendance:submitted" — teacher committed a roll-call
 *   - "behavioral-point:created" — quick +/- registered
 *   - "grade:created" — new grade saved
 *
 * Each event payload includes only what the deputy needs to see —
 * no sensitive cross-tenant data.
 */

export interface AttendanceSubmittedEvent {
  type: "attendance:submitted";
  schoolId: string;
  payload: {
    classSessionId: string;
    timetableSlotId: string;
    date: string;
    classroomName: string;
    subjectTitle: string;
    teacherName: string;
    submittedAt: string;
    absentees: Array<{
      studentId: string;
      studentName: string;
      status: "ABSENT" | "LATE";
    }>;
  };
}

export interface BehavioralPointCreatedEvent {
  type: "behavioral-point:created";
  schoolId: string;
  payload: {
    pointId: string;
    studentId: string;
    studentName: string;
    classroomName: string;
    pointType: "POSITIVE" | "NEGATIVE";
    reasonTag: string | null;
    teacherName: string;
    createdAt: string;
  };
}

export interface NotificationSentEvent {
  type: "notification:sent";
  schoolId: string;
  payload: {
    id: string;
    recipientPhone: string;
    studentId: string;
  };
}

export type SamikEvent =
  | AttendanceSubmittedEvent
  | BehavioralPointCreatedEvent
  | NotificationSentEvent;

const _g = globalThis as unknown as { __samikEventBus?: EventEmitter };
if (!_g.__samikEventBus) {
  _g.__samikEventBus = new EventEmitter();
  // Raise the listener cap — we may have many concurrent SSE connections
  // in dev (one per open deputy dashboard tab).
  _g.__samikEventBus.setMaxListeners(100);
}
export const eventBus: EventEmitter = _g.__samikEventBus!;

/**
 * Emit an attendance-submitted event. Called by POST /api/v1/attendance/sessions
 * after a successful commit. The SSE endpoint listens and pushes to deputies.
 */
export function emitAttendanceSubmitted(payload: AttendanceSubmittedEvent["payload"]) {
  const event: AttendanceSubmittedEvent = {
    type: "attendance:submitted",
    schoolId: payload.schoolId,
    payload,
  };
  eventBus.emit(`attendance:submitted:${payload.schoolId}`, event);
}

/**
 * Emit a behavioral-point-created event. Called by POST /api/v1/behavioral-points.
 */
export function emitBehavioralPointCreated(payload: BehavioralPointCreatedEvent["payload"]) {
  const event: BehavioralPointCreatedEvent = {
    type: "behavioral-point:created",
    schoolId: payload.schoolId,
    payload,
  };
  eventBus.emit(`behavioral-point:created:${payload.schoolId}`, event);
}

/**
 * Subscribe to all events for a given school. Returns an unsubscribe function.
 *
 * Used by the SSE endpoint to filter events by the deputy's active school.
 */
export function subscribeToSchool(
  schoolId: string,
  listener: (event: SamikEvent) => void
): () => void {
  const attendanceEvent = `attendance:submitted:${schoolId}`;
  const behavioralEvent = `behavioral-point:created:${schoolId}`;
  const notificationEvent = `notification:sent:${schoolId}`;

  const wrapped = (event: SamikEvent) => listener(event);
  eventBus.on(attendanceEvent, wrapped);
  eventBus.on(behavioralEvent, wrapped);
  eventBus.on(notificationEvent, wrapped);

  return () => {
    eventBus.off(attendanceEvent, wrapped);
    eventBus.off(behavioralEvent, wrapped);
    eventBus.off(notificationEvent, wrapped);
  };
}
