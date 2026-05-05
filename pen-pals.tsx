import { useState, useEffect, useRef } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useLocation } from "wouter";
import { Mail, Sparkles, Loader2, Trash2, MessageCircle, ChevronDown, ChevronUp, X, Check, Star } from "lucide-react";
import { useRingy } from "@/contexts/RingyContext";
import { useSEO } from "@/hooks/useSEO";
import Layout from "@/components/Layout";

const INTEREST_LIST = [
  "Music","Art","Writing","Gaming","Anime","Movies","Nature","Travel",
  "Food","Fitness","Books","Astrology","Mental Health","Spirituality",
  "Coding","Fashion","Photography","Poetry","True Crime","Pets",
  "Journaling","Philosophy","Cooking","Skateboarding","Vintage","Memes",
];

interface PenPalProfile {
  displayName: string;
  username: string;
  avatarUrl?: string;
  interactionLevel?: string;
  zodiacSign?: string;
  mbtiType?: string;
  isVerified?: boolean;
  isBot?: boolean;
}

interface PenPal {
  id: string;
  penPalId: string;
  matchScore: number;
  matchTraits: string[];
  conversationId?: number;
  createdAt: string;
  profile: PenPalProfile | null;
}

interface Prefs {
  exists: boolean;
  interests: string[];
  age: number | null;
  ageMin: number;
  ageMax: number;
  lookingFor: string;
}

function MatchScore({ score }: { score: number }) {
  const color = score >= 70 ? "text-violet-400" : score >= 45 ? "text-sky-400" : "text-muted-foreground";
  const bars = Math.round(score / 20);
  return (
    <div className={`flex items-center gap-1.5 text-xs ${color}`}>
      {[1,2,3,4,5].map(b => (
        <div key={b} className={`w-1.5 h-4 rounded-full ${b <= bars ? "bg-current" : "bg-current opacity-20"}`} />
      ))}
      <span className="ml-0.5 font-semibold">{score}%</span>
    </div>
  );
}

