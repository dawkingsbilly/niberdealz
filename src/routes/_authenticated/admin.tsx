import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2, ShieldCheck, Loader2, Crown, Users, Store, BarChart3, Eye, MessageCircle, Package } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { adminDeleteProduct, ownerDeleteVendor, ownerListUsers, promoteToRole } from "@/lib/marketplace.functions";

export const Route = createFileRoute("/_authenticated/admin")({ component: Admin });

function Admin() {
  const { user, roles, isLoading } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"overview" | "listings" | "stores" | "users" | "admins">("overview");

  const isAdmin = roles.includes("admin");
  const isOwner = roles.includes("owner");

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (!isAdmin && !isOwner) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="flex-1 container mx-auto px-4 py-16 max-w-lg text-center">
          <ClaimAccess email={user?.email ?? ""} />
        </div>
        <SiteFooter />
      </div>
    );
  }

  const tabs = isOwner
    ? (["overview", "listings", "stores", "users", "admins"] as const)
    : (["overview", "listings"] as const);

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
              <Button asChild size="sm" variant="outline"><Link to="/dashboard"><Store className="h-4 w-4 mr-1.5" />My store</Link></Button>
              <Button asChild size="sm" className="bg-foreground text-background hover:bg-foreground/90"><Link to="/register-shop">Sell a product</Link></Button>
            </div>
          )}
        </div>
        <p className="text-muted-foreground mb-6">
          {isOwner ? "Monitor every seller, remove scams or bad listings, delete entire stores, and sell your own products." : "Remove inappropriate listings."}
        </p>

        <div className="flex gap-2 mb-6 border-b border-border overflow-x-auto">
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px capitalize transition whitespace-nowrap ${tab === t ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t}</button>
          ))}
        </div>

        {tab === "overview" && <OverviewTab />}
        {tab === "listings" && <ListingsTab qc={qc} />}
        {tab === "stores" && isOwner && <StoresTab qc={qc} />}
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
      const [events, products, vendors] = await Promise.all([
        supabase.from("product_events").select("event_type, created_at").gte("created_at", since).limit(10000),
        supabase.from("products").select("id, is_sold", { count: "exact" }),
        supabase.from("vendors").select("id", { count: "exact", head: true }),
      ]);
      return {
        events: events.data ?? [],
        productCount: products.count ?? 0,
        soldCount: (products.data ?? []).filter((p: any) => p.is_sold).length,
        vendorCount: vendors.count ?? 0,
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
      const row = byDate.get(k);
      if (!row) return;
      if (e.event_type === "view") row.views++;
      else if (e.event_type === "whatsapp_click") row.whatsapp++;
    });
    return days;
  }, [data]);

  const totalViews = series.reduce((s, d) => s + d.views, 0);
  const totalWa = series.reduce((s, d) => s + d.whatsapp, 0);
  const ctr = totalViews ? Math.round((totalWa / totalViews) * 100) : 0;

  if (isLoading) return <div className="py-12 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard Icon={Eye} label="Listing views (30d)" value={totalViews.toLocaleString()} />
        <StatCard Icon={MessageCircle} label="WhatsApp taps (30d)" value={totalWa.toLocaleString()} sub={`${ctr}% click-through`} />
        <StatCard Icon={Package} label="Active listings" value={(data?.productCount ?? 0) - (data?.soldCount ?? 0)} sub={`${data?.soldCount ?? 0} sold`} />
        <StatCard Icon={Store} label="Stores" value={data?.vendorCount ?? 0} />
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-semibold mb-1 flex items-center gap-2"><BarChart3 className="h-4 w-4" />Traffic — last 30 days</h3>
        <p className="text-xs text-muted-foreground mb-4">Listing views and WhatsApp chat hand-offs.</p>
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
        <h3 className="font-semibold mb-1">Engagement by day</h3>
        <p className="text-xs text-muted-foreground mb-4">Side-by-side comparison.</p>
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
    try {
      await promote({ data: { email, role } });
      toast.success(`You are now ${role}! Reloading…`);
      setTimeout(() => window.location.reload(), 600);
    } catch (e: any) {
      toast.error(e.message ?? "Access denied.");
    } finally { setLoading(null); }
  };
  return (
    <>
      <Crown className="h-12 w-12 mx-auto text-amber-500 mb-3" />
      <h1 className="font-display text-2xl font-bold">Owner / Admin access</h1>
      <p className="text-muted-foreground mt-2">Signed in as <strong className="text-foreground">{email}</strong>.</p>
      <Button onClick={() => claim("owner")} disabled={loading !== null} className="mt-6 bg-amber-500 hover:bg-amber-500/90 text-white">
        {loading === "owner" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Claim CEO / Owner
      </Button>
      <p className="text-xs text-muted-foreground mt-4">Only the verified CEO email can claim the owner role. Additional admins can only be added by the owner.</p>
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
            <div className="font-semibold line-clamp-1">{p.title}</div>
            <div className="text-xs text-muted-foreground truncate">{p.vendors?.business_name} · R{p.price_zar} · {p.category}</div>
            <p className="text-xs mt-1 line-clamp-2 text-foreground/70">{p.description}</p>
            <div className="mt-2 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => remove(p.id)}><Trash2 className="h-3.5 w-3.5 mr-1" /> Remove</Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StoresTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const del = useServerFn(ownerDeleteVendor);
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
    <div className="space-y-2">
      {vendors.map((v: any) => (
        <div key={v.id} className="rounded-xl bg-card border border-border p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-semibold">{v.business_name} <span className="text-xs text-muted-foreground font-normal">· {v.owner_name}</span></div>
            <div className="text-xs text-muted-foreground">{v.email} · {v.whatsapp_number} · {v.city} · {v.category}</div>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline"><Link to="/vendor/$id" params={{ id: v.id }}><Store className="h-3.5 w-3.5 mr-1" />View</Link></Button>
            <Button size="sm" variant="outline" onClick={() => remove(v.id, v.business_name)}><Trash2 className="h-3.5 w-3.5 mr-1 text-destructive" />Delete</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function UsersTab() {
  const list = useServerFn(ownerListUsers);
  const { data, isLoading } = useQuery({
    queryKey: ["owner-users"],
    queryFn: async () => list({ data: undefined as any }),
  });
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
      <p className="text-sm text-muted-foreground">Promote an existing user to admin so they can remove inappropriate listings. They must register first.</p>
      <div className="flex gap-2">
        <Input type="email" placeholder="user@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button onClick={add} disabled={!email || loading} className="bg-[var(--deal)] hover:bg-[var(--deal)]/90 text-[color:var(--deal-foreground)]">
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Add
        </Button>
      </div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center text-muted-foreground">No {label} yet.</div>;
}
