import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { PLANS, SITE_NAME } from "@/lib/constants";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Vendor pricing — Niber-Dealz" },
      { name: "description", content: "Niber-Dealz vendor plans: R50 for 5 products, R100 for 20 products, R200 for unlimited products per month." },
    ],
  }),
  component: Pricing,
});

function Pricing() {
  const items: { key: keyof typeof PLANS; highlight?: boolean }[] = [
    { key: "starter" },
    { key: "growth", highlight: true },
    { key: "unlimited" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <section className="container mx-auto px-4 py-16 flex-1">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--deal)]/10 text-[color:var(--deal)] px-3 py-1 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles className="h-3.5 w-3.5" /> Vendor plans
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold">Simple monthly pricing.</h1>
          <p className="mt-3 text-lg text-muted-foreground">Pick a plan, pay by EFT, upload your proof, and start listing once approved.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {items.map(({ key, highlight }) => {
            const plan = PLANS[key];
            return (
              <div key={key} className={`relative rounded-2xl bg-card border p-8 ${highlight ? "border-[var(--deal)] shadow-[var(--shadow-deal)] md:-translate-y-2" : "border-border shadow-[var(--shadow-card)]"}`}>
                {highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--deal)] text-[color:var(--deal-foreground)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider">Most popular</div>
                )}
                <h3 className="font-display text-xl font-bold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="font-display text-5xl font-bold">R{plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="mt-6 space-y-3 text-sm">
                  <li className="flex gap-2"><Check className="h-5 w-5 text-success shrink-0" /><span><strong>{plan.productLimit === "unlimited" ? "Unlimited" : plan.productLimit}</strong> product listings</span></li>
                  <li className="flex gap-2"><Check className="h-5 w-5 text-success shrink-0" /> Verified vendor badge</li>
                  <li className="flex gap-2"><Check className="h-5 w-5 text-success shrink-0" /> Direct WhatsApp buyer chat</li>
                  <li className="flex gap-2"><Check className="h-5 w-5 text-success shrink-0" /> Your own shop page</li>
                  <li className="flex gap-2"><Check className="h-5 w-5 text-success shrink-0" /> AI scam protection</li>
                </ul>
                <Button asChild className={`w-full mt-8 ${highlight ? "bg-[var(--deal)] hover:bg-[var(--deal)]/90 text-[color:var(--deal-foreground)]" : ""}`} variant={highlight ? "default" : "outline"}>
                  <Link to="/auth" search={{ mode: "register" }}>Get started</Link>
                </Button>
              </div>
            );
          })}
        </div>

        <div className="max-w-2xl mx-auto mt-16 text-center text-sm text-muted-foreground">
          <p>Already a vendor? <Link to="/auth" search={{ mode: "login" }} className="text-foreground font-semibold underline-offset-2 hover:underline">Sign in</Link> to manage your plan.</p>
          <p className="mt-2">{SITE_NAME} doesn't take any cut of your sales — buyers contact you directly.</p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
