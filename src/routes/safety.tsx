import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { ShieldAlert, MapPin, MessageCircle, EyeOff, Users } from "lucide-react";

export const Route = createFileRoute("/safety")({
  head: () => ({
    meta: [
      { title: "Safety guidelines — Niberdealz" },
      { name: "description", content: "Tips to stay safe when buying and selling on Niberdealz. Meet in public, inspect items, never pay before seeing." },
    ],
  }),
  component: Safety,
});

const TIPS = [
  { Icon: MapPin, title: "Meet in public, on campus", body: "Pick a busy spot — campus food court, library entrance, residence reception. Avoid private rooms or off-campus addresses." },
  { Icon: Users, title: "Bring a friend", body: "Especially for high-value items like laptops or phones. There's safety in numbers." },
  { Icon: EyeOff, title: "Inspect before handing over money", body: "Test the item in person. Turn on electronics. Check book editions. Try on clothing." },
  { Icon: MessageCircle, title: "Keep chat on WhatsApp", body: "Don't move conversations to email or shady links. Screenshot suspicious messages." },
  { Icon: ShieldAlert, title: "Report sketchy stuff", body: "Anything that feels off — fake products, harassment, scams — email niberdealz@gmail.com and our admins will remove the listing." },
];

function Safety() {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="container mx-auto px-4 py-12 max-w-4xl flex-1">
        <ShieldAlert className="h-10 w-10 text-[color:var(--deal)] mb-3" />
        <h1 className="font-display text-3xl md:text-4xl font-bold">Safety guidelines</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">Niberdealz connects students — we don't process payments or deliver goods. Here's how to keep yourself safe.</p>

        <div className="mt-8 grid sm:grid-cols-2 gap-4">
          {TIPS.map(({ Icon, title, body }) => (
            <div key={title} className="rounded-2xl bg-card border border-border p-5 shadow-[var(--shadow-card)]">
              <Icon className="h-6 w-6 text-[color:var(--deal)] mb-2" />
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{body}</p>
            </div>
          ))}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
