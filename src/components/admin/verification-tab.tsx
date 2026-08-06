import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { BadgeCheck, Check, Crown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { staffListVerificationRequests, setVerificationStatus } from "@/lib/marketplace.functions";
import { socialUrl, socialLabel } from "@/lib/socials";

export function VerificationTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(staffListVerificationRequests);
  const decideFn = useServerFn(setVerificationStatus);

  const { data, isLoading } = useQuery({
    queryKey: ["staff-verifications"],
    queryFn: () => listFn({ data: undefined as any }),
  });
  const requests: any[] = (data as any)?.requests ?? [];

  const decide = async (id: string, status: "approved" | "rejected") => {
    let notes: string | undefined;
    if (status === "rejected") notes = prompt("Reason for declining? (optional)") ?? "";
    try {
      await decideFn({ data: { request_id: id, status, admin_notes: notes } });
      toast.success(status === "approved" ? "Verified badge granted" : "Application declined");
      qc.invalidateQueries({ queryKey: ["staff-verifications"] });
      qc.invalidateQueries({ queryKey: ["admin-vendors"] });
    } catch (e: any) { toast.error(e.message); }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading applications…</p>;
  if (requests.length === 0) {
    return <div className="rounded-xl border-2 border-dashed border-border p-12 text-center text-muted-foreground">No verification applications yet.</div>;
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Approve only sellers who show a real track record. Approving grants the verified badge. Stores that run their own website also become official stores.
      </p>
      {requests.map((r) => {
        const v = r.vendors ?? {};
        const socials = [
          ["TikTok", socialUrl("tiktok", r.social_tiktok)],
          ["Instagram", socialUrl("instagram", r.social_instagram)],
          ["Facebook", socialUrl("facebook", r.social_facebook)],
        ].filter(([, url]) => !!url) as [string, string][];
        return (
          <div key={r.id} className="rounded-xl bg-card border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold flex items-center gap-2">
                  {v.business_name ?? "Store"}
                  {v.verified && <BadgeCheck className="h-4 w-4 text-sky-600" />}
                  {v.is_official && <Crown className="h-4 w-4 text-amber-500" />}
                  <span className={`text-[10px] rounded-full px-2 py-0.5 uppercase font-bold ${r.status === "pending" ? "bg-amber-100 text-amber-800" : r.status === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>{r.status}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Legal name: {r.legal_name} · {v.email} · {v.city} · selling about {r.selling_since_months} month(s) on {r.selling_channel}
                </div>
                {(r.website_url || v.website_url) && (
                  <a href={r.website_url || v.website_url} target="_blank" rel="noopener noreferrer" className="text-xs underline break-all">{r.website_url || v.website_url}</a>
                )}
                {socials.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    {socials.map(([label, url]) => (
                      <a key={label} href={url} target="_blank" rel="noopener noreferrer" className="underline">
                        {label} {socialLabel(url)}
                      </a>
                    ))}
                  </div>
                )}
                {r.note && <p className="text-sm mt-1 text-foreground/80 whitespace-pre-line">{r.note}</p>}
                {Array.isArray(r.proof_images) && r.proof_images.length > 0 && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {r.proof_images.map((img: string) => (
                      <a key={img} href={img} target="_blank" rel="noopener noreferrer" className="h-20 w-20 rounded-lg overflow-hidden border block">
                        <img src={img} alt="Customer review proof" className="h-full w-full object-cover" />
                      </a>
                    ))}
                  </div>
                )}
                {r.admin_notes && <p className="text-xs text-muted-foreground mt-2">Notes: {r.admin_notes}</p>}
              </div>
              {r.status === "pending" && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => decide(r.id, "rejected")}><X className="h-4 w-4 mr-1" />Decline</Button>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => decide(r.id, "approved")}><Check className="h-4 w-4 mr-1" />Grant badge</Button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
