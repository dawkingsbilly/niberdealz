import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Crown, ShoppingBag, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SITE_NAME } from "@/lib/constants";
import { storedRefCode, clearRefCode, captureRefFromUrl } from "@/lib/affiliate";
import { attachReferral } from "@/lib/affiliate.functions";

const searchSchema = z.object({
  mode: z.enum(["login", "register", "forgot"]).default("login").catch("login"),
  role: z.enum(["vendor", "ceo"]).default("vendor").catch("vendor"),
  next: z.string().optional(),
  ref: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in | Niberdealz" },
      { name: "description", content: "Sign in to Niberdealz, create a free account or reset your password to buy and sell safely." },
      { property: "og:title", content: "Sign in | Niberdealz" },
      { property: "og:description", content: "Sign in to Niberdealz or create a free account to buy and sell." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode, role, next, ref } = Route.useSearch();
  const isRegister = mode === "register" && role !== "ceo";
  const isForgot = mode === "forgot" && role !== "ceo";
  const isCeo = role === "ceo";
  const navigate = useNavigate();
  const { user, roles, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [refCode, setRefCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentReset, setSentReset] = useState(false);

  useEffect(() => {
    captureRefFromUrl();
    setRefCode((ref ?? storedRefCode() ?? "").toUpperCase());
  }, [ref]);

  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      const code = storedRefCode();
      if (code) {
        try {
          await attachReferral({ data: { code, source: "link" } });
        } catch { /* ignore */ }
        clearRefCode();
      }
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
      navigate({ to: "/", replace: true });
    })();
  }, [user, roles, authLoading, navigate, isCeo, next]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isForgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSentReset(true);
        toast.success("Check your email for the reset link.");
      } else if (isRegister) {
        if (refCode.trim()) {
          try { localStorage.setItem("nd_ref_code", refCode.trim().toUpperCase()); } catch { /* ignore */ }
        }
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
          {isCeo ? "CEO / Owner sign in" : isForgot ? "Reset your password" : isRegister ? "Create your account" : "Sign in"}
        </h1>
        <p className="text-center text-muted-foreground text-sm mt-1">
          {isCeo
            ? "Restricted area. Authorized staff only."
            : isForgot
              ? "Enter your email and we will send you a link to set a new password."
              : isRegister
                ? "Free account. Browse, buy on the website and open a store whenever you want to sell."
                : "Welcome back."}
        </p>

        {isRegister && refCode && (
          <div className="mt-4 rounded-lg border border-success/30 bg-success/5 p-3 flex items-start gap-2 text-xs">
            <Gift className="h-4 w-4 text-success mt-0.5 shrink-0" />
            <div>You are joining with code <strong>{refCode}</strong>. Your friend earns reward points when you join.</div>
          </div>
        )}

        {isForgot && sentReset ? (
          <div className="mt-6 rounded-xl border border-border bg-secondary/60 p-4 text-sm">
            <p className="font-medium">Email sent</p>
            <p className="text-muted-foreground mt-1">
              Open the link in that email to choose a new password. It can take a minute to arrive, and check your spam folder too.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link to="/auth" search={{ mode: "login" }}>Back to sign in</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {isRegister && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" required minLength={2} maxLength={80} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Thabo Sibanda" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city">City / area</Label>
                  <Input id="city" required minLength={2} maxLength={80} value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Johannesburg" />
                  <p className="text-xs text-muted-foreground">We show you listings near you first.</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="refCode">Affiliate or coupon code (optional)</Label>
                  <Input id="refCode" maxLength={16} value={refCode} onChange={(e) => setRefCode(e.target.value.toUpperCase())} placeholder="e.g. THABO4K2P" />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {!isForgot && (
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required minLength={8} autoComplete={isRegister ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} />
                {isRegister && <p className="text-xs text-muted-foreground">At least 8 characters.</p>}
              </div>
            )}
            <Button type="submit" disabled={loading} className={`w-full h-11 ${accent}`}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isCeo ? "Sign in to control room" : isForgot ? "Send reset link" : isRegister ? "Create free account" : "Sign in"}
            </Button>
          </form>
        )}

        {!isCeo && !isForgot && !isRegister && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            <Link to="/auth" search={{ mode: "forgot" }} className="font-medium text-foreground hover:underline">Forgot your password?</Link>
          </p>
        )}

        {!isCeo && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            {isRegister || isForgot
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
