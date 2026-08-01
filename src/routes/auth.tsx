import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Crown, ShoppingBag, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SITE_NAME, WHATSAPP_CHANNEL_URL } from "@/lib/constants";

const searchSchema = z.object({
  mode: z.enum(["login", "register"]).default("login").catch("login"),
  role: z.enum(["vendor", "ceo"]).default("vendor").catch("vendor"),
  next: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Sign in — Niberdealz" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { mode, role, next } = Route.useSearch();
  const isRegister = mode === "register" && role !== "ceo";
  const isCeo = role === "ceo";
  const navigate = useNavigate();
  const { user, roles, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      if (roles.includes("owner") || roles.includes("admin")) {
        navigate({ to: "/admin", replace: true });
        return;
      }
      if (isCeo) {
        navigate({ to: "/admin", replace: true });
        return;
      }
      if (next) {
        navigate({ to: next as any, replace: true });
        return;
      }
      // Signed in: land on browse. Users can choose "Open a store" from header.
      navigate({ to: "/", replace: true });
    })();
  }, [user, roles, authLoading, navigate, isCeo, next]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName, city },
          },
        });
        if (error) throw error;
        toast.success("Welcome to Niberdealz!");
        // Nudge them to follow the WhatsApp channel
        try { window.open(WHATSAPP_CHANNEL_URL, "_blank", "noopener"); } catch {}
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

  const accent = isCeo
    ? "bg-foreground text-background hover:bg-foreground/90"
    : "bg-[var(--deal)] hover:bg-[var(--deal)]/90 text-[color:var(--deal-foreground)]";

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border p-8 shadow-[var(--shadow-card)]">
        <Link to="/" className="flex items-center gap-2 justify-center mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-foreground text-background">
            {isCeo ? <Crown className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" strokeWidth={2.5} />}
          </div>
          <span className="font-display text-xl font-bold">{SITE_NAME}</span>
        </Link>
        <h1 className="font-display text-2xl font-bold text-center">
          {isCeo ? "CEO / Owner sign in" : isRegister ? "Create your account" : "Sign in"}
        </h1>
        <p className="text-center text-muted-foreground text-sm mt-1">
          {isCeo
            ? "Restricted area. Authorized staff only."
            : isRegister
              ? "Free account. Browse anywhere, chat on WhatsApp, and open a store later if you want to sell."
              : "Welcome back."}
        </p>

        {isRegister && (
          <div className="mt-4 rounded-lg border border-success/30 bg-success/5 p-3 flex items-start gap-2 text-xs">
            <MessageCircle className="h-4 w-4 text-success mt-0.5 shrink-0" />
            <div>After sign-up we'll open our WhatsApp channel so you get updates & new deals. Just tap <strong>Follow</strong>.</div>
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {isRegister && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" required minLength={2} maxLength={80} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Thabo Sibanda" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="city">City / area</Label>
                <Input id="city" required minLength={2} maxLength={80} value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Johannesburg — UJ Kingsway" />
                <p className="text-xs text-muted-foreground">We'll show you listings near you first.</p>
              </div>
            </>
          )}
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
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isCeo ? "Sign in to control room" : isRegister ? "Create free account" : "Sign in"}
          </Button>
        </form>

        {!isCeo && (
          <p className="text-center text-sm text-muted-foreground mt-6">
            {isRegister
              ? (<>Already have an account? <Link to="/auth" search={{ mode: "login" }} className="font-semibold text-foreground hover:underline">Sign in</Link></>)
              : (<>New here? <Link to="/auth" search={{ mode: "register" }} className="font-semibold text-foreground hover:underline">Create free account</Link></>)}
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
