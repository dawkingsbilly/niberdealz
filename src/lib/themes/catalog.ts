// Theme catalog for Niberdealz. Each theme overrides a small set of CSS
// custom properties on <html> and can render a top-of-site banner strip.

export type ThemeVars = {
  "--primary"?: string;
  "--primary-foreground"?: string;
  "--accent"?: string;
  "--accent-foreground"?: string;
  "--deal"?: string;
  "--deal-foreground"?: string;
  "--background"?: string;
  "--foreground"?: string;
  "--muted"?: string;
  "--muted-foreground"?: string;
};

export type ThemePreset = {
  key: string;
  name: string;
  category: "season" | "holiday";
  emoji: string;
  swatches: string[]; // hex, for UI preview only
  banner: {
    text: string;
    gradient: string; // any valid CSS background value
    fg: string; // banner text color (hex/rgb ok — banner is themed chrome)
  };
  vars: ThemeVars;
};

// ---------- SEASONS (Southern Hemisphere) ----------
const SEASONS: ThemePreset[] = [
  {
    key: "spring",
    name: "Spring",
    category: "season",
    emoji: "🌸",
    swatches: ["#EC4899", "#FBCFE8", "#84CC16", "#FEF3C7"],
    banner: {
      text: "🌸 Spring has sprung — fresh deals from local sellers",
      gradient: "linear-gradient(90deg, #FBCFE8 0%, #FEF3C7 50%, #D9F99D 100%)",
      fg: "#7C2D12",
    },
    vars: {
      "--primary": "oklch(0.55 0.19 350)",
      "--primary-foreground": "oklch(1 0 0)",
      "--accent": "oklch(0.94 0.06 350)",
      "--accent-foreground": "oklch(0.35 0.15 350)",
      "--deal": "oklch(0.55 0.19 350)",
      "--deal-foreground": "oklch(1 0 0)",
    },
  },
  {
    key: "summer",
    name: "Summer",
    category: "season",
    emoji: "☀️",
    swatches: ["#F59E0B", "#EF4444", "#0EA5E9", "#FDE68A"],
    banner: {
      text: "☀️ Summer season — beat the heat with hot deals",
      gradient: "linear-gradient(90deg, #FDE68A 0%, #FCA5A5 50%, #7DD3FC 100%)",
      fg: "#7C2D12",
    },
    vars: {
      "--primary": "oklch(0.68 0.19 55)",
      "--primary-foreground": "oklch(0.16 0 0)",
      "--accent": "oklch(0.95 0.07 80)",
      "--accent-foreground": "oklch(0.35 0.15 55)",
      "--deal": "oklch(0.62 0.22 30)",
      "--deal-foreground": "oklch(1 0 0)",
    },
  },
  {
    key: "autumn",
    name: "Autumn",
    category: "season",
    emoji: "🍂",
    swatches: ["#B45309", "#D97706", "#78350F", "#FED7AA"],
    banner: {
      text: "🍂 Autumn arrivals — warm tones, warmer prices",
      gradient: "linear-gradient(90deg, #FED7AA 0%, #FCA5A5 50%, #B45309 100%)",
      fg: "#3F1D0A",
    },
    vars: {
      "--primary": "oklch(0.48 0.13 55)",
      "--primary-foreground": "oklch(1 0 0)",
      "--accent": "oklch(0.93 0.06 60)",
      "--accent-foreground": "oklch(0.35 0.13 55)",
      "--deal": "oklch(0.55 0.16 40)",
      "--deal-foreground": "oklch(1 0 0)",
    },
  },
  {
    key: "winter",
    name: "Winter",
    category: "season",
    emoji: "❄️",
    swatches: ["#0369A1", "#1E293B", "#CBD5E1", "#F1F5F9"],
    banner: {
      text: "❄️ Winter is here — cozy deals from local sellers",
      gradient: "linear-gradient(90deg, #1E293B 0%, #0369A1 50%, #64748B 100%)",
      fg: "#F1F5F9",
    },
    vars: {
      "--primary": "oklch(0.30 0.06 240)",
      "--primary-foreground": "oklch(1 0 0)",
      "--accent": "oklch(0.94 0.02 240)",
      "--accent-foreground": "oklch(0.30 0.06 240)",
      "--deal": "oklch(0.45 0.15 240)",
      "--deal-foreground": "oklch(1 0 0)",
    },
  },
];

