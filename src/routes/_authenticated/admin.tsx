import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, ShieldCheck, Loader2, Crown, Users, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { adminDeleteProduct, ownerDeleteVendor, ownerListUsers, promoteToRole } from "@/lib/marketplace.functions";
import { CEO_EMAIL } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/admin")({ component: Admin });

function Admin() {
  const { user, roles, isLoading } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"listings" | "stores" | "users" | "admins">("listings");

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
    ? (["listings", "stores", "users", "admins"] as const)
    : (["listings"] as const);

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="container mx-auto px-4 py-8 flex-1 max-w-6xl">
        <h1 className="font-display text-3xl font-bold mb-1 flex items-center gap-2">
          {isOwner ? <Crown className="h-7 w-7 text-amber-500" /> : <ShieldCheck className="h-7 w-7 text-[color:var(--deal)]" />}
          {isOwner ? "Owner panel" : "Admin"}
        </h1>
        <p className="text-muted-foreground mb-6">
          {isOwner ? "Manage users, stores and listings on Niberdealz." : "Remove inappropriate listings."}
        </p>

        <div className="flex gap-2 mb-6 border-b border-border overflow-x-auto">
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px capitalize transition ${tab === t ? "border-[var(--deal)] text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t}</button>
          ))}
        </div>

        {tab === "listings" && <ListingsTab qc={qc} />}
        {tab === "stores" && isOwner && <StoresTab qc={qc} />}
        {tab === "users" && isOwner && <UsersTab />}
        {tab === "admins" && isOwner && <AdminsTab />}
      </div>
      <SiteFooter />
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
  const isCeo = email.toLowerCase() === CEO_EMAIL.toLowerCase();
  return (
    <>
      <Crown className="h-12 w-12 mx-auto text-amber-500 mb-3" />
      <h1 className="font-display text-2xl font-bold">Owner / Admin access</h1>
      <p className="text-muted-foreground mt-2">Signed in as <strong className="text-foreground">{email}</strong>.</p>
      {isCeo && (
        <Button onClick={() => claim("owner")} disabled={loading !== null} className="mt-6 bg-amber-500 hover:bg-amber-500/90 text-white">
          {loading === "owner" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Claim CEO / Owner
        </Button>
      )}
      <p className="text-xs text-muted-foreground mt-4">Only the owner can promote new admins.</p>
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
