export interface ProfileTheme {
  id: string;
  name: string;
  description: string;
  free: boolean;
  cost: number;
  banner: string;
  accent: string;
  glow: string;
  ring: string;
  textGradient: string;
  preview: string;
  bgImage?: string; // CSS background-image value applied over banner
}

export const PROFILE_THEMES: ProfileTheme[] = [
  // ── Free themes ────────────────────────────────────────────────────────────
  {
    id: "midnight",
    name: "Midnight",
    description: "Deep space purple. The default CLAW aesthetic.",
    free: true, cost: 0,
    banner: "linear-gradient(135deg, #1a0a2e 0%, #0d0d1a 50%, #0a1628 100%)",
    accent: "rgba(139,92,246,0.15)", glow: "rgba(139,92,246,0.4)", ring: "#7c3aed",
    textGradient: "linear-gradient(90deg, #a855f7, #7c3aed)", preview: "from-violet-950 to-slate-950",
  },
  {
    id: "crimson",
    name: "Crimson",
    description: "Passionate. Dangerous. Unfiltered.",
    free: true, cost: 0,
    banner: "linear-gradient(135deg, #2a0a0a 0%, #1a0808 50%, #0f0505 100%)",
    accent: "rgba(220,38,38,0.15)", glow: "rgba(220,38,38,0.4)", ring: "#dc2626",
    textGradient: "linear-gradient(90deg, #f87171, #dc2626)", preview: "from-red-950 to-slate-950",
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Still waters. Deep truths.",
    free: true, cost: 0,
    banner: "linear-gradient(135deg, #0a1628 0%, #061220 50%, #020f1a 100%)",
    accent: "rgba(59,130,246,0.15)", glow: "rgba(59,130,246,0.4)", ring: "#3b82f6",
    textGradient: "linear-gradient(90deg, #60a5fa, #3b82f6)", preview: "from-blue-950 to-slate-950",
  },
  {
    id: "sage",
    name: "Sage",
    description: "Grounded. Real. Alive.",
    free: true, cost: 0,
    banner: "linear-gradient(135deg, #0a1a0a 0%, #081408 50%, #040e04 100%)",
    accent: "rgba(34,197,94,0.12)", glow: "rgba(34,197,94,0.35)", ring: "#22c55e",
    textGradient: "linear-gradient(90deg, #4ade80, #22c55e)", preview: "from-green-950 to-slate-950",
  },
  // ── 50 GEMZ themes ─────────────────────────────────────────────────────────
  {
    id: "gold",
    name: "Gold",
    description: "Luxury. Power. Earned.",
    free: false, cost: 50,
    banner: "linear-gradient(135deg, #1a1200 0%, #120d00 50%, #0a0800 100%)",
    accent: "rgba(234,179,8,0.15)", glow: "rgba(234,179,8,0.5)", ring: "#eab308",
    textGradient: "linear-gradient(90deg, #fde047, #eab308)", preview: "from-yellow-950 to-slate-950",
  },
  {
    id: "amethyst",
    name: "Amethyst",
    description: "Crystal-clear honesty. Premium mystic.",
    free: false, cost: 50,
    banner: "linear-gradient(135deg, #1e0a3c 0%, #150828 50%, #0d0520 100%)",
    accent: "rgba(192,132,252,0.18)", glow: "rgba(192,132,252,0.55)", ring: "#c084fc",
    textGradient: "linear-gradient(90deg, #e879f9, #c084fc, #a855f7)", preview: "from-purple-900 to-violet-950",
  },
  {
    id: "onyx",
    name: "Onyx",
    description: "Absolute black. No softness whatsoever.",
    free: false, cost: 50,
    banner: "linear-gradient(135deg, #0a0a0a 0%, #050505 50%, #000000 100%)",
    accent: "rgba(148,163,184,0.1)", glow: "rgba(148,163,184,0.35)", ring: "#64748b",
    textGradient: "linear-gradient(90deg, #cbd5e1, #94a3b8)", preview: "from-slate-900 to-black",
  },
  {
    id: "neon",
    name: "Neon",
    description: "Cyberpunk chaos. Loud and unapologetic.",
    free: false, cost: 50,
    banner: "linear-gradient(135deg, #001a1a 0%, #00100a 50%, #0a0018 100%)",
    accent: "rgba(0,255,200,0.12)", glow: "rgba(0,255,200,0.5)", ring: "#00ffcb",
    textGradient: "linear-gradient(90deg, #00ffcb, #00d4ff, #bf00ff)", preview: "from-teal-950 to-slate-950",
  },
  // ── 75 GEMZ themes ─────────────────────────────────────────────────────────
  {
    id: "beach",
    name: "Beach",
    description: "Saltwater soul. Sun-soaked energy.",
    free: false, cost: 75,
    banner: "linear-gradient(135deg, #001428 0%, #000a1e 50%, #002835 100%)",
    accent: "rgba(0,180,220,0.15)", glow: "rgba(0,220,255,0.5)", ring: "#00dcff",
    textGradient: "linear-gradient(90deg, #00dcff, #38bdf8, #fbbf24)", preview: "from-sky-950 to-slate-950",
  },
  {
    id: "love",
    name: "Love",
    description: "Romance in the dark. Pink as a knife.",
    free: false, cost: 75,
    banner: "linear-gradient(135deg, #1a0a0a 0%, #0a0014 50%, #1a0000 100%)",
    accent: "rgba(220,50,100,0.15)", glow: "rgba(255,80,130,0.5)", ring: "#ff5082",
    textGradient: "linear-gradient(90deg, #ff5082, #f472b6, #fb7185)", preview: "from-rose-950 to-slate-950",
  },
  {
    id: "stoner",
    name: "Stoner",
    description: "Green vibes only. Chill but aware.",
    free: false, cost: 75,
    banner: "linear-gradient(135deg, #001400 0%, #140a00 50%, #0a0014 100%)",
    accent: "rgba(50,200,50,0.15)", glow: "rgba(80,255,80,0.4)", ring: "#50ff50",
    textGradient: "linear-gradient(90deg, #50ff50, #a3e635, #84cc16)", preview: "from-green-950 to-emerald-950",
  },
  {
    id: "hippie",
    name: "Hippie",
    description: "Peace, love, and unfiltered truth.",
    free: false, cost: 75,
    banner: "linear-gradient(135deg, #0a1400 0%, #140a00 50%, #001414 100%)",
    accent: "rgba(200,150,50,0.15)", glow: "rgba(255,200,80,0.4)", ring: "#ffc850",
    textGradient: "linear-gradient(90deg, #ff8c00, #ffd700, #32cd32, #4169e1)", preview: "from-amber-950 to-green-950",
  },
  {
    id: "preppy",
    name: "Preppy",
    description: "Clean aesthetic. Secret chaos underneath.",
    free: false, cost: 75,
    banner: "linear-gradient(135deg, #001a0a 0%, #0a000d 50%, #001414 100%)",
    accent: "rgba(0,200,150,0.15)", glow: "rgba(0,255,180,0.4)", ring: "#00ffb4",
    textGradient: "linear-gradient(90deg, #00ffb4, #34d399, #059669)", preview: "from-teal-950 to-emerald-950",
  },
  {
    id: "nostalgic",
    name: "Nostalgic",
    description: "Sepia memories. Bittersweet and warm.",
    free: false, cost: 75,
    banner: "linear-gradient(135deg, #2a1a0a 0%, #1a0a00 50%, #0a0000 100%)",
    accent: "rgba(200,150,50,0.15)", glow: "rgba(220,170,80,0.4)", ring: "#d4a050",
    textGradient: "linear-gradient(90deg, #d4a050, #f59e0b, #b45309)", preview: "from-amber-950 to-stone-950",
  },
  {
    id: "neutral",
    name: "Neutral",
    description: "Understated. Letting your words do the work.",
    free: false, cost: 75,
    banner: "linear-gradient(135deg, #0a0a0a 0%, #141414 50%, #0a0a0a 100%)",
    accent: "rgba(150,150,150,0.12)", glow: "rgba(200,200,200,0.35)", ring: "#a0a0a0",
    textGradient: "linear-gradient(90deg, #d1d5db, #9ca3af)", preview: "from-zinc-900 to-stone-950",
  },
  {
    id: "plain",
    name: "Plain",
    description: "Nothing to prove. Nothing to hide.",
    free: false, cost: 75,
    banner: "linear-gradient(135deg, #141414 0%, #1e1e1e 50%, #141414 100%)",
    accent: "rgba(100,100,100,0.1)", glow: "rgba(150,150,150,0.3)", ring: "#808080",
    textGradient: "linear-gradient(90deg, #e5e7eb, #9ca3af)", preview: "from-zinc-800 to-zinc-900",
  },
  {
    id: "pop",
    name: "Pop",
    description: "Bright, loud, and in your face. Chart-topper energy.",
    free: false, cost: 75,
    banner: "linear-gradient(135deg, #1a0a1a 0%, #0a0a1a 50%, #1a0a0a 100%)",
    accent: "rgba(255,100,200,0.15)", glow: "rgba(255,150,220,0.5)", ring: "#ff96dc",
    textGradient: "linear-gradient(90deg, #ff96dc, #f472b6, #fb923c)", preview: "from-pink-950 to-violet-950",
  },
  {
    id: "rap",
    name: "Rap",
    description: "Gold chains, real talk. No filter, all bars.",
    free: false, cost: 75,
    banner: "linear-gradient(135deg, #0a0a00 0%, #0a0500 50%, #000000 100%)",
    accent: "rgba(200,150,0,0.15)", glow: "rgba(255,200,0,0.5)", ring: "#ffc800",
    textGradient: "linear-gradient(90deg, #ffc800, #fbbf24, #f59e0b)", preview: "from-yellow-950 to-zinc-950",
  },
  {
    id: "music",
    name: "Music",
    description: "Every feeling is a note. Every note is the truth.",
    free: false, cost: 75,
    banner: "linear-gradient(135deg, #0a000a 0%, #000a14 50%, #0a0000 100%)",
    accent: "rgba(200,100,50,0.15)", glow: "rgba(255,150,80,0.4)", ring: "#ff9650",
    textGradient: "linear-gradient(90deg, #ff9650, #fb923c, #ef4444)", preview: "from-orange-950 to-red-950",
  },
  // ── 100 GEMZ themes ────────────────────────────────────────────────────────
  {
    id: "rock",
    name: "Rock",
    description: "Raw. Loud. Unapologetically alive.",
    free: false, cost: 100,
    banner: "linear-gradient(135deg, #0a0a0a 0%, #1a0000 50%, #050505 100%)",
    accent: "rgba(200,50,50,0.15)", glow: "rgba(255,80,80,0.4)", ring: "#ff5050",
    textGradient: "linear-gradient(90deg, #ff5050, #ef4444, #dc2626)", preview: "from-red-950 to-zinc-950",
  },
  {
    id: "emo",
    name: "Emo",
    description: "Black eyeliner and big feelings. Always.",
    free: false, cost: 100,
    banner: "linear-gradient(135deg, #000000 0%, #0a000a 50%, #000000 100%)",
    accent: "rgba(200,0,200,0.12)", glow: "rgba(255,50,255,0.4)", ring: "#ff32ff",
    textGradient: "linear-gradient(90deg, #ff32ff, #e879f9, #a855f7)", preview: "from-fuchsia-950 to-black",
  },
  {
    id: "punk",
    name: "Punk",
    description: "Destroy the system. Rebuild it weirder.",
    free: false, cost: 100,
    banner: "linear-gradient(135deg, #0a0a0a 0%, #1a0a00 50%, #0a001a 100%)",
    accent: "rgba(200,0,100,0.15)", glow: "rgba(255,0,128,0.5)", ring: "#ff0080",
    textGradient: "linear-gradient(90deg, #ff0080, #f472b6, #a855f7)", preview: "from-pink-950 to-zinc-950",
  },
  {
    id: "trap",
    name: "Trap",
    description: "808s and raw honesty. No pretending here.",
    free: false, cost: 100,
    banner: "linear-gradient(135deg, #0a0a00 0%, #0a0000 50%, #0a0500 100%)",
    accent: "rgba(200,150,0,0.15)", glow: "rgba(255,200,0,0.5)", ring: "#ffc800",
    textGradient: "linear-gradient(90deg, #ffc800, #fbbf24, #dc2626)", preview: "from-yellow-950 to-red-950",
  },
  {
    id: "alt",
    name: "Alternative",
    description: "Comfortable in the uncomfortable. Different by design.",
    free: false, cost: 100,
    banner: "linear-gradient(135deg, #050a1a 0%, #0a0514 50%, #0a0a0a 100%)",
    accent: "rgba(50,100,200,0.15)", glow: "rgba(80,150,255,0.4)", ring: "#5096ff",
    textGradient: "linear-gradient(90deg, #5096ff, #818cf8, #a855f7)", preview: "from-indigo-950 to-violet-950",
  },
  {
    id: "rb",
    name: "R&B",
    description: "Smooth. Deep. Emotionally complex.",
    free: false, cost: 100,
    banner: "linear-gradient(135deg, #14000a 0%, #0a0014 50%, #140005 100%)",
    accent: "rgba(150,50,100,0.15)", glow: "rgba(200,80,150,0.5)", ring: "#c85096",
    textGradient: "linear-gradient(90deg, #c85096, #a855f7, #7c3aed)", preview: "from-purple-950 to-rose-950",
  },
  {
    id: "philosophy",
    name: "Philosophy",
    description: "What is reality, really? Ask Ringy.",
    free: false, cost: 100,
    banner: "linear-gradient(135deg, #0a0a14 0%, #0a0a0a 50%, #141414 100%)",
    accent: "rgba(150,150,200,0.12)", glow: "rgba(200,200,255,0.35)", ring: "#c8c8ff",
    textGradient: "linear-gradient(90deg, #c8c8ff, #a5b4fc, #818cf8)", preview: "from-indigo-950 to-zinc-950",
  },
  {
    id: "crypto",
    name: "Crypto",
    description: "Decentralized feelings. Volatile by nature.",
    free: false, cost: 100,
    banner: "linear-gradient(135deg, #001a14 0%, #0a0a00 50%, #001a00 100%)",
    accent: "rgba(0,200,100,0.15)", glow: "rgba(0,255,150,0.4)", ring: "#00ff96",
    textGradient: "linear-gradient(90deg, #00ff96, #34d399, #f59e0b)", preview: "from-emerald-950 to-yellow-950",
  },
  {
    id: "hacker",
    name: "Hacker",
    description: "Everything is exploitable. Especially people.",
    free: false, cost: 100,
    banner: "linear-gradient(135deg, #000a00 0%, #001400 50%, #000a00 100%)",
    accent: "rgba(0,200,50,0.15)", glow: "rgba(0,255,80,0.5)", ring: "#00ff50",
    textGradient: "linear-gradient(90deg, #00ff50, #22c55e, #16a34a)", preview: "from-green-950 to-black",
  },
  {
    id: "nintendo",
    name: "Nintendo",
    description: "Red and blue. Nostalgia as a weapon.",
    free: false, cost: 100,
    banner: "linear-gradient(135deg, #1a0000 0%, #00001a 50%, #001a00 100%)",
    accent: "rgba(200,50,50,0.15)", glow: "rgba(255,80,80,0.5)", ring: "#e60012",
    textGradient: "linear-gradient(90deg, #e60012, #ffffff, #0000ff)", preview: "from-red-950 to-blue-950",
  },
  {
    id: "playstation",
    name: "PlayStation",
    description: "It only does everything. Including drama.",
    free: false, cost: 100,
    banner: "linear-gradient(135deg, #00001a 0%, #0a0014 50%, #000014 100%)",
    accent: "rgba(0,70,200,0.15)", glow: "rgba(0,120,255,0.5)", ring: "#0070ff",
    textGradient: "linear-gradient(90deg, #0070ff, #22d3ee, #a855f7)", preview: "from-blue-950 to-indigo-950",
  },
  {
    id: "xbox",
    name: "Xbox",
    description: "Green machine. Competitive by nature.",
    free: false, cost: 100,
    banner: "linear-gradient(135deg, #001a00 0%, #000a00 50%, #001a00 100%)",
    accent: "rgba(16,124,16,0.15)", glow: "rgba(20,200,20,0.5)", ring: "#107c10",
    textGradient: "linear-gradient(90deg, #107c10, #22c55e, #84cc16)", preview: "from-green-950 to-emerald-950",
  },
  // ── 125 GEMZ themes ────────────────────────────────────────────────────────
  {
    id: "mystic",
    name: "Mystic",
    description: "Between dimensions. Neither here nor there.",
    free: false, cost: 125,
    banner: "linear-gradient(135deg, #1a0a2e 0%, #0a1a2e 50%, #1a1a0a 100%)",
    accent: "rgba(100,50,200,0.15)", glow: "rgba(150,100,255,0.4)", ring: "#9664ff",
    textGradient: "linear-gradient(90deg, #9664ff, #c084fc, #38bdf8)", preview: "from-violet-950 to-sky-950",
    bgImage: "radial-gradient(ellipse at 20% 50%, rgba(150,100,255,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(56,189,248,0.06) 0%, transparent 50%), repeating-linear-gradient(60deg, transparent, transparent 30px, rgba(150,100,255,0.02) 30px, rgba(150,100,255,0.02) 31px)",
  },
  {
    id: "gemstone",
    name: "Gemstone",
    description: "Rare. Brilliant. Formed under pressure.",
    free: false, cost: 125,
    banner: "linear-gradient(135deg, #0d001a 0%, #001a0d 50%, #1a0d00 100%)",
    accent: "rgba(0,200,100,0.15)", glow: "rgba(0,255,150,0.4)", ring: "#00ff96",
    textGradient: "linear-gradient(90deg, #00ff96, #22d3ee, #e879f9)", preview: "from-emerald-950 to-violet-950",
    bgImage: "repeating-linear-gradient(45deg, rgba(0,255,150,0.025) 0px, rgba(0,255,150,0.025) 2px, transparent 2px, transparent 20px), repeating-linear-gradient(-45deg, rgba(232,121,249,0.025) 0px, rgba(232,121,249,0.025) 2px, transparent 2px, transparent 20px)",
  },
  {
    id: "rainbow",
    name: "Rainbow",
    description: "Every color at once. Maximum chaos energy.",
    free: false, cost: 125,
    banner: "linear-gradient(135deg, #1a0033 0%, #001a33 33%, #001a00 66%, #1a1a00 100%)",
    accent: "rgba(255,100,200,0.12)", glow: "rgba(255,100,200,0.4)", ring: "#ff64c8",
    textGradient: "linear-gradient(90deg, #ff0000, #ff8800, #ffff00, #00ff00, #0000ff, #8800ff)", preview: "from-violet-950 to-emerald-950",
  },
  {
    id: "money",
    name: "Money",
    description: "Stacking GEMZ and not apologizing for it.",
    free: false, cost: 125,
    banner: "linear-gradient(135deg, #001a00 0%, #000d00 50%, #001a0d 100%)",
    accent: "rgba(0,200,0,0.15)", glow: "rgba(0,255,100,0.4)", ring: "#00c800",
    textGradient: "linear-gradient(90deg, #00c800, #fbbf24, #84cc16)", preview: "from-green-950 to-emerald-950",
  },
  {
    id: "vaporwave",
    name: "Vaporwave",
    description: "Aesthetic excess. Retro-future dreamland.",
    free: false, cost: 125,
    banner: "linear-gradient(135deg, #0d0028 0%, #280014 50%, #001428 100%)",
    accent: "rgba(200,50,200,0.15)", glow: "rgba(255,100,255,0.5)", ring: "#ff64ff",
    textGradient: "linear-gradient(90deg, #ff71ce, #b967ff, #01cdfe)", preview: "from-fuchsia-950 to-cyan-950",
    bgImage: "repeating-linear-gradient(0deg, transparent, transparent 18px, rgba(255,100,255,0.06) 18px, rgba(255,100,255,0.06) 19px), repeating-linear-gradient(90deg, transparent, transparent 18px, rgba(1,205,254,0.04) 18px, rgba(1,205,254,0.04) 19px)",
  },
  {
    id: "cowboy",
    name: "Cowboy",
    description: "Ride hard. Speak true. Tip your hat.",
    free: false, cost: 125,
    banner: "linear-gradient(135deg, #1a0f00 0%, #0f0800 50%, #1a0a00 100%)",
    accent: "rgba(180,120,50,0.15)", glow: "rgba(220,160,80,0.5)", ring: "#dca050",
    textGradient: "linear-gradient(90deg, #dca050, #fbbf24, #d97706)", preview: "from-amber-950 to-stone-950",
  },
  {
    id: "scenecore",
    name: "Scenecore",
    description: "Side-swept bangs and emotional devastation.",
    free: false, cost: 125,
    banner: "linear-gradient(135deg, #0a0014 0%, #140028 50%, #000a14 100%)",
    accent: "rgba(200,0,150,0.15)", glow: "rgba(255,0,200,0.5)", ring: "#ff00c8",
    textGradient: "linear-gradient(90deg, #ff00c8, #f472b6, #38bdf8)", preview: "from-fuchsia-950 to-sky-950",
  },
  {
    id: "lachrywave",
    name: "Lachrywave",
    description: "Beautiful sadness. Tears in neon.",
    free: false, cost: 125,
    banner: "linear-gradient(135deg, #000a1a 0%, #0a001a 50%, #001414 100%)",
    accent: "rgba(0,150,200,0.15)", glow: "rgba(0,200,255,0.4)", ring: "#00c8ff",
    textGradient: "linear-gradient(90deg, #00c8ff, #b967ff, #a0e4ff)", preview: "from-sky-950 to-violet-950",
  },
  {
    id: "swancore",
    name: "Swan Core",
    description: "Ethereal. Precise. Violently beautiful.",
    free: false, cost: 125,
    banner: "linear-gradient(135deg, #0a0a0f 0%, #0f0a0a 50%, #0a0f0a 100%)",
    accent: "rgba(220,220,240,0.12)", glow: "rgba(240,240,255,0.4)", ring: "#f0f0ff",
    textGradient: "linear-gradient(90deg, #f0f0ff, #c7d2fe, #e879f9)", preview: "from-slate-950 to-violet-950",
  },
  {
    id: "desert",
    name: "Desert",
    description: "Burning clarity. Nowhere to hide.",
    free: false, cost: 125,
    banner: "linear-gradient(135deg, #1e0f00 0%, #141400 50%, #1e0a00 100%)",
    accent: "rgba(200,150,80,0.15)", glow: "rgba(255,200,120,0.5)", ring: "#ffc878",
    textGradient: "linear-gradient(90deg, #ffc878, #fb923c, #ef4444)", preview: "from-orange-950 to-red-950",
  },
  {
    id: "mountain",
    name: "Mountain",
    description: "Cold peaks. Long views. Earned silence.",
    free: false, cost: 125,
    banner: "linear-gradient(135deg, #051428 0%, #050a1e 50%, #05051e 100%)",
    accent: "rgba(50,100,150,0.15)", glow: "rgba(80,150,220,0.4)", ring: "#5096dc",
    textGradient: "linear-gradient(90deg, #5096dc, #60a5fa, #c7d2fe)", preview: "from-blue-950 to-indigo-950",
  },
  {
    id: "peppy-rock",
    name: "Peppy Rock",
    description: "Loud anthems and loud feelings. No apologies.",
    free: false, cost: 125,
    banner: "linear-gradient(135deg, #1a000a 0%, #0a0014 50%, #1a0005 100%)",
    accent: "rgba(255,50,150,0.15)", glow: "rgba(255,80,180,0.5)", ring: "#ff50b4",
    textGradient: "linear-gradient(90deg, #ff50b4, #f472b6, #818cf8)", preview: "from-pink-950 to-violet-950",
  },
  {
    id: "preppy-alt",
    name: "Preppy Alternative",
    description: "Bow headbands and existential dread. Both.",
    free: false, cost: 125,
    banner: "linear-gradient(135deg, #001414 0%, #140014 50%, #001414 100%)",
    accent: "rgba(0,200,200,0.15)", glow: "rgba(0,255,255,0.4)", ring: "#00ffff",
    textGradient: "linear-gradient(90deg, #00ffff, #38bdf8, #c084fc)", preview: "from-cyan-950 to-violet-950",
  },
  // ── 150 GEMZ themes ────────────────────────────────────────────────────────
  {
    id: "tarot",
    name: "Tarot",
    description: "Every card is a mirror. You pulled this one.",
    free: false, cost: 150,
    banner: "linear-gradient(135deg, #1a0a2e 0%, #2d1b00 50%, #1a0a10 100%)",
    accent: "rgba(212,175,55,0.15)", glow: "rgba(212,175,55,0.4)", ring: "#d4af37",
    textGradient: "linear-gradient(90deg, #d4af37, #fbbf24, #c084fc)", preview: "from-violet-950 to-amber-950",
  },
  {
    id: "sacred-geometry",
    name: "Sacred Geometry",
    description: "The universe is math. You are a pattern.",
    free: false, cost: 150,
    banner: "linear-gradient(135deg, #001a33 0%, #000d1a 50%, #00001a 100%)",
    accent: "rgba(0,100,200,0.15)", glow: "rgba(0,150,255,0.4)", ring: "#0096ff",
    textGradient: "linear-gradient(90deg, #0096ff, #38bdf8, #e879f9)", preview: "from-blue-950 to-violet-950",
  },
  {
    id: "nu-metal",
    name: "Nu-Metal",
    description: "Rage in the key of D-tuned guitar.",
    free: false, cost: 150,
    banner: "linear-gradient(135deg, #0a0a0a 0%, #1a0500 50%, #050505 100%)",
    accent: "rgba(150,30,0,0.15)", glow: "rgba(200,50,0,0.5)", ring: "#c83200",
    textGradient: "linear-gradient(90deg, #c83200, #ef4444, #94a3b8)", preview: "from-red-950 to-zinc-950",
  },
  {
    id: "southern-metal",
    name: "Southern Metal",
    description: "Blues-soaked brutality. Real and raw.",
    free: false, cost: 150,
    banner: "linear-gradient(135deg, #1a0a00 0%, #0d0500 50%, #1a0000 100%)",
    accent: "rgba(150,80,0,0.15)", glow: "rgba(200,100,0,0.4)", ring: "#c86400",
    textGradient: "linear-gradient(90deg, #c86400, #d97706, #dc2626)", preview: "from-orange-950 to-red-950",
  },
  {
    id: "metal",
    name: "Metal",
    description: "Cold steel. Precision pain. No filters.",
    free: false, cost: 150,
    banner: "linear-gradient(135deg, #0a0a0a 0%, #050505 50%, #0f0f0f 100%)",
    accent: "rgba(150,150,150,0.15)", glow: "rgba(200,200,200,0.4)", ring: "#c8c8c8",
    textGradient: "linear-gradient(90deg, #c8c8c8, #94a3b8, #64748b)", preview: "from-zinc-950 to-slate-950",
  },
  {
    id: "mainstream-skeleton",
    name: "Mainstream Skeleton",
    description: "Everyone pretends. You see through it all.",
    free: false, cost: 150,
    banner: "linear-gradient(135deg, #0f0a14 0%, #14000a 50%, #0a0f0a 100%)",
    accent: "rgba(200,200,200,0.1)", glow: "rgba(255,255,255,0.3)", ring: "#ffffff",
    textGradient: "linear-gradient(90deg, #ffffff, #e2e8f0, #cbd5e1)", preview: "from-violet-950 to-zinc-950",
  },
  // ── 175-200 GEMZ themes ────────────────────────────────────────────────────
  {
    id: "occult",
    name: "Occult",
    description: "Ancient power. Hidden knowledge. Eyes open.",
    free: false, cost: 175,
    banner: "linear-gradient(135deg, #0d0005 0%, #05000d 50%, #000005 100%)",
    accent: "rgba(139,0,0,0.2)", glow: "rgba(180,0,0,0.5)", ring: "#8b0000",
    textGradient: "linear-gradient(90deg, #8b0000, #dc2626, #a855f7)", preview: "from-red-950 to-violet-950",
  },
  {
    id: "dark-brotherhood",
    name: "Dark Brotherhood",
    description: "We know. We always know. Listener.",
    free: false, cost: 175,
    banner: "linear-gradient(135deg, #050000 0%, #0d0000 50%, #050000 100%)",
    accent: "rgba(100,0,0,0.2)", glow: "rgba(150,0,0,0.5)", ring: "#960000",
    textGradient: "linear-gradient(90deg, #960000, #b91c1c, #1c1917)", preview: "from-red-950 to-stone-950",
  },
  {
    id: "sad-skeleton",
    name: "Sad Skeleton",
    description: "Decomposing beautifully. We're all just bones.",
    free: false, cost: 175,
    banner: "linear-gradient(135deg, #0a0a0a 0%, #0d0a0a 50%, #0a0a0d 100%)",
    accent: "rgba(200,200,220,0.12)", glow: "rgba(220,220,240,0.35)", ring: "#c8c8f0",
    textGradient: "linear-gradient(90deg, #c8c8f0, #a5b4fc, #e2e8f0)", preview: "from-zinc-950 to-indigo-950",
  },
  {
    id: "fallen-angel",
    name: "Fallen Angel Skeleton",
    description: "Once divine. Now gloriously broken.",
    free: false, cost: 175,
    banner: "linear-gradient(135deg, #050005 0%, #0a0005 50%, #050005 100%)",
    accent: "rgba(200,150,255,0.12)", glow: "rgba(255,200,255,0.4)", ring: "#ffc8ff",
    textGradient: "linear-gradient(90deg, #ffc8ff, #e879f9, #d4af37)", preview: "from-fuchsia-950 to-violet-950",
  },
  {
    id: "jester",
    name: "Jester",
    description: "Chaos is the bit. You're always the punchline.",
    free: false, cost: 175,
    banner: "linear-gradient(135deg, #1a0000 0%, #00001a 50%, #1a1a00 100%)",
    accent: "rgba(200,0,0,0.15)", glow: "rgba(255,50,0,0.4)", ring: "#ff3200",
    textGradient: "linear-gradient(90deg, #ff3200, #fbbf24, #4f46e5)", preview: "from-red-950 to-indigo-950",
  },
  {
    id: "bat",
    name: "Bat",
    description: "Upside-down perspective. Night is when it's real.",
    free: false, cost: 175,
    banner: "linear-gradient(135deg, #050014 0%, #0a0014 50%, #050014 100%)",
    accent: "rgba(50,0,100,0.2)", glow: "rgba(80,0,150,0.5)", ring: "#500096",
    textGradient: "linear-gradient(90deg, #500096, #7c3aed, #1e1b4b)", preview: "from-violet-950 to-indigo-950",
  },
  {
    id: "death",
    name: "Death",
    description: "The ultimate equalizer. Everyone gets here.",
    free: false, cost: 200,
    banner: "linear-gradient(135deg, #000000 0%, #050005 50%, #000000 100%)",
    accent: "rgba(50,0,50,0.2)", glow: "rgba(80,0,80,0.5)", ring: "#500050",
    textGradient: "linear-gradient(90deg, #500050, #7c3aed, #6b21a8)", preview: "from-purple-950 to-black",
  },
  {
    id: "custom_photo",
    name: "Custom Photo",
    description: "Upload your own background image. Make it yours.",
    free: false, cost: 200,
    banner: "linear-gradient(135deg, #0a0a1a 0%, #0a0a0a 100%)",
    accent: "rgba(139,92,246,0.15)", glow: "rgba(139,92,246,0.4)", ring: "#7c3aed",
    textGradient: "linear-gradient(90deg, #a855f7, #7c3aed)", preview: "from-violet-950 to-slate-950",
  },
];

