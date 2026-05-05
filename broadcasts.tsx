import { useState, useEffect, useRef, useCallback } from "react";
import { useSEO } from "@/hooks/useSEO";
import { useAuth } from "@workspace/replit-auth-web";
import Layout from "@/components/Layout";
import { Mic, MicOff, Send, Radio, Volume2, VolumeX, ChevronDown, Headphones } from "lucide-react";
import { playAudioBlob, unlockAudio } from "@/lib/audio";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

interface LiveMessage {
  id: string;
  host: "velvet" | "gravel" | "user";
  text: string;
  timestamp: number;
  displayName?: string;
  isAnonymous?: boolean;
  isRecording?: boolean;
}

// ── Host avatars ─────────────────────────────────────────────────────────────
function VelvetAvatar({ speaking, size = 56 }: { speaking: boolean; size?: number }) {
  return (
    <div style={{ width: size, height: size, flexShrink: 0 }} className="relative">
      <div className="absolute inset-0 rounded-full transition-all duration-500"
        style={{
          background: speaking ? "radial-gradient(circle, rgba(236,72,153,0.5) 0%, rgba(168,85,247,0.3) 60%, transparent 100%)" : "radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)",
          transform: speaking ? "scale(1.3)" : "scale(1)",
        }} />
      <svg viewBox="0 0 56 56" fill="none" width={size} height={size} className="relative z-10">
        <circle cx="28" cy="28" r="27" fill="#1a0a1e" stroke="#7c3aed" strokeWidth="1.5" strokeOpacity={speaking ? 1 : 0.4} />
        <ellipse cx="28" cy="32" rx="12" ry="10" fill="#2d1042" />
        <circle cx="28" cy="22" r="12" fill="#2d1042" />
        <path d="M17 22 Q17 12 28 12 Q39 12 39 22" stroke="#ec4899" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <rect x="14" y="20" width="5" height="8" rx="2.5" fill="#ec4899" opacity="0.8" />
        <rect x="37" y="20" width="5" height="8" rx="2.5" fill="#ec4899" opacity="0.8" />
        <circle cx="23" cy="22" r="3.5" fill="#1a0a1e" />
        <circle cx="33" cy="22" r="3.5" fill="#1a0a1e" />
        <circle cx="23" cy="22" r="2" fill={speaking ? "#ec4899" : "#a855f7"} />
        <circle cx="33" cy="22" r="2" fill={speaking ? "#ec4899" : "#a855f7"} />
        <circle cx="22.2" cy="21.3" r="0.7" fill="white" opacity="0.8" />
        <circle cx="32.2" cy="21.3" r="0.7" fill="white" opacity="0.8" />
        {speaking && <circle cx="28" cy="46" r="4" fill="#ec4899" opacity="0.9" style={{ animation: "micPulse 1s ease-in-out infinite" }} />}
        <path d="M17 32 Q28 36 39 32" stroke="#ec4899" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7" />
      </svg>
    </div>
  );
}

function GravelAvatar({ speaking, size = 56 }: { speaking: boolean; size?: number }) {
  return (
    <div style={{ width: size, height: size, flexShrink: 0 }} className="relative">
      <div className="absolute inset-0 rounded-full transition-all duration-500"
        style={{
          background: speaking ? "radial-gradient(circle, rgba(251,191,36,0.4) 0%, rgba(168,85,247,0.2) 60%, transparent 100%)" : "radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)",
          transform: speaking ? "scale(1.3)" : "scale(1)",
        }} />
      <svg viewBox="0 0 56 56" fill="none" width={size} height={size} className="relative z-10">
        <circle cx="28" cy="28" r="27" fill="#0f1a0a" stroke="#7c3aed" strokeWidth="1.5" strokeOpacity={speaking ? 1 : 0.4} />
        <ellipse cx="28" cy="34" rx="13" ry="11" fill="#1a2a10" />
        <circle cx="28" cy="21" r="13" fill="#1a2a10" />
        <path d="M16 21 Q16 10 28 10 Q40 10 40 21" stroke="#f59e0b" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <rect x="13" y="19" width="5" height="9" rx="2.5" fill="#f59e0b" opacity="0.8" />
        <rect x="38" y="19" width="5" height="9" rx="2.5" fill="#f59e0b" opacity="0.8" />
        <circle cx="23" cy="21" r="3.5" fill="#0f1a0a" />
        <circle cx="33" cy="21" r="3.5" fill="#0f1a0a" />
        <circle cx="23" cy="21" r="2" fill={speaking ? "#f59e0b" : "#a855f7"} />
        <circle cx="33" cy="21" r="2" fill={speaking ? "#f59e0b" : "#a855f7"} />
        <circle cx="22.2" cy="20.3" r="0.7" fill="white" opacity="0.8" />
        <circle cx="32.2" cy="20.3" r="0.7" fill="white" opacity="0.8" />
        <path d="M21 30 Q28 33 35 30" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.6" />
        {speaking && <circle cx="28" cy="46" r="4" fill="#f59e0b" opacity="0.9" style={{ animation: "micPulse 1s ease-in-out infinite" }} />}
      </svg>
    </div>
  );
}

