import { Link, useRouter } from "@tanstack/react-router";
import { ShoppingBag, LogOut, LayoutDashboard, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SITE_NAME } from "@/lib/constants";

export function SiteHeader() {
  const { user, roles, isLoading } = useAuth();
  const router = useRouter();
  const isAdmin = roles.includes("admin");

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--deal)] text-[color:var(--deal-foreground)] shadow-[var(--shadow-deal)] transition-transform group-hover:scale-105">
            <ShoppingBag className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div className="leading-none">
            <span className="block font-display text-lg font-bold text-foreground">{SITE_NAME}</span>
            <span className="block text-[10px] font-medium tracking-widest text-muted-foreground uppercase">Shop SA Direct</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link to="/" className="text-foreground/80 hover:text-foreground transition" activeProps={{ className: "text-foreground" }} activeOptions={{ exact: true }}>Browse</Link>
          <Link to="/pricing" className="text-foreground/80 hover:text-foreground transition">Sell with us</Link>
        </nav>

        <div className="flex items-center gap-2">
          {!isLoading && user ? (
            <>
              {isAdmin && (
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link to="/admin"><ShieldCheck className="h-4 w-4 mr-1.5" /> Admin</Link>
                </Button>
              )}
              <Button asChild variant="outline" size="sm">
                <Link to="/dashboard"><LayoutDashboard className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">Dashboard</span></Link>
              </Button>
              <Button onClick={handleSignOut} variant="ghost" size="icon" aria-label="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/auth" search={{ mode: "login" }}>Sign in</Link>
              </Button>
              <Button asChild size="sm" className="bg-[var(--deal)] text-[color:var(--deal-foreground)] hover:bg-[var(--deal)]/90 shadow-[var(--shadow-deal)]">
                <Link to="/auth" search={{ mode: "register" }}>Become a vendor</Link>
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
    <footer className="border-t border-border/60 bg-secondary/40 mt-16">
      <div className="container mx-auto px-4 py-10 grid gap-8 md:grid-cols-3 text-sm">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--deal)] text-[color:var(--deal-foreground)]">
              <ShoppingBag className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold">{SITE_NAME}</span>
          </div>
          <p className="text-muted-foreground">The South African marketplace where vendors sell direct to buyers via WhatsApp. No middleman, no buyer accounts needed.</p>
        </div>
        <div>
          <h4 className="font-semibold mb-3">For buyers</h4>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground">Browse all products</Link></li>
            <li>Contact vendors on WhatsApp</li>
            <li>No account required</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">For vendors</h4>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/auth" search={{ mode: "register" }} className="hover:text-foreground">Register your shop</Link></li>
            <li><Link to="/pricing" className="hover:text-foreground">Plans & pricing</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
      </div>
    </footer>
  );
}
