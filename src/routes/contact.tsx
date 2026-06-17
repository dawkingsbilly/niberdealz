import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { Phone, Mail, MessageCircle } from "lucide-react";
import { CONTACT_PHONE, CONTACT_EMAIL } from "@/lib/constants";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact us — Niberdealz" },
      { name: "description", content: "Get in touch with the Niberdealz team. Email, WhatsApp, or phone." },
    ],
  }),
  component: Contact,
});

function Contact() {
  const waNumber = CONTACT_PHONE.replace(/[^0-9]/g, "");
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="container mx-auto px-4 py-12 max-w-3xl flex-1">
        <h1 className="font-display text-3xl md:text-4xl font-bold">Contact Niberdealz</h1>
        <p className="text-muted-foreground mt-2">Questions, problems, or a listing to report? We're here.</p>

        <div className="mt-8 grid sm:grid-cols-2 gap-4">
          <a href={`tel:${waNumber}`} className="rounded-2xl bg-card border border-border p-6 hover:border-[var(--deal)] transition shadow-[var(--shadow-card)]">
            <Phone className="h-6 w-6 text-[color:var(--deal)] mb-2" />
            <div className="font-semibold">Call us</div>
            <div className="text-sm text-muted-foreground mt-1">{CONTACT_PHONE}</div>
          </a>
          <a href={`https://wa.me/27${waNumber.replace(/^0/, "")}`} target="_blank" rel="noopener noreferrer" className="rounded-2xl bg-card border border-border p-6 hover:border-[#25D366] transition shadow-[var(--shadow-card)]">
            <MessageCircle className="h-6 w-6 text-[#25D366] mb-2" />
            <div className="font-semibold">WhatsApp</div>
            <div className="text-sm text-muted-foreground mt-1">{CONTACT_PHONE}</div>
          </a>
          <a href={`mailto:${CONTACT_EMAIL}`} className="sm:col-span-2 rounded-2xl bg-card border border-border p-6 hover:border-[var(--deal)] transition shadow-[var(--shadow-card)]">
            <Mail className="h-6 w-6 text-[color:var(--deal)] mb-2" />
            <div className="font-semibold">Email</div>
            <div className="text-sm text-muted-foreground mt-1">{CONTACT_EMAIL}</div>
          </a>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
