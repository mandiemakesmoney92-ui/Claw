import { useState, useEffect } from "react";
import { useGetFeed, useGetFeedSummary, getGetFeedQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import Layout from "@/components/Layout";
import PostCard from "@/components/PostCard";
import PostCreate from "@/components/PostCreate";
import { Plus, Loader2, Flame, X, BadgeCheck, Sparkles, Heart, MessageCircle, Coins, Shield, Star } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

const INTENT_FILTERS = ["all", "Insight", "Honesty", "PressureTest"];
const INTENSITY_FILTERS = ["all", "Soft", "Direct", "Claw"];

const DAILY_TRUTH_PROMPTS = [
  "What would you say if no one could trace it back to you?",
  "Name something you believed for years that turned out to be completely wrong.",
  "Who in your life gets away with too much because you like them?",
  "What's the opinion you hold that most people around you wouldn't agree with?",
  "What do you pretend not to care about but actually think about constantly?",
  "Describe a moment you let someone down and never apologized for.",
  "What's the most honest thing you could say about yourself right now?",
  "Name one thing you wish someone had told you five years ago.",
  "What relationship in your life is built more on habit than genuine connection?",
  "What would you stop doing if you didn't care what anyone thought?",
  "Name something you're jealous of that you'd never admit in person.",
  "What's the real reason you stopped talking to someone you used to be close with?",
  "What part of yourself do you hide the most on social media?",
];

function getDailyPrompt() {
  const day = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return DAILY_TRUTH_PROMPTS[day % DAILY_TRUTH_PROMPTS.length];
}

const CLAW_FEATURES = [
  { icon: Shield, label: "Interaction Levels", desc: "Choose Soft, Direct, or Claw — you set how intense the conversation gets", color: "text-blue-400" },
  { icon: Heart, label: "Social Circles", desc: "Inner Circle, Network, Opposition — curate exactly who sees what you share", color: "text-pink-400" },
  { icon: Sparkles, label: "Confessions", desc: "Send anonymous truths to anyone, or receive confessions from your circle", color: "text-purple-400" },
  { icon: MessageCircle, label: "Broadcasts", desc: "Go live with text drops, time-sensitive truths, and open real-time threads", color: "text-cyan-400" },
  { icon: Coins, label: "GEMZ & SOULZ", desc: "Two currencies: GEMZ buys upgrades, SOULZ is your social capital earned by engaging", color: "text-yellow-400" },
  { icon: Star, label: "Ringy", desc: "Your AI black cat companion — sarcastic, philosophical, always watching the feed", color: "text-accent" },
];

function PlatformIntroCard() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem("claw_intro_dismissed") === "1");
  const [expanded, setExpanded] = useState(false);

  function dismiss() {
    localStorage.setItem("claw_intro_dismissed", "1");
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <div className="relative rounded-2xl border border-primary/40 overflow-hidden mb-6 bg-gradient-to-br from-[#0d0015] via-[#100820] to-[#08001a]">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="relative p-5">
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-white/30 hover:text-white/60 transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3 mb-4">
          <div className="text-3xl">🐱</div>
          <div>
            <h2 className="text-lg font-serif font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent leading-tight">
              Welcome to CLAW
            </h2>
            <p className="text-xs text-white/50 mt-0.5">Speak Truth. Scratch Back.</p>
          </div>
        </div>

        <p className="text-sm text-white/70 leading-relaxed mb-4">
          CLAW is a <span className="text-primary font-medium">consent-based social platform</span> built around honesty, controlled chaos, and actual connection. 
          No algorithms deciding what you see. No hiding behind curated perfection. You choose how intense your interactions get — and so does everyone else.
        </p>

        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 transition-all duration-300 ${expanded ? "" : "max-h-[180px] overflow-hidden"}`}>
          {CLAW_FEATURES.map(f => (
            <div key={f.label} className="flex items-start gap-2.5 bg-white/3 rounded-xl p-3 border border-white/5">
              <f.icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${f.color}`} />
              <div>
                <div className="text-xs font-semibold text-white/90">{f.label}</div>
                <div className="text-[11px] text-white/50 mt-0.5 leading-relaxed">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {!expanded && (
          <div className="absolute bottom-16 left-0 right-0 h-12 bg-gradient-to-t from-[#08001a] to-transparent pointer-events-none" />
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-primary/70 hover:text-primary transition-colors border border-primary/20 hover:border-primary/40 px-3 py-1.5 rounded-full"
          >
            {expanded ? "Show less" : "See all features"}
          </button>
          <button
            onClick={dismiss}
            className="text-xs text-white/40 hover:text-white/60 transition-colors"
          >
            Got it, close this
          </button>
          <span className="text-[10px] text-white/25 ml-auto hidden sm:block">
            Ringy is watching. Be interesting.
          </span>
        </div>
      </div>
    </div>
  );
}

