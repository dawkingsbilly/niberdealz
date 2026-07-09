import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Palette, Trash2, Sparkles, Calendar, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { THEME_PRESETS, THEMES_BY_KEY, type ThemePreset } from "@/lib/themes/catalog";
import {
  listScheduledThemes,
  activateTheme,
  deleteScheduledTheme,
  type ScheduledTheme,
} from "@/lib/themes/themes.functions";

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const DURATION_PRESETS: { label: string; hours: number }[] = [
  { label: "1 day", hours: 24 },
  { label: "3 days", hours: 72 },
  { label: "1 week", hours: 24 * 7 },
  { label: "2 weeks", hours: 24 * 14 },
  { label: "1 month", hours: 24 * 30 },
  { label: "3 months (season)", hours: 24 * 90 },
];

export function ThemesTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listScheduledThemes);
  const [selected, setSelected] = useState<ThemePreset | null>(null);

  const { data: scheduled = [], isLoading } = useQuery({
    queryKey: ["admin-scheduled-themes"],
    queryFn: () => listFn(),
  });

  const now = Date.now();
  const active = useMemo(
    () =>
      scheduled.find(
        (t) => new Date(t.start_at).getTime() <= now && new Date(t.end_at).getTime() >= now,
      ),
    [scheduled, now],
  );
  const upcoming = useMemo(
    () =>
      scheduled
        .filter((t) => new Date(t.start_at).getTime() > now)
        .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()),
    [scheduled, now],
  );

  return (
    <div className="space-y-8">
      {/* Currently active */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> Currently live
        </h2>
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : active ? (
          <ActiveThemeCard theme={active} qc={qc} />
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No theme is currently live. The marketplace is using the default look.
          </div>
        )}
      </section>

      {/* Upcoming schedule */}
      {upcoming.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Scheduled next
          </h2>
          <div className="space-y-2">
            {upcoming.map((t) => (
              <ScheduledRow key={t.id} row={t} qc={qc} />
            ))}
          </div>
        </section>
      )}

      {/* Catalog */}
      <section>
        <div className="flex items-end justify-between gap-3 mb-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <Palette className="h-4 w-4" /> Theme catalog
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Click any theme to schedule it — pick a start time and how long it should run.</p>
          </div>
        </div>

        <ThemeGrid label="Seasons" themes={THEME_PRESETS.filter((t) => t.category === "season")} onPick={setSelected} activeKey={active?.theme_key} />
        <ThemeGrid label="South African holidays" themes={THEME_PRESETS.filter((t) => t.category === "holiday")} onPick={setSelected} activeKey={active?.theme_key} />
      </section>

      {selected && (
        <ScheduleDialog theme={selected} onClose={() => setSelected(null)} qc={qc} />
      )}
    </div>
  );
}

