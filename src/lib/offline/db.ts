import Dexie, { type Table } from "dexie";

/**
 * Samik Offline Database (Section 10 of architecture doc).
 *
 * Per Section 10 — "دیتابیس محلی (Local State/Storage)":
 *   > "در زمان لاگین یا در اولین اتصال به اینترنت در طول روز، کلاینت
 *   >  لیستی از کلاس‌ها، دانش‌آموزان و برنامه هفتگیِ همان روز را از سرور
 *   >  دریافت کرده و در دیتابیس محلی (مثل Hive یا SQLite در موبایل، یا
 *   >  IndexedDB در مرورگر) کش (Hydrate) می‌کند."
 *
 * Schema:
 *   - `students`     — hydrated from GET /api/v1/teacher/students per classroom
 *   - `timetable`    — hydrated from GET /api/v1/deputy/timetable (teacher's slots)
 *   - `pendingMutations` — queue of operations to sync (attendance, grades, points)
 *
 * Each pending mutation carries:
 *   - `idempotencyKey` — UUID generated client-side (sent as X-Idempotency-Key)
 *   - `endpoint` + `method` + `body` — the HTTP request to replay
 *   - `status` — pending | syncing | synced | failed
 *   - `attempts` — retry counter (max 5)
 */

export type MutationStatus = "pending" | "syncing" | "synced" | "failed";

export interface CachedStudent {
  id: string; // studentUserId
  enrollmentId: string;
  classroomId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  guardianPhone1: string;
  guardianPhone2: string | null;
  cachedAt: number;
}

export interface CachedTimetableSlot {
  id: string; // slotId
  classroomId: string;
  classroomName: string;
  subjectId: string;
  subjectTitle: string;
  bellScheduleId: string;
  bellTitle: string;
  startTime: string;
  endTime: string;
  dayOfWeek: number;
  weekType: "ALL_WEEKS" | "ODD_WEEKS" | "EVEN_WEEKS";
  cachedAt: number;
}

export interface PendingMutation {
  id?: number; // auto-increment
  idempotencyKey: string;
  endpoint: string;
  method: "POST" | "PATCH" | "DELETE";
  body: string; // JSON.stringify
  status: MutationStatus;
  attempts: number;
  createdAt: number;
  lastAttemptAt?: number;
  errorMessage?: string;
}

export class SamikOfflineDB extends Dexie {
  students!: Table<CachedStudent, string>;
  timetable!: Table<CachedTimetableSlot, string>;
  pendingMutations!: Table<PendingMutation, number>;

  constructor() {
    super("samik-offline");
    this.version(1).stores({
      // Indexes: classroomId for filtering, id for primary key
      students: "id, classroomId",
      timetable: "id, classroomId, dayOfWeek",
      // Auto-increment id; status for filtering pending items
      pendingMutations: "++id, status, createdAt, idempotencyKey",
    });
  }
}

/**
 * Singleton Dexie instance. Pinned to window so we don't re-create it
 * across HMR reloads in dev.
 */
const _w = (typeof window !== "undefined" ? window : {}) as unknown as {
  __samikOfflineDB?: SamikOfflineDB;
};
if (typeof window !== "undefined" && !_w.__samikOfflineDB) {
  _w.__samikOfflineDB = new SamikOfflineDB();
}

export const offlineDB: SamikOfflineDB | null =
  typeof window !== "undefined" ? _w.__samikOfflineDB! : null;

/**
 * Hydrate the students cache for a given classroom.
 */
export async function cacheStudents(
  classroomId: string,
  students: Array<Omit<CachedStudent, "classroomId" | "cachedAt">>
) {
  if (!offlineDB) return;
  const now = Date.now();
  await offlineDB.students.bulkPut(
    students.map((s) => ({ ...s, classroomId, cachedAt: now }))
  );
}

/**
 * Hydrate the timetable cache from the teacher's perspective.
 */
export async function cacheTimetable(
  slots: Array<Omit<CachedTimetableSlot, "cachedAt">>
) {
  if (!offlineDB) return;
  const now = Date.now();
  await offlineDB.timetable.bulkPut(
    slots.map((s) => ({ ...s, cachedAt: now }))
  );
}

/**
 * Get cached students for a classroom. Returns null if cache miss
 * (caller should fetch from API and call cacheStudents).
 */
export async function getCachedStudents(
  classroomId: string
): Promise<CachedStudent[]> {
  if (!offlineDB) return [];
  return offlineDB.students.where("classroomId").equals(classroomId).toArray();
}
