import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { getActiveTheme } from "@/lib/themes/themes.functions";
import { getTheme } from "@/lib/themes/catalog";

/**
 * Applies the currently-active site theme (if any) by writing CSS custom
 * properties onto <html>, and renders a top banner strip.
 *
 * Mounted once in __root.tsx so every route participates.
 */
export function ThemeApplier() {
  const fetchActive = useServerFn(getActiveTheme);
  const { data: active } = useQuery({
    queryKey: ["site-active-theme"],
    queryFn: () => fetchActive(),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000, // re-check every 5 min so windows expire in-tab
  });

  const preset = getTheme(active?.theme_key);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    const applied: string[] = [];
    if (preset) {
      for (const [k, v] of Object.entries(preset.vars)) {
        if (!v) continue;
        html.style.setProperty(k, v);
        applied.push(k);
      }
      html.dataset.siteTheme = preset.key;
    } else {
      html.removeAttribute("data-site-theme");
    }
    return () => {
      for (const k of applied) html.style.removeProperty(k);
    };
  }, [preset]);

  if (!preset) return null;

  return (
    <div
      role="status"
      aria-label={`${preset.name} theme active`}
      className="w-full py-2 px-4 text-center text-xs sm:text-sm font-semibold tracking-tight"
      style={{ background: preset.banner.gradient, color: preset.banner.fg }}
    >
      <span className="inline-flex items-center gap-2">
        <span>{preset.banner.text}</span>
      </span>
    </div>
  );
}
