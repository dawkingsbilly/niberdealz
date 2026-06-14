import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Check, X, ShieldCheck, AlertTriangle, Eye, UserPlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { adminVendorAction, adminProductAction, adminPaymentAction, promoteToAdmin } from "@/lib/marketplace.functions";

export const Route = createFileRoute("/_authenticated/admin")({ component: Admin });

function Admin() {
  const { user, roles, isLoading } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"vendors" | "products" | "payments" | "admins">("vendors");

  const isAdmin = roles.includes("admin");

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="flex-1 container mx-auto px-4 py-16 max-w-lg text-center">
          {adminBootstrap?.hasAdmin === false ? (
            <ClaimAdmin email={user?.email ?? ""} />
          ) : (
            <>
              <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h1 className="font-display text-2xl font-bold">Admin only</h1>
              <p className="text-muted-foreground mt-2">You don't have admin access.</p>
              <Button asChild className="mt-6"><Link to="/dashboard">Back to dashboard</Link></Button>
            </>
          )}
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="container mx-auto px-4 py-8 flex-1 max-w-6xl">
        <h1 className="font-display text-3xl font-bold mb-1 flex items-center gap-2"><ShieldCheck className="h-7 w-7 text-[color:var(--deal)]" />Admin</h1>
        <p className="text-muted-foreground mb-6">Approve vendors, review products, verify payments.</p>

        <div className="flex gap-2 mb-6 border-b border-border overflow-x-auto">
          {(["vendors", "products", "payments", "admins"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px capitalize transition ${tab === t ? "border-[var(--deal)] text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{t}</button>
          ))}
        </div>

        {tab === "vendors" && <VendorsTab qc={qc} />}
        {tab === "products" && <ProductsTab qc={qc} />}
        {tab === "payments" && <PaymentsTab qc={qc} />}
        {tab === "admins" && <AdminsTab />}
      </div>
      <SiteFooter />
    </div>
  );
}

