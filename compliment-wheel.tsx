import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import Layout from "@/components/Layout";
import { useSEO } from "@/hooks/useSEO";
import { Star, CheckCircle, Loader2, ArrowLeft } from "lucide-react";

interface WheelTarget {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

interface WheelData {
  canSpin: boolean;
  targetUser?: WheelTarget;
  completedDate?: string;
}

const COMPLIMENT_STARTERS = [
  "The way you show up for people is genuinely rare.",
  "Your presence makes things better, even when you don't notice.",
  "There's something about the way you think that I really respect.",
  "You handle hard things with more grace than most people realize.",
  "The energy you bring is different — and in the best way.",
  "You're more interesting than you give yourself credit for.",
  "Your honesty is one of the most valuable things about you.",
  "The things you create matter more than you know.",
  "Watching you grow has been genuinely inspiring.",
  "You make the people around you feel seen.",
];

const SEGMENT_COLORS = [
  "#9b59b6", "#7c3aed", "#6366f1", "#8b5cf6", "#a855f7",
  "#c084fc", "#d946ef", "#e879f9", "#7e22ce", "#5b21b6",
  "#4c1d95", "#6d28d9",
];

function SpinningWheel({ spinning, target }: { spinning: boolean; target?: WheelTarget }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const SIZE = 220;
    const cx = SIZE / 2, cy = SIZE / 2, r = SIZE / 2 - 10;
    const segments = 12;
    const segAngle = (Math.PI * 2) / segments;

    const draw = (angle: number) => {
      ctx.clearRect(0, 0, SIZE, SIZE);
      for (let i = 0; i < segments; i++) {
        const start = angle + i * segAngle;
        const end = start + segAngle;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, start, end);
        ctx.closePath();
        ctx.fillStyle = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(start + segAngle / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.font = "bold 11px serif";
        ctx.fillText("✦", r - 20, 4);
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.fillStyle = "#0d0d1a";
      ctx.fill();
      ctx.strokeStyle = "rgba(155,92,246,0.5)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(SIZE - 8, cy - 10);
      ctx.lineTo(SIZE - 8, cy + 10);
      ctx.lineTo(SIZE + 2, cy);
      ctx.closePath();
      ctx.fillStyle = "#f59e0b";
      ctx.fill();
    };

    let speed = spinning ? 18 : 0;
    let deceleration = 0;

    if (spinning) {
      deceleration = 0.03 + Math.random() * 0.02;
    }

    const animate = () => {
      if (spinning) {
        speed = Math.max(0.2, speed - deceleration);
        rotationRef.current += (speed * Math.PI) / 180;
      }
      draw(rotationRef.current);
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [spinning]);

  return (
    <div className="relative flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={220}
        height={220}
        className={`${spinning ? "drop-shadow-[0_0_30px_rgba(155,92,246,0.6)]" : "drop-shadow-[0_0_15px_rgba(155,92,246,0.3)]"} transition-all duration-500`}
      />
    </div>
  );
}

export default function ComplimentWheel() {
  useSEO({
    title: "Compliment Wheel",
    description:
      "Spin the CLAW Compliment Wheel to send a kind truth to someone in your circle. Daily kindness, one spin at a time.",
    canonical: "/compliment-wheel",
  });
  const [wheelData, setWheelData] = useState<WheelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [spunTarget, setSpunTarget] = useState<WheelTarget | null>(null);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedStarter, setSelectedStarter] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/users/me/daily-compliment", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setWheelData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const spin = () => {
    if (!wheelData?.canSpin) return;
    setSpinning(true);
    setTimeout(() => {
      setSpinning(false);
      setSpunTarget(wheelData.targetUser || null);
    }, 3500);
  };

  const handleStarterClick = (s: string) => {
    setSelectedStarter(s);
    setMessage(s);
  };