function makeCursorSvg(emoji: string) {
  const enc = encodeURIComponent(emoji);
  return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ctext y='26' font-size='22'%3E${enc}%3C/text%3E%3C/svg%3E") 8 8, default`;
}

export const CURSOR_OPTIONS = [
  { id: "default",    name: "Default",    css: "default",    preview: "↖",  premium: false },
  { id: "crosshair",  name: "Crosshair",  css: "crosshair",  preview: "+",   premium: false },
  { id: "cell",       name: "Cell",       css: "cell",        preview: "⊕",  premium: false },
  { id: "zoom-in",    name: "Zoom",       css: "zoom-in",     preview: "🔍", premium: false },
  { id: "grab",       name: "Grab",       css: "grab",        preview: "✋", premium: false },
  {
    id: "cat-paw", name: "Cat Paw", premium: false,
    css: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='20' r='7' fill='%23a855f7' opacity='0.9'/%3E%3Ccircle cx='9' cy='13' r='3.5' fill='%23a855f7' opacity='0.8'/%3E%3Ccircle cx='23' cy='13' r='3.5' fill='%23a855f7' opacity='0.8'/%3E%3Ccircle cx='13' cy='10' r='2.5' fill='%23a855f7' opacity='0.7'/%3E%3Ccircle cx='19' cy='10' r='2.5' fill='%23a855f7' opacity='0.7'/%3E%3C/svg%3E") 16 16, default`,
    preview: "🐾",
  },
  { id: "sparkle", name: "Sparkle", premium: false, css: makeCursorSvg("✦"), preview: "✦" },
  { id: "skull",   name: "Skull",   premium: false, css: makeCursorSvg("💀"), preview: "💀" },
  // ── Mystic Pack ──────────────────────────────────────────────────────────
  { id: "moon",          name: "Moon",          premium: true, pack: "cursor_mystic_pack", css: makeCursorSvg("🌙"), preview: "🌙" },
  { id: "shooting-star", name: "Shooting Star", premium: true, pack: "cursor_mystic_pack", css: makeCursorSvg("🌟"), preview: "🌟" },
  { id: "crystal",       name: "Crystal Ball",  premium: true, pack: "cursor_mystic_pack", css: makeCursorSvg("🔮"), preview: "🔮" },
  { id: "wand",          name: "Magic Wand",    premium: true, pack: "cursor_mystic_pack", css: makeCursorSvg("🪄"), preview: "🪄" },
  { id: "rose",          name: "Rose",          premium: true, pack: "cursor_mystic_pack", css: makeCursorSvg("🌹"), preview: "🌹" },
  // ── Dark Pack ─────────────────────────────────────────────────────────────
  { id: "dagger", name: "Dagger",   premium: true, pack: "cursor_dark_pack", css: makeCursorSvg("🗡️"), preview: "🗡️" },
  { id: "eye",    name: "Eye of Ra",premium: true, pack: "cursor_dark_pack", css: makeCursorSvg("👁️"), preview: "👁️" },
  { id: "raven",  name: "Raven",    premium: true, pack: "cursor_dark_pack", css: makeCursorSvg("🦅"), preview: "🦅" },
  { id: "flame",  name: "Flame",    premium: true, pack: "cursor_dark_pack", css: makeCursorSvg("🔥"), preview: "🔥" },
  {
    id: "void", name: "Void", premium: true, pack: "cursor_dark_pack",
    css: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='10' fill='%230f0f0f' stroke='%23a855f7' stroke-width='2'/%3E%3Ccircle cx='16' cy='16' r='4' fill='%23a855f7' opacity='0.7'/%3E%3C/svg%3E") 16 16, default`,
    preview: "⚫",
  },
  // ── Critter Pack ──────────────────────────────────────────────────────────
  { id: "rodent",  name: "Rodent Mouse",   premium: true, pack: "cursor_critter_pack", css: makeCursorSvg("🐭"), preview: "🐭" },
  { id: "snake",   name: "Snake",          premium: true, pack: "cursor_critter_pack", css: makeCursorSvg("🐍"), preview: "🐍" },
  { id: "nugget",  name: "Chicken Nugget", premium: true, pack: "cursor_critter_pack", css: makeCursorSvg("🍗"), preview: "🍗" },
  { id: "fries",   name: "Fries",          premium: true, pack: "cursor_critter_pack", css: makeCursorSvg("🍟"), preview: "🍟" },
  // ── Love Pack ─────────────────────────────────────────────────────────────
  { id: "heart",     name: "Heart",       premium: true, pack: "cursor_love_pack", css: makeCursorSvg("❤️"), preview: "❤️" },
  { id: "lips",      name: "Lips",        premium: true, pack: "cursor_love_pack", css: makeCursorSvg("💋"), preview: "💋" },
  { id: "heartbreak",name: "Heartbreak",  premium: true, pack: "cursor_love_pack", css: makeCursorSvg("💔"), preview: "💔" },
  { id: "galaxy",    name: "Galaxy",      premium: true, pack: "cursor_love_pack", css: makeCursorSvg("🌌"), preview: "🌌" },
  // ── Vibes Pack ────────────────────────────────────────────────────────────
  { id: "tree",      name: "Leafless Tree",premium: true, pack: "cursor_vibes_pack", css: makeCursorSvg("🌳"), preview: "🌳" },
  { id: "music-note",name: "Music Note",   premium: true, pack: "cursor_vibes_pack", css: makeCursorSvg("🎵"), preview: "🎵" },
  { id: "sports",    name: "Sports",       premium: true, pack: "cursor_vibes_pack", css: makeCursorSvg("⚽"), preview: "⚽" },
  { id: "tarot-card",name: "Tarot Card",   premium: true, pack: "cursor_vibes_pack", css: makeCursorSvg("🃏"), preview: "🃏" },
];

