import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2, ShieldCheck, Loader2, Crown, Users, Store, BarChart3, Eye, MessageCircle, Package, Flag, AlertTriangle, X, Mail, Phone, MapPin, Calendar, Check, Sparkles, Plus, BadgeCheck } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { adminDeleteProduct, ownerDeleteVendor, ownerListUsers, promoteToRole, sendVendorWarning, setReportStatus, ownerStoreDetail, setVendorStatus, createSaleCampaign, deleteSaleCampaign, createBroadcast, listBroadcasts } from "@/lib/marketplace.functions";
import { ThemesTab } from "@/components/admin/themes-tab";
import { PaymentsTab } from "@/components/admin/payments-tab";
import { VerificationTab } from "@/components/admin/verification-tab";
import { OrdersTab } from "@/components/admin/orders-tab";
import { PayoutsTab } from "@/components/admin/payouts-tab";
import { socialUrl } from "@/lib/socials";

export const Route = createFileRoute("/_authenticated/admin")({ component: Admin });

function Admin() {
  const { user, roles, isLoading } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"overview" | "approvals" | "verification" | "listings" | "orders" | "payouts" | "stores" | "payments" | "sales" | "themes" | "broadcasts" | "reports" | "users" | "admins">("overview");

  const isAdmin = roles.includes("admin");
  const isOwner = roles.includes("owner");

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (!isAdmin && !isOwner) {
    return (
      <div className="min-h-screen flex flex-col"><SiteHeader />
        <div className="flex-1 container mx-auto px-4 py-16 max-w-lg text-center"><ClaimAccess email={user?.email ?? ""} /></div>
        <SiteFooter />
      </div>
    );
  }

  const tabs = isOwner
    ? (["overview", "approvals", "verification", "listings", "orders", "payouts", "stores", "payments", "sales", "themes", "broadcasts", "reports", "users", "admins"] as const)
    : (["overview", "approvals", "verification", "listings", "orders", "payouts", "payments", "reports"] as const);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="container mx-auto px-4 py-8 flex-1 max-w-6xl">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            {isOwner ? <Crown className="h-7 w-7" /> : <ShieldCheck className="h-7 w-7" />}
            {isOwner ? "CEO control room" : "Admin"}
          </h1>
          {isOwner && (
            <div className="flex gap-2">
              <Button asChild size="sm" className="bg-foreground text-background hover:bg-foreground/90"><Link to="/" hash="shop"><Package className="h-4 w-4 mr-1.5" />View storefront</Link></Button>
            </div>
          )}
        </div>
        <p className="text-muted-foreground mb-6">
          {isOwner ? "Monitor every seller, review reports, send warnings, and remove scams." : "Remove inappropriate listings and review reports."}
        </p>

        <div className="flex gap-2 mb-6 border-b border-border overflow-x-auto">
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px capitalize transition whitespace-nowrap ${tab === t ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t}</button>
          ))}
        </div>

        {tab === "overview" && <OverviewTab />}
        {tab === "approvals" && <ApprovalsTab qc={qc} />}
        {tab === "verification" && <VerificationTab />}
        {tab === "listings" && <ListingsTab qc={qc} />}
        {tab === "orders" && <OrdersTab />}
        {tab === "payouts" && <PayoutsTab />}
        {tab === "stores" && isOwner && <StoresTab qc={qc} />}
        {tab === "payments" && <PaymentsTab />}
        {tab === "sales" && isOwner && <SalesTab qc={qc} />}
        {tab === "themes" && isOwner && <ThemesTab />}
        {tab === "broadcasts" && isOwner && <BroadcastsTab />}
        {tab === "reports" && <ReportsTab qc={qc} />}
        {tab === "users" && isOwner && <UsersTab />}
        {tab === "admins" && isOwner && <AdminsTab />}
      </div>
      <SiteFooter />
    </div>
  );
}

function OverviewTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const since = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString();
      const [events, products, vendors, openReports] = await Promise.all([
        supabase.from("product_events").select("event_type, created_at").gte("created_at", since).limit(10000),
        supabase.from("products").select("id, is_sold", { count: "exact" }),
        supabase.from("vendors").select("id", { count: "exact", head: true }),
        (supabase.from("reports" as any) as any).select("id", { count: "exact", head: true }).eq("status", "open"),
      ]);
      return {
        events: events.data ?? [],
        productCount: products.count ?? 0,
        soldCount: (products.data ?? []).filter((p: any) => p.is_sold).length,
        vendorCount: vendors.count ?? 0,
        openReports: openReports.count ?? 0,
      };
    },
  });

  const series = useMemo(() => {
    const days: { date: string; label: string; views: number; whatsapp: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      days.push({ date: d.toISOString().slice(0, 10), label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), views: 0, whatsapp: 0 });
    }
    const byDate = new Map(days.map(d => [d.date, d]));
    (data?.events ?? []).forEach((e: any) => {
      const k = e.created_at.slice(0, 10);
      const row = byDate.get(k); if (!row) return;
      if (e.event_type === "view") row.views++; else if (e.event_type === "whatsapp_click") row.whatsapp++;
    });
    return days;
  }, [data]);

  const totalViews = series.reduce((s, d) => s + d.views, 0);
  const totalWa = series.reduce((s, d) => s + d.whatsapp, 0);
  const ctr = totalViews ? Math.round((totalWa / totalViews) * 100) : 0;

  if (isLoading) return <div className="py-12 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard Icon={Eye} label="Views (30d)" value={totalViews.toLocaleString()} />
        <StatCard Icon={MessageCircle} label="WhatsApp taps" value={totalWa.toLocaleString()} sub={`${ctr}% CTR`} />
        <StatCard Icon={Package} label="Active listings" value={(data?.productCount ?? 0) - (data?.soldCount ?? 0)} sub={`${data?.soldCount ?? 0} sold`} />
        <StatCard Icon={Store} label="Stores" value={data?.vendorCount ?? 0} />
        <StatCard Icon={Flag} label="Open reports" value={data?.openReports ?? 0} />
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-semibold mb-1 flex items-center gap-2"><BarChart3 className="h-4 w-4" />Traffic — last 30 days</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="vG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(220 70% 50%)" stopOpacity={0.35} /><stop offset="100%" stopColor="hsl(220 70% 50%)" stopOpacity={0} /></linearGradient>
                <linearGradient id="wG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#25D366" stopOpacity={0.35} /><stop offset="100%" stopColor="#25D366" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 90%)" />
              <XAxis dataKey="label" fontSize={11} tickMargin={6} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" name="Views" dataKey="views" stroke="hsl(220 70% 50%)" fill="url(#vG)" strokeWidth={2} />
              <Area type="monotone" name="WhatsApp taps" dataKey="whatsapp" stroke="#25D366" fill="url(#wG)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-semibold mb-1">Engagement — last 14 days</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series.slice(-14)} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 90%)" />
              <XAxis dataKey="label" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar name="Views" dataKey="views" fill="hsl(220 70% 50%)" radius={[4, 4, 0, 0]} />
              <Bar name="WhatsApp" dataKey="whatsapp" fill="#25D366" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function StatCard({ Icon, label, value, sub }: { Icon: any; label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between text-muted-foreground text-xs font-medium uppercase tracking-wider">
        <span>{label}</span><Icon className="h-4 w-4" />
      </div>
      <div className="mt-2 font-display text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function ClaimAccess({ email }: { email: string }) {
  const promote = useServerFn(promoteToRole);
  const [loading, setLoading] = useState<"owner" | "admin" | null>(null);
  const claim = async (role: "owner" | "admin") => {
    setLoading(role);
    try { await promote({ data: { email, role } }); toast.success(`You are now ${role}! Reloading…`); setTimeout(() => window.location.reload(), 600); }
    catch (e: any) { toast.error(e.message ?? "Access denied."); }
    finally { setLoading(null); }
  };
  return (
    <>
      <Crown className="h-12 w-12 mx-auto text-amber-500 mb-3" />
      <h1 className="font-display text-2xl font-bold">Owner / Admin access</h1>
      <p className="text-muted-foreground mt-2">Signed in as <strong className="text-foreground">{email}</strong>.</p>
      <Button onClick={() => claim("owner")} disabled={loading !== null} className="mt-6 bg-amber-500 hover:bg-amber-500/90 text-white">
        {loading === "owner" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Claim CEO / Owner
      </Button>
      <p className="text-xs text-muted-foreground mt-4">Only the verified CEO email can claim the owner role.</p>
    </>
  );
}

function ListingsTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const del = useServerFn(adminDeleteProduct);
  const { data: products = [] } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*, vendors(business_name)").order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });
  const remove = async (id: string) => {
    if (!confirm("Remove this listing?")) return;
    try { await del({ data: { product_id: id } }); toast.success("Removed"); qc.invalidateQueries({ queryKey: ["admin-products"] }); }
    catch (e: any) { toast.error(e.message); }
  };
  if (products.length === 0) return <Empty label="listings" />;
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {products.map((p: any) => (
        <div key={p.id} className="rounded-xl bg-card border border-border p-3 flex gap-3">
          <div className="h-20 w-20 rounded-lg bg-muted overflow-hidden shrink-0">{p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}</div>
          <div className="flex-1 min-w-0">
            <Link to="/product/$id" params={{ id: p.id }} className="font-semibold line-clamp-1 hover:underline">{p.title}</Link>
            <div className="text-xs text-muted-foreground truncate">{p.vendors?.business_name} · R{p.price_zar} · {p.category}</div>
            <p className="text-xs mt-1 line-clamp-2 text-foreground/70">{p.description}</p>
            <div className="mt-2 flex justify-end"><Button size="sm" variant="outline" onClick={() => remove(p.id)}><Trash2 className="h-3.5 w-3.5 mr-1" /> Remove</Button></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StoresTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const del = useServerFn(ownerDeleteVendor);
  const [warning, setWarning] = useState<{ id: string; name: string } | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const { data: vendors = [] } = useQuery({
    queryKey: ["admin-vendors"],
    queryFn: async () => {
      const { data } = await supabase.from("vendors").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete store "${name}" and all its listings?`)) return;
    try { await del({ data: { vendor_id: id } }); toast.success("Store deleted"); qc.invalidateQueries({ queryKey: ["admin-vendors"] }); }
    catch (e: any) { toast.error(e.message); }
  };
  if (vendors.length === 0) return <Empty label="stores" />;
  return (
    <>
      <div className="space-y-2">
        {vendors.map((v: any) => (
          <div key={v.id} className="rounded-xl bg-card border border-border p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold">{v.business_name} <span className="text-xs text-muted-foreground font-normal">· {v.owner_name}</span></div>
              <div className="text-xs text-muted-foreground truncate">{v.email} · {v.whatsapp_number} · {v.city} · {v.category}</div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => setViewing(v.id)}>Full info</Button>
              <Button size="sm" variant="outline" onClick={() => setWarning({ id: v.id, name: v.business_name })} className="text-amber-700 border-amber-300"><AlertTriangle className="h-3.5 w-3.5 mr-1" />Warn</Button>
              <Button size="sm" variant="outline" onClick={() => remove(v.id, v.business_name)}><Trash2 className="h-3.5 w-3.5 mr-1 text-destructive" />Delete</Button>
            </div>
          </div>
        ))}
      </div>
      {warning && <WarningDialog vendorId={warning.id} vendorName={warning.name} onClose={() => setWarning(null)} />}
      {viewing && <StoreDetailDialog vendorId={viewing} onClose={() => setViewing(null)} onWarn={(id, name) => { setViewing(null); setWarning({ id, name }); }} />}
    </>
  );
}

function WarningDialog({ vendorId, vendorName, onClose }: { vendorId: string; vendorName: string; onClose: () => void }) {
  const warnFn = useServerFn(sendVendorWarning);
  const [message, setMessage] = useState(`Dear ${vendorName},\n\nThis is an official warning from Niberdealz regarding your store. We have noticed the following issue:\n\n[describe what to fix]\n\nPlease correct this within 7 days, or your store may be suspended.\n\n— Niberdealz Team`);
  const [saving, setSaving] = useState(false);
  const send = async () => {
    setSaving(true);
    try { await warnFn({ data: { vendor_id: vendorId, message } }); toast.success("Warning sent to store"); onClose(); }
    catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-lg font-bold flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" />Warn {vendorName}</h3>
          <Button size="sm" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        <p className="text-xs text-muted-foreground mb-2">Edit the message — the store owner will see it on their dashboard.</p>
        <Textarea rows={10} value={message} onChange={(e) => setMessage(e.target.value)} />
        <div className="flex gap-2 mt-4 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={send} disabled={saving} className="bg-amber-500 hover:bg-amber-500/90 text-white">{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Send warning</Button>
        </div>
      </div>
    </div>
  );
}

function StoreDetailDialog({ vendorId, onClose, onWarn }: { vendorId: string; onClose: () => void; onWarn: (id: string, name: string) => void }) {
  const detailFn = useServerFn(ownerStoreDetail);
  const { data, isLoading } = useQuery({
    queryKey: ["store-detail", vendorId],
    queryFn: () => detailFn({ data: { vendor_id: vendorId } }),
  });
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-card rounded-2xl w-full max-w-2xl my-8 p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold">Store details</h3>
          <Button size="sm" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
        {isLoading || !data ? <div className="py-12 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div> : (
          <>
            <div className="space-y-3 mb-5">
              <div>
                <div className="font-display text-xl font-bold">{data.vendor?.business_name}</div>
                <div className="text-sm text-muted-foreground">{data.vendor?.category}</div>
              </div>
              <div className="grid sm:grid-cols-2 gap-2 text-sm">
                <Info Icon={Users} label="Owner" value={data.vendor?.owner_name} />
                <Info Icon={Mail} label="Email" value={data.vendor?.email} />
                <Info Icon={Phone} label="WhatsApp" value={data.vendor?.whatsapp_number} />
                <Info Icon={MapPin} label="City" value={data.vendor?.city} />
                <Info Icon={Calendar} label="Joined" value={data.vendor ? new Date(data.vendor.created_at).toLocaleDateString() : "—"} />
                <Info Icon={Calendar} label="Last sign-in" value={data.user?.last_sign_in_at ? new Date(data.user.last_sign_in_at).toLocaleString() : "—"} />
              </div>
              {data.vendor?.business_description && <p className="text-sm bg-muted/40 rounded-lg p-3">{data.vendor.business_description}</p>}
              <Button onClick={() => onWarn(vendorId, data.vendor?.business_name ?? "")} className="bg-amber-500 hover:bg-amber-500/90 text-white"><AlertTriangle className="h-4 w-4 mr-1.5" />Send a warning</Button>
            </div>

            <Section title={`Listings (${data.products.length})`}>
              {data.products.length === 0 ? <p className="text-sm text-muted-foreground">No listings.</p> : (
                <div className="space-y-1.5">
                  {data.products.map((p: any) => (
                    <Link key={p.id} to="/product/$id" params={{ id: p.id }} className="flex justify-between text-sm hover:underline">
                      <span className="truncate">{p.title} {p.is_sold && <span className="text-xs text-destructive">· sold</span>}</span>
                      <span className="text-muted-foreground">R{p.price_zar}</span>
                    </Link>
                  ))}
                </div>
              )}
            </Section>

            <Section title={`Warnings sent (${data.warnings.length})`}>
              {data.warnings.length === 0 ? <p className="text-sm text-muted-foreground">None.</p> : (
                <div className="space-y-2">
                  {data.warnings.map((w: any) => (
                    <div key={w.id} className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-2">
                      <div className="text-xs text-muted-foreground mb-1">{new Date(w.created_at).toLocaleString()} {w.acknowledged_at && "· acknowledged"}</div>
                      <p className="whitespace-pre-line text-foreground/80">{w.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title={`Reports against this store (${data.reports.length})`}>
              {data.reports.length === 0 ? <p className="text-sm text-muted-foreground">None.</p> : (
                <div className="space-y-2">
                  {data.reports.map((r: any) => (
                    <div key={r.id} className="text-sm border rounded-lg p-2">
                      <div className="flex justify-between"><span className="font-medium">{r.reason}</span><span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()} · {r.status}</span></div>
                      {r.note && <p className="text-xs text-foreground/70 mt-1">{r.note}</p>}
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

function Info({ Icon, label, value }: any) {
  return (
    <div className="flex items-start gap-2"><Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0"><div className="text-xs text-muted-foreground">{label}</div><div className="truncate">{value || "—"}</div></div>
    </div>
  );
}
function Section({ title, children }: any) {
  return <div className="mt-4 pt-4 border-t"><h4 className="font-semibold mb-2">{title}</h4>{children}</div>;
}

function ReportsTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const setStatus = useServerFn(setReportStatus);
  const [filter, setFilter] = useState<"open" | "reviewed" | "dismissed" | "all">("open");
  const { data: reports = [] } = useQuery({
    queryKey: ["admin-reports", filter],
    queryFn: async () => {
      let q = (supabase.from("reports" as any) as any).select("*").order("created_at", { ascending: false }).limit(200);
      if (filter !== "all") q = q.eq("status", filter);
      const { data } = await q;
      return data ?? [];
    },
  });
  const update = async (id: string, status: "reviewed" | "dismissed") => {
    try { await setStatus({ data: { report_id: id, status } }); toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-reports"] }); }
    catch (e: any) { toast.error(e.message); }
  };
  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(["open","reviewed","dismissed","all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${filter === f ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>{f}</button>
        ))}
      </div>
      {reports.length === 0 ? <Empty label="reports" /> : (
        <div className="space-y-2">
          {reports.map((r: any) => (
            <div key={r.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold flex items-center gap-2"><Flag className="h-4 w-4 text-destructive" />{r.reason}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.target_type === "product" ? <Link to="/product/$id" params={{ id: r.target_id }} className="underline">View product</Link> : <span>Legacy store report</span>}
                    {" · "}{new Date(r.created_at).toLocaleString()}
                  </div>
                  {r.note && <p className="text-sm mt-2 text-foreground/80 whitespace-pre-line">{r.note}</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === "open" ? "bg-amber-100 text-amber-800" : r.status === "reviewed" ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}>{r.status}</span>
                  {r.status === "open" && (
                    <div className="flex gap-1 mt-1">
                      <Button size="sm" variant="outline" onClick={() => update(r.id, "reviewed")}>Mark reviewed</Button>
                      <Button size="sm" variant="ghost" onClick={() => update(r.id, "dismissed")}>Dismiss</Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UsersTab() {
  const list = useServerFn(ownerListUsers);
  const { data, isLoading } = useQuery({ queryKey: ["owner-users"], queryFn: async () => list({ data: undefined as any }) });
  if (isLoading) return <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>;
  const users = data?.users ?? [];
  if (users.length === 0) return <Empty label="users" />;
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr><th className="px-3 py-2">Email</th><th className="px-3 py-2">Registered</th><th className="px-3 py-2">Last sign-in</th></tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-border">
              <td className="px-3 py-2 truncate max-w-xs">{u.email}</td>
              <td className="px-3 py-2 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
              <td className="px-3 py-2 text-muted-foreground">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/20 border-t flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{users.length} users</div>
    </div>
  );
}

function AdminsTab() {
  const promote = useServerFn(promoteToRole);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const add = async () => {
    setLoading(true);
    try { await promote({ data: { email, role: "admin" } }); toast.success("Admin added"); setEmail(""); }
    catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  };
  return (
    <div className="max-w-md space-y-3">
      <p className="text-sm text-muted-foreground">Promote a registered user to admin so they can moderate listings and reports.</p>
      <div className="flex gap-2">
        <Input type="email" placeholder="user@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button onClick={add} disabled={!email || loading} className="bg-[var(--deal)] hover:bg-[var(--deal)]/90 text-[color:var(--deal-foreground)]">{loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Add</Button>
      </div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center text-muted-foreground">No {label} yet.</div>;
}

function ApprovalsTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const setStatus = useServerFn(setVendorStatus);
  const { data: vendors = [] } = useQuery({
    queryKey: ["admin-approvals"],
    queryFn: async () => {
      const { data } = await supabase.from("vendors").select("*").eq("status", "pending").order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const decide = async (id: string, status: "approved" | "rejected") => {
    let reason: string | undefined;
    if (status === "rejected") { const r = prompt("Reason for declining? (optional)") ?? ""; reason = r; }
    try { await setStatus({ data: { vendor_id: id, status, reason } }); toast.success(status === "approved" ? "Store approved" : "Store declined"); qc.invalidateQueries({ queryKey: ["admin-approvals"] }); qc.invalidateQueries({ queryKey: ["admin-vendors"] }); }
    catch (e: any) { toast.error(e.message); }
  };
  if (vendors.length === 0) return <Empty label="pending stores" />;
  return (
    <div className="space-y-2">
      {vendors.map((v: any) => (
        <div key={v.id} className="rounded-xl bg-card border border-border p-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="font-semibold flex items-center gap-2">{v.business_name} <span className="text-xs text-muted-foreground font-normal">· {v.owner_name}</span></div>
            <div className="text-xs text-muted-foreground">{v.email} · {v.whatsapp_number} · {v.city} · {v.category}</div>
            <p className="text-sm mt-1 text-foreground/80">{v.business_description}</p>
            {v.legal_name && <p className="text-xs text-muted-foreground mt-1">Legal name: {v.legal_name}</p>}
            {(v.social_tiktok || v.social_instagram || v.social_facebook) && (
              <div className="mt-1 flex flex-wrap gap-2 text-xs">
                {([["tiktok", v.social_tiktok], ["instagram", v.social_instagram], ["facebook", v.social_facebook]] as const).map(([k, raw]) => {
                  const url = socialUrl(k as any, raw);
                  return url ? <a key={k} href={url} target="_blank" rel="noopener noreferrer" className="underline capitalize">{k}</a> : null;
                })}
              </div>
            )}
            {Array.isArray(v.application_images) && v.application_images.length > 0 && (
              <div className="mt-2 flex gap-2 flex-wrap">
                {v.application_images.map((img: string) => (
                  <a key={img} href={img} target="_blank" rel="noopener noreferrer" className="h-20 w-20 rounded-lg overflow-hidden border block">
                    <img src={img} alt="What this store sells" className="h-full w-full object-cover" />
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => decide(v.id, "rejected")}><X className="h-4 w-4 mr-1" />Decline</Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => decide(v.id, "approved")}><Check className="h-4 w-4 mr-1" />Approve</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SalesTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const create = useServerFn(createSaleCampaign);
  const del = useServerFn(deleteSaleCampaign);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", discount_pct: "10", starts_at: "", ends_at: "" });
  const [saving, setSaving] = useState(false);
  const { data: campaigns = [] } = useQuery({
    queryKey: ["admin-campaigns"],
    queryFn: async () => {
      const { data } = await (supabase.from("sale_campaigns" as any) as any).select("*, sale_participants(status)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const submit = async () => {
    setSaving(true);
    try {
      await create({ data: { title: form.title, description: form.description, discount_pct: Number(form.discount_pct), starts_at: new Date(form.starts_at).toISOString(), ends_at: new Date(form.ends_at).toISOString() } });
      toast.success("Campaign created and all stores invited");
      setShowNew(false);
      setForm({ title: "", description: "", discount_pct: "10", starts_at: "", ends_at: "" });
      qc.invalidateQueries({ queryKey: ["admin-campaigns"] });
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this campaign?")) return;
    try { await del({ data: { campaign_id: id } }); qc.invalidateQueries({ queryKey: ["admin-campaigns"] }); toast.success("Deleted"); }
    catch (e: any) { toast.error(e.message); }
  };
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">Run platform-wide sales. Stores get an invitation on their dashboard.</p>
        <Button onClick={() => setShowNew(!showNew)} className="bg-[var(--deal)] hover:bg-[var(--deal)]/90 text-[color:var(--deal-foreground)]"><Plus className="h-4 w-4 mr-1.5" />New campaign</Button>
      </div>
      {showNew && (
        <div className="rounded-xl border border-border bg-card p-4 mb-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Back to School 2026" /></div>
            <div><Label>Discount %</Label><Input type="number" min="1" max="90" value={form.discount_pct} onChange={(e) => setForm({ ...form, discount_pct: e.target.value })} /></div>
            <div><Label>Starts</Label><Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></div>
            <div><Label>Ends</Label><Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !form.title || !form.starts_at || !form.ends_at}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create & invite all stores</Button>
          </div>
        </div>
      )}
      {campaigns.length === 0 ? <Empty label="campaigns" /> : (
        <div className="space-y-2">
          {campaigns.map((c: any) => {
            const joined = (c.sale_participants ?? []).filter((p: any) => p.status === "joined").length;
            const invited = (c.sale_participants ?? []).length;
            const active = new Date(c.starts_at) <= new Date() && new Date(c.ends_at) >= new Date();
            return (
              <div key={c.id} className="rounded-xl border border-border bg-card p-4 flex flex-wrap justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[color:var(--deal)]" />{c.title} · -{c.discount_pct}%
                    {active && <span className="text-[10px] rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 uppercase font-bold">Live</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">{new Date(c.starts_at).toLocaleDateString()} — {new Date(c.ends_at).toLocaleDateString()} · {joined}/{invited} stores joined</div>
                  {c.description && <p className="text-sm mt-1 text-foreground/80">{c.description}</p>}
                </div>
                <Button size="sm" variant="outline" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4 mr-1 text-destructive" />Delete</Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BroadcastsTab() {
  const createFn = useServerFn(createBroadcast);
  const listFn = useServerFn(listBroadcasts);
  const qc = useQueryClient();
  const [tab2, setTab2] = useState<"vendors" | "buyers">("vendors");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ count: number; recipients: string[]; audience: string } | null>(null);

  const { data: hist } = useQuery({
    queryKey: ["broadcasts"],
    queryFn: () => listFn({ data: undefined as any }),
  });

  const send = async () => {
    if (!subject.trim() || !body.trim()) { toast.error("Subject and message required."); return; }
    setSending(true);
    try {
      const res = await createFn({ data: { audience: tab2, subject, body } });
      setLastResult({ count: res.count, recipients: res.recipients, audience: tab2 });
      toast.success(`Prepared for ${res.count} recipient${res.count === 1 ? "" : "s"}. Click "Open in mail app" to send.`);
      qc.invalidateQueries({ queryKey: ["broadcasts"] });
    } catch (e: any) { toast.error(e.message); }
    finally { setSending(false); }
  };

  const mailtoLink = lastResult
    ? `mailto:?bcc=${encodeURIComponent(lastResult.recipients.join(","))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    : "#";

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-1"><Mail className="h-5 w-5 text-[color:var(--deal)]" /><h3 className="font-display text-lg font-bold">Send an email broadcast</h3></div>
        <p className="text-xs text-muted-foreground mb-4">Reach every signed-up user in one click. Choose vendors, buyers, or both.</p>

        <div className="inline-flex rounded-lg border border-border p-1 mb-4">
          <button onClick={() => setTab2("vendors")} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition ${tab2 === "vendors" ? "bg-foreground text-background" : "text-muted-foreground"}`}>Store owners</button>
          <button onClick={() => setTab2("buyers")} className={`px-3 py-1.5 text-sm font-semibold rounded-md transition ${tab2 === "buyers" ? "bg-foreground text-background" : "text-muted-foreground"}`}>Customers</button>
        </div>

        <div className="space-y-3">
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={tab2 === "vendors" ? "New feature for sellers…" : "New products this week on Niberdealz"} />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your update, promo or news…" />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 items-center">
          <Button onClick={send} disabled={sending} className="bg-foreground text-background hover:bg-foreground/90">
            {sending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Prepare send
          </Button>
          {lastResult && (
            <>
              <Button asChild variant="outline"><a href={mailtoLink} target="_blank" rel="noopener noreferrer">Open in mail app ({lastResult.count})</a></Button>
              <Button variant="ghost" onClick={() => navigator.clipboard.writeText(lastResult.recipients.join(", ")).then(() => toast.success("Emails copied"))}>Copy emails</Button>
            </>
          )}
        </div>
        {lastResult && (
          <div className="mt-3 rounded-lg bg-secondary/50 p-3 text-xs">
            <div className="font-semibold mb-1">{lastResult.count} {lastResult.audience === "vendors" ? "store owner" : "customer"}{lastResult.count === 1 ? "" : "s"} ready:</div>
            <div className="max-h-32 overflow-y-auto text-muted-foreground break-all">{lastResult.recipients.join(", ") || "(no addresses)"}</div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-display text-lg font-bold mb-3">Recent broadcasts</h3>
        {(!hist || hist.broadcasts.length === 0) ? <p className="text-sm text-muted-foreground">No broadcasts yet.</p> : (
          <div className="space-y-2">
            {hist.broadcasts.map((b: any) => (
              <div key={b.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <div className="font-semibold">{b.subject}</div>
                  <div className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleString()} · {b.audience} · {b.recipient_count} recipient{b.recipient_count === 1 ? "" : "s"}</div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground whitespace-pre-line line-clamp-3">{b.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
