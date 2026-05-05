import { useState } from "react";
import { useLocation } from "wouter";
import { useUpdateMyProfile } from "@workspace/api-client-react";

const BOUNDARIES = [
  "Mental health struggles",
  "Body image / weight",
  "Relationship history",
  "Family dynamics",
  "Sexual topics",
  "Financial status",
  "Past trauma",
  "Political views",
  "Religious beliefs",
  "Career / success",
];

const LEVELS = [
  {
    key: "Soft",
    title: "Soft Mode",
    sub: "Gentle honesty. Cushioned but real.",
    desc: "Feedback is kind, considerate, and always respectful. People support you without harsh critique.",
    color: "border-blue-500/50 bg-blue-500/10",
    glow: "shadow-blue-500/20",
    badge: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  },
  {
    key: "Direct",
    title: "Direct Mode",
    sub: "Blunt truth. No filter, no cruelty.",
    desc: "People say exactly what they mean. No sugarcoating, but also no malice. Just the raw truth.",
    color: "border-violet-500/50 bg-violet-500/10",
    glow: "shadow-violet-500/20",
    badge: "bg-violet-500/20 text-violet-300 border border-violet-500/30",
  },
  {
    key: "Claw",
    title: "Claw Mode",
    sub: "Brutal honesty. You asked for it.",
    desc: "No mercy, no softening. You've consented to receive the unfiltered, uncut truth from those around you.",
    color: "border-red-500/50 bg-red-500/10",
    glow: "shadow-red-500/20",
    badge: "bg-red-500/20 text-red-300 border border-red-500/30",
  },
];

