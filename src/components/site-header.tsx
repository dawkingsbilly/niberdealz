import { Link, useRouter } from "@tanstack/react-router";
import { LogOut, LayoutDashboard, ShieldCheck, Crown, ShieldAlert, Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SITE_NAME, CONTACT_PHONE, CONTACT_EMAIL } from "@/lib/constants";
import logoAsset from "@/assets/niber-logo.ico.asset.json";

export function SiteHeader() {
  const { user, roles, isLoading } = useAuth();
  const router = useRouter();
  const canModerate = roles.includes("admin") || roles.includes("owner");

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between gap-2 px-4">
        <Link to="/" className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-foreground overflow-hidden ring-1 ring-border shrink-0">
            <img src={logoAsset.url} alt={`${SITE_NAME} logo`} className="h-8 w-8 object-contain" draggable={false} />
          </div>
          <div className="leading-none text-left min-w-0">
            <span className="block font-display text-lg font-bold text-foreground truncate">{SITE_NAME}</span>
            <span className="hidden sm:block text-[10px] font-medium tracking-widest text-muted-foreground uppercase">Student Marketplace</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link to="/" className="text-foreground/70 hover:text-foreground transition" activeProps={{ className: "text-foreground" }} activeOptions={{ exact: true }}>Browse</Link>
          <Link to="/safety" className="text-foreground/70 hover:text-foreground transition">Safety</Link>
          <Link to="/contact" className="text-foreground/70 hover:text-foreground transition">Contact</Link>
        </nav>

        <div className="flex items-center gap-2">
          {!isLoading && user ? (
            <>
              {canModerate && (
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link to="/admin">{roles.includes("owner") ? <Crown className="h-4 w-4 mr-1.5" /> : <ShieldCheck className="h-4 w-4 mr-1.5" />} {roles.includes("owner") ? "CEO" : "Admin"}</Link>
                </Button>
              )}
              <Button asChild variant="outline" size="sm">
                <Link to="/dashboard"><LayoutDashboard className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">Dashboard</span></Link>
              </Button>
              <Button onClick={handleSignOut} variant="ghost" size="icon" aria-label="Sign out"><LogOut className="h-4 w-4" /></Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/auth" search={{ mode: "login" }}>Sign in</Link>
              </Button>
              <Button asChild size="sm" className="bg-foreground text-background hover:bg-foreground/90">
                <Link to="/auth" search={{ mode: "register" }}>Open a store</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary/40 mt-16">
      <div className="container mx-auto px-4 py-10 grid gap-8 md:grid-cols-4 text-sm">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-foreground overflow-hidden">
              <img src={logoAsset.url} alt={`${SITE_NAME} logo`} className="h-7 w-7 object-contain" />
            </div>
            <span className="font-display font-bold">{SITE_NAME}</span>
          </div>
          <p className="text-muted-foreground">Free student marketplace. Buyers and sellers connect on WhatsApp.</p>
          <div className="mt-3 text-xs text-muted-foreground space-y-1">
            <div>📞 {CONTACT_PHONE}</div>
            <div>✉️ {CONTACT_EMAIL}</div>
          </div>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Marketplace</h4>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground">Browse listings</Link></li>
            <li><Link to="/auth" search={{ mode: "register" }} className="hover:text-foreground">Open a free store</Link></li>
            <li><Link to="/auth" search={{ mode: "login" }} className="hover:text-foreground">Vendor sign in</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Help</h4>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/safety" className="hover:text-foreground"><span className="inline-flex items-center gap-1"><ShieldAlert className="h-3.5 w-3.5" />Safety guidelines</span></Link></li>
            <li><Link to="/contact" className="hover:text-foreground">Contact us</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Legal</h4>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-foreground">Terms of Service</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-center gap-3">
        <span>© {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</span>
        <Link to="/auth" search={{ mode: "login", role: "ceo" }} className="inline-flex items-center gap-1 text-muted-foreground/60 hover:text-foreground transition">
          <Lock className="h-3 w-3" /> Staff / CEO sign in
        </Link>
      </div>
    </footer>
  );
}
