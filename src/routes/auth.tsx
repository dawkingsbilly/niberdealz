import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SITE_NAME } from "@/lib/constants";

const searchSchema = z.object({ mode: z.enum(["login", "register", "forgot"]).default("login").catch("login"), next: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [
    { title: `Sign in | ${SITE_NAME}` },
    { name: "description", content: "Sign in to NiberDealz, create an account or reset your password." },
    { property: "og:title", content: `Sign in | ${SITE_NAME}` },
    { property: "og:description", content: "Sign in to NiberDealz or create an account to shop." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: AuthPage,
});

function AuthPage() {
  const { mode, next } = Route.useSearch();
  const isRegister = mode === "register";
  const isForgot = mode === "forgot";
  const navigate = useNavigate();
  const { user, roles, isLoading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [sentReset, setSentReset] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    if (roles.includes("owner") || roles.includes("admin")) { navigate({ to: "/admin", replace: true }); return; }
    navigate({ to: next || "/", replace: true } as any);
  }, [authLoading, user, roles, navigate, next]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true);
    try {
      if (isForgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error; setSentReset(true); toast.success("Check your email for the reset link."); return;
      }
      if (isRegister) {
        if (!privacyAccepted) throw new Error("Please accept the Terms and Privacy Policy to create an account.");
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/`, data: { full_name: fullName.trim(), city: city.trim(), privacy_consent: true, privacy_version: "2026-09", terms_version: "2026-09" } } });
        if (error) throw error; toast.success("Account created. Please check your email to confirm it."); return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error; toast.success("Welcome back.");
    } catch (error: any) { toast.error(error.message ?? "Something went wrong."); }
    finally { setLoading(false); }
  };

  return <div className="min-h-screen flex items-center justify-center bg-secondary px-4 py-10"><div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
    <Link to="/" className="mb-6 flex items-center justify-center gap-2"><div className="flex h-10 w-10 items-center justify-center rounded-md bg-foreground text-background"><ShoppingBag className="h-5 w-5" strokeWidth={2.5} /></div><span className="font-display text-xl font-bold">{SITE_NAME}</span></Link>
    <h1 className="text-center font-display text-2xl font-bold">{isForgot ? "Reset your password" : isRegister ? "Create your account" : "Sign in"}</h1>
    <p className="mt-1 text-center text-sm text-muted-foreground">{isForgot ? "Enter your email and we will send a reset link." : isRegister ? "Create an account to shop and manage your orders." : "Welcome back."}</p>
    {isForgot && sentReset ? <div className="mt-6 rounded-xl border border-border bg-secondary/60 p-4 text-sm"><p className="font-medium">Email sent</p><p className="mt-1 text-muted-foreground">Open the reset link in your email. It may take a minute to arrive.</p><Button asChild variant="outline" size="sm" className="mt-3"><Link to="/auth" search={{ mode: "login" }}>Back to sign in</Link></Button></div> :
      <form onSubmit={onSubmit} className="mt-6 space-y-4">{isRegister && <><div className="space-y-1.5"><Label htmlFor="fullName">Full name</Label><Input id="fullName" required minLength={2} maxLength={80} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Thabo Sibanda" /></div><div className="space-y-1.5"><Label htmlFor="city">City / area</Label><Input id="city" required minLength={2} maxLength={80} value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Mthatha" /></div></>}
        <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        {!isForgot && <div className="space-y-1.5"><Label htmlFor="password">Password</Label><Input id="password" type="password" required minLength={8} autoComplete={isRegister ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} />{isRegister && <p className="text-xs text-muted-foreground">At least 8 characters.</p>}</div>}
        {isRegister && <label className="flex cursor-pointer gap-2 text-xs leading-relaxed text-muted-foreground"><input type="checkbox" required checked={privacyAccepted} onChange={(e) => setPrivacyAccepted(e.target.checked)} className="mt-0.5 h-4 w-4" /><span>I accept the <Link to="/terms" className="font-medium text-foreground underline">Terms</Link> and <Link to="/privacy" className="font-medium text-foreground underline">Privacy Policy</Link>, and understand that NiberDealz records my privacy consent.</span></label>}
        <Button type="submit" disabled={loading} className="h-11 w-full bg-[var(--deal)] text-[color:var(--deal-foreground)] hover:bg-[var(--deal)]/90">{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{isForgot ? "Send reset link" : isRegister ? "Create account" : "Sign in"}</Button>
      </form>}
    {!isForgot && !isRegister && <p className="mt-4 text-center text-sm text-muted-foreground"><Link to="/auth" search={{ mode: "forgot" }} className="font-medium text-foreground hover:underline">Forgot your password?</Link></p>}
    <p className="mt-4 text-center text-sm text-muted-foreground">{isRegister || isForgot ? <>Already have an account? <Link to="/auth" search={{ mode: "login" }} className="font-semibold text-foreground hover:underline">Sign in</Link></> : <>New here? <Link to="/auth" search={{ mode: "register" }} className="font-semibold text-foreground hover:underline">Create an account</Link></>}</p>
  </div></div>;
}
