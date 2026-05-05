import { useGetCreatorAnalytics, useGetReceivedTips } from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import { useSEO } from "@/hooks/useSEO";
import {
  Zap, TrendingUp, Heart, Users, Eye, ThumbsUp, ThumbsDown, Gift,
  Loader2, Type, Palette, FileText, Copy, Check, Music, Image, Play,
  Coins, ShoppingBag, Sparkles, Film, BookOpen, Clock, Shuffle, EyeOff, Maximize2, Smile
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import MusicStudio from "./creator-music";
import PhotoStudio from "./creator-photo";
import VideoStudio from "./creator-video";

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ElementType; color: string }) {
  return (
    <div className={`bg-card border rounded-xl p-5 flex items-center gap-4 ${color === "primary" ? "border-primary/30" : color === "accent" ? "border-accent/30" : "border-border"}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color === "primary" ? "bg-primary/20" : color === "accent" ? "bg-accent/20" : "bg-muted"}`}>
        <Icon className={`w-5 h-5 ${color === "primary" ? "text-primary" : color === "accent" ? "text-accent" : "text-muted-foreground"}`} />
      </div>
      <div>
        <div className="text-2xl font-bold font-serif text-foreground">{value ?? 0}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
      </div>
    </div>
  );
}

const FONTS = [
  { name: "Gothic",      class: "font-serif", preview: "Speak truth.", label: "Gothic Serif" },
  { name: "Mono",        class: "font-mono",  preview: "Speak truth.", label: "Terminal Mono" },
  { name: "Sans",        class: "font-sans",  preview: "Speak truth.", label: "Clean Sans" },
  { name: "Cursive",     class: "", style: { fontFamily: "'Dancing Script', cursive" }, preview: "Speak truth.", label: "Cursive Flow" },
  { name: "Impact",      class: "", style: { fontFamily: "Impact, Haettenschweiler, sans-serif", letterSpacing: "0.05em" }, preview: "SPEAK TRUTH.", label: "Impact Bold" },
  { name: "Handwritten", class: "", style: { fontFamily: "'Caveat', cursive" }, preview: "Speak truth.", label: "Handwritten" },
  { name: "Cinzel",      class: "", style: { fontFamily: "'Times New Roman', serif", letterSpacing: "0.12em", textTransform: "uppercase" as const }, preview: "SPEAK TRUTH.", label: "Cinzel Caps" },
  { name: "Typewriter",  class: "", style: { fontFamily: "'Courier New', monospace", letterSpacing: "0.02em" }, preview: "Speak truth.", label: "Typewriter" },
];

const NEON_COLORS = [
  { name: "Mystic Purple", hex: "#9b59b6", bg: "bg-purple-500" },
  { name: "Electric Violet", hex: "#7c3aed", bg: "bg-violet-600" },
  { name: "Neon Pink", hex: "#ec4899", bg: "bg-pink-500" },
  { name: "Chaos Red", hex: "#ef4444", bg: "bg-red-500" },
  { name: "Ghost Blue", hex: "#3b82f6", bg: "bg-blue-500" },
  { name: "Acid Green", hex: "#10b981", bg: "bg-emerald-500" },
  { name: "Solar Orange", hex: "#f97316", bg: "bg-orange-500" },
  { name: "Gold", hex: "#f59e0b", bg: "bg-amber-500" },
  { name: "Ice White", hex: "#e2e8f0", bg: "bg-slate-200" },
  { name: "Void Black", hex: "#1a1a2e", bg: "bg-slate-900" },
];

