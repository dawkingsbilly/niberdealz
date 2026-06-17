import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { CONTACT_EMAIL } from "@/lib/constants";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Niberdealz" },
      { name: "description", content: "Rules for using the Niberdealz student marketplace." },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <article className="container mx-auto px-4 py-12 max-w-3xl flex-1 prose prose-sm dark:prose-invert">
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

        <h2 className="font-display text-xl font-bold mt-8">The marketplace</h2>
        <p>Niberdealz is a free platform that connects student buyers and sellers via WhatsApp. We don't process payments, hold inventory, or deliver goods.</p>

        <h2 className="font-display text-xl font-bold mt-6">Vendor rules</h2>
        <ul className="list-disc pl-5">
          <li>List only items you legally own and can sell.</li>
          <li>No counterfeit goods, weapons, drugs, stolen items, adult content, or anything illegal in South Africa.</li>
          <li>Honest descriptions and accurate prices.</li>
          <li>Respond to buyers respectfully on WhatsApp.</li>
        </ul>

        <h2 className="font-display text-xl font-bold mt-6">Buyer responsibility</h2>
        <p>Transactions happen between you and the seller. Inspect items before paying, meet in public, and follow our <a className="underline" href="/safety">safety guidelines</a>. Niberdealz isn't responsible for the outcome of deals.</p>

        <h2 className="font-display text-xl font-bold mt-6">Moderation</h2>
        <p>We remove listings that break the rules. Repeat offenders lose their store.</p>

        <h2 className="font-display text-xl font-bold mt-6">Liability</h2>
        <p>The marketplace is provided "as is" with no warranties. Niberdealz isn't liable for any loss or damage arising from listings or transactions.</p>

        <h2 className="font-display text-xl font-bold mt-6">Questions</h2>
        <p>Email <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
      </article>
      <SiteFooter />
    </div>
  );
}
