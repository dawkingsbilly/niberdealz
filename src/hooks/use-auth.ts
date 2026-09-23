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

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ ...signedOutState, isLoading: true });
  const requestId = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async (session: Session | null) => {
      const currentRequest = ++requestId.current;
      if (!session?.user) {
        if (!cancelled) setState(signedOutState);
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
