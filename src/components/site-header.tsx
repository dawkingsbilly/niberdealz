import { Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { LogOut, LayoutDashboard, ShieldCheck, Crown, ShieldAlert, Lock, Menu, MessageCircle, Mail, Home, LogIn, Store } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { SITE_NAME, CONTACT_EMAIL } from "@/lib/constants";
import logoAsset from "@/assets/niber-logo.ico.asset.json";

const WHATSAPP_CHANNEL = "https://wa.me/channel/0029VaOb9f1KbYMSEsUT6T46";
const BRAND = SITE_NAME.toUpperCase();

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-3 min-w-0">
      <img
        src={logoAsset.url}
        alt={`${BRAND} logo`}
        className="h-11 w-11 object-contain shrink-0"
        draggable={false}
      />
      <div className="leading-none text-left min-w-0">
        <span className="block font-display text-xl font-extrabold tracking-tight text-foreground truncate">{BRAND}</span>
        <span className="hidden sm:block text-[10px] font-medium tracking-[0.18em] text-muted-foreground uppercase">Student Marketplace</span>
      </div>
    </Link>
  );
}

export function SiteHeader() {
  const { user, roles, isLoading } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const canModerate = roles.includes("admin") || roles.includes("owner");
  const isCeo = roles.includes("owner");

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setOpen(false);
    router.navigate({ to: "/" });
  };

  const MenuLink = ({ to, icon: Icon, label, onClick }: { to?: string; icon: any; label: string; onClick?: () => void }) => {
    const className = "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground transition";
    if (to) {
      return (
        <SheetClose asChild>
          <Link to={to} className={className}><Icon className="h-4 w-4" />{label}</Link>
        </SheetClose>
      );
    }
    return (
      <button onClick={onClick} className={className + " w-full text-left"}>
        <Icon className="h-4 w-4" />{label}
      </button>
    );
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between gap-2 px-4">
        <Brand />

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link to="/" className="text-foreground/70 hover:text-foreground transition" activeProps={{ className: "text-foreground" }} activeOptions={{ exact: true }}>Browse</Link>
          <Link to="/safety" className="text-foreground/70 hover:text-foreground transition">Safety</Link>
          <Link to="/contact" className="text-foreground/70 hover:text-foreground transition">Contact</Link>
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle className="hidden sm:inline-flex" />

          {!isLoading && user ? (
            <>
              {canModerate && (
                <Button asChild variant="ghost" size="sm" className="hidden lg:inline-flex">
                  <Link to="/admin">{isCeo ? <Crown className="h-4 w-4 mr-1.5" /> : <ShieldCheck className="h-4 w-4 mr-1.5" />}{isCeo ? "CEO" : "Admin"}</Link>
                </Button>
              )}
              <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                <Link to="/dashboard"><LayoutDashboard className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">Dashboard</span></Link>
              </Button>
            </>
          ) : (
            <Button asChild size="sm" className="hidden sm:inline-flex bg-foreground text-background hover:bg-foreground/90">
              <Link to="/auth" search={{ mode: "register" }}>Open a store</Link>
            </Button>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[340px] flex flex-col">
              <SheetHeader>
                <SheetTitle className="font-display tracking-tight">{BRAND}</SheetTitle>
              </SheetHeader>

              <nav className="mt-4 flex flex-col gap-1">
                <MenuLink to="/" icon={Home} label="Browse listings" />
                <MenuLink to="/safety" icon={ShieldAlert} label="Safety guidelines" />
                <MenuLink to="/contact" icon={Mail} label="Contact us" />

                {!isLoading && user ? (
                  <>
                    <MenuLink to="/dashboard" icon={LayoutDashboard} label="My dashboard" />
                    {canModerate && <MenuLink to="/admin" icon={isCeo ? Crown : ShieldCheck} label={isCeo ? "CEO room" : "Admin"} />}
                    <MenuLink icon={LogOut} label="Sign out" onClick={handleSignOut} />
                  </>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Link to="/auth" search={{ mode: "login" }} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground transition">
                        <LogIn className="h-4 w-4" />Sign in
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link to="/auth" search={{ mode: "register" }} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground transition">
                        <Store className="h-4 w-4" />Open a free store
                      </Link>
                    </SheetClose>
                  </>
                )}

                <div className="my-3 h-px bg-border" />

                <a href={WHATSAPP_CHANNEL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground transition">
                  <MessageCircle className="h-4 w-4 text-success" />Join our WhatsApp channel
                </a>
                <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-foreground transition">
                  <Mail className="h-4 w-4" />{CONTACT_EMAIL}
                </a>
              </nav>

              <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Appearance</span>
                <ThemeToggle />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-secondary/40 mt-16">
      <div className="container mx-auto px-4 py-12 grid gap-10 md:grid-cols-4 text-sm">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2.5 mb-3">
            <img src={logoAsset.url} alt={`${BRAND} logo`} className="h-9 w-9 object-contain" />
            <span className="font-display font-extrabold tracking-tight text-base">{BRAND}</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            A trusted community marketplace. Verified sellers, safe meet-ups, direct conversations on WhatsApp.
          </p>
          <a
            href={WHATSAPP_CHANNEL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-4 text-xs font-medium text-success hover:underline"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Follow our WhatsApp channel
          </a>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-foreground">Marketplace</h4>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground transition">Browse listings</Link></li>
            <li><Link to="/auth" search={{ mode: "register" }} className="hover:text-foreground transition">Open a free store</Link></li>
            <li><Link to="/auth" search={{ mode: "login" }} className="hover:text-foreground transition">Vendor sign in</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-foreground">Support</h4>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/safety" className="hover:text-foreground transition"><span className="inline-flex items-center gap-1"><ShieldAlert className="h-3.5 w-3.5" />Safety guidelines</span></Link></li>
            <li><Link to="/contact" className="hover:text-foreground transition">Contact us</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3 text-foreground">Legal</h4>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link to="/privacy" className="hover:text-foreground transition">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-foreground transition">Terms of Service</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 px-4 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-3 container mx-auto">
        <span>© {new Date().getFullYear()} {BRAND}. All rights reserved.</span>
        <div className="flex items-center gap-4">
          <Link to="/contact" className="hover:text-foreground transition">Get in touch</Link>
          <Link to="/auth" search={{ mode: "login", role: "ceo" }} className="inline-flex items-center gap-1 text-muted-foreground/60 hover:text-foreground transition">
            <Lock className="h-3 w-3" /> Staff sign in
          </Link>
        </div>
      </div>
    </footer>
  );
}
