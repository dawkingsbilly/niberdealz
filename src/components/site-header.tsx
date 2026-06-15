import { Link, useRouter } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { LogOut, LayoutDashboard, ShieldCheck, Store, UserCog, Crown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SITE_NAME } from "@/lib/constants";
import logoAsset from "@/assets/niber-logo.ico.asset.json";

export function SiteHeader() {
  const { user, roles, isLoading } = useAuth();
  const router = useRouter();
  const isAdmin = roles.includes("admin");
  const [menuOpen, setMenuOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  };

  const startLongPress = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    longPressed.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressed.current = true;
      setMenuOpen(false);
      router.navigate({ to: "/auth", search: { mode: "login" } });
    }, 650);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const onLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    setMenuOpen((v) => !v);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Open Niber-Dealz menu (hold for CEO sign-in)"
                onClick={onLogoClick}
                onPointerDown={startLongPress}
                onPointerUp={cancelLongPress}
                onPointerLeave={cancelLongPress}
                onPointerCancel={cancelLongPress}
                onContextMenu={(e) => e.preventDefault()}
                className="group flex items-center gap-2 rounded-xl p-1 -m-1 transition-transform active:scale-95 select-none"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--deal)] shadow-[var(--shadow-deal)] overflow-hidden ring-1 ring-black/5">
                  <img src={logoAsset.url} alt={`${SITE_NAME} logo`} className="h-9 w-9 object-contain" draggable={false} />
                </div>
                <div className="leading-none text-left">
                  <span className="block font-display text-lg font-bold text-foreground">{SITE_NAME}</span>
                  <span className="block text-[10px] font-medium tracking-widest text-muted-foreground uppercase">Shop SA Direct</span>
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-2">
              <div className="px-2 py-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Join Niber-Dealz</p>
              </div>
              <Link
                to="/auth"
                search={{ mode: "register" }}
                onClick={() => setMenuOpen(false)}
                className="flex items-start gap-3 rounded-md px-2 py-2.5 hover:bg-accent transition"
              >
                <Store className="h-5 w-5 mt-0.5 text-[var(--deal)]" />
                <div>
                  <div className="text-sm font-medium">Register as Vendor</div>
                  <div className="text-xs text-muted-foreground">Open your shop & sell products</div>
                </div>
              </Link>
              <Link
                to="/auth"
                search={{ mode: "register" }}
                onClick={() => setMenuOpen(false)}
                className="flex items-start gap-3 rounded-md px-2 py-2.5 hover:bg-accent transition"
              >
                <UserCog className="h-5 w-5 mt-0.5 text-foreground" />
                <div>
                  <div className="text-sm font-medium">Sign up as Admin</div>
                  <div className="text-xs text-muted-foreground">Admins are approved by the CEO</div>
                </div>
              </Link>
              <div className="my-1 border-t" />
              <Link
                to="/auth"
                search={{ mode: "login" }}
                onClick={() => setMenuOpen(false)}
                className="flex items-start gap-3 rounded-md px-2 py-2.5 hover:bg-accent transition"
              >
                <Crown className="h-5 w-5 mt-0.5 text-amber-500" />
                <div>
                  <div className="text-sm font-medium">CEO / Existing user sign in</div>
                  <div className="text-xs text-muted-foreground">Tip: press & hold the logo</div>
                </div>
              </Link>
            </PopoverContent>
          </Popover>
        </div>

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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--deal)] overflow-hidden">
              <img src={logoAsset.url} alt={`${SITE_NAME} logo`} className="h-7 w-7 object-contain" />
            </div>
            <span className="font-display font-bold">{SITE_NAME}</span>
          </div>
          <p className="text-muted-foreground">The South African marketplace where vendors sell direct to buyers via WhatsApp. No middleman, no buyer accounts needed.</p>
          <div className="mt-3 text-xs text-muted-foreground space-y-1">
            <div>📞 068 751 0600</div>
            <div>✉️ niberdealz@gmail.com</div>
          </div>
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
