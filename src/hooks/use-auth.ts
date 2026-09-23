import { useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "vendor" | "owner";

export interface AuthState {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  isLoading: boolean;
  roleError: string | null;
}

const signedOutState: AuthState = {
  user: null,
  session: null,
  roles: [],
  isLoading: false,
  roleError: null,
};

// Keep the UI in step with the function middleware. Without this check, a session
// that has just expired can still render as signed in while server actions correctly
// reject its bearer token.
const REFRESH_WINDOW_SECONDS = 60;

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ ...signedOutState, isLoading: true });
  const requestId = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const getUsableSession = async (session: Session | null) => {
      if (!session) return null;
      const expiresSoon =
        !session.expires_at ||
        session.expires_at <= Math.floor(Date.now() / 1000) + REFRESH_WINDOW_SECONDS;
      if (!expiresSoon) return session;

      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data.session) return data.session;

      // Remove only this browser's unusable credentials. The account itself remains
      // intact and the customer can sign in again without seeing a misleading API error.
      await supabase.auth.signOut({ scope: "local" });
      return null;
    };

    const loadSession = async (candidate: Session | null) => {
      const currentRequest = ++requestId.current;
      let session: Session | null;
      try {
        session = await getUsableSession(candidate);
      } catch {
        await supabase.auth.signOut({ scope: "local" });
        session = null;
      }
      if (cancelled || currentRequest !== requestId.current) return;
      if (!session?.user) {
        setState(signedOutState);
        return;
      }

      setState({ user: session.user, session, roles: [], isLoading: true, roleError: null });
      // Auth events are raised while Supabase updates its internal state. Deferring the
      // query avoids racing that update, while the request id prevents stale results
      // from an earlier event overwriting a newer session.
      await new Promise((resolve) => setTimeout(resolve, 0));

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id);
        if (error) throw error;
        if (!cancelled && currentRequest === requestId.current) {
          setState({
            user: session.user,
            session,
            roles: (data ?? []).map((row) => row.role as AppRole),
            isLoading: false,
            roleError: null,
          });
        }
      } catch (error) {
        if (!cancelled && currentRequest === requestId.current) {
          setState({
            user: session.user,
            session,
            roles: [],
            isLoading: false,
            roleError:
              error instanceof Error
                ? error.message
                : "We could not confirm your staff access. Please try again.",
          });
        }
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadSession(session);
    });
    void supabase.auth.getSession().then(({ data: { session } }) => loadSession(session));

    return () => {
      cancelled = true;
      requestId.current += 1;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