  const submit = async () => {
    if (!message.trim() || !spunTarget) return;
    setSubmitting(true);
    try {
      await fetch("/api/users/me/daily-compliment/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ targetUserId: spunTarget.id, message }),
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-24">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto p-4">
        <div className="flex items-center gap-3 pt-4 pb-6">
          <Link href="/feed">
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-serif font-bold bg-gradient-to-r from-yellow-400 via-primary to-accent bg-clip-text text-transparent">
              Daily Compliment Wheel
            </h1>
            <p className="text-xs text-muted-foreground">Spin once per day. Land on someone. Say something real.</p>
          </div>
        </div>

        {submitted ? (
          <div className="bg-card border border-primary/30 rounded-2xl p-8 text-center shadow-2xl shadow-primary/10">
            <CheckCircle className="w-14 h-14 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-serif font-bold text-foreground mb-2">Compliment sent.</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Your words are on their way to <strong className="text-foreground">{spunTarget?.displayName}</strong>.
            </p>
            <p className="text-primary italic font-serif text-lg mb-6">"{message}"</p>
            <Link href="/feed">
              <button className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-accent transition-colors">
                Back to Feed
              </button>
            </Link>
          </div>
        ) : spunTarget ? (
          <div className="space-y-6">
            <Link href={`/profile/${spunTarget.id}`}>
              <div className="bg-card border border-primary/30 rounded-2xl p-6 flex items-center gap-4 hover:border-primary/60 transition-colors cursor-pointer">
                <div className="w-16 h-16 rounded-full border-2 border-primary/40 overflow-hidden bg-muted flex-shrink-0">
                  {spunTarget.avatarUrl ? (
                    <img src={spunTarget.avatarUrl} alt={spunTarget.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-primary">
                      {spunTarget.displayName[0]}
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-semibold text-foreground text-lg">{spunTarget.displayName}</div>
                  <div className="text-sm text-muted-foreground">@{spunTarget.username}</div>
                  <div className="text-xs text-primary mt-1">The wheel chose them. Say something true.</div>
                </div>
              </div>
            </Link>

            <div className="bg-card border border-border rounded-xl p-5">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Need a spark?</div>
              <div className="flex flex-wrap gap-2 mb-4">
                {COMPLIMENT_STARTERS.slice(0, 5).map(s => (
                  <button
                    key={s}
                    onClick={() => handleStarterClick(s)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      selectedStarter === s
                        ? "border-primary/60 bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {s.split(" ").slice(0, 5).join(" ")}...
                  </button>
                ))}
              </div>

              <textarea
                value={message}
                onChange={e => { setMessage(e.target.value); setSelectedStarter(null); }}
                placeholder={`Write a real compliment for ${spunTarget.displayName}...`}
                rows={4}
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 resize-none"
              />
              <div className="text-xs text-muted-foreground text-right mt-1">{message.length}/280</div>
            </div>

            <button
              onClick={submit}
              disabled={!message.trim() || submitting}
              className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-accent transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {submitting ? "Sending..." : "Send This Compliment"}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              {!wheelData?.canSpin ? (
                <>
                  <CheckCircle className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h2 className="text-xl font-serif font-bold text-foreground mb-2">Done for today.</h2>
                  <p className="text-muted-foreground text-sm">You already gave your daily compliment. Come back tomorrow.</p>
                </>
              ) : (
                <>
                  <div className="flex justify-center mb-6">
                    <SpinningWheel spinning={spinning} />
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">
                    The wheel picks someone from CLAW. You must say something real to them.
                  </p>
                  <button
                    onClick={spin}
                    disabled={spinning}
                    className="px-10 py-4 rounded-full bg-primary text-primary-foreground font-bold text-lg hover:bg-accent transition-all shadow-xl shadow-primary/30 disabled:opacity-70 hover:scale-105 active:scale-95"
                  >
                    {spinning ? "Spinning..." : "SPIN"}
                  </button>
                </>
              )}
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">How it works</div>
              <div className="space-y-2">
                {[
                  "The wheel spins once per day — no skipping.",
                  "It lands on a real CLAW user at random.",
                  "You write them a genuine compliment.",
                  "They receive it as a notification.",
                  "No one is exempt. Everyone deserves one good thing.",
                ].map((t, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <span className="text-primary font-bold flex-shrink-0">{i + 1}.</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
