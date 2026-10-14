import { EventEmitter } from "node:events";

export const eventBus = new EventEmitter();
eventBus.setMaxListeners(50); // Increase if many concurrent SSE connections

export interface AttendanceSubmittedEvent {
  type: "attendance:submitted";
  schoolId: string;
  payload: {
    classSessionId: string;
    timetableSlotId: string;
    /** "YYYY-MM-DD" school-local date the session belongs to. */
    date: string;
    classroomName: string;
    subjectTitle: string;
    teacherName: string;
    submittedAt: string;
    absentees: Array<{
      studentId: string;
      studentName: string;
      guardianPhone?: string;
      status: "ABSENT";
    }>;
  };
}

export interface BehavioralPointCreatedEvent {
  type: "behavioral-point:created";
  schoolId: string;
  payload: {
    studentId: string;
    pointType: "POSITIVE" | "NEGATIVE";
    categoryTitle: string;
    points: number;
    description: string;
    recordedAt: string;
    studentName: string;
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
    outboxId: string;
    status: "DRAFT" | "SENT" | "FAILED";
  };
}

export type SamikEvent =
  | AttendanceSubmittedEvent
  | BehavioralPointCreatedEvent
  | GradeSavedEvent
  | NotificationUpdatedEvent;

/**
 * Emit an attendance-submitted event. Called by POST /api/v1/attendance/sessions
 * to push the result to the deputy live dashboard and to refresh the teacher
 * dashboard's active-session card.
 */
export function emitAttendanceSubmitted(
  data: AttendanceSubmittedEvent["payload"] & { schoolId: string }
) {
  const { schoolId, ...payload } = data;
  const event: AttendanceSubmittedEvent = {
    type: "attendance:submitted",
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
