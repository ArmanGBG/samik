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
      guardianPhone?: string;
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

export interface AttendanceExcusedEvent {
  type: "attendance:excused";
  schoolId: string;
  payload: {
    studentId: string;
    recordId: string;
    classSessionId?: string;
  };
}

export interface GradeSavedEvent {
  type: "grade:saved";
  schoolId: string;
  payload: {
    studentUserId: string;
    assessmentId: string;
    numericScore: number | null;
    descriptiveScore: string | null;
    isAbsent: boolean;
  };
}

export interface NotificationUpdatedEvent {
  type: "notification:updated";
  schoolId: string;
  payload: {
    action: "DRAFT_CREATED" | "DISCARDED" | "SENT" | "BULK_SENT";
    count?: number;
  };
}

export type SamikEvent =
  | AttendanceSubmittedEvent
  | AttendanceExcusedEvent
  | BehavioralPointCreatedEvent
  | GradeSavedEvent
  | NotificationSentEvent
  | NotificationUpdatedEvent;

const _g = globalThis as unknown as { __samikEventBus?: EventEmitter };
if (!_g.__samikEventBus) {
  _g.__samikEventBus = new EventEmitter();
  // Raise the listener cap — we may have many concurrent SSE connections
  // in dev (one per open tab across all panels).
  _g.__samikEventBus.setMaxListeners(200);
}
export const eventBus: EventEmitter = _g.__samikEventBus!;

/**
 * Emit an attendance-submitted event. Called by POST /api/v1/attendance/sessions
 * after a successful commit.
 */
export function emitAttendanceSubmitted(data: AttendanceSubmittedEvent["payload"] & { schoolId: string }) {
  const { schoolId, ...payload } = data;
  const event: AttendanceSubmittedEvent = {
    type: "attendance:submitted",
    schoolId,
    payload,
  };
  eventBus.emit(`event:${schoolId}`, event);
}

/**
 * Emit an attendance-excused event. Called by POST /api/v1/deputy/attendance/excuse.
 */
export function emitAttendanceExcused(data: AttendanceExcusedEvent["payload"] & { schoolId: string }) {
  const { schoolId, ...payload } = data;
  const event: AttendanceExcusedEvent = {
    type: "attendance:excused",
    schoolId,
    payload,
  };
  eventBus.emit(`event:${schoolId}`, event);
}

/**
 * Emit a behavioral-point-created event. Called by POST /api/v1/behavioral-points.
 */
export function emitBehavioralPointCreated(data: BehavioralPointCreatedEvent["payload"] & { schoolId: string }) {
  const { schoolId, ...payload } = data;
  const event: BehavioralPointCreatedEvent = {
    type: "behavioral-point:created",
    schoolId,
    payload,
  };
  eventBus.emit(`event:${schoolId}`, event);
}

/**
 * Emit a grade-saved event. Called by POST /api/v1/grades.
 */
export function emitGradeSaved(data: GradeSavedEvent["payload"] & { schoolId: string }) {
  const { schoolId, ...payload } = data;
  const event: GradeSavedEvent = {
    type: "grade:saved",
    schoolId,
    payload,
  };
  eventBus.emit(`event:${schoolId}`, event);
}

/**
 * Emit a notification-updated event. Called on SMS draft/send actions.
 */
export function emitNotificationUpdated(data: NotificationUpdatedEvent["payload"] & { schoolId: string }) {
  const { schoolId, ...payload } = data;
  const event: NotificationUpdatedEvent = {
    type: "notification:updated",
    schoolId,
    payload,
  };
  eventBus.emit(`event:${schoolId}`, event);
}

/**
 * Subscribe to all events for a given school. Returns an unsubscribe function.
 *
 * Used by the SSE endpoint to filter events by the user's active school.
 */
export function subscribeToSchool(
  schoolId: string,
  listener: (event: SamikEvent) => void
): () => void {
  const channel = `event:${schoolId}`;
  const wrapped = (event: SamikEvent) => listener(event);

  eventBus.on(channel, wrapped);

  return () => {
    eventBus.off(channel, wrapped);
  };
}
