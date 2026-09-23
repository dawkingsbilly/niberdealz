import { Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
  ClipboardList,
  Crown,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  ShoppingCart,
  Mail,
  Home,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { SITE_NAME } from "@/lib/constants";
import { useCart } from "@/lib/cart";
import logoUrl from "@/assets/niber-logo.png";

const BRAND = SITE_NAME.toUpperCase();
function Brand() {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-3">
      <img
        src={logoUrl}
        alt={`${BRAND} logo`}
        className="h-11 w-11 shrink-0 object-contain"
        draggable={false}
      />
      <div className="min-w-0 leading-none">
        <span className="block truncate font-display text-xl font-extrabold tracking-tight">
          {BRAND}
        </span>
        <span className="hidden text-[10px] font-medium uppercase tracking-[.18em] text-muted-foreground sm:block">
          Direct store
        </span>
      </div>
    </Link>
  );
}
export function SiteHeader() {
  const { user, roles, isLoading } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const { count } = useCart();
  const isStaff = roles.includes("admin") || roles.includes("owner");
  const isCEO = roles.includes("owner");
  const search = (event: React.FormEvent) => {
    event.preventDefault();
    setOpen(false);
    router.navigate({
      to: "/",
      search: { q: term.trim() || undefined },
      hash: "shop",
    });
  };
  const signOut = async () => {
    await supabase.auth.signOut();
    setOpen(false);
    router.navigate({ to: "/" });
  };
  const MenuLink = ({
    to,
    icon: Icon,
    label,
    onClick,
  }: {
    to?: string;
    icon: LucideIcon;
    label: string;
    onClick?: () => void;
  }) =>
    to ? (
      <SheetClose asChild>
        <Link
          to={to}
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground/80 transition hover:bg-accent hover:text-foreground"
        >
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      </SheetClose>
    ) : (
      <button
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-medium text-foreground/80 transition hover:bg-accent hover:text-foreground"
      >
        <Icon className="h-4 w-4" />
        {label}
      </button>
    );
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/90 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between gap-2 px-4">
        <Brand />
        <form onSubmit={search} className="relative hidden max-w-md flex-1 md:flex">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search NiberDealz"
            className="h-10 pl-10"
          />
        </form>
        <div className="flex items-center gap-1.5">
          <ThemeToggle className="hidden sm:inline-flex" />
          <Button asChild variant="ghost" size="icon" aria-label="Cart" className="relative">
            <Link to="/cart">
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--deal)] px-1 text-[10px] font-bold text-[color:var(--deal-foreground)]">
                  {count}
                </span>
              )}
            </Link>
          </Button>
          {!isLoading && user ? (
            <>
              {isStaff && (
                <Button asChild variant="ghost" size="sm" className="hidden lg:inline-flex">
                  <Link to="/admin">
                    {isCEO ? (
                      <Crown className="mr-1.5 h-4 w-4" />
                    ) : (
                      <ShieldCheck className="mr-1.5 h-4 w-4" />
                    )}
                    {isCEO ? "CEO" : "Admin"}
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                <Link to="/orders">
                  <ClipboardList className="mr-1.5 h-4 w-4" />
                  Orders
                </Link>
              </Button>
            </>
          ) : (
            <Button
              asChild
              size="sm"
              className="hidden bg-foreground text-background hover:bg-foreground/90 sm:inline-flex"
            >
              <Link to="/auth" search={{ mode: "register" }}>
                Sign in
              </Link>
            </Button>
          )}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-[300px] flex-col sm:w-[340px]">
              <SheetHeader>
                <SheetTitle className="font-display tracking-tight">{BRAND}</SheetTitle>
              </SheetHeader>
              <form onSubmit={search} className="relative mt-4 md:hidden">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Search NiberDealz"
                  className="pl-10"
                />
              </form>
              <nav className="mt-4 flex flex-col gap-1">
                <MenuLink to="/" icon={Home} label="Shop" />
                <MenuLink to="/cart" icon={ShoppingCart} label="Cart" />
                <MenuLink to="/orders" icon={ClipboardList} label="Your orders" />
                <MenuLink to="/contact" icon={Mail} label="Contact NiberDealz" />
                {!isLoading && user ? (
                  <>
                    {isStaff && (
                      <MenuLink
                        to="/admin"
                        icon={isCEO ? Crown : ShieldCheck}
                        label={isCEO ? "CEO control room" : "Admin control room"}
                      />
                    )}
                    <MenuLink icon={LogOut} label="Sign out" onClick={signOut} />
                  </>
                ) : (
                  <SheetClose asChild>
                    <Link
                      to="/auth"
                      search={{ mode: "login" }}
                      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-accent"
                    >
                      <LogIn className="h-4 w-4" />
                      Sign in
                    </Link>
                  </SheetClose>
                )}
              </nav>
              <div className="mt-auto flex items-center justify-between border-t pt-4">
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
    <footer className="mt-16 border-t bg-secondary/40">
      <div className="container mx-auto grid gap-10 px-4 py-12 text-sm md:grid-cols-4">
        <div>
          <div className="mb-3 flex items-center gap-2.5">
            <img src={logoUrl} alt={`${BRAND} logo`} className="h-9 w-9 object-contain" />
            <span className="font-display font-extrabold">{BRAND}</span>
          </div>
          <p className="leading-relaxed text-muted-foreground">
            A direct NiberDealz store for dependable products, secure ordering and straightforward
            support.
          </p>
        </div>
        <div>
          <h4 className="mb-3 font-semibold">Shop</h4>
          <ul className="space-y-2 text-muted-foreground">
            <li>
              <Link to="/" hash="shop">
                All products
              </Link>
            </li>
            <li>
              <Link to="/cart">Your cart</Link>
            </li>
            <li>
              <Link to="/orders">Track orders</Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-semibold">Support</h4>
          <ul className="space-y-2 text-muted-foreground">
            <li>
              <Link to="/contact">Contact us</Link>
            </li>
            <li>
              <Link to="/delivery">Delivery information</Link>
            </li>
            <li>
              <Link to="/privacy">Privacy policy</Link>
            </li>
            <li>
              <Link to="/terms">Terms of service</Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-semibold">Need help?</h4>
          <Link to="/contact" className="text-muted-foreground hover:text-foreground">
            Send a private message
          </Link>
        </div>
      </div>
      <div className="container mx-auto flex flex-col items-center justify-between gap-3 border-t px-4 py-5 text-xs text-muted-foreground sm:flex-row">
        <span>
          © {new Date().getFullYear()} {BRAND}. All rights reserved.
        </span>
        <span>Orders handled by NiberDealz</span>
      </div>
    </footer>
  );
}