function ThemeGrid({
  label,
  themes,
  onPick,
  activeKey,
}: {
  label: string;
  themes: ThemePreset[];
  onPick: (t: ThemePreset) => void;
  activeKey?: string;
}) {
  return (
    <div className="mb-6">
      <div className="text-xs font-semibold text-muted-foreground mb-2">{label}</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {themes.map((t) => {
          const isActive = t.key === activeKey;
          return (
            <button
              key={t.key}
              onClick={() => onPick(t)}
              className={`group text-left rounded-xl border ${isActive ? "border-foreground ring-2 ring-foreground/20" : "border-border hover:border-foreground/60"} bg-card p-3 transition`}
            >
              <div className="h-16 rounded-md mb-2 overflow-hidden" style={{ background: t.banner.gradient }} />
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span aria-hidden>{t.emoji}</span>
                  <span className="font-semibold text-sm truncate">{t.name}</span>
                </div>
                {isActive && <CheckCircle2 className="h-4 w-4 shrink-0 text-foreground" />}
              </div>
              <div className="flex gap-1 mt-2">
                {t.swatches.map((s) => (
                  <span key={s} className="h-3 w-3 rounded-full border border-border" style={{ background: s }} />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ActiveThemeCard({ theme, qc }: { theme: ScheduledTheme; qc: ReturnType<typeof useQueryClient> }) {
  const preset = THEMES_BY_KEY[theme.theme_key];
  const del = useServerFn(deleteScheduledTheme);
  const [busy, setBusy] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="h-14" style={{ background: preset?.banner.gradient ?? "hsl(var(--muted))" }} />
      <div className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-semibold flex items-center gap-2">
            <span aria-hidden>{preset?.emoji}</span> {preset?.name ?? theme.theme_key}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Ends {new Date(theme.end_at).toLocaleString()}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await del({ data: { id: theme.id } });
              await qc.invalidateQueries({ queryKey: ["admin-scheduled-themes"] });
              await qc.invalidateQueries({ queryKey: ["site-active-theme"] });
              toast.success("Theme ended");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed to end theme");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "End theme now"}
        </Button>
      </div>
    </div>
  );
}

function ScheduledRow({ row, qc }: { row: ScheduledTheme; qc: ReturnType<typeof useQueryClient> }) {
  const preset = THEMES_BY_KEY[row.theme_key];
  const del = useServerFn(deleteScheduledTheme);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <div className="h-9 w-9 rounded-md shrink-0" style={{ background: preset?.banner.gradient ?? "hsl(var(--muted))" }} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold flex items-center gap-1.5">
          <span aria-hidden>{preset?.emoji}</span> {preset?.name ?? row.theme_key}
        </div>
        <div className="text-xs text-muted-foreground">
          {new Date(row.start_at).toLocaleString()} → {new Date(row.end_at).toLocaleString()}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await del({ data: { id: row.id } });
            await qc.invalidateQueries({ queryKey: ["admin-scheduled-themes"] });
            toast.success("Removed");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </Button>
    </div>
  );
}

function ScheduleDialog({
  theme,
  onClose,
  qc,
}: {
  theme: ThemePreset;
  onClose: () => void;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const activate = useServerFn(activateTheme);
  const [start, setStart] = useState(() => toLocalInputValue(new Date()));
  const [end, setEnd] = useState(() => toLocalInputValue(new Date(Date.now() + 7 * 24 * 3600 * 1000)));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-card border border-border shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="h-24 relative" style={{ background: theme.banner.gradient }}>
          <div className="absolute inset-0 flex items-center justify-center px-4 text-center font-semibold" style={{ color: theme.banner.fg }}>
            <span className="text-sm sm:text-base">
              <span aria-hidden className="mr-1.5">{theme.emoji}</span>
              {theme.banner.text}
            </span>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <div className="font-semibold text-lg">Schedule "{theme.name}"</div>
            <p className="text-sm text-muted-foreground">The marketplace will switch to this theme between your start and end times.</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Quick duration</Label>
            <div className="flex flex-wrap gap-1.5">
              {DURATION_PRESETS.map((d) => (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => {
                    const startDate = new Date(start);
                    if (Number.isNaN(startDate.getTime())) return;
                    setEnd(toLocalInputValue(new Date(startDate.getTime() + d.hours * 3600 * 1000)));
                  }}
                  className="px-2.5 py-1 rounded-md border border-border text-xs hover:bg-muted transition"
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="theme-start" className="text-xs">Starts</Label>
              <Input id="theme-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="theme-end" className="text-xs">Ends</Label>
              <Input id="theme-end" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="theme-note" className="text-xs">Internal note (optional)</Label>
            <Textarea id="theme-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Paired with the Heritage Day sale campaign" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button
              className="bg-foreground text-background hover:bg-foreground/90"
              disabled={busy}
              onClick={async () => {
                const s = new Date(start);
                const e = new Date(end);
                if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
                  toast.error("Please pick valid start and end times");
                  return;
                }
                if (e.getTime() <= s.getTime()) {
                  toast.error("End must be after start");
                  return;
                }
                setBusy(true);
                try {
                  await activate({
                    data: {
                      theme_key: theme.key,
                      start_at: s.toISOString(),
                      end_at: e.toISOString(),
                      note: note.trim() || null,
                    },
                  });
                  await qc.invalidateQueries({ queryKey: ["admin-scheduled-themes"] });
                  await qc.invalidateQueries({ queryKey: ["site-active-theme"] });
                  toast.success(`${theme.name} scheduled`);
                  onClose();
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Failed to schedule");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Schedule
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