export default function PenPalsPage() {
  useSEO({
    title: "Pen Pals — Find Your Letter-Writing Match | CLAW",
    description: "Get matched with a pen pal on CLAW based on your interests, age, and vibe. No algorithm, no swiping — just real human connection through writing.",
    canonical: "/pen-pals",
  });

  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { speak } = useRingy();

  const [penPals, setPenPals] = useState<PenPal[]>([]);
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<PenPal | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Setup form state
  const [setupAge, setSetupAge] = useState("");
  const [setupInterests, setSetupInterests] = useState<string[]>([]);
  const [setupLookingFor, setSetupLookingFor] = useState("");
  const [setupAgeMin, setSetupAgeMin] = useState("16");
  const [setupAgeMax, setSetupAgeMax] = useState("99");
  const [savingPrefs, setSavingPrefs] = useState(false);

  const hasSpokeRef = useRef(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [palsRes, prefsRes] = await Promise.all([
        fetch("/api/pen-pals", { credentials: "include" }),
        fetch("/api/pen-pals/preferences", { credentials: "include" }),
      ]);
      if (palsRes.ok) setPenPals(await palsRes.json());
      if (prefsRes.ok) {
        const p = await prefsRes.json();
        setPrefs(p);
        setSetupInterests(p.interests || []);
        setSetupAge(p.age?.toString() || "");
        setSetupLookingFor(p.lookingFor || "");
        setSetupAgeMin(p.ageMin?.toString() || "16");
        setSetupAgeMax(p.ageMax?.toString() || "99");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadAll();
  }, [user]);

  useEffect(() => {
    if (!loading && !hasSpokeRef.current) {
      hasSpokeRef.current = true;
      if (penPals.length === 0) {
        speak("letters to people you haven't met yet. that's kind of beautiful.", "normal");
      } else {
        speak(`you have ${penPals.length} pen pal${penPals.length !== 1 ? "s" : ""}. don't leave them waiting.`, "normal");
      }
    }
  }, [loading]);

  const toggleInterest = (i: string) => {
    setSetupInterests(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  };

  const savePrefs = async () => {
    setSavingPrefs(true);
    try {
      await fetch("/api/pen-pals/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          age: setupAge ? Number(setupAge) : null,
          ageMin: Number(setupAgeMin) || 16,
          ageMax: Number(setupAgeMax) || 99,
          interests: setupInterests,
          lookingFor: setupLookingFor,
        }),
      });
      await loadAll();
      setShowSetup(false);
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleMatch = async () => {
    setMatching(true);
    setMatchResult(null);
    setMatchError(null);
    speak("finding someone who matches your signal...", "normal");
    try {
      const res = await fetch("/api/pen-pals/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setMatchError(data.error || "couldn't find a match right now");
        speak("no match found yet. try adding more interests.", "normal");
      } else {
        setMatchResult(data);
        setPenPals(prev => [{ ...data, createdAt: new Date().toISOString() }, ...prev]);
        speak(`matched. ${data.matchScore}% compatible. write them something real.`, "normal");
      }
    } finally {
      setMatching(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`/api/pen-pals/${id}`, { method: "DELETE", credentials: "include" });
      setPenPals(prev => prev.filter(p => p.id !== id));
      if (matchResult?.id === id) setMatchResult(null);
    } finally {
      setDeletingId(null);
    }
  };

  const openConversation = (conversationId?: number) => {
    navigate("/messages");
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <Mail className="w-7 h-7 text-violet-400" />
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Pen Pals</h1>
              <p className="text-xs text-muted-foreground">matched by vibe, not algorithm</p>
            </div>
          </div>
          <button
            onClick={() => setShowSetup(s => !s)}
            className="text-xs text-violet-400/70 hover:text-violet-300 transition-colors border border-violet-400/20 px-3 py-1.5 rounded-lg hover:border-violet-400/40"
          >
            {showSetup ? "Close" : "My Preferences"}
          </button>
        </div>

        <p className="text-sm text-muted-foreground/70 mb-6 leading-relaxed">
          get matched with someone based on what you're actually into. no swiping. no performative bios. just hit the button and see who the void sends you.
        </p>

        {/* Preferences Panel */}
        {showSetup && (
          <div className="bg-card border border-violet-500/20 rounded-2xl p-5 mb-6 shadow-lg shadow-violet-900/10">
            <div className="text-xs text-violet-400 font-semibold uppercase tracking-widest mb-4">Your Pen Pal Profile</div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Your age</label>
                <input type="number" value={setupAge} onChange={e => setSetupAge(e.target.value)} min="13" max="100"
                  placeholder="e.g. 24" className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-violet-400/60" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Looking for</label>
                <input value={setupLookingFor} onChange={e => setSetupLookingFor(e.target.value)} maxLength={120}
                  placeholder="e.g. someone to vent with" className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-violet-400/60" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Preferred age min</label>
                <input type="number" value={setupAgeMin} onChange={e => setSetupAgeMin(e.target.value)} min="13" max="100"
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-violet-400/60" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Preferred age max</label>
                <input type="number" value={setupAgeMax} onChange={e => setSetupAgeMax(e.target.value)} min="13" max="100"
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-violet-400/60" />
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs text-muted-foreground mb-2 block">Interests <span className="text-violet-400/60">({setupInterests.length} selected)</span></label>
              <div className="flex flex-wrap gap-1.5">
                {INTEREST_LIST.map(interest => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                      setupInterests.includes(interest)
                        ? "bg-violet-500/20 border-violet-500/50 text-violet-300"
                        : "border-border text-muted-foreground hover:border-violet-400/30 hover:text-foreground"
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={savePrefs}
              disabled={savingPrefs}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 disabled:opacity-50 transition-colors"
            >
              {savingPrefs ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save Preferences
            </button>
          </div>
        )}

        {/* Match CTA */}
        <div className="mb-8">
          <button
            onClick={handleMatch}
            disabled={matching}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-semibold text-base transition-all duration-300 relative overflow-hidden group"
            style={{
              background: matching
                ? "rgba(109,40,217,0.3)"
                : "linear-gradient(135deg, rgba(109,40,217,0.4) 0%, rgba(168,85,247,0.3) 50%, rgba(109,40,217,0.4) 100%)",
              border: "1px solid rgba(168,85,247,0.4)",
              boxShadow: matching ? "none" : "0 0 30px rgba(109,40,217,0.3)",
            }}
          >
            {matching ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-violet-300" />
                <span className="text-violet-200">scanning the void for your match...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-violet-300 group-hover:animate-pulse" />
                <span className="text-violet-100">Find Me a Pen Pal</span>
                <Sparkles className="w-5 h-5 text-violet-300 group-hover:animate-pulse" />
              </>
            )}
            {!matching && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            )}
          </button>

          {matchError && (
            <p className="mt-3 text-xs text-center text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2">{matchError}</p>
          )}
        </div>

        {/* New match reveal */}
        {matchResult && (
          <div className="mb-6 bg-card border border-violet-500/40 rounded-2xl p-5 shadow-lg shadow-violet-900/20 animate-in fade-in slide-in-from-bottom-2 duration-400">
            <div className="flex items-center gap-1.5 text-[10px] text-violet-400 uppercase tracking-widest font-semibold mb-3">
              <Sparkles className="w-3 h-3" /> New Match
            </div>
            <PenPalCard
              pal={matchResult}
              expanded
              onMessage={() => openConversation(matchResult.conversationId)}
              onDelete={() => handleDelete(matchResult.id)}
              deleting={deletingId === matchResult.id}
            />
          </div>
        )}

        {/* Pen pal list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : penPals.length === 0 ? (
          <div className="text-center py-16">
            <Mail className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">no pen pals yet.</p>
            <p className="text-muted-foreground/50 text-xs mt-1">hit the button above — you might be surprised who you get.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
                {penPals.length} Pen Pal{penPals.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="space-y-3">
              {penPals.map(pal => (
                <PenPalCard
                  key={pal.id}
                  pal={pal}
                  expanded={expandedId === pal.id}
                  onToggle={() => setExpandedId(expandedId === pal.id ? null : pal.id)}
                  onMessage={() => openConversation(pal.conversationId)}
                  onDelete={() => handleDelete(pal.id)}
                  deleting={deletingId === pal.id}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

function PenPalCard({
  pal, expanded, onToggle, onMessage, onDelete, deleting,
}: {
  pal: PenPal;
  expanded?: boolean;
  onToggle?: () => void;
  onMessage: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const p = pal.profile;
  const name = p?.displayName || "Unknown";
  const initial = name.slice(0, 1);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden hover:border-violet-400/20 transition-colors">
      <div className="p-4 flex items-center gap-3">
        {/* Avatar */}
        <div className="w-11 h-11 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
          {p?.avatarUrl ? (
            <img src={p.avatarUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-bold text-muted-foreground">{initial}</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-foreground text-sm">{name}</span>
            {p?.isVerified && <Star className="w-3 h-3 text-violet-400 fill-violet-400" />}
            {p?.isBot && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">AI</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <MatchScore score={pal.matchScore} />
            {p?.zodiacSign && <span className="text-[10px] text-muted-foreground/60">{p.zodiacSign}</span>}
            {p?.mbtiType && <span className="text-[10px] text-muted-foreground/60">{p.mbtiType}</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={onMessage}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-medium hover:bg-violet-500/30 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Write
          </button>
          {onToggle && (
            <button onClick={onToggle} className="text-muted-foreground hover:text-foreground transition-colors p-1">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
          <button onClick={onDelete} disabled={deleting} className="text-muted-foreground hover:text-red-400 transition-colors p-1">
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded: match traits */}
      {expanded && pal.matchTraits.length > 0 && (
        <div className="px-4 pb-4 border-t border-border/40 pt-3">
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-2">Why you matched</p>
          <div className="flex flex-wrap gap-1.5">
            {pal.matchTraits.map((t, i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
