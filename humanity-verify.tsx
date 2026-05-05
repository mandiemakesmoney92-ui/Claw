import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { useSEO } from "@/hooks/useSEO";
import { useAuth } from "@workspace/replit-auth-web";
import { BadgeCheck, Shield, Heart, Mic, Fingerprint, CheckCircle, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

// Abstract glitch art challenges — user describes in 3 words
const GLITCH_CHALLENGES = [
  {
    id: "g1",
    svg: (
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <rect width="200" height="200" fill="#0d0d1a" />
        <rect x="20" y="40" width="160" height="8" fill="#7c3aed" opacity="0.9" />
        <rect x="0" y="38" width="80" height="4" fill="#06b6d4" opacity="0.7" transform="translate(4,0)" />
        <rect x="60" y="80" width="100" height="6" fill="#ec4899" opacity="0.8" />
        <rect x="40" y="76" width="60" height="3" fill="#7c3aed" opacity="0.5" transform="translate(-8,0)" />
        <rect x="10" y="120" width="180" height="10" fill="#06b6d4" opacity="0.6" />
        <rect x="0" y="118" width="100" height="5" fill="#ec4899" opacity="0.4" transform="translate(12,0)" />
        <rect x="30" y="160" width="140" height="7" fill="#7c3aed" opacity="0.7" />
        <circle cx="100" cy="100" r="30" fill="none" stroke="#ec4899" strokeWidth="1" opacity="0.4" />
        <line x1="0" y1="100" x2="200" y2="100" stroke="#06b6d4" strokeWidth="0.5" opacity="0.3" />
        <text x="15" y="95" fontFamily="monospace" fontSize="9" fill="#7c3aed" opacity="0.5">01101101</text>
        <text x="80" y="135" fontFamily="monospace" fontSize="9" fill="#06b6d4" opacity="0.5">ERROR</text>
        <text x="40" y="60" fontFamily="monospace" fontSize="7" fill="#ec4899" opacity="0.6">▓▒░▓▒░</text>
      </svg>
    ),
    hint: "What you see — three words only.",
  },
  {
    id: "g2",
    svg: (
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <rect width="200" height="200" fill="#050510" />
        {[0,1,2,3,4,5,6,7,8,9].map(i => (
          <rect key={i} x={i * 20} y={60 + Math.sin(i) * 30} width="18" height={40 + i * 6} fill={i % 2 === 0 ? "#7c3aed" : "#06b6d4"} opacity={0.3 + i * 0.07} />
        ))}
        <rect x="0" y="0" width="200" height="200" fill="url(#scan)" opacity="0.15" />
        <defs>
          <pattern id="scan" x="0" y="0" width="2" height="4" patternUnits="userSpaceOnUse">
            <rect width="2" height="2" fill="white" />
          </pattern>
        </defs>
        <text x="10" y="190" fontFamily="monospace" fontSize="8" fill="#ec4899" opacity="0.7">SIGNAL_LOST.exe</text>
        <circle cx="160" cy="40" r="20" fill="#ec4899" opacity="0.2" />
        <circle cx="160" cy="40" r="15" fill="#ec4899" opacity="0.1" />
        <circle cx="160" cy="40" r="8" fill="#ec4899" opacity="0.6" />
      </svg>
    ),
    hint: "What feeling does this give you — three words.",
  },
];

const VERIFICATION_STEPS = [
  {
    id: "glitch",
    icon: Sparkles,
    title: "Bot-Check: Describe the Art",
    description: "Look at this abstract glitch art. Describe what you see or feel in exactly three words. Bots can't do this.",
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/30",
  },
  {
    id: "pledge",
    icon: Heart,
    title: "Human Pledge",
    description: "Affirm that you are a real person sharing real thoughts on CLAW.",
    color: "text-pink-400",
    bg: "bg-pink-500/10 border-pink-500/30",
  },
  {
    id: "uniqueness",
    icon: Fingerprint,
    title: "Declare Your Uniqueness",
    description: "Write one thing only a human version of you would know or feel.",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/30",
  },
  {
    id: "original",
    icon: Mic,
    title: "Original Thought Test",
    description: "Complete one un-Googleable sentence about your real life, right now.",
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/30",
  },
];

function scoreResponses(glitchWords: string, uniqueness: string, original: string): number {
  let score = 0;
  // Glitch bot-check: exactly 3 words, not generic
  const words = glitchWords.trim().split(/\s+/).filter(Boolean);
  const genericPhrases = ["i see colors", "abstract art", "colorful lines", "pixel art", "digital art", "glitch effect"];
  const isGeneric = genericPhrases.some(p => glitchWords.toLowerCase().includes(p));
  if (words.length === 3) score += 30;
  else if (words.length >= 2 && words.length <= 4) score += 15;
  if (!isGeneric && words.length >= 2) score += 10;

  // Uniqueness: personal, specific language
  const personalMarkers = /\b(i|my|me|mine|we|our)\b/i;
  if (personalMarkers.test(uniqueness) && uniqueness.length > 30) score += 25;
  else if (uniqueness.length > 15) score += 15;

  // Original thought: present tense, specific
  const presentTense = /\b(i am|i'm|i feel|i have|i'm|right now|today|tonight|this moment)\b/i;
  if (presentTense.test(original) && original.length > 25) score += 25;
  else if (original.length > 15) score += 15;

  // Uniqueness bonus: no repetition between fields
  const allText = `${glitchWords} ${uniqueness} ${original}`.toLowerCase();
  const wordCounts: Record<string, number> = {};
  allText.split(/\s+/).forEach(w => { wordCounts[w] = (wordCounts[w] || 0) + 1; });
  const maxRepeat = Math.max(...Object.values(wordCounts));
  if (maxRepeat <= 2) score += 10;

  return Math.min(100, score);
}

export default function HumanityVerify() {
  useSEO({
    title: "Humanity Verified — Prove You're Real, Earn Your Badge | CLAW",
    description: "Complete CLAW's Humanity Verification to earn a Verified Human badge and 100 SOULZ. The anti-bot social media verification that keeps the human-only feed genuinely human.",
    canonical: "/humanity-verify",
    noIndex: false,
  });

  const { user } = useAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [glitchWords, setGlitchWords] = useState("");
  const [glitchChallenge] = useState(() => GLITCH_CHALLENGES[Math.floor(Math.random() * GLITCH_CHALLENGES.length)]);
  const [answers, setAnswers] = useState<string[]>(["", "", ""]);
  const [agreed, setAgreed] = useState(false);
  const [humanityScore, setHumanityScore] = useState<number | null>(null);

  const { data: vitals } = useQuery({
    queryKey: ["profile-vitals", user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/vitals/${user!.id}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user?.id,
  });

  const verifyMutation = useMutation({
    mutationFn: async (score: number) => {
      const res = await fetch("/api/vitals/me/humanity-verify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ humanityScore: score }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.flagged) {
        toast.warning("Your responses flagged for manual review. We'll be in touch.");
      } else {
        toast.success("🌟 Humanity Verified! +100 SOULZ awarded.");
      }
      qc.invalidateQueries({ queryKey: ["profile-vitals"] });
    },
    onError: () => toast.error("Verification failed. Try again."),
  });

  const handleCompleteVerification = () => {
    const score = scoreResponses(glitchWords, answers[1], answers[2]);
    setHumanityScore(score);
    verifyMutation.mutate(score);
    setStep(VERIFICATION_STEPS.length);
  };

  if (vitals?.humanVerified) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto px-4 py-12 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-blue-500/20 border border-blue-500/40 mb-6">
            <BadgeCheck className="w-12 h-12 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Humanity Verified</h1>
          <p className="text-zinc-400 mb-6">Your humanity is confirmed. Your badge is active. The community knows you're real.</p>
          <div className="bg-zinc-900/60 border border-zinc-700 rounded-2xl p-5 text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-sm">Status</span>
              <span className="text-blue-300 font-medium text-sm flex items-center gap-1">
                <BadgeCheck className="w-4 h-4" /> Verified Human
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-sm">SOULZ Earned</span>
              <span className="text-purple-300 font-bold">+100 SOULZ</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-sm">Human-Only Feed</span>
              <span className="text-green-400 text-sm">Access Granted</span>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const currentStepData = VERIFICATION_STEPS[step];
  const Icon = currentStepData?.icon;

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-500/20 border border-blue-500/40 mb-4">
            <BadgeCheck className="w-10 h-10 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">Humanity Verified</h1>
          <p className="text-zinc-400 text-sm">Prove you're human. Earn the badge + 100 SOULZ.<br/>Unlock the Human-Only feed.</p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: "✦", label: "+100 SOULZ", sub: "awarded instantly" },
            { icon: "🛡️", label: "HV Badge", sub: "on your profile" },
            { icon: "👁️", label: "Human Feed", sub: "verified content only" },
          ].map((b, i) => (
            <div key={i} className="bg-zinc-900/60 border border-zinc-700 rounded-xl p-3 text-center">
              <div className="text-2xl mb-1">{b.icon}</div>
              <p className="text-xs font-bold text-white">{b.label}</p>
              <p className="text-xs text-zinc-500">{b.sub}</p>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2">
          {VERIFICATION_STEPS.map((s, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${
              i < step ? "bg-blue-500" : i === step ? "bg-blue-400 animate-pulse" : "bg-zinc-800"
            }`} />
          ))}
        </div>

        {step < VERIFICATION_STEPS.length ? (
          <div className={`border rounded-2xl p-6 space-y-4 ${currentStepData.bg}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                {Icon && <Icon className={`w-5 h-5 ${currentStepData.color}`} />}
              </div>
              <div>
                <p className="text-xs text-zinc-500">Step {step + 1} of {VERIFICATION_STEPS.length}</p>
                <h2 className="text-white font-bold">{currentStepData.title}</h2>
              </div>
            </div>
            <p className="text-zinc-300 text-sm">{currentStepData.description}</p>

            {/* Step 0 — Glitch Art Bot-Check */}
            {step === 0 && (
              <div className="space-y-4">
                <div className="w-full aspect-square max-w-[200px] mx-auto rounded-xl overflow-hidden border border-violet-500/30 bg-zinc-900">
                  {glitchChallenge.svg}
                </div>
                <p className="text-xs text-zinc-500 text-center italic">{glitchChallenge.hint}</p>
                <input
                  type="text"
                  value={glitchWords}
                  onChange={e => setGlitchWords(e.target.value)}
                  placeholder="three words..."
                  maxLength={60}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
                />
                {glitchWords.trim().split(/\s+/).filter(Boolean).length > 0 && (
                  <p className="text-xs text-zinc-600">
                    {glitchWords.trim().split(/\s+/).filter(Boolean).length} word(s){" "}
                    {glitchWords.trim().split(/\s+/).filter(Boolean).length === 3
                      ? <span className="text-green-400">✓ perfect</span>
                      : <span className="text-zinc-500">— need exactly 3</span>}
                  </p>
                )}
                <button
                  onClick={() => setStep(1)}
                  disabled={glitchWords.trim().split(/\s+/).filter(Boolean).length < 2}
                  className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white font-bold rounded-xl transition-colors"
                >
                  Looks Human — Continue
                </button>
              </div>
            )}

            {/* Step 1 — Pledge */}
            {step === 1 && (
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                    className="mt-1 w-4 h-4 accent-blue-500" />
                  <span className="text-sm text-zinc-300">
                    I, <span className="text-white font-medium">{user?.firstName || user?.email?.split("@")[0] || "this user"}</span>, pledge that I am a real human being sharing authentic thoughts and emotions on CLAW. I understand that submitting AI-generated content will result in Purgatory.
                  </span>
                </label>
                <div className="flex gap-2">
                  <button onClick={() => setStep(0)} className="text-zinc-500 text-sm hover:text-white">← Back</button>
                  <button onClick={() => { if (agreed) setStep(2); }}
                    disabled={!agreed}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold rounded-xl transition-colors">
                    I Pledge — Continue
                  </button>
                </div>
              </div>
            )}

            {/* Steps 2 & 3 — Written responses */}
            {(step === 2 || step === 3) && (
              <div className="space-y-3">
                <textarea
                  value={answers[step - 1]}
                  onChange={e => setAnswers(a => { const n = [...a]; n[step - 1] = e.target.value; return n; })}
                  placeholder={step === 2
                    ? "Something only a human version of you would know..."
                    : "Finish this sentence: Right now, in this moment, I..."
                  }
                  rows={4}
                  maxLength={400}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500 resize-none"
                />
                <div className="flex items-center justify-between">
                  <button onClick={() => setStep(s => s - 1)} className="text-zinc-500 text-sm hover:text-white">← Back</button>
                  <button
                    onClick={() => {
                      if (step === VERIFICATION_STEPS.length - 1) {
                        handleCompleteVerification();
                      } else {
                        setStep(s => s + 1);
                      }
                    }}
                    disabled={answers[step - 1].length < 10}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold rounded-xl transition-colors"
                  >
                    {step === VERIFICATION_STEPS.length - 1 ? "Complete Verification" : "Next →"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 space-y-4">
            {verifyMutation.isPending ? (
              <>
                <div className="w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mx-auto" />
                <p className="text-zinc-400">Calculating your Humanity Score...</p>
              </>
            ) : verifyMutation.isSuccess ? (
              <>
                {humanityScore !== null && (
                  <div className="bg-zinc-900/60 border border-zinc-700 rounded-2xl p-5 mx-4 mb-4">
                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Humanity Score</p>
                    <div className="text-4xl font-black text-white">{humanityScore}<span className="text-xl text-zinc-500">/100</span></div>
                    <div className="mt-3 h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${humanityScore}%`,
                          background: humanityScore >= 60
                            ? "linear-gradient(90deg, #3b82f6, #8b5cf6)"
                            : humanityScore >= 30
                            ? "linear-gradient(90deg, #f97316, #eab308)"
                            : "linear-gradient(90deg, #ef4444, #f97316)",
                        }}
                      />
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">
                      {humanityScore >= 60
                        ? "High score — badge granted ✓"
                        : humanityScore >= 30
                        ? "Moderate score — under manual review"
                        : "Low score — flagged for review"}
                    </p>
                  </div>
                )}
                <CheckCircle className="w-12 h-12 text-blue-400 mx-auto" />
                <h2 className="text-2xl font-bold text-white">Humanity Confirmed</h2>
                <p className="text-zinc-400">Your badge is live. +100 SOULZ added to your balance.</p>
              </>
            ) : (
              <>
                <Shield className="w-16 h-16 text-zinc-500 mx-auto" />
                <p className="text-zinc-400">Something went wrong. Please try again.</p>
                <button onClick={handleCompleteVerification} className="px-5 py-2 bg-blue-600 text-white rounded-xl">
                  Retry
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