function DailyPromptCard() {
  const [dismissed, setDismissed] = useState(false);
  const [showRespond, setShowRespond] = useState(false);
  if (dismissed) return null;
  const prompt = getDailyPrompt();
  return (
    <div className="relative bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/30 rounded-xl p-4 mb-5">
      <button onClick={() => setDismissed(true)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors">
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-2 mb-2">
        <Flame className="w-4 h-4 text-accent" />
        <span className="text-xs font-semibold text-accent uppercase tracking-widest">Today's Truth Prompt</span>
      </div>
      <p className="text-foreground font-medium text-sm leading-relaxed pr-6">{prompt}</p>
      {!showRespond ? (
        <button
          onClick={() => setShowRespond(true)}
          className="mt-3 text-xs font-medium text-primary hover:text-accent transition-colors border border-primary/30 hover:border-accent/40 px-3 py-1.5 rounded-full"
        >
          Respond publicly
        </button>
      ) : (
        <PostCreate initialContent={`"${prompt}"\n\n`} onClose={() => setShowRespond(false)} />
      )}
    </div>
  );
}

export default function Feed() {
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [intentFilter, setIntentFilter] = useState("all");
  const [intensityFilter, setIntensityFilter] = useState("all");
  const [humanOnly, setHumanOnly] = useState(false);

  useSEO({
    title: "The Lounge — Honest Social Feed | CLAW",
    description:
      "Real people, raw truths, zero algorithm manipulation. Browse the CLAW honest social feed — Soft, Direct, and Claw intensity posts from verified humans in your community.",
    canonical: "/feed",
  });
  const { data: posts, isLoading } = useGetFeed({
    feedType: "global",
    ...(intentFilter !== "all" ? { intentType: intentFilter as any } : {}),
    ...(intensityFilter !== "all" ? { intensityLevel: intensityFilter as any } : {}),
    limit: 30,
  });
  const { data: summary } = useGetFeedSummary();

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4">
        {summary && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <div className="text-2xl font-bold font-serif text-primary">{summary.hotToday}</div>
              <div className="text-xs text-muted-foreground mt-1">Hot Today</div>
            </div>
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <div className="text-2xl font-bold font-serif text-accent">{summary.activeBroadcasts}</div>
              <div className="text-xs text-muted-foreground mt-1">Broadcasts</div>
            </div>
            <div className="bg-card border border-border rounded-xl p-3 text-center">
              <div className="text-2xl font-bold font-serif text-secondary">{summary.activePurgeWindows}</div>
              <div className="text-xs text-muted-foreground mt-1">Purge Windows</div>
            </div>
          </div>
        )}

        <PlatformIntroCard />

        <DailyPromptCard />

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-serif font-bold text-foreground">The Feed</h2>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-accent transition-colors shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            Post
          </button>
        </div>

        {showCreate && (
          <div className="mb-4">
            <PostCreate onClose={() => setShowCreate(false)} />
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          <div className="flex gap-1.5 flex-wrap">
            {INTENT_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setIntentFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                  intentFilter === f
                    ? "border-primary/60 bg-primary/20 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "all" ? "All" : f === "PressureTest" ? "Pressure Test" : f}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {INTENSITY_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setIntensityFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                  intensityFilter === f
                    ? "border-accent/60 bg-accent/20 text-accent"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "all" ? "Any Level" : f}
              </button>
            ))}
          </div>
          {/* Human-Only feed toggle */}
          <button
            onClick={() => setHumanOnly(!humanOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all ${
              humanOnly
                ? "border-blue-500/60 bg-blue-500/20 text-blue-300"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
            title="Show only posts from Humanity Verified users"
          >
            <BadgeCheck className="w-3 h-3" />
            Human Only
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-1/4" />
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-5/6" />
                  <div className="h-3 bg-muted rounded w-4/6" />
                </div>
                <div className="flex gap-4 pt-3 border-t border-border">
                  <div className="h-3 bg-muted rounded w-8" />
                  <div className="h-3 bg-muted rounded w-8" />
                  <div className="h-3 bg-muted rounded w-10" />
                </div>
              </div>
            ))}
          </div>
        ) : posts?.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full bg-primary/5 border border-primary/10 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center text-3xl">🐱</div>
            </div>
            <p className="font-serif text-lg mb-2">Nothing here yet</p>
            <p className="text-sm">Be the first to break the silence.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 px-6 py-2.5 rounded-full bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary text-sm font-medium transition-colors"
            >
              Write the first post →
            </button>
          </div>
        ) : (
          (() => {
            const filtered = humanOnly
              ? posts?.filter(p => !(p as any).aiSuspected)
              : posts;
            return filtered?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="font-serif mb-1">No verified human posts found</p>
                <p className="text-sm">Try disabling the Human Only filter.</p>
              </div>
            ) : (
              filtered?.map(post => (
                <PostCard key={post.id} post={post} currentUserId={user?.id} />
              ))
            );
          })()
        )}
      </div>
    </Layout>
  );
}
