import { useEffect, useRef, useState } from "react";
import { useCall } from "@/contexts/CallContext";
import { Phone, PhoneOff, Video } from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

/** Web Audio fallback ring pattern — 2 beeps per ring, repeating */
function createFallbackRing(): () => void {
  let stopped = false;
  let ctx: AudioContext | null = null;

  const beep = (audioCtx: AudioContext, startAt: number, freq = 880, dur = 0.15) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(0.4, startAt + 0.02);
    gain.gain.linearRampToValueAtTime(0, startAt + dur);
    osc.start(startAt);
    osc.stop(startAt + dur + 0.01);
  };

  const playPattern = () => {
    if (stopped) return;
    ctx = new AudioContext();
    // Resume is required — AudioContext starts suspended without a prior user gesture
    ctx.resume().then(() => {
      if (stopped || !ctx) return;
      const t = ctx.currentTime;
      beep(ctx, t);
      beep(ctx, t + 0.2);
      beep(ctx, t + 0.5);
      beep(ctx, t + 0.7);
      // Repeat every 2 seconds
      setTimeout(() => { if (!stopped) { ctx?.close().catch(() => {}); ctx = null; playPattern(); } }, 2000);
    }).catch(() => {});
  };

  playPattern();

  return () => {
    stopped = true;
    ctx?.close().catch(() => {});
  };
}

export default function IncomingCallModal() {
  const { incomingCall, acceptCall, declineCall } = useCall();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fallbackStopRef = useRef<(() => void) | null>(null);
  const vibRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);

  useEffect(() => {
    if (!incomingCall) {
      // Stop everything
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      fallbackStopRef.current?.(); fallbackStopRef.current = null;
      if (vibRef.current) { clearInterval(vibRef.current); vibRef.current = null; }
      navigator.vibrate?.(0);
      setAccepting(false);
      setDeclining(false);
      return;
    }

    // Vibration pattern
    if ("vibrate" in navigator) {
      navigator.vibrate([600, 200, 600, 200, 600]);
      vibRef.current = setInterval(() => navigator.vibrate([600, 200, 600, 200, 600]), 1800);
    }

    // Try Ringy's voice ring audio first, fall back to Web Audio if unavailable
    const audio = new Audio(`${BASE}/api/calls/ring-audio`);
    audio.loop = true;
    audio.volume = 1.0;
    audioRef.current = audio;

    const tryPlay = () => audio.play().catch(() => {
      // Autoplay blocked — start fallback ring and wait for user tap to try again
      if (!fallbackStopRef.current) {
        fallbackStopRef.current = createFallbackRing();
      }
      const unlock = () => {
        audio.play().then(() => {
          fallbackStopRef.current?.();
          fallbackStopRef.current = null;
        }).catch(() => {});
        document.removeEventListener("touchstart", unlock, true);
        document.removeEventListener("click", unlock, true);
      };
      document.addEventListener("touchstart", unlock, { once: true, capture: true });
      document.addEventListener("click", unlock, { once: true, capture: true });
    });

    audio.addEventListener("error", () => {
      // API not ready yet — use fallback ring only
      audio.src = "";
      audioRef.current = null;
      if (!fallbackStopRef.current) {
        fallbackStopRef.current = createFallbackRing();
      }
    });

    tryPlay();

    return () => {
      audio.pause();
      audio.src = "";
      fallbackStopRef.current?.(); fallbackStopRef.current = null;
      if (vibRef.current) { clearInterval(vibRef.current); vibRef.current = null; }
      navigator.vibrate?.(0);
    };
  }, [incomingCall?.callId]);

  if (!incomingCall) return null;

  const caller = incomingCall.participants.find(p => p.userId === incomingCall.initiatorId);
  const isVideo = incomingCall.type === "video";
  const is3Way = incomingCall.participants.length > 2;
  const initial = (caller?.displayName || "?")[0].toUpperCase();

  const handleAccept = async () => {
    setAccepting(true);
    await acceptCall();
  };

  const handleDecline = () => {
    setDeclining(true);
    declineCall();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-between"
      style={{ background: "linear-gradient(180deg, #0a0010 0%, #150030 40%, #0f001e 100%)" }}>

      {/* Animated pulse rings */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[1, 2, 3, 4].map(i => (
          <div key={i}
            className="absolute rounded-full border border-violet-500/15 animate-ping"
            style={{
              width: i * 180, height: i * 180,
              top: "30%", left: "50%",
              transform: "translate(-50%, -50%)",
              animationDuration: `${1.5 + i * 0.4}s`,
              animationDelay: `${i * 0.2}s`,
            }} />
        ))}
        <div className="absolute rounded-full" style={{
          width: 300, height: 300, top: "calc(30% - 150px)", left: "calc(50% - 150px)",
          background: "radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)"
        }} />
      </div>

      {/* Top: caller info */}
      <div className="relative flex flex-col items-center pt-20 gap-5 w-full px-8">
        <p className="text-violet-400/60 text-xs tracking-widest uppercase font-semibold">
          {is3Way ? "Group Call · 3-Way" : `Incoming ${isVideo ? "Video" : "Voice"} Call`}
        </p>

        {/* Avatar with pulsing glow */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full animate-pulse"
            style={{ background: "radial-gradient(circle, rgba(124,58,237,0.6) 0%, transparent 70%)", transform: "scale(1.5)" }} />
          <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-violet-500/60 shadow-2xl shadow-violet-900/80"
            style={{ background: "linear-gradient(135deg, #3b1b7e, #6d28d9)" }}>
            {caller?.avatarUrl ? (
              <img src={caller.avatarUrl} alt={caller.displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-serif font-bold text-violet-200">
                {initial}
              </div>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full flex items-center justify-center border-2 border-black"
            style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}>
            {isVideo ? <Video className="w-4 h-4 text-white" /> : <Phone className="w-4 h-4 text-white" />}
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-white text-3xl font-bold tracking-tight">{caller?.displayName || "Unknown"}</h1>
          <p className="text-violet-300/60 text-base mt-1">is calling you…</p>
        </div>

        <p className="text-violet-400/40 text-xs italic text-center px-4 mt-2">
          🐾 Don't keep them waiting, darling!
        </p>
      </div>

      <div className="flex-1" />

      {/* Slide to answer hint */}
      <p className="relative text-white/20 text-xs mb-4">tap to answer or decline</p>

      {/* Bottom: action buttons */}
      <div className="relative w-full px-12 pb-16 flex items-center justify-around">
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handleDecline}
            disabled={declining || accepting}
            className="w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90"
            style={{ background: declining ? "#991b1b" : "#dc2626", boxShadow: "0 8px 30px rgba(220,38,38,0.5)" }}
          >
            <PhoneOff className="w-8 h-8 text-white" />
          </button>
          <span className="text-white/50 text-sm font-medium">Decline</span>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={handleAccept}
            disabled={accepting || declining}
            className="w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all active:scale-90"
            style={{ background: accepting ? "#166534" : "linear-gradient(135deg,#16a34a,#22c55e)", boxShadow: "0 8px 30px rgba(34,197,94,0.5)" }}
          >
            {accepting
              ? <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : isVideo ? <Video className="w-8 h-8 text-white" /> : <Phone className="w-8 h-8 text-white" />}
          </button>
          <span className="text-white/50 text-sm font-medium">
            {accepting ? "Connecting…" : "Answer"}
          </span>
        </div>
      </div>
    </div>
  );
}
