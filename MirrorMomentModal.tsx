import { useState, useEffect } from "react";
import { Ghost, Lock, Globe, SkipForward, Loader2, X } from "lucide-react";
import { useRingy } from "@/contexts/RingyContext";
import { useAuth } from "@workspace/replit-auth-web";

interface MirrorMoment {
  id: number;
  question: string;
  alreadyAnswered: boolean;
}

const MIRROR_COOLDOWN_KEY = "claw_mirror_moment_date";

export default function MirrorMomentModal() {
  const { user } = useAuth();
  const { speak } = useRingy();
  const [moment, setMoment] = useState<MirrorMoment | null>(null);
  const [visible, setVisible] = useState(false);
  const [answer, setAnswer] = useState("");
  const [mode, setMode] = useState<"private" | "anonymous" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!user) return;
    const today = new Date().toDateString();
    const last = localStorage.getItem(MIRROR_COOLDOWN_KEY);
    if (last === today) return; // Already shown today

    let timer: ReturnType<typeof setTimeout> | null = null;
    const load = async () => {
      try {
        const res = await fetch("/api/mirror-moment/today", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        if (data.completed) {
          localStorage.setItem(MIRROR_COOLDOWN_KEY, today);
          return;
        }
        setMoment(data);
        timer = setTimeout(() => {
          setVisible(true);
          speak("mirror moment. just one question.", "normal");
        }, 3500);
      } catch {}
    };
    load();
    return () => { if (timer) clearTimeout(timer); };
  }, [user]);

  const handleRespond = async (visibility: "private" | "anonymous" | "skip") => {
    if (!moment) return;
    if (visibility !== "skip" && !answer.trim()) return;
    setSubmitting(true);
    try {
      await fetch("/api/mirror-moment/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          question: moment.question,
          response: visibility === "skip" ? null : answer.trim(),
          visibility: visibility === "skip" ? "skipped" : visibility,
        }),
      });
      const today = new Date().toDateString();
      localStorage.setItem(MIRROR_COOLDOWN_KEY, today);
      setDone(true);
      if (visibility === "skip") {
        speak("skipped. maybe tomorrow.", "normal");
      } else {
        speak("noted.", "normal");
      }
      setTimeout(() => setVisible(false), 1800);
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible || !moment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setVisible(false)} />
      <div className="relative bg-card border border-violet-500/30 rounded-2xl shadow-2xl shadow-violet-900/30 max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-300">
        <button
          onClick={() => setVisible(false)}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Ghost className="w-5 h-5 text-violet-400" />
          <span className="text-xs font-semibold text-violet-400 uppercase tracking-widest">Mirror Moment</span>
        </div>

        <p className="text-foreground font-medium text-lg leading-snug mb-5">
          {moment.question}
        </p>

        {!done ? (
          <>
            <textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder="whatever comes up..."
              rows={4}
              className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground resize-none focus:outline-none focus:border-violet-400/60 mb-4"
            />
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setMode("private"); handleRespond("private"); }}
                disabled={submitting || !answer.trim()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-300 text-sm font-medium hover:bg-violet-500/30 disabled:opacity-50 transition-colors"
              >
                {submitting && mode === "private" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Keep it private
              </button>
              <button
                onClick={() => { setMode("anonymous"); handleRespond("anonymous"); }}
                disabled={submitting || !answer.trim()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-300 text-sm font-medium hover:bg-sky-500/30 disabled:opacity-50 transition-colors"
              >
                {submitting && mode === "anonymous" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                Share anonymously
              </button>
              <button
                onClick={() => handleRespond("skip")}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-muted-foreground text-sm hover:text-foreground transition-colors"
              >
                {submitting && mode === null ? <Loader2 className="w-4 h-4 animate-spin" /> : <SkipForward className="w-4 h-4" />}
                Skip for today
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground text-sm italic">noted.</p>
          </div>
        )}
      </div>
    </div>
  );
}