function validateUsername(u: string) {
  if (!u) return "Username is required.";
  if (u.length < 3) return "At least 3 characters.";
  if (u.length > 20) return "Max 20 characters.";
  if (!/^[a-z0-9_]+$/.test(u)) return "Lowercase letters, numbers and underscores only.";
  return null;
}

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<"profile" | "agreement" | "level" | "boundaries" | "done">("profile");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [level, setLevel] = useState<"Soft" | "Direct" | "Claw">("Soft");
  const [boundaries, setBoundaries] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const updateProfile = useUpdateMyProfile();
  const [, setLocation] = useLocation();

  const toggleBoundary = (b: string) =>
    setBoundaries(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);

  const saveProfile = async () => {
    const nameErr = !displayName.trim() ? "Name is required." : null;
    const uErr = validateUsername(username.trim().toLowerCase());
    if (nameErr || uErr) {
      setUsernameError(uErr || nameErr);
      return;
    }
    setProfileSaving(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ displayName: displayName.trim(), username: username.trim().toLowerCase() }),
      });
      if (res.status === 409) {
        setUsernameError("That username is already taken. Try another.");
        return;
      }
      if (!res.ok) {
        setUsernameError("Something went wrong. Try again.");
        return;
      }
      setStep("agreement");
    } catch {
      setUsernameError("Connection error. Try again.");
    } finally {
      setProfileSaving(false);
    }
  };

  const finish = async () => {
    setSaving(true);
    updateProfile.mutate(
      { data: { interactionLevel: level } as any },
      {
        onSettled: () => {
          localStorage.setItem("claw_onboarded", "1");
          setSaving(false);
          onComplete();
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Step 1 — Profile Setup */}
        {step === "profile" && (
          <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl shadow-black/50">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🐾</span>
              </div>
              <h1 className="text-3xl font-serif font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                Welcome to CLAW
              </h1>
              <p className="text-muted-foreground text-sm mt-2">Set up your identity. You can change this later.</p>
            </div>

            <div className="space-y-4 mb-8">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="How should people know you?"
                  maxLength={40}
                  className="w-full bg-muted/50 border border-border rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 block">
                  Username
                </label>
                <div className="flex items-center bg-muted/50 border border-border rounded-xl px-4 py-3 focus-within:border-primary/60 transition-colors">
                  <span className="text-muted-foreground text-sm mr-1">@</span>
                  <input
                    type="text"
                    value={username}
                    onChange={e => {
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
                      setUsernameError(null);
                    }}
                    placeholder="your_handle"
                    maxLength={20}
                    className="flex-1 bg-transparent text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground/60 mt-1">3–20 characters. Lowercase, numbers, underscores only.</p>
                {usernameError && (
                  <p className="text-xs text-red-400 mt-1.5">{usernameError}</p>
                )}
              </div>
            </div>

            <button
              onClick={saveProfile}
              disabled={profileSaving || !displayName.trim() || !username.trim()}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-accent transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {profileSaving ? "Saving..." : "Continue"}
            </button>
          </div>
        )}

        {/* Step 2 — Truth Agreement */}
        {step === "agreement" && (
          <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl shadow-black/50">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚖️</span>
              </div>
              <h1 className="text-3xl font-serif font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                The Truth Agreement
              </h1>
              <p className="text-muted-foreground text-sm mt-2">Before you enter CLAW, you must agree to these terms.</p>
            </div>

            <div className="space-y-3 mb-8">
              {[
                "I understand CLAW is a consent-based honesty platform.",
                "I will not use honesty as a weapon or to harm others.",
                "I accept the interaction level I choose and its consequences.",
                "I understand that brutal honesty is allowed within set boundaries.",
                "I will not stalk, dox, or make real-world threats.",
                "I take responsibility for the content I post here.",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="w-6 h-6 rounded-full border-2 border-primary/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-primary text-xs font-bold">{i + 1}</span>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">{item}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => { setAgreed(true); setStep("level"); }}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-accent transition-colors shadow-lg shadow-primary/20"
            >
              I Accept the Truth Agreement
            </button>
            <p className="text-center text-xs text-muted-foreground mt-3">
              By continuing, you agree to play by the rules of controlled chaos.
            </p>
          </div>
        )}

        {/* Step 3 — Interaction Level */}
        {step === "level" && (
          <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl shadow-black/50">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-serif font-bold text-foreground">Choose Your Exposure Level</h2>
              <p className="text-muted-foreground text-sm mt-2">How much honesty can you handle? You can change this anytime.</p>
            </div>

            <div className="space-y-3 mb-8">
              {LEVELS.map(l => (
                <button
                  key={l.key}
                  onClick={() => setLevel(l.key as any)}
                  className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-200 ${
                    level === l.key ? `${l.color} shadow-lg ${l.glow}` : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${l.badge}`}>{l.key}</span>
                    <span className="font-semibold text-foreground">{l.title}</span>
                    {level === l.key && <span className="ml-auto text-xs text-primary font-bold">Selected</span>}
                  </div>
                  <p className="text-xs text-muted-foreground italic mb-1">{l.sub}</p>
                  <p className="text-sm text-foreground/70">{l.desc}</p>
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep("boundaries")}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-accent transition-colors shadow-lg shadow-primary/20"
            >
              Continue with {level} Mode
            </button>
          </div>
        )}

        {/* Step 4 — Boundaries */}
        {step === "boundaries" && (
          <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl shadow-black/50">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-serif font-bold text-foreground">Set Your Boundaries</h2>
              <p className="text-muted-foreground text-sm mt-2">Select topics that are off-limits for you. Others will be warned before approaching these areas.</p>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-8">
              {BOUNDARIES.map(b => (
                <button
                  key={b}
                  onClick={() => toggleBoundary(b)}
                  className={`px-3 py-2.5 rounded-lg text-sm text-left transition-all duration-200 border ${
                    boundaries.includes(b)
                      ? "border-primary/60 bg-primary/15 text-primary font-medium"
                      : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {boundaries.includes(b) && <span className="mr-1">✓</span>}
                  {b}
                </button>
              ))}
            </div>

            {boundaries.length > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/30 text-xs text-primary">
                {boundaries.length} boundary{boundaries.length > 1 ? "s" : ""} set: {boundaries.join(", ")}
              </div>
            )}

            <button
              onClick={finish}
              disabled={saving}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-accent transition-colors shadow-lg shadow-primary/20 disabled:opacity-60"
            >
              {saving ? "Entering CLAW..." : boundaries.length > 0 ? `Enter CLAW with ${boundaries.length} Boundaries` : "Enter CLAW (No Boundaries)"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
