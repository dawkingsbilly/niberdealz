import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "vendor";

export interface AuthState {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  isLoading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    roles: [],
    isLoading: true,
  });

  useEffect(() => {
    let cancelled = false;

    const loadRoles = async (userId: string): Promise<AppRole[]> => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      return (data ?? []).map((r) => r.role as AppRole);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (!session?.user) {
        setState({ user: null, session: null, roles: [], isLoading: false });
        return;
      }
      setState((s) => ({ ...s, user: session.user, session, isLoading: true }));
      setTimeout(async () => {
        const roles = await loadRoles(session.user.id);
        if (!cancelled) setState({ user: session.user, session, roles, isLoading: false });
      }, 0);
    });

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session?.user) {
        setState({ user: null, session: null, roles: [], isLoading: false });
        return;
      }
      const roles = await loadRoles(session.user.id);
      if (!cancelled) setState({ user: session.user, session, roles, isLoading: false });
    })();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