export const GLITCH_EFFECTS = [
  { id: "none",    name: "No Effect",      description: "Clean profile. No glitch.",                      preview: "―",  appId: null,           cssClass: "" },
  { id: "crt",     name: "CRT Glitch",     description: "TV scanlines and static interference.",           preview: "📺", appId: "glitch_crt",   cssClass: "profile-glitch-crt" },
  { id: "decay",   name: "Digital Decay",  description: "Profile dissolves and reforms in fragments.",      preview: "💀", appId: "glitch_decay", cssClass: "profile-glitch-decay" },
  { id: "neon",    name: "Neon Fracture",  description: "RGB color splits tear through the profile.",      preview: "🌈", appId: "glitch_neon",  cssClass: "profile-glitch-neon" },
  { id: "vhs",     name: "VHS Rewind",     description: "Tracking lines and ghost images, like a VHS.",   preview: "📼", appId: "glitch_vhs",   cssClass: "profile-glitch-vhs" },
];

export const RINGY_OUTFITS = [
  { id: "default",  name: "Classic Ringy",   emoji: "",      appId: null,            description: "The original. Quiet, watching." },
  { id: "wizard",   name: "Wizard Ringy",    emoji: "🧙",   appId: "ringy_wizard",  description: "Starry sorcerer's hat, mystic robes." },
  { id: "goth",     name: "Goth Ringy",      emoji: "🦇",   appId: "ringy_goth",    description: "Black lace, bat wings, crimson eyes." },
  { id: "space",    name: "Space Ringy",     emoji: "🚀",   appId: "ringy_space",   description: "Astronaut helmet. Watching from the void." },
  { id: "vampire",  name: "Vampire Ringy",   emoji: "🧛",   appId: "ringy_vampire", description: "Cape, fangs, moonlit menace." },
  { id: "witch",    name: "Witch Ringy",     emoji: "🧙‍♀️", appId: "ringy_witch",   description: "Pointed hat, broomstick, an attitude." },
];

