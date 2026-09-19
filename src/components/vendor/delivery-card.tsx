import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DELIVERY_METHODS, parseDeliveryOptions, type DeliveryMethodKey } from "@/lib/affiliate";
import { setVendorDeliveryOptions } from "@/lib/orders.functions";

type Row = { on: boolean; fee: string; days: string };

export function DeliveryCard({ products }: { products: any[] }) {
  const save = useServerFn(setVendorDeliveryOptions);
  const qc = useQueryClient();
  const [rows, setRows] = useState<Record<DeliveryMethodKey, Row>>({
    courier: { on: false, fee: "", days: "" },
    paxi: { on: false, fee: "", days: "" },
    pickup: { on: false, fee: "", days: "" },
    meetup: { on: false, fee: "", days: "" },
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const first = products.find((p) => Array.isArray(p.delivery_options) && p.delivery_options.length > 0);
    if (!first) return;
    const opts = parseDeliveryOptions(first.delivery_options);
    setRows((prev) => {
      const next = { ...prev };
      opts.forEach((o) => {
        next[o.method] = { on: true, fee: String(o.fee_zar), days: String(o.days) };
      });
      return next;
    });
  }, [products.length]);

  const upd = (key: DeliveryMethodKey, patch: Partial<Row>) =>
    setRows((r) => ({ ...r, [key]: { ...r[key], ...patch } }));

  const submit = async () => {
    const options = DELIVERY_METHODS.filter((m) => rows[m.key].on).map((m) => ({
      method: m.key,
      fee_zar: Number(rows[m.key].fee) || 0,
      days: Math.max(0, Math.floor(Number(rows[m.key].days) || 0)),
    }));
    if (options.length === 0) {
      toast.error("Choose at least one delivery option.");
      return;
    }
    setBusy(true);
    try {
      await save({ data: { options } });
      toast.success("Delivery options saved for all your listings.");
      qc.invalidateQueries({ queryKey: ["vendor-products"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save your delivery options.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl bg-card border border-border p-5 shadow-[var(--shadow-card)]">
      <h2 className="font-display text-xl font-bold flex items-center gap-2"><Truck className="h-5 w-5 text-[color:var(--deal)]" />Delivery options</h2>
      <p className="text-sm text-muted-foreground mt-1">
        Pick how buyers can receive their order, with your own fee and estimated days. These apply to all your listings.
      </p>
      <div className="mt-4 space-y-3">
        {DELIVERY_METHODS.map((m) => (
          <div key={m.key} className="rounded-xl border border-border p-3">
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input type="checkbox" checked={rows[m.key].on} onChange={(e) => upd(m.key, { on: e.target.checked })} className="h-4 w-4 accent-[var(--deal)]" />
              {m.label}
            </label>
            {rows[m.key].on && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Fee in rand</Label>
                  <Input type="number" min="0" step="1" value={rows[m.key].fee} onChange={(e) => upd(m.key, { fee: e.target.value })} placeholder="0 for free" />
                </div>
                <div className="space-y-1.5">
                  <Label>Estimated days</Label>
                  <Input type="number" min="0" step="1" value={rows[m.key].days} onChange={(e) => upd(m.key, { days: e.target.value })} placeholder="e.g. 3" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <Button className="mt-4" onClick={submit} disabled={busy}>
        {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save delivery options
      </Button>
    </div>
  );
}
