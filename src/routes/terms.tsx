import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { CONTACT_EMAIL, SITE_NAME } from "@/lib/constants";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Niberdealz" },
      { name: "description", content: "The rules for buying, selling and using the Niberdealz student marketplace." },
    ],
  }),
  component: Terms,
});

function Terms() {
  const updated = new Date().toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" });
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <article className="container mx-auto px-4 py-12 max-w-3xl flex-1 text-sm leading-relaxed">
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: {updated}</p>

        <p className="mt-6">
          These Terms of Service ("Terms") govern your use of {SITE_NAME} (the "Service"). By accessing or using
          the Service — as a visitor, buyer, seller or administrator — you agree to be bound by these Terms. If
          you do not agree, please stop using the Service.
        </p>

        <h2 className="font-display text-xl font-bold mt-8">1. What Niberdealz is</h2>
        <p>{SITE_NAME} is a free online marketplace that helps South African students list items for sale and connect with buyers via WhatsApp. We are a platform only. We do not own, sell, buy, store, ship, deliver, inspect, pay for or guarantee any item listed on the Service.</p>

        <h2 className="font-display text-xl font-bold mt-8">2. Eligibility</h2>
        <p>You must be at least 18 years old, or have the consent of a parent or legal guardian, to create an account. You must provide accurate information and keep it up to date. You may not use the Service if you have previously been banned.</p>

        <h2 className="font-display text-xl font-bold mt-8">3. Your account</h2>
        <p>You are responsible for everything that happens under your account, including all listings posted from it. Keep your password confidential. Notify us immediately at <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> if you suspect unauthorised access. One person, one account — multiple accounts to evade bans or manipulate the marketplace are prohibited.</p>

        <h2 className="font-display text-xl font-bold mt-8">4. Listings and seller rules</h2>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>List only items you legally own and have the right to sell.</li>
          <li>Use your own clear, accurate photos. Describe condition, size, and any defects honestly.</li>
          <li>Set a fair price in South African Rand. No bait-and-switch pricing.</li>
          <li>Keep the WhatsApp number on your store working and answer buyers respectfully.</li>
          <li>Mark items as Sold promptly when sold, or remove them.</li>
          <li>One listing per item. No spam, no duplicate listings to push others off the page.</li>
        </ul>

        <h2 className="font-display text-xl font-bold mt-8">5. Prohibited items and conduct</h2>
        <p>The following are not allowed and will be removed without notice. Repeat offenders lose their store and may be banned.</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Weapons, ammunition, explosives, fireworks.</li>
          <li>Illegal drugs, paraphernalia, prescription medication.</li>
          <li>Alcohol or tobacco sold to minors.</li>
          <li>Stolen goods, counterfeit clothing, fake electronics, replica IDs.</li>
          <li>Exam papers, completed assignments, "essay-for-hire" or any academic dishonesty service.</li>
          <li>Adult or sexually explicit content, escort or sex-work services.</li>
          <li>Live animals, body parts, human remains, hazardous chemicals.</li>
          <li>Pyramid schemes, get-rich-quick schemes, MLM recruiting.</li>
          <li>Harassment, hate speech, threats, doxxing or any unlawful conduct.</li>
          <li>Spam, malware links, phishing, or attempts to move users off the Service to defraud them.</li>
          <li>Anything illegal under South African law.</li>
        </ul>

        <h2 className="font-display text-xl font-bold mt-8">6. Transactions are between users</h2>
        <p>Every transaction is a direct contract between the buyer and the seller. {SITE_NAME} is not a party to it. We don't process payments, hold escrow, ship goods, or verify the quality, safety or legality of any item. Please inspect items before paying and follow our <a className="underline" href="/safety">Safety Guidelines</a>.</p>

        <h2 className="font-display text-xl font-bold mt-8">7. Fees</h2>
        <p>{SITE_NAME} is free to use. We do not charge listing fees, subscription fees or commissions. We will tell you in advance if this ever changes.</p>

        <h2 className="font-display text-xl font-bold mt-8">8. Content you post</h2>
        <p>You keep ownership of the photos and descriptions you post. You grant {SITE_NAME} a worldwide, non-exclusive, royalty-free licence to display, store and distribute your content for the purpose of operating, promoting and improving the Service. You confirm that you have the right to grant this licence and that your content does not infringe anyone else's rights.</p>

        <h2 className="font-display text-xl font-bold mt-8">9. Moderation and enforcement</h2>
        <p>Our admin team may, at any time and without notice, remove listings, suspend or delete stores, and ban users who break these Terms, the law, or who endanger the community. We may also cooperate with law enforcement when required.</p>

        <h2 className="font-display text-xl font-bold mt-8">10. Reporting</h2>
        <p>If you see a listing or user that breaks these Terms, report it to <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We review every report and aim to act within 48 hours.</p>

        <h2 className="font-display text-xl font-bold mt-8">11. Intellectual property</h2>
        <p>The {SITE_NAME} name, logo, design, code and aggregated content are owned by us and protected by South African and international law. You may not copy, scrape, reverse engineer, or build a competing service from our content without our written permission.</p>

        <h2 className="font-display text-xl font-bold mt-8">12. Disclaimers</h2>
        <p>The Service is provided "as is" and "as available" without warranties of any kind, whether express or implied, including warranties of merchantability, fitness for a particular purpose, or non-infringement. We don't guarantee that listings are accurate, that sellers will deliver, that buyers will pay, or that the Service will be uninterrupted or error-free.</p>

        <h2 className="font-display text-xl font-bold mt-8">13. Limitation of liability</h2>
        <p>To the maximum extent allowed by law, {SITE_NAME}, its founders, employees and partners are not liable for any loss, damage, theft, injury or expense arising out of (a) any transaction between users, (b) the conduct of any user, (c) the content of any listing, or (d) your use of or inability to use the Service. Your sole remedy is to stop using the Service.</p>

        <h2 className="font-display text-xl font-bold mt-8">14. Indemnity</h2>
        <p>You agree to indemnify and hold {SITE_NAME} harmless from any claim, loss or expense (including legal fees) arising from your use of the Service, your listings, your transactions with other users, or your breach of these Terms.</p>

        <h2 className="font-display text-xl font-bold mt-8">15. Termination</h2>
        <p>You can delete your account at any time from your dashboard. We can suspend or terminate your access at any time, with or without notice, if you breach these Terms or if we discontinue the Service.</p>

        <h2 className="font-display text-xl font-bold mt-8">16. Changes to these Terms</h2>
        <p>We may update these Terms from time to time. We'll change the "Last updated" date above and, for significant changes, give you reasonable notice. Continuing to use the Service after changes means you accept the new Terms.</p>

        <h2 className="font-display text-xl font-bold mt-8">17. Governing law and disputes</h2>
        <p>These Terms are governed by the laws of the Republic of South Africa. Any dispute will first be resolved by good-faith discussion; if that fails, the courts of South Africa have exclusive jurisdiction.</p>

        <h2 className="font-display text-xl font-bold mt-8">18. Contact</h2>
        <p>Questions about these Terms? Email <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
      </article>
      <SiteFooter />
    </div>
  );
}