export function getThemeById(id: string): ProfileTheme {
  return PROFILE_THEMES.find(t => t.id === id) || PROFILE_THEMES[0];
}

export function getCursorById(id: string) {
  return CURSOR_OPTIONS.find(c => c.id === id) || CURSOR_OPTIONS[0];
}

export interface ProfileFont {
  id: string;
  name: string;
  description: string;
  free: boolean;
  cost: number;
  fontFamily: string;
  googleFont?: string;
  preview: string;
}

export const PROFILE_FONTS: ProfileFont[] = [
  { id: "inter",       name: "Default",         description: "Clean and readable. The base CLAW aesthetic.",             free: true,  cost: 0,   fontFamily: "Inter, sans-serif",                   preview: "The truth hurts." },
  { id: "cinzel",      name: "Mystical",         description: "Ancient runes meet modern drama.",                        free: false, cost: 75,  fontFamily: "'Cinzel Decorative', serif",           googleFont: "Cinzel+Decorative:wght@400;700",      preview: "The truth hurts." },
  { id: "orbitron",    name: "Techno",           description: "Cyberpunk edge. Cold, precise, futuristic.",              free: false, cost: 75,  fontFamily: "'Orbitron', sans-serif",               googleFont: "Orbitron:wght@400;700",               preview: "The truth hurts." },
  { id: "pacifico",    name: "Dreamy",           description: "Soft handwritten vibes. Chaos with a smile.",             free: false, cost: 75,  fontFamily: "'Pacifico', cursive",                  googleFont: "Pacifico",                            preview: "The truth hurts." },
  { id: "im-fell",     name: "Gothic",           description: "Old world darkness. Poetic and unsettling.",              free: false, cost: 75,  fontFamily: "'IM Fell English', serif",             googleFont: "IM+Fell+English:ital@0;1",            preview: "The truth hurts." },
  { id: "press-start", name: "Pixel",            description: "8-bit energy. Retro chaos. Unhinged in the best way.",   free: false, cost: 100, fontFamily: "'Press Start 2P', monospace",          googleFont: "Press+Start+2P",                      preview: "Truth hurts." },
  { id: "righteous",   name: "Over Obsessed",    description: "Bold geometry. Main character energy.",                   free: false, cost: 75,  fontFamily: "'Righteous', sans-serif",              googleFont: "Righteous",                           preview: "The truth hurts." },
  { id: "creepster",   name: "Bitten",           description: "Vampire horror. Something bit it.",                       free: false, cost: 75,  fontFamily: "'Creepster', cursive",                 googleFont: "Creepster",                           preview: "The truth hurts." },
  { id: "unfraktur",   name: "Blackletter",      description: "Medieval German blackletter. Ancient and brooding.",      free: false, cost: 100, fontFamily: "'UnifrakturMaguntia', cursive",        googleFont: "UnifrakturMaguntia",                  preview: "The truth hurts." },
  { id: "nosifer",     name: "Haunted",          description: "Dripping horror letters. Something is wrong here.",       free: false, cost: 100, fontFamily: "'Nosifer', cursive",                   googleFont: "Nosifer",                             preview: "The truth hurts." },
  { id: "rock-salt",   name: "Punk Scribble",    description: "Scratched into the wall. Someone was angry.",             free: false, cost: 75,  fontFamily: "'Rock Salt', cursive",                 googleFont: "Rock+Salt",                           preview: "The truth hurts." },
  { id: "playfair",    name: "Preppy",           description: "Elegant serif. Private school dropout energy.",           free: false, cost: 75,  fontFamily: "'Playfair Display', serif",            googleFont: "Playfair+Display:wght@400;700",       preview: "The truth hurts." },
  { id: "metal-mania", name: "Rocker",           description: "Heavy metal lettering. Put your horns up.",              free: false, cost: 100, fontFamily: "'Metal Mania', cursive",               googleFont: "Metal+Mania",                         preview: "The truth hurts." },
  { id: "great-vibes", name: "Cursive",          description: "Flowing script. Beautifully chaotic.",                   free: false, cost: 75,  fontFamily: "'Great Vibes', cursive",               googleFont: "Great+Vibes",                         preview: "The truth hurts." },
  { id: "perm-marker", name: "Graffiti",         description: "Marker on the wall. Permanent. Just like your choices.", free: false, cost: 75,  fontFamily: "'Permanent Marker', cursive",          googleFont: "Permanent+Marker",                    preview: "The truth hurts." },
];