const TEMPLATES = [
  {
    name: "Raw Confession",
    content: "I need to say something I've been holding for too long:\n\n[write your truth here]\n\nThis is not for sympathy. This is just real.",
    intent: "Honesty",
  },
  {
    name: "Reality Check",
    content: "Let me be honest with myself and whoever reads this:\n\n[your honest observation]\n\nSomeone out there needed to see this written out loud.",
    intent: "Insight",
  },
  {
    name: "Pressure Test",
    content: "I'm opening this to brutal honesty. Tell me what you actually think:\n\n[your situation / question]\n\nNo sugarcoating. I opted into Claw mode for a reason.",
    intent: "PressureTest",
  },
  {
    name: "Broadcast",
    content: "Attention CLAW:\n\n[your announcement / declaration]\n\nThis is not a request. This is a statement.",
    intent: "Broadcast",
  },
  {
    name: "Daily Chaos",
    content: "Today I:\n\n— [thing that happened]\n— [how it made you feel]\n— [what you're going to do about it]\n\nThis is my log. Judge it.",
    intent: "Honesty",
  },
  {
    name: "Dear Stranger",
    content: "Dear person reading this:\n\n[what you want them to know]\n\nYou don't know me. But you needed to read this today.",
    intent: "Insight",
  },
];

const MOODS = [
  { name: "Raw",       emoji: "🩸", prefix: "" },
  { name: "Haunted",   emoji: "👻", prefix: "[ haunted ]\n\n" },
  { name: "Furious",   emoji: "🔥", prefix: "[ unfiltered rage ]\n\n" },
  { name: "Tender",    emoji: "🕯️", prefix: "[ soft truth ]\n\n" },
  { name: "Numb",      emoji: "🌑", prefix: "[ void state ]\n\n" },
  { name: "Chaotic",   emoji: "⚡", prefix: "[ chaos mode ]\n\n" },
];

