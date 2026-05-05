import { useState, useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import Layout from "@/components/Layout";
import { Waves, Zap, User } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

interface FreqMatch {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  interactionLevel: string;
  isVerified: boolean;
  zodiacSign?: string;
  mbtiType?: string;
  score: number;
  traits: string[];
}

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

function MatchCard({ match, onConnect }: { match: FreqMatch; onConnect: (id: string) => void }) {
  const [sent, setSent] = useState(false);
  const pct = match.score;
  const color = pct >= 70 ? "#a855f7" : pct >= 45 ? "#6366f1" : "#3b82f6";

  const handleConnect = async () => {
    await fetch(`${BASE}/api/frequency-match/${match.userId}/connect`, {
      method: "POST", credentials: "include",
    });
    setSent(true);
    onConnect(match.userId);
  };

  return (
    <div className="relative bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 overflow-hidden hover:border-purple-500/30 transition-all duration-300 group">
      {/* Frequency ring behind card */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${color}15, transparent 70%)` }} />

      <div className="flex items-start gap-4 mb-4">
        <div className="relative flex-shrink-0">
          {match.avatarUrl ? (
            <img src={match.avatarUrl} alt={match.displayName} className="w-14 h-14 rounded-2xl object-cover border-2 border-white/10" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-violet-800 flex items-center justify-center border-2 border-white/10">
              <User className="w-6 h-6 text-white/60" />
            </div>
          )}
          {match.isVerified && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
              <span className="text-[8px] text-white font-bold">✓</span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-bold text-white text-sm">{match.displayName}</span>
          </div>
          <div className="text-white/40 text-xs mb-2">@{match.username}</div>
          <div className="flex flex-wrap gap-1.5">
            {match.zodiacSign && (
              <span className="text-[10px] bg-purple-500/15 text-purple-300/80 border border-purple-500/20 rounded-full px-2 py-0.5">{match.zodiacSign}</span>
            )}
            {match.mbtiType && (
              <span className="text-[10px] bg-violet-500/15 text-violet-300/80 border border-violet-500/20 rounded-full px-2 py-0.5">{match.mbtiType}</span>
            )}
            <span className="text-[10px] bg-white/5 text-white/40 border border-white/10 rounded-full px-2 py-0.5">{match.interactionLevel}</span>
          </div>
        </div>

        {/* Frequency meter */}
        <div className="flex flex-col items-center flex-shrink-0">
          <div className="relative w-12 h-12">
            <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
              <circle cx="24" cy="24" r="20" fill="none" stroke={color} strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 20}`}
                strokeDashoffset={`${2 * Math.PI * 20 * (1 - pct / 100)}`}
                style={{ transition: "stroke-dashoffset 1s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-white">{pct}%</span>
            </div>
          </div>
          <div className="text-[9px] text-white/30 mt-1 uppercase tracking-widest">match</div>
        </div>
      </div>

      {/* Shared traits */}
      {match.traits.length > 0 && (
        <div className="mb-4 space-y-1">
          {match.traits.map((t, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-white/50">
              <Waves className="w-3 h-3 text-purple-400/60 flex-shrink-0" />
              <span>{t}</span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleConnect}
        disabled={sent}
        className="w-full py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 disabled:opacity-40"
        style={{
          background: sent ? "rgba(168,85,247,0.1)" : `linear-gradient(135deg, ${color}80, ${color}40)`,
          border: `1px solid ${color}30`,
          color: sent ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.85)",
        }}
      >
        {sent ? "✦ Signal sent" : "⌁ Connect on the same wavelength"}
      </button>
    </div>
  );
}

export default function FrequencyMatchPage() {
  useSEO({
    title: "Frequency Match — Find Your People on CLAW",
    description: "CLAW's Frequency Match goes deeper than shared interests. It compares your interaction patterns, intensity preferences, and engagement style to find people who truly resonate on your wavelength.",
    canonical: "/frequency-match",
    keywords: "frequency match, soul match, resonance match, CLAW frequency match, compatibility social media, find your people online",
  });
  const { user } = useAuth();
  const [matches, setMatches] = useState<FreqMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    fetch(`${BASE}/api/frequency-match`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { setMatches(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  const highMatches = matches.filter(m => m.score >= 60);
  const otherMatches = matches.filter(m => m.score < 60);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center mx-auto mb-4">
            <Waves className="w-7 h-7 text-purple-400" />
          </div>
          <h1 className="text-2xl font-serif font-bold bg-gradient-to-r from-purple-300 to-violet-400 bg-clip-text text-transparent mb-2">
            Frequency Match
          </h1>
          <p className="text-white/40 text-sm leading-relaxed max-w-sm mx-auto">
            Some souls carry the same signal. We found yours. These people might be your twin flames — your cosmic mirrors.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white/30 text-sm">Scanning the frequency…</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">🔮</div>
            <p className="text-white/40 text-sm mb-2">No resonance detected yet</p>
            <p className="text-white/25 text-xs max-w-xs mx-auto">
              Fill out your zodiac, MBTI, and soul excavation answers in your profile to unlock frequency matches.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {highMatches.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-white/50">Strong resonance</span>
                </div>
                <div className="grid gap-3">
                  {highMatches.map(m => (
                    <MatchCard key={m.userId} match={m} onConnect={id => setConnected(c => [...c, id])} />
                  ))}
                </div>
              </div>
            )}
            {otherMatches.length > 0 && (
              <div>
                {highMatches.length > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <Waves className="w-4 h-4 text-purple-400/60" />
                    <span className="text-xs font-bold uppercase tracking-widest text-white/30">Partial alignment</span>
                  </div>
                )}
                <div className="grid gap-3">
                  {otherMatches.map(m => (
                    <MatchCard key={m.userId} match={m} onConnect={id => setConnected(c => [...c, id])} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