function Waveform({ active, color }: { active: boolean; color: string }) {
  return (
    <div className="flex items-end gap-[2px] h-5">
      {[0.6, 1, 0.75, 1, 0.5, 0.8, 0.6].map((h, i) => (
        <div key={i} style={{ width: 2, height: active ? `${h * 20}px` : "4px", background: color, borderRadius: 2, transition: "height 0.18s ease", animation: active ? `wave ${0.4 + i * 0.07}s ease-in-out infinite alternate` : "none" }} />
      ))}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Broadcasts() {
  useSEO({ title: "CLAW Radio — Live", description: "Live underground AI radio. Velvet Static & Gravel Tone. Text them. Chime in.", canonical: "/broadcasts" });

  const { user } = useAuth();
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [input, setInput] = useState("");
  const [isAnon, setIsAnon] = useState(false);
  const [sending, setSending] = useState(false);
  const [speakingHost, setSpeakingHost] = useState<"velvet" | "gravel" | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [audioReady, setAudioReady] = useState(false); // true once user has unlocked
  const [recording, setRecording] = useState(false);
  const [chimeSent, setChimeSent] = useState(false);
  const [connected, setConnected] = useState(false);
  const [listenerCount] = useState(Math.floor(Math.random() * 80) + 12);

  // Stable refs — read by SSE handler without re-subscribing
  const audioEnabledRef = useRef(true);
  const audioReadyRef = useRef(false);
  const playingRef = useRef(false);
  const audioQueueRef = useRef<Array<{ text: string; host: "velvet" | "gravel" }>>([]);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const drainScheduled = useRef(false);

  // Keep refs in sync with state
  useEffect(() => { audioEnabledRef.current = audioEnabled; }, [audioEnabled]);
  useEffect(() => { audioReadyRef.current = audioReady; }, [audioReady]);

  const scrollBottom = useCallback(() => {
    chatRef.current && (chatRef.current.scrollTop = chatRef.current.scrollHeight);
  }, []);

  // ── Audio drain loop ───────────────────────────────────────────────────────
  const drainQueue = useCallback(async () => {
    if (drainScheduled.current) return;
    drainScheduled.current = true;

    while (true) {
      // Wait until enabled, unlocked, and not already playing
      if (!audioEnabledRef.current || !audioReadyRef.current || playingRef.current) break;
      const item = audioQueueRef.current.shift();
      if (!item) break;

      playingRef.current = true;
      setSpeakingHost(item.host);

      try {
        const res = await fetch(`${BASE}/api/podcast/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ text: item.text, host: item.host }),
        });
        if (res.ok) {
          const blob = await res.blob();
          await playAudioBlob(blob);
        }
      } catch { /* silent */ }

      setSpeakingHost(null);
      playingRef.current = false;
      await new Promise(r => setTimeout(r, 400)); // brief gap between lines
    }

    drainScheduled.current = false;
  }, []);

  // Re-drain whenever audio becomes ready (user tapped unlock)
  useEffect(() => {
    if (audioReady && audioEnabled && audioQueueRef.current.length > 0) {
      drainQueue();
    }
  }, [audioReady, audioEnabled, drainQueue]);

  // ── SSE — stable, no audio deps ────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const es = new EventSource(`${BASE}/api/podcast/stream`, { withCredentials: true });
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);

        if (data.type === "history") {
          setMessages(data.messages || []);
          setTimeout(scrollBottom, 50);
          return;
        }

        const msg: LiveMessage = data;
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
        setTimeout(scrollBottom, 50);

        if (audioEnabledRef.current && (msg.host === "velvet" || msg.host === "gravel")) {
          const text = msg.text.replace(/\*[^*]+\*/g, "").trim();
          if (text.length > 3) {
            audioQueueRef.current.push({ text, host: msg.host });
            if (audioReadyRef.current && !drainScheduled.current) drainQueue();
          }
        }
      } catch { /* ignore */ }
    };

    return () => { es.close(); setConnected(false); };
  }, [user, scrollBottom, drainQueue]); // NOTE: audioEnabled/audioReady intentionally excluded — use refs

  // ── Unlock audio ───────────────────────────────────────────────────────────
  const doUnlock = useCallback(async () => {
    await unlockAudio();
    setAudioReady(true);
    audioReadyRef.current = true;
    // Drain any queued text that arrived before unlock
    drainQueue();
  }, [drainQueue]);

  // ── Send text message ──────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!input.trim() || !user) return;
    setSending(true);
    try {
      await fetch(`${BASE}/api/podcast/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: input.trim(), isAnonymous: isAnon }),
      });
      setInput("");
    } finally { setSending(false); }
  };

  // ── Chime in ───────────────────────────────────────────────────────────────
  const sendChime = async () => {
    if (!user || chimeSent) return;
    await doUnlock(); // chime also unlocks audio

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      mediaRecRef.current = rec;
      setRecording(true);
      rec.start();
      setTimeout(() => {
        rec.stop();
        stream.getTracks().forEach(t => t.stop());
        setRecording(false);
        notifyChime();
      }, 4000);
    } catch {
      notifyChime();
    }
  };

  const notifyChime = () => {
    setChimeSent(true);
    fetch(`${BASE}/api/podcast/chime`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ isAnonymous: isAnon }),
    });
    setTimeout(() => setChimeSent(false), 8000);
  };

  const stopRecording = () => {
    if (mediaRecRef.current && recording) { mediaRecRef.current.stop(); setRecording(false); }
  };

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const isEmote = (t: string) => /^\*.*\*$/.test(t.trim());

  return (
    <Layout>
      <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-4rem)] lg:h-[calc(100vh-0px)]">

        {/* ── Studio header ─────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-border"
          style={{ background: "linear-gradient(180deg, rgba(109,40,217,0.12) 0%, transparent 100%)" }}>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${connected ? "bg-red-500" : "bg-white/20"}`}
                  style={connected ? { animation: "onairPulse 1.4s ease-in-out infinite" } : {}} />
                <span className="text-xs font-bold uppercase tracking-widest text-red-400">
                  {connected ? "On Air" : "Connecting…"}
                </span>
              </div>
              <span className="text-white/20 text-xs">·</span>
              <span className="text-xs text-white/30">{listenerCount} listening</span>
            </div>

            {/* Audio toggle — also unlocks */}
            <button
              onClick={async () => {
                if (!audioEnabled) {
                  setAudioEnabled(true);
                  await doUnlock();
                } else {
                  setAudioEnabled(false);
                  audioEnabledRef.current = false;
                }
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
            >
              {audioEnabled && audioReady
                ? <Volume2 className="w-3.5 h-3.5 text-primary" />
                : audioEnabled
                ? <Headphones className="w-3.5 h-3.5 text-amber-400" />
                : <VolumeX className="w-3.5 h-3.5 text-white/40" />
              }
              <span className="text-[11px] text-white/50">
                {audioEnabled && audioReady ? "Live" : audioEnabled ? "Tap to hear" : "Muted"}
              </span>
            </button>
          </div>

          {/* Unlock CTA — shown until user taps it */}
          {audioEnabled && !audioReady && (
            <button onClick={doUnlock}
              className="w-full mb-3 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, rgba(109,40,217,0.25), rgba(236,72,153,0.12))", borderColor: "rgba(109,40,217,0.5)", color: "rgba(255,255,255,0.9)", animation: "unlockPulse 2s ease-in-out infinite" }}
            >
              <Headphones className="w-4 h-4 text-primary" />
              Tap to hear Velvet Static &amp; Gravel Tone
            </button>
          )}

          {/* Host cards */}
          <div className="grid grid-cols-2 gap-3">
            {(["velvet", "gravel"] as const).map(host => {
              const isVelvet = host === "velvet";
              const speaking = speakingHost === host;
              return (
                <div key={host} className="flex items-center gap-3 p-3 rounded-xl border transition-all duration-500"
                  style={{
                    background: speaking ? (isVelvet ? "linear-gradient(135deg, rgba(236,72,153,0.15), rgba(109,40,217,0.10))" : "linear-gradient(135deg, rgba(251,191,36,0.12), rgba(109,40,217,0.10))") : "rgba(255,255,255,0.02)",
                    borderColor: speaking ? (isVelvet ? "rgba(236,72,153,0.5)" : "rgba(251,191,36,0.5)") : "rgba(255,255,255,0.06)",
                    boxShadow: speaking ? (isVelvet ? "0 0 20px rgba(236,72,153,0.15)" : "0 0 20px rgba(251,191,36,0.12)") : "none",
                  }}>
                  {isVelvet ? <VelvetAvatar speaking={speaking} size={44} /> : <GravelAvatar speaking={speaking} size={44} />}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-white/90 leading-none mb-1">{isVelvet ? "Velvet Static" : "Gravel Tone"}</div>
                    <div className={`text-[10px] mb-1.5 ${isVelvet ? "text-pink-400/60" : "text-amber-400/60"}`}>{isVelvet ? "she/her · emotional depth" : "he/him · grounded reality"}</div>
                    <Waveform active={speaking} color={isVelvet ? "rgb(236,72,153)" : "rgb(251,191,36)"} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Chat ──────────────────────────────────────────────────────────── */}
        <div ref={chatRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0" style={{ scrollBehavior: "smooth" }}>
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Radio className="w-10 h-10 text-primary/30 mb-3" />
              <p className="text-white/30 text-sm italic">Tuning in…</p>
            </div>
          )}

          {messages.map(msg => {
            if (msg.host === "user") {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[75%] px-3.5 py-2 rounded-2xl rounded-br-sm text-sm"
                    style={{ background: "rgba(109,40,217,0.25)", border: "1px solid rgba(109,40,217,0.35)" }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-semibold text-primary/80">{msg.isAnonymous ? "Anonymous" : msg.displayName}</span>
                      {msg.isRecording && <Mic className="w-2.5 h-2.5 text-primary/60" />}
                    </div>
                    <p className="text-white/80">{msg.text}</p>
                    <div className="text-[9px] text-white/20 mt-0.5 text-right">{formatTime(msg.timestamp)}</div>
                  </div>
                </div>
              );
            }

            const isVelvet = msg.host === "velvet";
            const emote = isEmote(msg.text);

            return (
              <div key={msg.id} className={`flex items-end gap-2.5 ${isVelvet ? "flex-row" : "flex-row-reverse"}`}>
                {isVelvet ? <VelvetAvatar speaking={false} size={28} /> : <GravelAvatar speaking={false} size={28} />}
                <div className={`max-w-[76%] px-3.5 py-2 rounded-2xl text-sm ${isVelvet ? "rounded-bl-sm" : "rounded-br-sm"} ${emote ? "italic" : ""}`}
                  style={{ background: isVelvet ? "linear-gradient(135deg, rgba(236,72,153,0.12), rgba(109,40,217,0.08))" : "linear-gradient(135deg, rgba(251,191,36,0.10), rgba(109,40,217,0.06))", border: isVelvet ? "1px solid rgba(236,72,153,0.25)" : "1px solid rgba(251,191,36,0.20)" }}>
                  <div className={`text-[10px] font-bold mb-0.5 ${isVelvet ? "text-pink-400/80" : "text-amber-400/80"}`}>{isVelvet ? "Velvet Static" : "Gravel Tone"}</div>
                  <p className={`leading-relaxed ${emote ? "text-white/40 text-xs" : "text-white/85"}`}>{msg.text}</p>
                  <div className="text-[9px] text-white/15 mt-0.5">{formatTime(msg.timestamp)}</div>
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={scrollBottom} className="mx-4 mb-1 flex items-center justify-center gap-1 py-1 text-[10px] text-white/20 hover:text-white/40 transition-colors">
          <ChevronDown className="w-3 h-3" /> scroll to live
        </button>

        {/* ── Input bar ─────────────────────────────────────────────────────── */}
        {user ? (
          <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-border space-y-2">
            <div className="flex items-center gap-2">
              <button
                onMouseDown={sendChime} onMouseUp={stopRecording}
                onTouchStart={sendChime} onTouchEnd={stopRecording}
                disabled={chimeSent}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${recording ? "bg-red-500/20 border-red-500/50 text-red-400" : chimeSent ? "bg-primary/10 border-primary/20 text-primary/50" : "bg-white/[0.04] border-white/[0.10] text-white/60 hover:border-primary/40 hover:text-white/80"}`}
              >
                {recording ? <Mic className="w-4 h-4 animate-pulse" /> : chimeSent ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{recording ? "Recording…" : chimeSent ? "Chime sent!" : "Chime in"}</span>
              </button>
              <label className="flex items-center gap-1.5 cursor-pointer ml-auto">
                <input type="checkbox" checked={isAnon} onChange={e => setIsAnon(e.target.checked)} className="accent-primary w-3 h-3" />
                <span className="text-[11px] text-white/40">Anonymous</span>
              </label>
            </div>

            <div className="flex gap-2">
              <input
                value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Message the hosts…" maxLength={280}
                className="flex-1 bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-2.5 text-sm text-white/80 placeholder:text-white/25 focus:outline-none focus:border-primary/50 transition-colors"
              />
              <button onClick={sendMessage} disabled={!input.trim() || sending}
                className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-accent disabled:opacity-40 transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-white/20 text-center">The hosts hear you. They may respond on air.</p>
          </div>
        ) : (
          <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-border text-center">
            <p className="text-sm text-white/30 italic">Sign in to message the hosts or chime in.</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes onairPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.85)} }
        @keyframes micPulse { 0%,100%{opacity:0.9;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.8)} }
        @keyframes wave { from{opacity:0.7} to{opacity:1} }
        @keyframes unlockPulse { 0%,100%{box-shadow:0 0 0 0 rgba(109,40,217,0.4)} 50%{box-shadow:0 0 0 8px rgba(109,40,217,0)} }
      `}</style>
    </Layout>
  );
}