export interface FontColorPack {
  id: string;
  name: string;
  description: string;
  free: boolean;
  cost: number;
  color: string;
  preview: string;
}

export const FONT_COLOR_PACKS: FontColorPack[] = [
  { id: "white",        name: "Ghost",         description: "Pure white. Clean and haunting.",           free: true,  cost: 0,   color: "#ffffff",  preview: "bg-white" },
  { id: "gold",         name: "Gold",          description: "Drip. Royalty. Wealth energy.",              free: false, cost: 50,  color: "#fbbf24",  preview: "bg-yellow-400" },
  { id: "violet",       name: "Violet",        description: "CLAW purple. The signature shade.",          free: false, cost: 50,  color: "#a855f7",  preview: "bg-violet-500" },
  { id: "crimson",      name: "Crimson",       description: "Dangerous, passionate. Red energy.",         free: false, cost: 50,  color: "#ef4444",  preview: "bg-red-500" },
  { id: "cyan",         name: "Cyber",         description: "Neon teal. Digital ghost aesthetic.",        free: false, cost: 50,  color: "#22d3ee",  preview: "bg-cyan-400" },
  { id: "rose",         name: "Rose",          description: "Soft but deadly. Pink as poison.",           free: false, cost: 50,  color: "#fb7185",  preview: "bg-rose-400" },
  { id: "emerald",      name: "Emerald",       description: "Forest witch green. Mystic and calm.",       free: false, cost: 50,  color: "#34d399",  preview: "bg-emerald-400" },
  { id: "rainbow",      name: "Rainbow",       description: "Every color at once. Chaos is the vibe.",   free: false, cost: 125, color: "rainbow",  preview: "bg-gradient-to-r from-violet-400 via-pink-400 to-yellow-400" },
  { id: "dark-magenta", name: "Dark Magenta",  description: "Deep magenta power. Dark and commanding.",   free: false, cost: 50,  color: "#8B008B",  preview: "bg-fuchsia-900" },
  { id: "purple",       name: "Purple",        description: "Classic purple energy. Regal and bold.",     free: false, cost: 50,  color: "#800080",  preview: "bg-purple-700" },
  { id: "magenta",      name: "Magenta",       description: "Neon fuchsia. Loud and electric.",           free: false, cost: 50,  color: "#FF00FF",  preview: "bg-fuchsia-500" },
  { id: "deep-pink",    name: "Deep Pink",     description: "Hot pink intensity. Uncompromising.",        free: false, cost: 50,  color: "#FF1493",  preview: "bg-pink-500" },
  { id: "dark-violet",  name: "Dark Violet",   description: "Deep violet shadow. Mysterious and heavy.",  free: false, cost: 50,  color: "#9400D3",  preview: "bg-violet-800" },
  { id: "sky-blue",     name: "Sky Blue",      description: "Light sky energy. Open and clear.",          free: false, cost: 50,  color: "#87CEFA",  preview: "bg-sky-300" },
  { id: "blue",         name: "Electric Blue", description: "Pure blue. Direct and striking.",            free: false, cost: 50,  color: "#0000FF",  preview: "bg-blue-600" },
  { id: "aqua",         name: "Aqua",          description: "Tropical neon. Cool and refreshing.",        free: false, cost: 50,  color: "#00FFFF",  preview: "bg-cyan-400" },
  { id: "aquamarine",   name: "Aquamarine",    description: "Mermaid blue-green. Ethereal.",              free: false, cost: 50,  color: "#7FFFD4",  preview: "bg-teal-300" },
  { id: "lime",         name: "Lime",          description: "Radioactive lime. Warning label energy.",    free: false, cost: 50,  color: "#00FF00",  preview: "bg-lime-400" },
  { id: "yellow",       name: "Yellow",        description: "Sunshine neon. Impossible to ignore.",       free: false, cost: 50,  color: "#FFFF00",  preview: "bg-yellow-300" },
  { id: "red",          name: "Danger Red",    description: "Pure red. Urgent and unmissable.",           free: false, cost: 50,  color: "#FF0000",  preview: "bg-red-500" },
  { id: "snow",         name: "Snow",          description: "Soft white with a chill. Haunting quiet.",   free: false, cost: 50,  color: "#FFFAFA",  preview: "bg-slate-50" },
];

export function getFontById(id: string): ProfileFont {
  return PROFILE_FONTS.find(f => f.id === id) || PROFILE_FONTS[0];
}

export function getFontColorById(id: string): FontColorPack {
  return FONT_COLOR_PACKS.find(c => c.id === id) || FONT_COLOR_PACKS[0];
}
