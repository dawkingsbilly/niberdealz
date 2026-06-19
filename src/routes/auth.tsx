import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Crown, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SITE_NAME } from "@/lib/constants";

const searchSchema = z.object({
  mode: z.enum(["login", "register"]).catch("login"),
  role: z.enum(["vendor", "ceo"]).catch("vendor"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Sign in — Niberdealz" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { mode, role } = Route.useSearch();
  const isRegister = mode === "register" && role !== "ceo"; // CEO never registers here
  const isCeo = role === "ceo";
  const navigate = useNavigate();
  const { user, roles, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Smart redirect after sign in:
  // - owner/admin → /admin
  // - vendor with profile → /dashboard
  // - new user → /register-shop
  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      if (roles.includes("owner") || roles.includes("admin")) {
        navigate({ to: "/admin", replace: true });
        return;
      }
      // CEO sign-in flow never falls back to vendor registration.
      if (isCeo) {
        navigate({ to: "/admin", replace: true });
        return;
      }
      const { data } = await supabase.from("vendors").select("id").eq("id", user.id).maybeSingle();
      navigate({ to: data ? "/dashboard" : "/register-shop", replace: true });
    })();
  }, [user, roles, authLoading, navigate, isCeo]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast.success("Account created! Let's set up your shop.");
        navigate({ to: "/register-shop" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const accent = isCeo ? "bg-foreground text-background hover:bg-foreground/90" : "bg-[var(--deal)] hover:bg-[var(--deal)]/90 text-[color:var(--deal-foreground)]";

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary px-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border p-8 shadow-[var(--shadow-card)]">
        <Link to="/" className="flex items-center gap-2 justify-center mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-foreground text-background">
            {isCeo ? <Crown className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" strokeWidth={2.5} />}
          </div>
          <span className="font-display text-xl font-bold">{SITE_NAME}</span>
        </Link>
        <h1 className="font-display text-2xl font-bold text-center">
          {isCeo ? "CEO / Owner sign in" : isRegister ? "Open your shop" : "Vendor sign in"}
        </h1>
        <p className="text-center text-muted-foreground text-sm mt-1">
          {isCeo
            ? "Restricted area. Authorized staff only."
            : isRegister
              ? "Buyers don't need accounts — only vendors."
              : "Welcome back to your shop."}
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required minLength={8} autoComplete={isRegister ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
            {isRegister && <p className="text-xs text-muted-foreground">At least 8 characters.</p>}
          </div>
          <Button type="submit" disabled={loading} className={`w-full h-11 ${accent}`}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{isCeo ? "Sign in to control room" : isRegister ? "Create vendor account" : "Sign in"}
          </Button>
        </form>

        {!isCeo && (
          <p className="text-center text-sm text-muted-foreground mt-6">
            {isRegister
              ? (<>Already have a shop? <Link to="/auth" search={{ mode: "login" }} className="font-semibold text-foreground hover:underline">Sign in</Link></>)
              : (<>New here? <Link to="/auth" search={{ mode: "register" }} className="font-semibold text-foreground hover:underline">Become a vendor</Link></>)}
          </p>
        )}
        {isCeo && (
          <p className="text-center text-xs text-muted-foreground mt-6">
            Not staff? <Link to="/" className="hover:underline">Back to marketplace</Link>
          </p>
        )}
      </div>
    </div>
  );
}
