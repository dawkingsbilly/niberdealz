import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { ShieldAlert, MapPin, MessageCircle, EyeOff, Users, Camera, Flag, Phone, Sun, BadgeCheck, Ban, Lock } from "lucide-react";
import { CONTACT_EMAIL, CONTACT_PHONE } from "@/lib/constants";

export const Route = createFileRoute("/safety")({
  head: () => ({
    meta: [
      { title: "Safety Guidelines — Niberdealz" },
      { name: "description", content: "Stay safe on Niberdealz. Meet on campus, inspect items, keep chat on WhatsApp, and report scams." },
    ],
  }),
  component: Safety,
});

const TIPS = [
  { Icon: MapPin, title: "Meet in public, on campus", body: "Pick a busy spot — campus food court, library entrance, residence reception, or the security desk. Avoid private rooms, hostels you don't know, or off-campus addresses you can't verify." },
  { Icon: Sun, title: "Meet during the day", body: "Daylight meet-ups are safer. If you must meet after dark, pick a well-lit public area with foot traffic and CCTV." },
  { Icon: Users, title: "Bring a friend", body: "Especially for high-value items like laptops, phones or sneakers. Tell someone where you're going, who you're meeting, and when you'll be back." },
  { Icon: EyeOff, title: "Inspect before handing over money", body: "Power on electronics, check IMEI on phones, open textbooks to confirm the edition, try on clothing and sneakers. If the seller refuses inspection, walk away." },
  { Icon: MessageCircle, title: "Keep the chat on WhatsApp", body: "All conversations should stay on the WhatsApp number listed on the store. Don't switch to email, Telegram, or shady links sent by strangers." },
  { Icon: Camera, title: "Screenshot everything", body: "Save the listing, your WhatsApp chat, and any agreement on price. This is your evidence if something goes wrong." },
  { Icon: BadgeCheck, title: "Trust verified stores", body: "Look at how long the store has been active, how many other listings it has, and whether the WhatsApp number matches the store name." },
  { Icon: Ban, title: "Never send money upfront to strangers", body: "Pay in person, after you have inspected the item and are happy with it. Refuse requests for EFT, eWallet, or crypto deposits before meeting." },
  { Icon: Lock, title: "Protect your personal info", body: "Don't share your ID number, banking PIN, OTPs, or NSFAS details. No legitimate seller or buyer needs them." },
  { Icon: Flag, title: "Report sketchy listings", body: `Anything that feels off — fake products, harassment, hate speech, weapons, drugs — email ${CONTACT_EMAIL} or WhatsApp ${CONTACT_PHONE}. Our team removes flagged listings fast.` },
];

const RED_FLAGS = [
  "Seller refuses to meet in person or only wants to ship.",
  "Price is far below market value with pressure to pay immediately.",
  "Asks for a deposit, 'holding fee', or delivery fee before you meet.",
  "WhatsApp number doesn't match the country code or store name.",
  "Profile or listing was created minutes ago with no other items.",
  "Photos look stolen from Google or a different language site.",
  "Pushes you off WhatsApp to a 'secure' link, courier site, or new app.",
];

function Safety() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="container mx-auto px-4 py-12 max-w-4xl flex-1">
        <ShieldAlert className="h-10 w-10 text-[color:var(--deal)] mb-3" />
        <h1 className="font-display text-3xl md:text-4xl font-bold">Safety Guidelines</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Niberdealz is a free marketplace that connects student buyers and sellers. We don't process payments,
          deliver goods, or hold items in escrow. Your safety depends on a few simple habits — please read these
          guidelines before every deal.
        </p>

        <h2 className="font-display text-2xl font-bold mt-10">Our 10 safety rules</h2>
        <div className="mt-4 grid sm:grid-cols-2 gap-4">
          {TIPS.map(({ Icon, title, body }) => (
            <div key={title} className="rounded-2xl bg-card border border-border p-5 shadow-[var(--shadow-card)]">
              <Icon className="h-6 w-6 text-[color:var(--deal)] mb-2" />
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{body}</p>
            </div>
          ))}
        </div>

        <h2 className="font-display text-2xl font-bold mt-12">Scam red flags</h2>
        <p className="text-sm text-muted-foreground mt-2">If you see any of these, stop and report the listing.</p>
        <ul className="mt-4 space-y-2 text-sm">
          {RED_FLAGS.map((flag) => (
            <li key={flag} className="flex gap-3 rounded-lg border border-border bg-card p-3">
              <Flag className="h-4 w-4 mt-0.5 text-[color:var(--deal)] shrink-0" />
              <span>{flag}</span>
            </li>
          ))}
        </ul>

        <h2 className="font-display text-2xl font-bold mt-12">For sellers</h2>
        <ul className="mt-3 list-disc pl-5 text-sm space-y-2 text-muted-foreground">
          <li>Only list items you legally own. No counterfeit goods, no stolen items, no prohibited products.</li>
          <li>Use your own clear photos of the actual item, not stock images.</li>
          <li>Be honest about condition, size, defects, and price. Mark sold items as Sold so you don't waste buyers' time.</li>
          <li>Meet buyers in the same public, on-campus spots you'd want to meet as a buyer.</li>
          <li>Don't accept suspicious "proof of payment" screenshots — wait for the cash in your hand or money in your account before handing over the item.</li>
        </ul>

        <h2 className="font-display text-2xl font-bold mt-12">For buyers</h2>
        <ul className="mt-3 list-disc pl-5 text-sm space-y-2 text-muted-foreground">
          <li>Confirm the meeting place and time on WhatsApp before leaving.</li>
          <li>Bring exact cash if you can. If paying by EFT, complete the transfer in front of the seller and show the confirmation.</li>
          <li>Test electronics, check serial numbers, and inspect for damage before paying.</li>
          <li>You are never obliged to complete a deal. If anything feels wrong, walk away.</li>
        </ul>

        <h2 className="font-display text-2xl font-bold mt-12">Prohibited items</h2>
        <p className="text-sm text-muted-foreground mt-2">
          The following are not allowed on Niberdealz and will be removed on sight: weapons, ammunition, illegal
          drugs and paraphernalia, prescription medication, alcohol and tobacco to minors, stolen goods, counterfeit
          clothing or electronics, exam papers and academic dishonesty services, adult content, live animals,
          hazardous materials, and any item or service that is illegal under South African law.
        </p>

        <h2 className="font-display text-2xl font-bold mt-12">Report a problem</h2>
        <div className="mt-3 rounded-2xl border border-border bg-card p-5 text-sm">
          <p>If you've been scammed, harassed, or have seen a dangerous listing, tell us immediately. We review every report and remove listings or stores that break the rules.</p>
          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <a href={`mailto:${CONTACT_EMAIL}`} className="inline-flex items-center gap-2 rounded-md bg-foreground text-background px-4 py-2 font-medium">
              <MessageCircle className="h-4 w-4" /> Email {CONTACT_EMAIL}
            </a>
            <a href={`https://wa.me/${CONTACT_PHONE.replace(/\D/g, "")}`} className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 font-medium">
              <Phone className="h-4 w-4" /> WhatsApp {CONTACT_PHONE}
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">If you are in immediate danger, call campus security or the South African Police Service on 10111 before contacting us.</p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
