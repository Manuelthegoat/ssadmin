import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { supabase } from "../lib/supabase";
import type { AdminEvent } from "../lib/types";

type Value = {
  events: AdminEvent[];
  event: AdminEvent | null;
  eventId: string | null;
  setEventId: (id: string) => void;
  reload: () => Promise<void>;
  loading: boolean;
};

const STORAGE_KEY = "ss-admin-event";
const Ctx = createContext<Value | null>(null);

export function EventScopeProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [selected, setSelected] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEY),
  );
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data } = await supabase
      .from("events")
      .select("*")
      .order("sort_order")
      .order("created_at");
    setEvents((data as AdminEvent[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const event = events.find((e) => e.id === selected) ?? events[0] ?? null;

  const value = useMemo<Value>(
    () => ({
      events,
      event,
      eventId: event?.id ?? null,
      loading,
      reload,
      setEventId: (id) => {
        localStorage.setItem(STORAGE_KEY, id);
        setSelected(id);
      },
    }),
    [events, event, loading, reload],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useEventScope() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useEventScope must be used inside EventScopeProvider");
  return ctx;
}