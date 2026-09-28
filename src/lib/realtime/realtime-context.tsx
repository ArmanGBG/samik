"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useAuth } from "@/stores/auth-store";

export interface RealtimeEvent<T = any> {
  type: string;
  schoolId?: string;
  payload: T;
  timestamp?: number;
}

type EventCallback = (event: RealtimeEvent) => void;

interface RealtimeContextValue {
  isConnected: boolean;
  subscribe: (types: string[] | "*", callback: EventCallback) => () => void;
  lastEvent: RealtimeEvent | null;
}

const RealtimeContext = createContext<RealtimeContextValue>({
  isConnected: false,
  subscribe: () => () => {},
  lastEvent: null,
});

/**
 * Global Realtime Provider for all Samik Dashboards.
 * Connects to /api/v1/sse once per session and routes events to subscribers.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);

  const listenersRef = useRef<Map<string, Set<EventCallback>>>(new Map());
  const wildcardListenersRef = useRef<Set<EventCallback>>(new Set());
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const subscribe = useCallback(
    (types: string[] | "*", callback: EventCallback): (() => void) => {
      if (types === "*") {
        wildcardListenersRef.current.add(callback);
        return () => {
          wildcardListenersRef.current.delete(callback);
        };
      }

      for (const t of types) {
        let set = listenersRef.current.get(t);
        if (!set) {
          set = new Set();
          listenersRef.current.set(t, set);
        }
        set.add(callback);
      }

      return () => {
        for (const t of types) {
          const set = listenersRef.current.get(t);
          if (set) {
            set.delete(callback);
            if (set.size === 0) listenersRef.current.delete(t);
          }
        }
      };
    },
    []
  );

  const dispatchEvent = useCallback((event: RealtimeEvent) => {
    setLastEvent(event);

    // Call specific listeners
    const set = listenersRef.current.get(event.type);
    if (set) {
      set.forEach((cb) => {
        try {
          cb(event);
        } catch (err) {
          console.error(`[REALTIME_CALLBACK_ERROR] type: ${event.type}`, err);
        }
      });
    }

    // Call wildcard listeners
    wildcardListenersRef.current.forEach((cb) => {
      try {
        cb(event);
      } catch (err) {
        console.error(`[REALTIME_WILDCARD_ERROR] type: ${event.type}`, err);
      }
    });
  }, []);

  const connect = useCallback(() => {
    // Only connect if user is authenticated with a contextual token
    if (auth.state.status !== "contextual") {
      return;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const es = new EventSource("/api/v1/sse");
      eventSourceRef.current = es;

      es.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      es.onmessage = (messageEvent) => {
        try {
          if (!messageEvent.data || messageEvent.data.startsWith(":")) {
            return; // ignore heartbeats
          }
          const data = JSON.parse(messageEvent.data);
          if (data.type === "connected") {
            setIsConnected(true);
            return;
          }
          dispatchEvent({
            type: data.type,
            schoolId: data.schoolId,
            payload: data.payload,
            timestamp: Date.now(),
          });
        } catch {
          // ignore malformed lines
        }
      };

      es.onerror = () => {
        setIsConnected(false);
        es.close();

        // Exponential backoff reconnect: 2s, 4s, 8s, up to 15s max
        const delay = Math.min(15_000, 2_000 * Math.pow(1.5, reconnectAttemptsRef.current));
        reconnectAttemptsRef.current += 1;

        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, delay);
      };
    } catch (err) {
      console.error("[REALTIME_CONNECT_ERROR]", err);
    }
  }, [auth.state.status, dispatchEvent]);

  useEffect(() => {
    if (auth.state.status === "contextual") {
      connect();
    } else {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
    }

    // Handle online/offline browser events
    const handleOnline = () => {
      if (auth.state.status === "contextual") {
        connect();
      }
    };

    const handleOffline = () => {
      setIsConnected(false);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [auth.state.status, connect]);

  return (
    <RealtimeContext.Provider value={{ isConnected, subscribe, lastEvent }}>
      {children}
    </RealtimeContext.Provider>
  );
}

/**
 * Custom React Hook to subscribe to real-time events in any component.
 * Automatically invalidates/triggers state updates and cleans up on unmount.
 *
 * Example:
 *   useRealtimeEvent(["attendance:submitted", "attendance:excused"], (event) => {
 *     loadData();
 *   });
 */
export function useRealtimeEvent(
  types: string[] | "*",
  callback: (event: RealtimeEvent) => void
) {
  const { subscribe } = useContext(RealtimeContext);
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    const unsub = subscribe(types, (e) => cbRef.current(e));
    return unsub;
  }, [subscribe, Array.isArray(types) ? types.join(",") : types]);
}

/**
 * Access the real-time connection status (connected, disconnected).
 */
export function useRealtimeStatus() {
  const { isConnected, lastEvent } = useContext(RealtimeContext);
  return { isConnected, lastEvent };
}
