import { useMemo } from "react";

interface Particle {
  id: number;
  x: number;
  size: number;
  delay: number;
  duration: number;
  symbol: string;
}

interface NeonConfig {
  symbols: string[];
  color: string;
  count: number;
  animClass: string;
}

const NEON_CONFIGS: Record<string, NeonConfig> = {
  hearts:    { symbols: ["♥","♡","♥","♡","♥"], color: "#ff1a5e", count: 10, animClass: "neon-float-up" },
  stars:     { symbols: ["✦","✧","★","⋆","✸","✺"], color: "#a855f7", count: 14, animClass: "neon-twinkle" },
  waves:     { symbols: ["≈","≋","〜","≈","∿"], color: "#00d4ff", count: 8, animClass: "neon-drift" },
  grid:      { symbols: ["+","×","#","⌗","⊞","⊕"], color: "#00ffcb", count: 10, animClass: "neon-pulse-in" },
  lightning: { symbols: ["↯","⚡","↯","⌁","↯"], color: "#8b00ff", count: 7, animClass: "neon-flash" },
  embers:    { symbols: ["°","·","∘","⊙","·","°"], color: "#ff6400", count: 16, animClass: "neon-float-up" },
  wisps:     { symbols: ["○","◌","◎","○","◦"], color: "#94a3b8", count: 9, animClass: "neon-drift" },
  leaves:    { symbols: ["✿","❀","✾","⚘","❋"], color: "#22c55e", count: 10, animClass: "neon-sway" },
  coins:     { symbols: ["◇","⋄","◈","⬡","✦"], color: "#eab308", count: 10, animClass: "neon-twinkle" },
  bars:      { symbols: ["▌","▎","▍","▋","▊"], color: "#f97316", count: 12, animClass: "neon-equalizer" },
  rainbow:   { symbols: ["★","◆","●","▲","✦"], color: "#ff00aa", count: 12, animClass: "neon-rainbow" },
  skulls:    { symbols: ["☠","†","☠","✝","✞"], color: "#6b21a8", count: 7, animClass: "neon-float-up" },
  roses:     { symbols: ["✿","❀","✾","♥","✿"], color: "#ff4488", count: 10, animClass: "neon-sway" },
};

const THEME_NEON_MAP: Record<string, string> = {
  love:               "hearts",
  pop:                "hearts",
  crimson:            "embers",
  midnight:           "stars",
  amethyst:           "stars",
  mystic:             "stars",
  tarot:              "stars",
  "sacred-geometry":  "stars",
  gemstone:           "stars",
  galaxy:             "stars",
  amethyst_dark:      "stars",
  ocean:              "waves",
  beach:              "waves",
  neon:               "grid",
  hacker:             "grid",
  crypto:             "grid",
  vaporwave:          "grid",
  nintendo:           "grid",
  playstation:        "grid",
  xbox:               "grid",
  rock:               "lightning",
  metal:              "lightning",
  punk:               "lightning",
  "nu-metal":         "lightning",
  "southern-metal":   "lightning",
  "peppy-rock":       "lightning",
  emo:                "embers",
  trap:               "embers",
  scenecore:          "embers",
  rap:                "embers",
  lachrywave:         "wisps",
  swancore:           "wisps",
  "sad-skeleton":     "skulls",
  "dark-brotherhood": "skulls",
  occult:             "skulls",
  "fallen-angel":     "wisps",
  bat:                "wisps",
  death:              "skulls",
  "mainstream-skeleton": "skulls",
  jester:             "rainbow",
  stoner:             "leaves",
  sage:               "leaves",
  hippie:             "rainbow",
  mountain:           "leaves",
  desert:             "leaves",
  "preppy-alt":       "roses",
  gold:               "coins",
  money:              "coins",
  music:              "bars",
  rb:                 "bars",
  alt:                "bars",
  rainbow:            "rainbow",
};

function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export default function NeonThemeBg({ themeId, className }: { themeId: string; className?: string }) {
  const neonKey = THEME_NEON_MAP[themeId];
  const config = neonKey ? NEON_CONFIGS[neonKey] : null;

  const particles = useMemo<Particle[]>(() => {
    if (!config) return [];
    const rand = seededRand(themeId.split("").reduce((a, c) => a + c.charCodeAt(0), 0));
    return Array.from({ length: config.count }, (_, i) => ({
      id: i,
      x: rand() * 90 + 5,
      size: rand() * 1.2 + 0.7,
      delay: rand() * 8,
      duration: rand() * 6 + 6,
      symbol: config.symbols[Math.floor(rand() * config.symbols.length)],
    }));
  }, [themeId, config]);

  if (!config) return null;

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none select-none z-0 ${className ?? ""}`}
      aria-hidden="true"
    >
      {particles.map((p) => (
        <span
          key={p.id}
          className={`absolute bottom-0 ${config.animClass}`}
          style={{
            left: `${p.x}%`,
            fontSize: `${p.size}rem`,
            color: config.color,
            filter: `drop-shadow(0 0 6px ${config.color}) drop-shadow(0 0 14px ${config.color})`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            animationTimingFunction: "ease-in-out",
            animationIterationCount: "infinite",
            animationFillMode: "both",
          }}
        >
          {p.symbol}
        </span>
      ))}
    </div>
  );
}
