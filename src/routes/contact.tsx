import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { MessageCircle, Mail, Phone, Send, Loader2 } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createContactRequest } from "@/lib/ecommerce.functions";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Contact us — NiberDealz" }, { name: "description", content: "Send a private message to NiberDealz support." }] }),
  component: Contact,
});

function Contact() {
  const send = useServerFn(createContactRequest);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", topic: "order", message: "", preferred_contact: "email" });
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true);
    try { await send({ data: form as any }); toast.success("Your message has been sent. We will get back to you soon."); setForm({ name: "", email: "", topic: "order", message: "", preferred_contact: "email" }); }
    catch (error: any) { toast.error(error.message); }
    finally { setBusy(false); }
  };
  return <div className="min-h-screen flex flex-col"><SiteHeader /><main className="container mx-auto max-w-2xl flex-1 px-4 py-12"><h1 className="font-display text-3xl font-bold">Contact us</h1><p className="mt-2 text-muted-foreground">Send a private message to the NiberDealz team. Your contact details are never displayed publicly.</p><div className="mt-7 grid grid-cols-3 gap-3 text-center text-sm"><div className="rounded-xl border bg-card p-4"><MessageCircle className="mx-auto h-5 w-5" /><p className="mt-2 font-medium">WhatsApp</p></div><div className="rounded-xl border bg-card p-4"><Mail className="mx-auto h-5 w-5" /><p className="mt-2 font-medium">Email</p></div><div className="rounded-xl border bg-card p-4"><Phone className="mx-auto h-5 w-5" /><p className="mt-2 font-medium">Call back</p></div></div><form onSubmit={submit} className="mt-7 grid gap-4 rounded-2xl border bg-card p-5"><div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-1 text-sm"><span>Your name</span><Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label className="grid gap-1 text-sm"><span>Your email</span><Input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label></div><label className="grid gap-1 text-sm"><span>What is this about?</span><select value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })} className="h-10 rounded-md border bg-background px-3"><option value="order">My order</option><option value="product">A product</option><option value="delivery">Delivery</option><option value="return">Return or refund</option><option value="privacy">Privacy</option><option value="other">Something else</option></select></label><label className="grid gap-1 text-sm"><span>Message</span><Textarea required minLength={10} rows={6} value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} placeholder="Tell us how we can help." /></label><fieldset><legend className="text-sm font-medium">How should we respond?</legend><div className="mt-2 flex flex-wrap gap-2">{[["email", "Email", Mail], ["whatsapp", "WhatsApp", MessageCircle], ["call", "Call", Phone]].map(([value, label, Icon]: any) => <button type="button" key={value} onClick={() => setForm({ ...form, preferred_contact: value })} className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm ${form.preferred_contact === value ? "border-foreground bg-foreground text-background" : "bg-background"}`}><Icon className="h-4 w-4" />{label}</button>)}</div></fieldset><Button disabled={busy} className="mt-1">{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Send private message</Button></form></main><SiteFooter /></div>;
}
