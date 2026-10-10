import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type AuthValue = {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  sendCode: (email: string) => Promise<string | null>;
  verifyCode: (email: string, code: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [adminState, setAdminState] = useState<{
    userId: string;
    isAdmin: boolean;
  } | null>(null);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setInitializing(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // ask the database whether this user is in admin_users
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase.rpc("is_admin").then(({ data }) => {
      if (!cancelled) setAdminState({ userId, isAdmin: data === true });
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const value = useMemo<AuthValue>(
    () => ({
      user: session?.user ?? null,
      isAdmin: !!userId && adminState?.userId === userId && adminState.isAdmin,
      loading: initializing || (!!userId && adminState?.userId !== userId),
      sendCode: async (email) => {
        // admins must already have an account, so never create one from here
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false },
        });
        return error?.message ?? null;
      },
      verifyCode: async (email, code) => {
        const { error } = await supabase.auth.verifyOtp({
          email,
          token: code,
          type: "email",
        });
        return error?.message ?? null;
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, userId, adminState, initializing],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}