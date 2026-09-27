"use client";

import { create } from "zustand";

/**
 * Client-side auth store — mirrors the JWT payload of the active session.
 * Hydrated by `GET /api/v1/me` on app mount.
 */

export type ProfileEntry = {
  schoolId: string;
  schoolName: string;
  schoolSubdomain: string;
  role: string;
  studentEnrollmentId?: string;
  label: string;
};

type SessionState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | {
      status: "root";
      userId: string;
      firstName: string;
      lastName: string;
      phone: string;
      profiles: ProfileEntry[];
    }
  | {
      status: "contextual";
      userId: string;
      firstName: string;
      lastName: string;
      schoolId: string;
      schoolName: string;
      role: string;
    };

interface AuthStore {
  state: SessionState;
  fetch: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthStore>((set) => ({
  state: { status: "loading" },

  fetch: async () => {
    try {
      const r = await fetch("/api/v1/me", { credentials: "include" });
      if (!r.ok) {
        set({ state: { status: "unauthenticated" } });
        return;
      }
      const data = await r.json();
      if (!data.ok) {
        set({ state: { status: "unauthenticated" } });
        return;
      }
      if (data.kind === "root") {
        set({
          state: {
            status: "root",
            userId: data.user.id,
            firstName: data.user.firstName,
            lastName: data.user.lastName,
            phone: data.user.phoneNumber,
            profiles: data.profiles ?? [],
          },
        });
      } else {
        set({
          state: {
            status: "contextual",
            userId: data.user.id,
            firstName: data.user.firstName,
            lastName: data.user.lastName,
            schoolId: data.school.id,
            schoolName: data.school.name,
            role: data.role,
          },
        });
      }
    } catch {
      set({ state: { status: "unauthenticated" } });
    }
  },

  logout: async () => {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    set({ state: { status: "unauthenticated" } });
    window.location.href = "/login";
  },
}));