function ClaimAdmin({ email }: { email: string }) {
  const promote = useServerFn(promoteToAdmin);
  const [loading, setLoading] = useState(false);
  const claim = async () => {
    setLoading(true);
    try {
      await promote({ data: { email } });
      toast.success("You are now admin! Reloading…");
      setTimeout(() => window.location.reload(), 600);
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally { setLoading(false); }
  };
  return (
    <>
      <ShieldCheck className="h-12 w-12 mx-auto text-[color:var(--deal)] mb-3" />
      <h1 className="font-display text-2xl font-bold">Claim admin access</h1>
      <p className="text-muted-foreground mt-2">No admin exists yet. As the first signed-in user, you can claim admin for <strong className="text-foreground">{email}</strong>.</p>
      <Button onClick={claim} disabled={loading} className="mt-6 bg-[var(--deal)] hover:bg-[var(--deal)]/90 text-[color:var(--deal-foreground)]">
        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Claim admin
      </Button>
    </>
  );
}

function VendorsTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const action = useServerFn(adminVendorAction);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const { data: vendors = [] } = useQuery({
    queryKey: ["admin-vendors", filter],
    queryFn: async () => {
      let q = supabase.from("vendors").select("*").order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter);
      const { data } = await q; return data ?? [];
    },
  });

  const act = async (id: string, type: "approve" | "reject") => {
    const reason = type === "reject" ? prompt("Reason for rejection?") ?? undefined : undefined;
    try { await action({ data: { vendor_id: id, action: type, reason } }); toast.success(`Vendor ${type}d`); qc.invalidateQueries({ queryKey: ["admin-vendors"] }); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <>
      <FilterRow value={filter} onChange={setFilter} />
      {vendors.length === 0 ? <Empty label="vendors" /> : (
        <div className="space-y-3">
          {vendors.map((v: any) => (
            <div key={v.id} className="rounded-xl bg-card border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{v.business_name} <span className="text-xs text-muted-foreground font-normal">· {v.owner_name}</span></div>
                  <div className="text-xs text-muted-foreground">{v.email} · {v.whatsapp_number} · {v.city}, {v.province} · {v.category}</div>
                  <p className="text-sm mt-2">{v.business_description}</p>
                  {typeof v.ai_risk_score === "number" && (
                    <div className="mt-2 text-xs flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                      AI risk: <strong>{v.ai_risk_score}/100</strong> — {v.ai_review_notes}
                    </div>
                  )}
                </div>
                <StatusBadge status={v.status} />
              </div>
              {v.status === "pending" && (
                <div className="mt-3 flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => act(v.id, "reject")}><X className="h-4 w-4 mr-1" />Reject</Button>
                  <Button size="sm" onClick={() => act(v.id, "approve")} className="bg-success hover:bg-success/90 text-success-foreground"><Check className="h-4 w-4 mr-1" />Approve</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function ProductsTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const action = useServerFn(adminProductAction);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const { data: products = [] } = useQuery({
    queryKey: ["admin-products", filter],
    queryFn: async () => {
      let q = supabase.from("products").select("*, vendors(business_name)").order("created_at", { ascending: false });
      if (filter !== "all") q = q.eq("status", filter);
      const { data } = await q; return data ?? [];
    },
  });
  const act = async (id: string, type: "approve" | "reject") => {
    const reason = type === "reject" ? prompt("Reason?") ?? undefined : undefined;
    try { await action({ data: { product_id: id, action: type, reason } }); toast.success(`Product ${type}d`); qc.invalidateQueries({ queryKey: ["admin-products"] }); }
    catch (e: any) { toast.error(e.message); }
  };
  return (
    <>
      <FilterRow value={filter} onChange={setFilter} />
      {products.length === 0 ? <Empty label="products" /> : (
        <div className="grid sm:grid-cols-2 gap-3">
          {products.map((p: any) => (
            <div key={p.id} className="rounded-xl bg-card border border-border p-4 flex gap-3">
              <div className="h-20 w-20 rounded-lg bg-muted overflow-hidden shrink-0">{p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold line-clamp-1">{p.title}</div>
                <div className="text-xs text-muted-foreground">{p.vendors?.business_name} · R{p.price_zar} · {p.category}</div>
                <p className="text-xs mt-1 line-clamp-2 text-foreground/70">{p.description}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <StatusBadge status={p.status} />
                  {p.status === "pending" && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => act(p.id, "reject")}><X className="h-3 w-3" /></Button>
                      <Button size="sm" onClick={() => act(p.id, "approve")} className="bg-success hover:bg-success/90 text-success-foreground"><Check className="h-3 w-3" /></Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function PaymentsTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const action = useServerFn(adminPaymentAction);
  const { data: payments = [] } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: async () => {
      const { data } = await supabase.from("payments").select("*, vendors(business_name, email)").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const viewProof = async (path: string) => {
    const { data, error } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 300);
    if (error) toast.error(error.message); else window.open(data.signedUrl, "_blank");
  };
  const act = async (id: string, type: "approve" | "reject") => {
    const notes = type === "reject" ? prompt("Notes?") ?? undefined : undefined;
    try { await action({ data: { payment_id: id, action: type, notes } }); toast.success(`Payment ${type}d` + (type === "approve" ? " — plan activated" : "")); qc.invalidateQueries({ queryKey: ["admin-payments"] }); }
    catch (e: any) { toast.error(e.message); }
  };

  return (
    <>
      {payments.length === 0 ? <Empty label="payments" /> : (
        <div className="space-y-3">
          {payments.map((p: any) => (
            <div key={p.id} className="rounded-xl bg-card border border-border p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{p.vendors?.business_name} <span className="text-xs text-muted-foreground font-normal">{p.vendors?.email}</span></div>
                <div className="text-sm">R{p.amount_zar} · <span className="capitalize">{p.plan}</span> plan · ref: {p.reference ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => viewProof(p.proof_url)}><Eye className="h-3.5 w-3.5 mr-1" />Proof</Button>
                <StatusBadge status={p.status} />
                {p.status === "pending" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => act(p.id, "reject")}><X className="h-4 w-4" /></Button>
                    <Button size="sm" onClick={() => act(p.id, "approve")} className="bg-success hover:bg-success/90 text-success-foreground"><Check className="h-4 w-4" /></Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function AdminsTab() {
  const promote = useServerFn(promoteToAdmin);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const add = async () => {
    setLoading(true);
    try { await promote({ data: { email } }); toast.success("Admin added"); setEmail(""); }
    catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };
  return (
    <div className="max-w-md rounded-xl bg-card border border-border p-6">
      <h3 className="font-display text-lg font-bold mb-2 flex items-center gap-2"><UserPlus className="h-5 w-5" />Add an admin</h3>
      <p className="text-sm text-muted-foreground mb-4">The person must have an account already. Enter their email.</p>
      <div className="flex gap-2">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" />
        <Button onClick={add} disabled={loading || !email} className="bg-[var(--deal)] hover:bg-[var(--deal)]/90 text-[color:var(--deal-foreground)]">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
        </Button>
      </div>
    </div>
  );
}

function FilterRow({ value, onChange }: { value: string; onChange: (v: any) => void }) {
  return (
    <div className="flex gap-2 mb-4 text-sm">
      {(["pending", "approved", "rejected", "all"] as const).map((f) => (
        <button key={f} onClick={() => onChange(f)} className={`px-3 py-1 rounded-full capitalize ${value === f ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{f}</button>
      ))}
    </div>
  );
}
function StatusBadge({ status }: { status: string }) {
  const cls = status === "approved" ? "bg-success/10 text-success" : status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-warning/15 text-warning-foreground border border-warning/30";
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cls}`}>{status}</span>;
}
function Empty({ label }: { label: string }) {
  return <div className="rounded-xl border-2 border-dashed border-border p-10 text-center text-muted-foreground">No {label}.</div>;
}
