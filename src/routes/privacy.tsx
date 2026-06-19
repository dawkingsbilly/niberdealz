import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/constants";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Niberdealz" },
      { name: "description", content: "How Niberdealz collects, uses, stores and protects your personal information under POPIA." },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  const updated = new Date().toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" });
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <article className="container mx-auto px-4 py-12 max-w-3xl flex-1 text-sm leading-relaxed">
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: {updated}</p>

        <p className="mt-6">
          This Privacy Policy explains how {SITE_NAME} ("we", "us", "our") collects, uses, shares and protects
          your personal information when you use our website and services. We comply with the Protection of
          Personal Information Act, 2013 (POPIA) of South Africa. By using {SITE_NAME} you agree to this Policy.
        </p>

        <h2 className="font-display text-xl font-bold mt-8">1. Who we are</h2>
        <p>{SITE_NAME} is a free student marketplace that connects buyers and sellers via WhatsApp. We are the responsible party for the personal information you submit through this site. You can contact us any time at <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>

        <h2 className="font-display text-xl font-bold mt-8">2. Information we collect</h2>
        <p className="mt-2"><strong>From sellers (when you open a store):</strong> your name, email address, WhatsApp number, city or campus, store name, store description, and the photos and details of every product you list.</p>
        <p className="mt-2"><strong>From buyers:</strong> you don't need an account to browse or contact a seller. When you click "Buy on WhatsApp" we redirect you to WhatsApp — anything you share with the seller there is handled by WhatsApp and the seller, not by us.</p>
        <p className="mt-2"><strong>Automatic information:</strong> basic usage data such as the pages you visit, anonymous view counts on listings, and the number of times a WhatsApp button is clicked. We use this to keep the site running and help sellers see how their listings perform.</p>
        <p className="mt-2"><strong>Cookies:</strong> we use strictly necessary cookies to keep you logged in and remember your session. We do not use third-party advertising cookies.</p>

        <h2 className="font-display text-xl font-bold mt-8">3. How we use your information</h2>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>To create and operate your store account.</li>
          <li>To display your store, listings and WhatsApp number to potential buyers.</li>
          <li>To allow buyers to contact you directly on WhatsApp.</li>
          <li>To moderate listings, investigate complaints, and remove content that breaks our Terms.</li>
          <li>To send you essential service messages (for example, password resets or important account updates).</li>
          <li>To produce anonymous statistics about how the marketplace is used.</li>
        </ul>

        <h2 className="font-display text-xl font-bold mt-8">4. Legal basis</h2>
        <p>We process your personal information based on the contract you enter into with us when you create an account, your consent (which you can withdraw), our legitimate interest in running a safe marketplace, and compliance with our legal obligations.</p>

        <h2 className="font-display text-xl font-bold mt-8">5. Information you make public</h2>
        <p>Your store name, store description, city, WhatsApp number, and product listings are public — anyone with the link can see them. Don't post anything you don't want public. Your email address and password are private and never shown to other users.</p>

        <h2 className="font-display text-xl font-bold mt-8">6. Sharing your information</h2>
        <p>We don't sell your personal information. We share it only with:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li><strong>Service providers</strong> that help us run the site, including our hosting, database and authentication providers. They process data on our instructions under strict confidentiality.</li>
          <li><strong>Law enforcement or regulators</strong> when we are legally required to, or to investigate fraud, abuse or threats to safety.</li>
          <li><strong>Buyers you choose to contact on WhatsApp</strong> — they will see the WhatsApp number on your store.</li>
        </ul>

        <h2 className="font-display text-xl font-bold mt-8">7. How long we keep it</h2>
        <p>We keep your account information for as long as your store is active. If you delete your store, we remove your listings within 30 days. Some information may be kept longer if we are required to by law or need it to resolve disputes.</p>

        <h2 className="font-display text-xl font-bold mt-8">8. Security</h2>
        <p>We use industry-standard measures to protect your information, including encrypted connections (HTTPS), hashed passwords, role-based access controls and database row-level security. No system is 100% secure, so we encourage you to use a strong, unique password and never share it.</p>

        <h2 className="font-display text-xl font-bold mt-8">9. Your rights under POPIA</h2>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Access the personal information we hold about you.</li>
          <li>Correct or update inaccurate information from your dashboard or by emailing us.</li>
          <li>Request deletion of your account and personal information.</li>
          <li>Object to processing or withdraw consent at any time.</li>
          <li>Lodge a complaint with the Information Regulator of South Africa at <a className="underline" href="https://inforegulator.org.za" target="_blank" rel="noreferrer">inforegulator.org.za</a>.</li>
        </ul>

        <h2 className="font-display text-xl font-bold mt-8">10. Children</h2>
        <p>{SITE_NAME} is intended for students aged 18 and older. If you are younger than 18, please use the site only with the consent of a parent or guardian. We do not knowingly collect information from children under 13.</p>

        <h2 className="font-display text-xl font-bold mt-8">11. Transactions between users</h2>
        <p>We are not a party to any transaction between a buyer and a seller. We don't process payments, handle goods or guarantee that an item will be as described. Please follow our <a className="underline" href="/safety">Safety Guidelines</a>.</p>

        <h2 className="font-display text-xl font-bold mt-8">12. Changes to this policy</h2>
        <p>We may update this Privacy Policy from time to time. We'll update the "Last updated" date above and, for significant changes, notify you by email or a banner on the site.</p>

        <h2 className="font-display text-xl font-bold mt-8">13. Contact us</h2>
        <p>Questions, requests or complaints? Email <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We aim to respond within 7 business days.</p>
      </article>
      <SiteFooter />
    </div>
  );
}
