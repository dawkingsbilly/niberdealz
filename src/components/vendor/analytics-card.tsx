import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { BarChart3, Eye, MessageCircle, Loader2 } from "lucide-react";
import { vendorAnalytics } from "@/lib/marketplace.functions";

export function VendorAnalyticsCard({ userId }: { userId: string }) {
  const fetchStats = useServerFn(vendorAnalytics);
  const { data, isLoading } = useQuery({
    queryKey: ["vendor-analytics", userId],
    queryFn: () => fetchStats({ data: { days: 14 } }),
  });

  const series = (data as any)?.series ?? [];
  const totals = (data as any)?.totals ?? { views: 0, clicks: 0 };
  const top: any[] = (data as any)?.top ?? [];
  const rate = totals.views > 0 ? Math.round((totals.clicks / totals.views) * 100) : 0;

  return (
    <div className="rounded-2xl bg-card border border-border p-6 mb-6 shadow-[var(--shadow-card)]">
      <h2 className="font-display text-xl font-bold flex items-center gap-2"><BarChart3 className="h-5 w-5" />Your traffic, last 14 days</h2>

      {isLoading ? (
        <div className="h-40 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <Stat icon={<Eye className="h-4 w-4" />} label="Listing views" value={totals.views} />
            <Stat icon={<MessageCircle className="h-4 w-4" />} label="Buyer contacts" value={totals.clicks} />
            <Stat icon={<BarChart3 className="h-4 w-4" />} label="Contact rate" value={`${rate}%`} />
          </div>

          <div className="h-56 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" fontSize={11} stroke="currentColor" />
                <YAxis fontSize={11} allowDecimals={false} stroke="currentColor" />
                <Tooltip />
                <Legend />
                <Area type="monotone" name="Views" dataKey="views" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} />
                <Area type="monotone" name="Contacts" dataKey="clicks" stroke="#16a34a" fill="#16a34a" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {top.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Top listings</div>
              <div className="space-y-2">
                {top.map((t) => (
                  <div key={t.product_id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                    <span className="truncate">{t.title}</span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{t.views} views · {t.clicks} contacts</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {totals.views === 0 && (
            <p className="text-sm text-muted-foreground mt-4">No views yet. Share your store link and consider a boost to get in front of buyers.</p>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="font-display text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