// ---------- SA PUBLIC HOLIDAYS + POPULAR OBSERVANCES ----------
const HOLIDAYS: ThemePreset[] = [
  {
    key: "new_year",
    name: "New Year",
    category: "holiday",
    emoji: "🎆",
    swatches: ["#0F172A", "#F59E0B", "#FBBF24", "#FFFFFF"],
    banner: {
      text: "🎆 Happy New Year — new beginnings, fresh deals",
      gradient: "linear-gradient(90deg, #0F172A 0%, #7C3AED 50%, #F59E0B 100%)",
      fg: "#FFFFFF",
    },
    vars: {
      "--primary": "oklch(0.18 0.02 260)",
      "--primary-foreground": "oklch(1 0 0)",
      "--accent": "oklch(0.94 0.10 85)",
      "--accent-foreground": "oklch(0.35 0.14 55)",
      "--deal": "oklch(0.75 0.17 80)",
      "--deal-foreground": "oklch(0.16 0 0)",
    },
  },
  {
    key: "valentines",
    name: "Valentine's Day",
    category: "holiday",
    emoji: "❤️",
    swatches: ["#DC2626", "#F472B6", "#FCE7F3", "#FEE2E2"],
    banner: {
      text: "❤️ Valentine's Day — spoil someone special",
      gradient: "linear-gradient(90deg, #FCE7F3 0%, #F472B6 50%, #DC2626 100%)",
      fg: "#FFFFFF",
    },
    vars: {
      "--primary": "oklch(0.55 0.22 15)",
      "--primary-foreground": "oklch(1 0 0)",
      "--accent": "oklch(0.94 0.07 15)",
      "--accent-foreground": "oklch(0.45 0.20 15)",
      "--deal": "oklch(0.55 0.22 15)",
      "--deal-foreground": "oklch(1 0 0)",
    },
  },
  {
    key: "human_rights_day",
    name: "Human Rights Day (21 Mar)",
    category: "holiday",
    emoji: "✊🏾",
    swatches: ["#DC2626", "#EAB308", "#16A34A", "#000000"],
    banner: {
      text: "✊🏾 Human Rights Day — remembering Sharpeville, 21 March",
      gradient: "linear-gradient(90deg, #000000 0%, #DC2626 40%, #16A34A 100%)",
      fg: "#FFFFFF",
    },
    vars: {
      "--primary": "oklch(0.55 0.22 27)",
      "--primary-foreground": "oklch(1 0 0)",
      "--accent": "oklch(0.94 0.10 130)",
      "--accent-foreground": "oklch(0.35 0.15 140)",
      "--deal": "oklch(0.55 0.22 27)",
      "--deal-foreground": "oklch(1 0 0)",
    },
  },
  {
    key: "easter",
    name: "Easter / Good Friday",
    category: "holiday",
    emoji: "🐣",
    swatches: ["#A78BFA", "#FDE68A", "#FBCFE8", "#BBF7D0"],
    banner: {
      text: "🐣 Easter weekend — long-weekend deals from local sellers",
      gradient: "linear-gradient(90deg, #FBCFE8 0%, #FDE68A 50%, #BBF7D0 100%)",
      fg: "#5B21B6",
    },
    vars: {
      "--primary": "oklch(0.60 0.16 300)",
      "--primary-foreground": "oklch(1 0 0)",
      "--accent": "oklch(0.94 0.06 300)",
      "--accent-foreground": "oklch(0.45 0.16 300)",
      "--deal": "oklch(0.60 0.16 300)",
      "--deal-foreground": "oklch(1 0 0)",
    },
  },
  {
    key: "freedom_day",
    name: "Freedom Day (27 Apr)",
    category: "holiday",
    emoji: "🇿🇦",
    swatches: ["#007A4D", "#DE3831", "#FFB612", "#002395"],
    banner: {
      text: "🇿🇦 Freedom Day — 30 years of democracy, celebrate local",
      gradient: "linear-gradient(90deg, #007A4D 0%, #FFB612 50%, #DE3831 100%)",
      fg: "#FFFFFF",
    },
    vars: {
      "--primary": "oklch(0.48 0.14 160)",
      "--primary-foreground": "oklch(1 0 0)",
      "--accent": "oklch(0.94 0.10 90)",
      "--accent-foreground": "oklch(0.35 0.15 90)",
      "--deal": "oklch(0.55 0.22 27)",
      "--deal-foreground": "oklch(1 0 0)",
    },
  },
  {
    key: "workers_day",
    name: "Workers' Day (1 May)",
    category: "holiday",
    emoji: "🛠️",
    swatches: ["#DC2626", "#B91C1C", "#FCA5A5", "#0F172A"],
    banner: {
      text: "🛠️ Workers' Day — honouring the people who build this country",
      gradient: "linear-gradient(90deg, #7F1D1D 0%, #DC2626 100%)",
      fg: "#FFFFFF",
    },
    vars: {
      "--primary": "oklch(0.50 0.22 27)",
      "--primary-foreground": "oklch(1 0 0)",
      "--accent": "oklch(0.94 0.08 27)",
      "--accent-foreground": "oklch(0.45 0.20 27)",
      "--deal": "oklch(0.50 0.22 27)",
      "--deal-foreground": "oklch(1 0 0)",
    },
  },
  {
    key: "mothers_day",
    name: "Mother's Day",
    category: "holiday",
    emoji: "🌷",
    swatches: ["#DB2777", "#F9A8D4", "#FBCFE8", "#FDF2F8"],
    banner: {
      text: "🌷 Mother's Day — find something she'll actually love",
      gradient: "linear-gradient(90deg, #FDF2F8 0%, #F9A8D4 50%, #DB2777 100%)",
      fg: "#831843",
    },
    vars: {
      "--primary": "oklch(0.55 0.20 350)",
      "--primary-foreground": "oklch(1 0 0)",
      "--accent": "oklch(0.94 0.07 350)",
      "--accent-foreground": "oklch(0.40 0.18 350)",
      "--deal": "oklch(0.55 0.20 350)",
      "--deal-foreground": "oklch(1 0 0)",
    },
  },
  {
    key: "youth_day",
    name: "Youth Day (16 Jun)",
    category: "holiday",
    emoji: "🎓",
    swatches: ["#000000", "#EAB308", "#16A34A", "#DC2626"],
    banner: {
      text: "🎓 Youth Day — remembering the class of '76, 16 June",
      gradient: "linear-gradient(90deg, #000000 0%, #16A34A 50%, #EAB308 100%)",
      fg: "#FFFFFF",
    },
    vars: {
      "--primary": "oklch(0.18 0.02 260)",
      "--primary-foreground": "oklch(1 0 0)",
      "--accent": "oklch(0.94 0.10 130)",
      "--accent-foreground": "oklch(0.35 0.15 140)",
      "--deal": "oklch(0.55 0.15 140)",
      "--deal-foreground": "oklch(1 0 0)",
    },
  },
  {
    key: "fathers_day",
    name: "Father's Day",
    category: "holiday",
    emoji: "👔",
    swatches: ["#1E3A8A", "#334155", "#94A3B8", "#F1F5F9"],
    banner: {
      text: "👔 Father's Day — gifts for the man who says he needs nothing",
      gradient: "linear-gradient(90deg, #1E293B 0%, #1E3A8A 100%)",
      fg: "#F1F5F9",
    },
    vars: {
      "--primary": "oklch(0.30 0.10 260)",
      "--primary-foreground": "oklch(1 0 0)",
      "--accent": "oklch(0.94 0.03 260)",
      "--accent-foreground": "oklch(0.30 0.10 260)",
      "--deal": "oklch(0.45 0.15 260)",
      "--deal-foreground": "oklch(1 0 0)",
    },
  },
  {
    key: "womens_day",
    name: "Women's Day (9 Aug)",
    category: "holiday",
    emoji: "🌺",
    swatches: ["#9333EA", "#EC4899", "#F9A8D4", "#7C3AED"],
    banner: {
      text: "🌺 National Women's Day — Wathint' abafazi, wathint' imbokodo",
      gradient: "linear-gradient(90deg, #7C3AED 0%, #EC4899 100%)",
      fg: "#FFFFFF",
    },
    vars: {
      "--primary": "oklch(0.50 0.22 310)",
      "--primary-foreground": "oklch(1 0 0)",
      "--accent": "oklch(0.94 0.08 320)",
      "--accent-foreground": "oklch(0.45 0.20 320)",
      "--deal": "oklch(0.55 0.22 340)",
      "--deal-foreground": "oklch(1 0 0)",
    },
  },
  {
    key: "heritage_day",
    name: "Heritage / Braai Day (24 Sep)",
    category: "holiday",
    emoji: "🔥",
    swatches: ["#B45309", "#DC2626", "#EAB308", "#007A4D"],
    banner: {
      text: "🔥 Heritage Day — fire up the braai, shop local",
      gradient: "linear-gradient(90deg, #7C2D12 0%, #DC2626 50%, #EAB308 100%)",
      fg: "#FFFFFF",
    },
    vars: {
      "--primary": "oklch(0.48 0.16 45)",
      "--primary-foreground": "oklch(1 0 0)",
      "--accent": "oklch(0.94 0.08 60)",
      "--accent-foreground": "oklch(0.40 0.16 45)",
      "--deal": "oklch(0.55 0.22 27)",
      "--deal-foreground": "oklch(1 0 0)",
    },
  },
  {
    key: "black_friday",
    name: "Black Friday",
    category: "holiday",
    emoji: "🖤",
    swatches: ["#000000", "#EAB308", "#FBBF24", "#171717"],
    banner: {
      text: "🖤 BLACK FRIDAY — biggest deals of the year, live now",
      gradient: "linear-gradient(90deg, #000000 0%, #171717 100%)",
      fg: "#FDE68A",
    },
    vars: {
      "--primary": "oklch(0.14 0 0)",
      "--primary-foreground": "oklch(0.98 0.08 90)",
      "--accent": "oklch(0.92 0.12 90)",
      "--accent-foreground": "oklch(0.16 0 0)",
      "--deal": "oklch(0.75 0.17 80)",
      "--deal-foreground": "oklch(0.16 0 0)",
    },
  },
  {
    key: "reconciliation",
    name: "Day of Reconciliation (16 Dec)",
    category: "holiday",
    emoji: "🤝",
    swatches: ["#007A4D", "#FFB612", "#DE3831", "#002395"],
    banner: {
      text: "🤝 Day of Reconciliation — one nation, one marketplace",
      gradient: "linear-gradient(90deg, #007A4D 0%, #002395 100%)",
      fg: "#FFFFFF",
    },
    vars: {
      "--primary": "oklch(0.35 0.14 260)",
      "--primary-foreground": "oklch(1 0 0)",
      "--accent": "oklch(0.94 0.08 160)",
      "--accent-foreground": "oklch(0.40 0.14 160)",
      "--deal": "oklch(0.48 0.14 160)",
      "--deal-foreground": "oklch(1 0 0)",
    },
  },
  {
    key: "christmas",
    name: "Christmas Day (25 Dec)",
    category: "holiday",
    emoji: "🎄",
    swatches: ["#DC2626", "#16A34A", "#FDE68A", "#7F1D1D"],
    banner: {
      text: "🎄 Merry Christmas — shop the last-minute gift rush",
      gradient: "linear-gradient(90deg, #7F1D1D 0%, #DC2626 40%, #14532D 100%)",
      fg: "#FEF3C7",
    },
    vars: {
      "--primary": "oklch(0.48 0.18 150)",
      "--primary-foreground": "oklch(1 0 0)",
      "--accent": "oklch(0.94 0.08 27)",
      "--accent-foreground": "oklch(0.45 0.20 27)",
      "--deal": "oklch(0.55 0.22 27)",
      "--deal-foreground": "oklch(1 0 0)",
    },
  },
  {
    key: "day_of_goodwill",
    name: "Day of Goodwill (26 Dec)",
    category: "holiday",
    emoji: "🎁",
    swatches: ["#7F1D1D", "#DC2626", "#FDE68A", "#14532D"],
    banner: {
      text: "🎁 Day of Goodwill — Boxing Day markdowns from local sellers",
      gradient: "linear-gradient(90deg, #14532D 0%, #DC2626 100%)",
      fg: "#FEF3C7",
    },
    vars: {
      "--primary": "oklch(0.50 0.22 27)",
      "--primary-foreground": "oklch(1 0 0)",
      "--accent": "oklch(0.94 0.10 150)",
      "--accent-foreground": "oklch(0.40 0.16 150)",
      "--deal": "oklch(0.55 0.22 27)",
      "--deal-foreground": "oklch(1 0 0)",
    },
  },
];

export const THEME_PRESETS: ThemePreset[] = [...SEASONS, ...HOLIDAYS];

export const THEMES_BY_KEY: Record<string, ThemePreset> = Object.fromEntries(
  THEME_PRESETS.map((t) => [t.key, t]),
);

export function getTheme(key: string | null | undefined): ThemePreset | null {
  if (!key) return null;
  return THEMES_BY_KEY[key] ?? null;
}
