import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Copy, Gift, Loader2, Share2, Sparkles, Wallet } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMyAffiliate, requestAffiliatePayout } from "@/lib/affiliate.functions";
import {
  COUPON_DISCOUNT_PCT,
  MIN_POINTS_TO_SPEND,
  MIN_POINTS_TO_WITHDRAW,
  POINTS_PER_SIGNUP,
  POINT_VALUE_ZAR,
  levelFor,
  pointsToZar,
} from "@/lib/affiliate";

export const Route = createFileRoute("/_authenticated/affiliate")({
  head: () => ({
    meta: [
      { title: "Affiliate programme | Niberdealz" },
      { name: "description", content: "Share your Niberdealz link and coupon code, earn reward points on every join and purchase, unlock discounts and cash withdrawals." },
      { property: "og:title", content: "Affiliate programme | Niberdealz" },
      { property: "og:description", content: "Earn points, discounts and commission by sharing Niberdealz." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AffiliatePage,
});

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-bold mt-1">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

function AffiliatePage() {
  const load = useServerFn(getMyAffiliate);
  const payout = useServerFn(requestAffiliatePayout);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["my-affiliate"], queryFn: () => load() });

  const [points, setPoints] = useState("");
  const [method, setMethod] = useState("Bank transfer");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  if (isLoading || !data) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        <SiteFooter />
      </div>
    );
  }

  const d: any = data;
  const account = d.account;
  const lvl = levelFor(d.lifetimePoints ?? 0);
  const link = typeof window !== "undefined" ? `${window.location.origin}/?ref=${account.code}` : `/?ref=${account.code}`;
  const successful = (d.referrals ?? []).filter((r: any) => r.has_purchased).length;
  const commission = Math.round(((d.orders ?? []).reduce((s: number, o: any) => s + Number(o.total_zar || 0), 0) * lvl.current.commissionPct) / 100 * 100) / 100;

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${what} copied.`);
    } catch {
      toast.error("Could not copy. Please copy it by hand.");
    }
  };

  const withdraw = async () => {
    const p = Math.floor(Number(points) || 0);
    if (p < MIN_POINTS_TO_WITHDRAW) {
      toast.error(`You need at least ${MIN_POINTS_TO_WITHDRAW} points to withdraw.`);
      return;
    }
    if (details.trim().length < 3) {
      toast.error("Please add the account details for your payment.");
      return;
    }
    setBusy(true);
    try {
      const res: any = await payout({ data: { points: p, method, details: details.trim() } });
      toast.success(`Withdrawal of R${res.amount_zar} requested. Our team reviews it.`);
      setPoints("");
      setDetails("");
      qc.invalidateQueries({ queryKey: ["my-affiliate"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Could not send your request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="container mx-auto px-4 py-6 flex-1 max-w-4xl">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Keep browsing
        </Link>
        <h1 className="font-display text-3xl font-bold flex items-center gap-2"><Share2 className="h-7 w-7" /> Affiliate programme</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Share your link or coupon code. You earn {POINTS_PER_SIGNUP} points for every member who joins with it, plus points on every purchase they make.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Points available" value={String(account.points)} hint={`Worth R${pointsToZar(account.points).toFixed(2)}`} />
          <Stat label="Points earned overall" value={String(d.lifetimePoints ?? 0)} />
          <Stat label="Members joined" value={String((d.referrals ?? []).length)} hint={`${successful} of them bought something`} />
          <Stat label="Purchases with your code" value={String((d.orders ?? []).length)} />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm font-semibold">Your affiliate link</p>
            <div className="mt-2 flex gap-2">
              <Input readOnly value={link} className="text-xs" />
              <Button variant="outline" size="icon" onClick={() => copy(link, "Link")} aria-label="Copy link"><Copy className="h-4 w-4" /></Button>
            </div>
            <p className="text-sm font-semibold mt-4">Your coupon code</p>
            <div className="mt-2 flex gap-2">
              <Input readOnly value={account.code} className="font-mono" />
              <Button variant="outline" size="icon" onClick={() => copy(account.code, "Code")} aria-label="Copy code"><Copy className="h-4 w-4" /></Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Buyers get {COUPON_DISCOUNT_PCT}% off with your code, and you earn points on what they spend.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-[color:var(--deal)]" />Level {lvl.current.level}: {lvl.current.name}</p>
            <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-[var(--deal)]" style={{ width: `${lvl.progressPct}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {lvl.next
                ? `${lvl.pointsToNext} more points to reach ${lvl.next.name} and ${lvl.next.commissionPct}% commission.`
                : "You reached the top level."}
            </p>
            <ul className="mt-3 text-xs text-muted-foreground space-y-1">
              <li>Commission at your level: <strong className="text-foreground">{lvl.current.commissionPct}%</strong></li>
              <li>Commission earned so far: <strong className="text-foreground">R{commission.toLocaleString("en-ZA")}</strong></li>
              <li>1 point is worth R{POINT_VALUE_ZAR.toFixed(2)}, and you can spend from {MIN_POINTS_TO_SPEND} points at checkout.</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-semibold flex items-center gap-2"><Wallet className="h-4 w-4" />Withdraw cash</p>
          <p className="text-xs text-muted-foreground mt-1">
            Withdrawals unlock from {MIN_POINTS_TO_WITHDRAW} points, which is R{pointsToZar(MIN_POINTS_TO_WITHDRAW).toFixed(2)}.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="wpoints">Points to withdraw</Label>
              <Input id="wpoints" type="number" min={MIN_POINTS_TO_WITHDRAW} step="1" value={points} onChange={(e) => setPoints(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wmethod">Payment method</Label>
              <select id="wmethod" value={method} onChange={(e) => setMethod(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option>Bank transfer</option>
                <option>Capitec Pay</option>
                <option>eWallet</option>
                <option>Airtime or data</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wdetails">Account details</Label>
              <Input id="wdetails" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Bank, account number or cellphone number" />
            </div>
          </div>
          <Button className="mt-3" disabled={busy || account.points < MIN_POINTS_TO_WITHDRAW} onClick={withdraw}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Request withdrawal
          </Button>

          {(d.payouts ?? []).length > 0 && (
            <div className="mt-4 space-y-2">
              {(d.payouts as any[]).map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                  <span>R{Number(p.amount_zar).toLocaleString("en-ZA")} {"\u00b7"} {p.method}</span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{p.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <p className="text-sm font-semibold flex items-center gap-2"><Gift className="h-4 w-4" />Points history</p>
          {(d.ledger ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground mt-2">Nothing yet. Share your link to get started.</p>
          ) : (
            <div className="mt-3 divide-y divide-border">
              {(d.ledger as any[]).map((l) => (
                <div key={l.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{l.note}</p>
                    <p className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("en-ZA")}</p>
                  </div>
                  <span className={`font-semibold ${l.points >= 0 ? "text-success" : "text-destructive"}`}>{l.points > 0 ? `+${l.points}` : l.points}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