function WritingToolkit() {
  const [selectedFont, setSelectedFont] = useState(FONTS[0]);
  const [selectedColor, setSelectedColor] = useState(NEON_COLORS[0]);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedMood, setSelectedMood] = useState(MOODS[0]);
  const [shadowMode, setShadowMode] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;
  const readingTimeSec = Math.max(1, Math.ceil(wordCount / 3.5));
  const readingTimeStr = readingTimeSec < 60 ? `${readingTimeSec}s read` : `${Math.ceil(readingTimeSec / 60)}m read`;

  const copy = () => {
    const content = selectedMood.prefix + text;
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shuffleColor = () => {
    const next = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
    setSelectedColor(next);
  };

  const handleMoodSelect = (mood: typeof MOODS[0]) => {
    setSelectedMood(mood);
    if (mood.prefix && !text.startsWith(mood.prefix)) {
      setText(mood.prefix + text.replace(/^\[.*?\]\n\n/, ""));
    } else if (!mood.prefix) {
      setText(text.replace(/^\[.*?\]\n\n/, ""));
    }
  };

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{wordCount} words · {charCount} chars · {readingTimeStr}</span>
          </div>
          <button onClick={() => setFullscreen(false)} className="px-4 py-2 rounded-xl bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-colors">
            Done
          </button>
        </div>
        <textarea
          autoFocus
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Write freely. No one is watching."
          className={`flex-1 bg-transparent border-none outline-none resize-none text-lg leading-relaxed ${selectedFont.class}`}
          style={{ color: selectedColor.hex, ...(selectedFont as any).style }}
          maxLength={2000}
        />
        <div className="mt-4 flex gap-3">
          <button onClick={copy} disabled={!text.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-colors disabled:opacity-50">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Type className="w-5 h-5 text-primary" />
          <h3 className="font-serif font-semibold text-foreground">Writing Toolkit</h3>
        </div>
        <button onClick={() => setFullscreen(true)} title="Distraction-free mode" className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <Maximize2 className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Mood Tag</div>
        <div className="flex flex-wrap gap-2">
          {MOODS.map(m => (
            <button
              key={m.name}
              onClick={() => handleMoodSelect(m)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                selectedMood.name === m.name
                  ? "border-primary/60 bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
              }`}
            >
              <span>{m.emoji}</span>
              {m.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Font</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {FONTS.map(f => (
            <button
              key={f.name}
              onClick={() => setSelectedFont(f)}
              className={`px-3 py-2.5 rounded-lg border text-left transition-all ${
                selectedFont.name === f.name
                  ? "border-primary/60 bg-primary/10"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <div className={`text-sm text-foreground ${f.class}`} style={(f as any).style}>{f.preview}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{f.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Neon Color</div>
          <button onClick={shuffleColor} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Shuffle className="w-3 h-3" /> Random
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {NEON_COLORS.map(c => (
            <button
              key={c.hex}
              onClick={() => setSelectedColor(c)}
              title={c.name}
              className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColor.hex === c.hex ? "border-white scale-110" : "border-transparent"} ${c.bg}`}
            />
          ))}
        </div>
        <div className="text-xs text-muted-foreground mt-1">{selectedColor.name}</div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Your Post</div>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={shadowMode} onChange={e => { setShadowMode(e.target.checked); setRevealed(false); }} className="accent-primary" />
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <EyeOff className="w-3 h-3" /> Shadow Draft
            </span>
          </label>
        </div>
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={shadowMode ? "Write without looking. Reveal when done." : "Type something true..."}
            rows={5}
            maxLength={500}
            className={`w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/60 resize-none ${selectedFont.class} transition-all`}
            style={{
              color: shadowMode && !revealed ? "transparent" : selectedColor.hex,
              textShadow: shadowMode && !revealed ? `0 0 8px ${selectedColor.hex}` : "none",
              ...(selectedFont as any).style,
            }}
          />
          {shadowMode && (
            <button
              onClick={() => setRevealed(r => !r)}
              className="absolute bottom-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-colors"
            >
              <Eye className="w-3 h-3" />
              {revealed ? "Hide" : "Reveal"}
            </button>
          )}
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{wordCount} words</span>
            <span>{charCount}/500</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{readingTimeStr}</span>
          </div>
          <button
            onClick={copy}
            disabled={!text.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 text-primary text-xs font-medium hover:bg-primary/30 transition-colors disabled:opacity-50"
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PostTemplates() {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (content: string, name: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(name);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-accent" />
        <h3 className="font-serif font-semibold text-foreground">Post Templates</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">Use these as starting points. Make them yours. Replace the brackets.</p>
      <div className="space-y-3">
        {TEMPLATES.map(t => (
          <div key={t.name} className="border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-foreground">{t.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                  {t.intent}
                </span>
                <button
                  onClick={() => copy(t.content, t.name)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-muted-foreground hover:text-foreground text-xs transition-colors"
                >
                  {copied === t.name ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied === t.name ? "Copied!" : "Use"}
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line line-clamp-3">{t.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MediaLinks() {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Palette className="w-5 h-5 text-accent" />
        <h3 className="font-serif font-semibold text-foreground">Media Creation</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link href="/profile-edit">
          <div className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer">
            <Music className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <div className="text-sm font-medium text-foreground">Profile Song</div>
              <div className="text-xs text-muted-foreground">Upload your audio identity</div>
            </div>
          </div>
        </Link>
        <Link href="/profile-edit">
          <div className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer">
            <Image className="w-5 h-5 text-accent flex-shrink-0" />
            <div>
              <div className="text-sm font-medium text-foreground">Profile Art</div>
              <div className="text-xs text-muted-foreground">Banner + avatar upload</div>
            </div>
          </div>
        </Link>
        <Link href="/reels">
          <div className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer">
            <Play className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <div className="text-sm font-medium text-foreground">Upload Reel</div>
              <div className="text-xs text-muted-foreground">Short-form video content</div>
            </div>
          </div>
        </Link>
        <Link href="/contests">
          <div className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer">
            <Zap className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <div>
              <div className="text-sm font-medium text-foreground">Enter Contest</div>
              <div className="text-xs text-muted-foreground">Drawings, writing, photos</div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

const BOOST_TYPES = [
  { id: "spotlight", label: "Spotlight", durationHours: 1, coins: 10, desc: "1 hour at the top of feeds" },
  { id: "prime", label: "Prime Spotlight", durationHours: 6, coins: 25, desc: "6 hours of prime visibility" },
  { id: "viral", label: "Viral Push", durationHours: 24, coins: 50, desc: "24-hour viral wave" },
];

const COIN_PACKAGES = [
  { id: "coins_starter", coins: 50, price: 0.99, label: "Starter Pack", bonus: "" },
  { id: "coins_claw", coins: 160, price: 1.99, label: "Claw Pack", bonus: "+10 bonus" },
  { id: "coins_chaos", coins: 550, price: 4.99, label: "Chaos Pack", bonus: "+50 bonus" },
  { id: "coins_legend", coins: 1700, price: 9.99, label: "Legend Pack", bonus: "+200 bonus" },
];

const BASE_URL_CREATOR = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

function ClawCoins({ balance, onPurchase }: { balance: number; onPurchase: (id: string) => void }) {
  const [showShop, setShowShop] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);

  const buy = async (pkgId: string) => {
    setBuying(pkgId);
    try {
      const r = await fetch(`${BASE_URL_CREATOR}/api/stripe/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ itemId: pkgId }),
      });
      if (r.ok) {
        const { url } = await r.json();
        if (url) window.location.href = url;
      } else {
        alert("Couldn't start checkout. Please try again.");
      }
    } finally {
      setBuying(null);
    }
  };

  return (
    <div className="bg-card border border-primary/30 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-primary" />
          <h3 className="font-serif font-semibold text-foreground">GEMZ</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-primary font-bold text-sm">
            {balance} Coins
          </div>
          <button
            onClick={() => setShowShop(!showShop)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-accent transition-colors"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Buy Coins
          </button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Use GEMZ to boost your posts to the top of everyone's feed. The more chaotic your truth, the more it deserves to be seen.</p>
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">What you can do with coins</div>
        <div className="grid grid-cols-3 gap-2">
          {BOOST_TYPES.map(b => (
            <div key={b.id} className="p-3 rounded-xl bg-muted/60 border border-border text-center">
              <Sparkles className="w-4 h-4 text-primary mx-auto mb-1" />
              <div className="text-xs font-semibold text-foreground">{b.label}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{b.desc}</div>
              <div className="text-primary font-bold text-sm mt-1.5">{b.coins} coins</div>
            </div>
          ))}
        </div>
      </div>

      {showShop && (
        <div className="border-t border-border pt-4 space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Purchase Coins</div>
          <div className="grid grid-cols-2 gap-2">
            {COIN_PACKAGES.map(pkg => (
              <button
                key={pkg.id}
                onClick={() => buy(pkg.id)}
                disabled={buying === pkg.id}
                className="p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
              >
                <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{pkg.label}</div>
                <div className="text-2xl font-serif font-bold text-primary mt-1">{pkg.coins}</div>
                <div className="text-[10px] text-muted-foreground">coins{pkg.bonus ? ` · ${pkg.bonus}` : ""}</div>
                <div className="mt-2 text-xs font-medium text-muted-foreground">${pkg.price.toFixed(2)} USD</div>
                {buying === pkg.id && <Loader2 className="w-4 h-4 animate-spin text-primary mt-1" />}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground text-center pt-1">Purchases processed securely. Coins are non-refundable.</p>
        </div>
      )}
    </div>
  );
}

export default function Creator() {
  useSEO({
    title: "Creator Hub — Build an Audience on an Honest Social Platform | CLAW",
    description:
      "CLAW's Creator Hub gives you analytics, a tip jar, GEMZ earnings, and audience tools. The social media creator platform that rewards authenticity — not virality.",
    canonical: "/creator",
  });
  const { data: stats, isLoading: loadingStats } = useGetCreatorAnalytics();
  const { data: tips, isLoading: loadingTips } = useGetReceivedTips();
  const [activeTab, setActiveTab] = useState<"analytics" | "toolkit" | "music" | "photo" | "video" | "stickers">("analytics");
  const [coinBalance, setCoinBalance] = useState(0);

  useEffect(() => {
    fetch("/api/coins/me", { credentials: "include" })
      .then(r => r.json())
      .then(d => setCoinBalance(d.balance || 0))
      .catch(() => {});
  }, []);

  const refreshCoins = () => {
    fetch("/api/coins/me", { credentials: "include" })
      .then(r => r.json())
      .then(d => setCoinBalance(d.balance || 0))
      .catch(() => {});
  };

  const tabs = [
    { key: "analytics", label: "Stats",    icon: TrendingUp },
    { key: "toolkit",   label: "Writing",  icon: Type },
    { key: "music",     label: "Music",    icon: Music },
    { key: "photo",     label: "Photo",    icon: Image },
    { key: "video",     label: "Video",    icon: Film },
    { key: "stickers",  label: "Stickers", icon: Sparkles },
  ] as const;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-2xl font-serif font-bold text-foreground">Creator Hub</h2>
              <p className="text-muted-foreground text-xs">Your tools, analytics, and rewards</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold">
            <Coins className="w-3.5 h-3.5" />
            {coinBalance}
          </div>
        </div>

        <div className="flex gap-1 p-1 bg-card border border-border rounded-xl">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === key
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {activeTab === "analytics" && (
          <div className="space-y-4">
            <ClawCoins balance={coinBalance} onPurchase={refreshCoins} />

            {loadingStats ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : stats && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <StatCard label="Total Posts" value={(stats as any).totalPosts || 0} icon={TrendingUp} color="primary" />
                <StatCard label="Total Views" value={(stats as any).totalViews || 0} icon={Eye} color="accent" />
                <StatCard label="Total Likes" value={(stats as any).totalLikes || 0} icon={ThumbsUp} color="primary" />
                <StatCard label="Followers" value={(stats as any).followerCount || 0} icon={Users} color="accent" />
                <StatCard label="Following" value={(stats as any).followingCount || 0} icon={Heart} color="muted" />
                <StatCard label="Engagement" value={`${(((stats as any).engagementRate || 0) * 100).toFixed(1)}%`} icon={ThumbsDown} color="primary" />
              </div>
            )}

            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Gift className="w-5 h-5 text-accent" />
                <h3 className="font-serif font-semibold text-foreground">Tip Jar</h3>
              </div>
              {loadingTips ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
              ) : !(tips as any)?.recentTips?.length ? (
                <p className="text-sm text-muted-foreground italic text-center py-4">No tips yet. Keep creating.</p>
              ) : (
                <div className="space-y-2">
                  {(tips as any).recentTips.slice(0, 10).map((t: any) => (
                    <div key={t.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
                      <Gift className="w-4 h-4 text-accent flex-shrink-0" />
                      <span className="flex-1 text-sm text-foreground">{t.senderName || "Someone"} tipped you</span>
                      <span className="text-sm font-bold text-accent">{t.amount} pts</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {stats && (stats as any).topPosts?.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="font-serif font-semibold text-foreground mb-4">Top Posts</h3>
                <div className="space-y-3">
                  {(stats as any).topPosts.slice(0, 5).map((post: any) => (
                    <div key={post.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{post.content}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ""}</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
                        <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{post.likeCount}</span>
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.viewCount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "toolkit" && (
          <div className="space-y-4">
            <WritingToolkit />
            <PostTemplates />
          </div>
        )}

        {activeTab === "music" && (
          <div className="bg-card border border-border rounded-xl p-5">
            <MusicStudio />
          </div>
        )}

        {activeTab === "photo" && (
          <div className="bg-card border border-border rounded-xl p-5">
            <PhotoStudio />
          </div>
        )}

        {activeTab === "video" && (
          <div className="bg-card border border-border rounded-xl p-5">
            <VideoStudio />
          </div>
        )}

        {activeTab === "stickers" && (
          <ClawStickersGallery />
        )}
      </div>
    </Layout>
  );
}

const CLAW_STICKER_PACK = [
  {
    id: "pawprint", label: "Paw Print",
    svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><ellipse cx="30" cy="40" rx="14" ry="12" fill="#e879a0"/><ellipse cx="16" cy="26" rx="7" ry="6" fill="#e879a0"/><ellipse cx="26" cy="20" rx="6" ry="5" fill="#e879a0"/><ellipse cx="36" cy="20" rx="6" ry="5" fill="#e879a0"/><ellipse cx="46" cy="26" rx="7" ry="6" fill="#e879a0"/></svg>`,
  },
  {
    id: "clawmarks", label: "Claw Marks",
    svg: `<svg viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg"><path d="M10 5 C8 25 6 50 10 75" stroke="#9b59b6" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M28 0 C26 22 24 50 28 80" stroke="#9b59b6" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M46 5 C48 25 50 50 46 75" stroke="#9b59b6" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`,
  },
  {
    id: "ghostkitty", label: "Ghost Kitty",
    svg: `<svg viewBox="0 0 60 70" xmlns="http://www.w3.org/2000/svg"><path d="M30 5 C16 5 6 16 6 30 L6 62 L13 56 L20 62 L30 56 L40 62 L47 56 L54 62 L54 30 C54 16 44 5 30 5Z" fill="white" opacity="0.88" stroke="#9b59b6" stroke-width="1.5"/><circle cx="22" cy="28" r="4" fill="#1a1a2e"/><circle cx="38" cy="28" r="4" fill="#1a1a2e"/><path d="M6 10 L14 22" stroke="#9b59b6" stroke-width="2" stroke-linecap="round"/><path d="M54 10 L46 22" stroke="#9b59b6" stroke-width="2" stroke-linecap="round"/><path d="M24 38 Q30 44 36 38" stroke="#9b59b6" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>`,
  },
  {
    id: "mysticeye", label: "Mystic Eye",
    svg: `<svg viewBox="0 0 80 44" xmlns="http://www.w3.org/2000/svg"><path d="M4 22 Q40 2 76 22 Q40 42 4 22Z" fill="#1a1a2e" stroke="#7c3aed" stroke-width="2"/><circle cx="40" cy="22" r="12" fill="#7c3aed"/><circle cx="40" cy="22" r="6" fill="#0a0a1a"/><circle cx="44" cy="18" r="3" fill="white" opacity="0.7"/></svg>`,
  },
  {
    id: "speaktruth", label: "Speak Truth",
    svg: `<svg viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="120" height="40" rx="6" fill="#1a1a2e" stroke="#9b59b6" stroke-width="1.5"/><text x="60" y="26" text-anchor="middle" font-family="Georgia, serif" font-size="13" font-weight="bold" fill="#e879a0" letter-spacing="2">SPEAK TRUTH</text></svg>`,
  },
  {
    id: "scratched", label: "CLAW'd",
    svg: `<svg viewBox="0 0 100 44" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="100" height="44" rx="4" fill="#9b59b6"/><text x="50" y="29" text-anchor="middle" font-family="Impact, sans-serif" font-size="20" fill="white" letter-spacing="3">CLAW'D</text><path d="M5 5 L22 39" stroke="white" stroke-width="1.5" opacity="0.25"/><path d="M14 5 L31 39" stroke="white" stroke-width="1.5" opacity="0.25"/></svg>`,
  },
  {
    id: "mooncat", label: "Moon Cat",
    svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><circle cx="30" cy="30" r="28" fill="#1a1a2e" stroke="#7c3aed" stroke-width="1.5"/><path d="M38 18 C30 18 24 24 24 32 C24 40 30 46 38 46 C32 44 28 38 28 32 C28 26 32 20 38 18Z" fill="#a78bfa"/><path d="M22 16 L18 10 L14 16" stroke="#a78bfa" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M40 16 L44 10 L48 16" stroke="#a78bfa" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>`,
  },
  {
    id: "chaos", label: "Chaos Star",
    svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><path d="M30 4 L33 25 L54 18 L37 30 L54 42 L33 35 L30 56 L27 35 L6 42 L23 30 L6 18 L27 25 Z" fill="#ec4899"/><circle cx="30" cy="30" r="7" fill="#1a1a2e"/><circle cx="30" cy="30" r="3" fill="#ec4899"/></svg>`,
  },
  {
    id: "void", label: "Void Circle",
    svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><circle cx="30" cy="30" r="28" fill="#0a0a1a" stroke="#7c3aed" stroke-width="2.5"/><circle cx="30" cy="30" r="14" fill="#7c3aed" opacity="0.5"/><circle cx="30" cy="30" r="5" fill="#e879a0"/><circle cx="36" cy="22" r="3" fill="white" opacity="0.4"/></svg>`,
  },
  {
    id: "ninelivez", label: "Nine Livez",
    svg: `<svg viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="100" height="40" rx="6" fill="#0a0a1a" stroke="#e879a0" stroke-width="1.5"/><text x="50" y="26" text-anchor="middle" font-family="Impact, sans-serif" font-size="14" fill="#e879a0" letter-spacing="2">NINE LIVEZ</text></svg>`,
  },
  {
    id: "scratch_banner", label: "Scratch Here",
    svg: `<svg viewBox="0 0 120 50" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="120" height="50" rx="8" fill="#1a1a2e" stroke="#9b59b6" stroke-width="2"/><path d="M5 10 L15 40" stroke="#9b59b6" stroke-width="2" opacity="0.5"/><path d="M12 10 L22 40" stroke="#9b59b6" stroke-width="2" opacity="0.5"/><text x="65" y="31" text-anchor="middle" font-family="Georgia, serif" font-size="12" font-style="italic" fill="#a78bfa" letter-spacing="1">scratch here</text></svg>`,
  },
  {
    id: "witness", label: "Witness",
    svg: `<svg viewBox="0 0 80 44" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="80" height="44" rx="22" fill="#1a1a2e" stroke="#7c3aed" stroke-width="1.5"/><circle cx="40" cy="22" r="8" fill="#7c3aed" opacity="0.7"/><circle cx="40" cy="22" r="4" fill="white" opacity="0.9"/><text x="40" y="38" text-anchor="middle" font-family="Georgia, serif" font-size="8" fill="#a78bfa" letter-spacing="1">WITNESS</text></svg>`,
  },
];

function ClawStickersGallery() {
  const [copied, setCopied] = useState<string | null>(null);

  const downloadSvg = (sticker: typeof CLAW_STICKER_PACK[0]) => {
    const blob = new Blob([sticker.svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `claw-sticker-${sticker.id}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copySvg = (sticker: typeof CLAW_STICKER_PACK[0]) => {
    navigator.clipboard.writeText(sticker.svg).then(() => {
      setCopied(sticker.id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-serif font-semibold text-foreground">CLAW Sticker Pack</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          Original CLAW-branded stickers. Download as SVG or copy the code to use anywhere.
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {CLAW_STICKER_PACK.map(sticker => (
            <div
              key={sticker.id}
              className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all group"
            >
              <div
                className="w-14 h-14 flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: sticker.svg }}
              />
              <span className="text-[10px] text-muted-foreground text-center leading-tight">{sticker.label}</span>
              <div className="flex gap-1 w-full">
                <button
                  onClick={() => downloadSvg(sticker)}
                  title="Download SVG"
                  className="flex-1 py-1 rounded-lg bg-muted hover:bg-primary/15 hover:text-primary text-muted-foreground text-[10px] font-medium transition-all"
                >
                  Save
                </button>
                <button
                  onClick={() => copySvg(sticker)}
                  title="Copy SVG code"
                  className={`flex-1 py-1 rounded-lg text-[10px] font-medium transition-all ${
                    copied === sticker.id
                      ? "bg-green-500/20 text-green-400"
                      : "bg-muted hover:bg-primary/15 hover:text-primary text-muted-foreground"
                  }`}
                >
                  {copied === sticker.id ? "✓" : "Copy"}
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-4 opacity-60">
          SVG stickers · Free to use · CLAW original · More coming
        </p>
      </div>
    </div>
  );
}
