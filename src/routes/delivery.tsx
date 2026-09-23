import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter, SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/delivery")({
  head: () => ({
    meta: [
      { title: "Delivery information | NiberDealz" },
      {
        name: "description",
        content: "Courier and PAXI delivery options for NiberDealz order requests.",
      },
    ],
  }),
  component: Delivery,
});

const rows = [
  ["Courier", "R150", "Door-to-door"],
  ["PAXI Standard · up to 5kg", "R59.95", "7–9 business days"],
  ["PAXI Express · up to 5kg", "R109.95", "3–5 business days"],
  ["PAXI Standard · up to 10kg", "R109.95", "7–9 business days"],
  ["PAXI Express · up to 10kg", "R139.95", "3–5 business days"],
];

function Delivery() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <main className="container mx-auto max-w-3xl flex-1 px-4 py-12">
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">
          NiberDealz delivery
        </p>
        <h1 className="font-display mt-3 text-3xl font-bold">Clear options, before you order.</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Select a delivery option with your order request. Fees are recalculated securely before
          the request is created, so no browser trickery gets a vote.
        </p>
        <section className="mt-8 overflow-hidden rounded-xl border">
          <div className="grid grid-cols-[1fr_auto] gap-3 border-b bg-secondary/40 px-4 py-3 text-xs font-semibold uppercase tracking-wide">
            <span>Service</span>
            <span>Fee</span>
          </div>
          {rows.map(([service, fee, timing]) => (
            <div
              key={service}
              className="grid grid-cols-[1fr_auto] gap-3 border-b px-4 py-4 text-sm last:border-0"
            >
              <div>
                <strong>{service}</strong>
                <p className="mt-0.5 text-xs text-muted-foreground">{timing}</p>
              </div>
              <strong>{fee}</strong>
            </div>
          ))}
        </section>
        <section className="mt-8 rounded-xl border p-5 text-sm leading-relaxed">
          <h2 className="font-display text-xl font-bold">PAXI collection</h2>
          <p className="mt-3">
            Choose your PEP, Ackermans or Shoe City pickup point during checkout. Take your ID and
            the SMS collection PIN with you.
          </p>
        </section>
        <section className="mt-8 rounded-xl border p-5 text-sm leading-relaxed">
          <h2 className="font-display text-xl font-bold">Order-request delivery</h2>
          <p className="mt-3">
            Delivery availability and the final next steps are confirmed after NiberDealz reviews
            your order request. Card payments are not available through this site.
          </p>
          <p className="mt-3">
            Need help with an order?{" "}
            <Link className="underline" to="/contact">
              Send NiberDealz a private message
            </Link>
            .
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
