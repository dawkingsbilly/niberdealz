import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { CONTACT_EMAIL } from "@/lib/constants";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Niberdealz" },
      { name: "description", content: "How Niberdealz collects, uses and protects your information." },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <article className="container mx-auto px-4 py-12 max-w-3xl flex-1 prose prose-sm dark:prose-invert">
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

        <h2 className="font-display text-xl font-bold mt-8">What we collect</h2>
        <p>When you register as a vendor we collect your email, name, WhatsApp number, city and store details. Buyers don't need accounts.</p>

        <h2 className="font-display text-xl font-bold mt-6">How we use it</h2>
        <p>To run your store, show listings to buyers, and let buyers contact you on WhatsApp. We never sell your data.</p>

        <h2 className="font-display text-xl font-bold mt-6">Sharing</h2>
        <p>Your store name, city, WhatsApp number and listings are public. Your email is private. We share data only with service providers needed to run the site (hosting, database).</p>

        <h2 className="font-display text-xl font-bold mt-6">Your rights</h2>
        <p>You can delete your store any time from your dashboard, or email <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> to request full account deletion.</p>

        <h2 className="font-display text-xl font-bold mt-6">Contact</h2>
        <p>Questions? Email <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
      </article>
      <SiteFooter />
    </div>
  );
}
