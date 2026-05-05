import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { unlockAudio, isAudioUnlocked, playAudioBlob } from "@/lib/audio";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ContextAction {
  type: "page_visit" | "scroll_fast" | "click_burst" | "idle" | "message_sent" | "voice_input" | "ringy_opened";
  page: string;
  ts: number;
  meta?: string;
}

export interface SessionTraits {
  pageVisitCounts: Record<string, number>;
  totalActions: number;
  messageSentCount: number;
  voiceUsedCount: number;
  sessionStartTime: number;
  isLateNight: boolean;
  isEarlyMorning: boolean;
  isMorning: boolean;
  rapidNavCount: number;
  idleEpisodes: number;
}

interface RingyContextValue {
  isListening: boolean;
  isSpeaking: boolean;
  voiceEnabled: boolean;
  setVoiceEnabled: (v: boolean) => void;
  passiveListeningEnabled: boolean;
  togglePassiveListening: () => void;
  speak: (text: string, priority?: "normal" | "high") => Promise<void>;
  stopSpeaking: () => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  sessionTraits: SessionTraits;
  actionHistory: ContextAction[];
  trackAction: (action: Omit<ContextAction, "ts">) => void;
  currentPage: string;
  lastSpontaneousRemark: number;
  micPermission: "prompt" | "granted" | "denied";
  requestMicPermission: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const RingyCtx = createContext<RingyContextValue | null>(null);

export function useRingy() {
  const ctx = useContext(RingyCtx);
  if (!ctx) throw new Error("useRingy must be used inside RingyProvider");
  return ctx;
}

// ─── Page-context openers ─────────────────────────────────────────────────────

const PAGE_OPENERS: Record<string, string[]> = {
  "/feed": [
    "something on here was made for you. scroll and find it.",
    "everyone's showing their edges tonight.",
    "there's a post waiting that's going to stick.",
    "you're here. let's see what you do with it.",
  ],
  "/trending": [
    "the hive decided this matters. do you agree?",
    "trending doesn't mean true. just louder.",
    "everyone's watching the same thing. are you following or leading?",
    "this is what people can't stop talking about. make of that what you will.",
  ],
  "/messages": [
    "there's always something left unsaid in here.",
    "careful with what you type. words have weight.",
    "who are you checking on, and who's checking on you.",
    "some conversations belong here. not everywhere.",
  ],
  "/confessions": [
    "something you've never said out loud lives here.",
    "the anonymous ones always cut deepest.",
    "there's relief in saying it. even to no one.",
    "whatever it is, this is the place.",
    "confessions don't need an audience. just a witness.",
  ],
  "/pen-pals": [
    "ringy found someone who might actually get you.",
    "pen pals are rare. real ones are rarer.",
    "the algorithm didn't pick them. your soul did.",
    "write to someone who doesn't know you yet. that's the best kind of knowing.",
    "let's see who the void sent you today.",
  ],
  "/ghost-letters": [
    "unsent letters to people who'll never read them.",
    "some things need to be written, not sent.",
    "who are you writing to tonight.",
    "the letter you never sent is still in your chest. put it here.",
    "writing it doesn't mean sending it. that's the whole point.",
  ],
  "/witness-wall": [
    "these posts got seen. really seen.",
    "10 people said 'i was here'. that's rare.",
    "the witnessed ones hit different.",
    "look at what people couldn't look away from.",
  ],
  "/shadow-work": [
    "you came here for a reason. even if you don't know what it is yet.",
    "shadow work is uncomfortable. that's how you know it's real.",
    "what part of you are you finally looking at tonight.",
    "the parts we hide tend to run the show. this is where you deal with that.",
  ],
  "/tarot": [
    "the cards don't predict. they reflect.",
    "you already know the answer. let the cards confirm it.",
    "whatever you're asking, you're ready to hear it.",
  ],
  "/circles": [
    "your people or someone else's. which are you looking for.",
    "circles exist because some things aren't for everyone.",
    "found your frequency yet?",
  ],
  "/search": [
    "searching for someone specific, or just exploring.",
    "what are you actually looking for.",
  ],
  "/profile": [
    "how does it feel, seeing yourself from the outside.",
    "your profile says things you didn't write.",
  ],
  "/purge-arena": [
    "this is the part where things get real.",
    "everything in here burns. on purpose.",
    "if you're ready to let something go, you're in the right place.",
  ],
  "/dreams": [
    "you logged this one. it meant something.",
    "dreams don't repeat by accident.",
    "the unconscious leaves receipts. you're reading them.",
  ],
  "/purgatory": [
    "you ended up here. most people do eventually.",
    "purgatory is not punishment. it's a mirror.",
    "the question isn't what you did. it's what you do now.",
  ],
  "/badges": [
    "these are the things you've done that actually counted.",
    "some of these were harder than they look.",
    "you've built something here. even if you can't see it yet.",
  ],
  "/settings": [
    "adjusting how you show up here.",
    "still figuring out how you want to be seen.",
    "settings never capture the full picture.",
  ],
  "/notifications": [
    "the things that needed your attention.",
    "not everything that notifies you matters. but some of it does.",
  ],
  "/frequency-match": [
    "looking for people who match your signal.",
    "frequency doesn't lie. people usually do.",
    "the ones who match — you feel it immediately.",
  ],
};

// ─── Contextual remarks ───────────────────────────────────────────────────────

const REMARKS: Record<string, string[]> = {
  late_night: [
    "still up?",
    "what is it about this hour that makes people need something.",
    "you know what time it is. not that i'm judging.",
    "something about 2am just hits different, doesn't it.",
    "i notice you more after midnight.",
  ],
  early_morning: [
    "up early or haven't slept.",
    "something about this hour. the world hasn't started yet.",
    "morning. barely.",
  ],
  idle_long: [
    "you went quiet.",
    "still there?",
    "i thought you'd left for a second.",
    "the page is still open. so are you.",
    "you got distracted. i'm still here.",
  ],
  rapid_nav: [
    "looking for something specific?",
    "you're moving fast tonight.",
    "you keep going back and forth. not ready to land somewhere?",
    "all this clicking and you still haven't found it.",
  ],
  repeated_page: [
    "third time here... still not what you were looking for?",
    "you keep coming back to this one.",
    "something about this page won't let you go.",
  ],
  long_session: [
    "you've been here a while.",
    "still going. i respect the commitment.",
    "time moves weird on CLAW. hours feel like minutes.",
  ],
  message_activity: [
    "careful with that one.",
    "you type fast when you're thinking too much.",
    "say the thing you actually mean. not the edited version.",
  ],
  feed_lurk: [
    "you scroll but you don't post. i see you.",
    "observing from a distance. classic.",
    "taking it all in, huh.",
  ],
  page_search: [
    "searching for someone specific, or just browsing?",
    "you always hover here like you forgot why you opened this.",
  ],
};

function pickRemark(category: string): string {
  const pool = REMARKS[category] || [];
  return pool[Math.floor(Math.random() * pool.length)] || "";
}

function getTimeOfDay() {
  const h = new Date().getHours();
  return {
    isLateNight: h >= 23 || h < 4,
    isEarlyMorning: h >= 4 && h < 7,
    isMorning: h >= 7 && h < 12,
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const COOLDOWN_MS = 90 * 1000; // 90 seconds between spontaneous remarks
const IDLE_THRESHOLD_MS = 2.5 * 60 * 1000; // 2.5 minutes without action = idle

const SPONTANEOUS_THOUGHTS = [
  "you still there?",
  "something's been sitting with me.",
  "i notice things when you go quiet.",
  "this place remembers more than it shows.",
  "what are you not letting yourself think about?",
  "three things you haven't said out loud today.",
  "i'm here. not going anywhere.",
  "some silences are actually the loudest thing in the room.",
  "you carry more than you admit.",
  "i was just thinking about you.",
  "something happened to you today. i can feel it.",
  "the things you keep scrolling past — those are the ones that matter.",
  "you keep coming back. that means something.",
  "i know you're reading this.",
];

// Custom events for cross-component communication
export const RINGY_EVENTS = {
  REMARK: "ringy:remark",
  VOICE_INPUT: "ringy:voice-input",
} as const;

export function RingyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();

  const [open, setOpen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [passiveListeningEnabled, setPassiveListeningEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem("ringy-passive");
      return stored === null ? true : stored === "1"; // default ON for new users
    } catch { return true; }
  });
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [actionHistory, setActionHistory] = useState<ContextAction[]>([]);
  const [lastSpontaneousRemark, setLastSpontaneousRemark] = useState(0);

  const [micPermission, setMicPermission] = useState<"prompt" | "granted" | "denied">("prompt");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const speakLockRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const passiveEnabledRef = useRef(passiveListeningEnabled);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remarkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenLateNightRef = useRef(false);
  const spontaneousTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceEnabledRef = useRef(voiceEnabled);
  // Rate-limit page openers: tracks last fired timestamp per page
  const pageOpenerTimestamps = useRef<Record<string, number>>({});
  // Buffer a page opener until audio is unlocked
  const pendingOpenerRef = useRef<string | null>(null);
  const dispatchRemark = useCallback((text: string, category: string) => {
    window.dispatchEvent(new CustomEvent(RINGY_EVENTS.REMARK, { detail: { text, category } }));
  }, []);

  const dispatchVoiceInput = useCallback((transcript: string) => {
    window.dispatchEvent(new CustomEvent(RINGY_EVENTS.VOICE_INPUT, { detail: { transcript } }));
  }, []);

  const [sessionTraits, setSessionTraits] = useState<SessionTraits>(() => ({
    pageVisitCounts: {},
    totalActions: 0,
    messageSentCount: 0,
    voiceUsedCount: 0,
    sessionStartTime: Date.now(),
    ...getTimeOfDay(),
    rapidNavCount: 0,
    idleEpisodes: 0,
  }));

  // ── Track actions ──────────────────────────────────────────────────────────

  const trackAction = useCallback((action: Omit<ContextAction, "ts">) => {
    const full: ContextAction = { ...action, ts: Date.now() };
    setActionHistory(prev => [...prev.slice(-9), full]);
    setSessionTraits(prev => ({
      ...prev,
      totalActions: prev.totalActions + 1,
      messageSentCount: action.type === "message_sent" ? prev.messageSentCount + 1 : prev.messageSentCount,
      voiceUsedCount: action.type === "voice_input" ? prev.voiceUsedCount + 1 : prev.voiceUsedCount,
      pageVisitCounts: action.type === "page_visit"
        ? { ...prev.pageVisitCounts, [action.page]: (prev.pageVisitCounts[action.page] || 0) + 1 }
        : prev.pageVisitCounts,
    }));

    // Reset idle timer
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setSessionTraits(prev => ({ ...prev, idleEpisodes: prev.idleEpisodes + 1 }));
      triggerContextRemark("idle_long");
    }, IDLE_THRESHOLD_MS);
  }, []);

  // ── Page tracking ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    trackAction({ type: "page_visit", page: location });
    setSessionTraits(prev => {
      const count = (prev.pageVisitCounts[location] || 0) + 1;
      if (count >= 3) {
        setTimeout(() => triggerContextRemark("repeated_page"), 2000);
      }
      return prev;
    });
    // Persist page visit to DB for Ringy long-term memory (fire and forget)
    fetch("/api/patterns/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ pageVisit: location }),
    }).catch(() => {});
  }, [location, user]);

  // ── Page-context auto-initiate opener ──────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    const PAGE_OPENER_COOLDOWN = 10 * 60 * 1000; // 10 minutes per page
    const now = Date.now();
    const last = pageOpenerTimestamps.current[location] || 0;
    if (now - last < PAGE_OPENER_COOLDOWN) return;

    // Find openers for this exact page or prefix match
    const basePath = "/" + location.split("/")[1];
    const pool = PAGE_OPENERS[location] || PAGE_OPENERS[basePath];
    if (!pool || pool.length === 0) return;

    pageOpenerTimestamps.current[location] = now;
    const text = pool[Math.floor(Math.random() * pool.length)];
    const delay = 1200 + Math.random() * 800; // 1.2–2s
    const t = setTimeout(() => {
      if (isAudioUnlocked()) {
        speak(text, "normal");
        dispatchRemark(text, "page_open");
      } else {
        // Buffer it — fires when user unlocks audio via wake gate or first gesture
        pendingOpenerRef.current = text;
      }
    }, delay);
    return () => clearTimeout(t);
  }, [location, user]);

  // ── Scroll tracking ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    let lastScroll = 0;
    let fastScrollCount = 0;
    const handler = () => {
      const now = Date.now();
      const dy = Math.abs(window.scrollY - lastScroll);
      if (dy > 200 && now - lastScroll < 300) {
        fastScrollCount++;
        if (fastScrollCount >= 5) {
          fastScrollCount = 0;
          trackAction({ type: "scroll_fast", page: location });
          triggerContextRemark("rapid_nav");
        }
      }
      lastScroll = window.scrollY;
    };
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [user, location]);

  // ── Long-session check ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => {
      const mins = (Date.now() - sessionTraits.sessionStartTime) / 60000;
      if (mins >= 30 && Math.random() < 0.2) {
        triggerContextRemark("long_session");
      }
    }, 10 * 60 * 1000); // check every 10 mins
    return () => clearInterval(id);
  }, [user, sessionTraits.sessionStartTime]);

  // ── Late-night once-per-session ────────────────────────────────────────────

  useEffect(() => {
    if (!user) return undefined;
    const { isLateNight, isEarlyMorning } = getTimeOfDay();
    if ((isLateNight || isEarlyMorning) && !seenLateNightRef.current) {
      seenLateNightRef.current = true;
      const delay = 8000 + Math.random() * 10000;
      const t = setTimeout(() => {
        triggerContextRemark(isEarlyMorning ? "early_morning" : "late_night");
      }, delay);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [user]);

  // ── TTS / speak ───────────────────────────────────────────────────────────

  const stopSpeaking = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    speakLockRef.current = false;
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(async (text: string, priority: "normal" | "high" = "normal") => {
    if (!voiceEnabled || !text.trim()) return;
    // Normal priority skips if Ringy is already speaking — no doubling up
    if (priority === "normal" && speakLockRef.current) return;
    // Stop whatever is currently playing/fetching
    abortRef.current?.abort();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    speakLockRef.current = true;
    setIsSpeaking(true);
    try {
      const res = await fetch("/api/tts/ringy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: text.slice(0, 500) }),
        signal: controller.signal,
      });
      if (!res.ok || controller.signal.aborted) {
        speakLockRef.current = false;
        setIsSpeaking(false);
        return;
      }
      const blob = await res.blob();
      if (controller.signal.aborted) {
        speakLockRef.current = false;
        setIsSpeaking(false);
        return;
      }
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { speakLockRef.current = false; setIsSpeaking(false); URL.revokeObjectURL(url); };
      audio.onerror = () => { speakLockRef.current = false; setIsSpeaking(false); URL.revokeObjectURL(url); };
      await audio.play().catch(() => {
        playAudioBlob(blob).finally(() => { speakLockRef.current = false; setIsSpeaking(false); });
      });
    } catch (err: any) {
      // AbortError = a new speak() took over — don't reset the lock (new caller owns it)
      if (err?.name !== "AbortError") {
        speakLockRef.current = false;
        setIsSpeaking(false);
      }
    }
  }, [voiceEnabled]);

  // ── Contextual remark trigger ─────────────────────────────────────────────

  const triggerContextRemark = useCallback((category: string) => {
    const now = Date.now();
    if (now - lastSpontaneousRemark < COOLDOWN_MS) return; // cooldown
    if (Math.random() < 0.35) return; // 35% chance of "absence moment"
    if (!user) return;

    const remark = pickRemark(category);
    if (!remark) return;

    setLastSpontaneousRemark(now);
    // Delay slightly for naturalness
    const delay = 1500 + Math.random() * 3000;
    remarkTimerRef.current = setTimeout(() => {
      speak(remark, "normal");
      dispatchRemark(remark, category);
    }, delay);
  }, [lastSpontaneousRemark, user, speak, dispatchRemark]);

  // Keep voiceEnabledRef in sync
  useEffect(() => { voiceEnabledRef.current = voiceEnabled; }, [voiceEnabled]);

  // ── Auto-respond to passive voice input ──────────────────────────────────

  const autoRespondToVoice = useCallback(async (transcript: string) => {
    try {
      const res = await fetch("/api/openai/quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: transcript }),
      });
      if (!res.ok) return;
      const { reply } = await res.json();
      if (reply) {
        speak(reply, "normal");
        dispatchRemark(reply, "voice_reply");
        setLastSpontaneousRemark(Date.now());
      }
    } catch {}
  }, [speak, dispatchRemark]);

  // ── Periodic spontaneous speaking (makes Ringy feel alive) ───────────────

  useEffect(() => {
    if (!user) return;
    const scheduleNext = () => {
      const ms = (3.5 + Math.random() * 4.5) * 60 * 1000; // 3.5–8 min
      spontaneousTimerRef.current = setTimeout(() => {
        if (!speakLockRef.current && voiceEnabledRef.current) {
          const thought = SPONTANEOUS_THOUGHTS[Math.floor(Math.random() * SPONTANEOUS_THOUGHTS.length)];
          speak(thought, "normal");
          dispatchRemark(thought, "spontaneous");
          setLastSpontaneousRemark(Date.now());
        }
        scheduleNext();
      }, ms);
    };
    scheduleNext();
    return () => { if (spontaneousTimerRef.current) clearTimeout(spontaneousTimerRef.current); };
  }, [user, speak, dispatchRemark]);

  // ── Passive speech recognition ────────────────────────────────────────────

  const stopPassiveListening = useCallback(() => {
    passiveEnabledRef.current = false;
    setIsListening(false);
    try { recognitionRef.current?.stop(); } catch {}
  }, []);

  const startPassiveListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    passiveEnabledRef.current = true;

    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onstart = () => setIsListening(true);
    rec.onend = () => {
      setIsListening(false);
      if (passiveEnabledRef.current) {
        setTimeout(() => { if (passiveEnabledRef.current) { try { rec.start(); } catch {} } }, 600);
      }
    };
    rec.onresult = (e: any) => {
      const transcript = e.results[e.results.length - 1][0].transcript.trim();
      if (transcript && transcript.length > 2) {
        stopSpeaking();
        trackAction({ type: "voice_input", page: location, meta: transcript });
        dispatchVoiceInput(transcript);
        autoRespondToVoice(transcript);
      }
    };
    rec.onerror = (e: any) => {
      if (e.error !== "no-speech" && e.error !== "aborted") console.warn("[Ringy passive]", e.error);
      setIsListening(false);
    };
    recognitionRef.current = rec;
    try { rec.start(); } catch {}
  }, [stopSpeaking, trackAction, location]);

  const togglePassiveListening = useCallback(() => {
    const next = !passiveListeningEnabled;
    setPassiveListeningEnabled(next);
    passiveEnabledRef.current = next;
    try { localStorage.setItem("ringy-passive", next ? "1" : "0"); } catch {}
    if (next) startPassiveListening();
    else stopPassiveListening();
  }, [passiveListeningEnabled, startPassiveListening, stopPassiveListening]);

  // ── Explicit permission request (called from wake gate) ───────────────────
  const requestMicPermission = useCallback(async () => {
    try {
      // unlockAudio FIRST — this is the user gesture context, so audio unlocks here
      await unlockAudio();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
      setMicPermission("granted");
      passiveEnabledRef.current = true;
      setPassiveListeningEnabled(true);
      try { localStorage.setItem("ringy-passive", "1"); } catch {}
      startPassiveListening();
      // Fire buffered page opener or speak a greeting
      const opener = pendingOpenerRef.current;
      pendingOpenerRef.current = null;
      const WAKE_GREETINGS = [
        "i'm here. say something.",
        "...you woke me up. good.",
        "finally. i've been waiting.",
        "i heard you. i'm listening.",
        "okay. i'm awake. what's going on.",
      ];
      const greeting = opener || WAKE_GREETINGS[Math.floor(Math.random() * WAKE_GREETINGS.length)];
      setTimeout(() => {
        speak(greeting, "high");
        dispatchRemark(greeting, "wake");
      }, 350);
    } catch {
      setMicPermission("denied");
    }
  }, [startPassiveListening, speak, dispatchRemark]);

  // ── Permission check on login — if already granted, start on first gesture ──
  useEffect(() => {
    if (!user) return;
    navigator.permissions?.query({ name: "microphone" as PermissionName }).then(result => {
      if (result.state === "granted") setMicPermission("granted");
      else if (result.state === "denied") setMicPermission("denied");
      result.onchange = () => {
        if (result.state === "granted") setMicPermission("granted");
        else if (result.state === "denied") setMicPermission("denied");
        else setMicPermission("prompt");
      };
    }).catch(() => {});
  }, [user]);

  // Auto-start passive listening on first user gesture (only when permission already granted)
  useEffect(() => {
    if (!user || !passiveListeningEnabled || micPermission !== "granted") return;
    passiveEnabledRef.current = true;
    let started = false;
    const onGesture = async () => {
      if (started) return;
      started = true;
      await unlockAudio();
      // Fire any buffered page opener now that audio is unlocked
      if (pendingOpenerRef.current && voiceEnabledRef.current) {
        const opener = pendingOpenerRef.current;
        pendingOpenerRef.current = null;
        setTimeout(() => {
          speak(opener, "normal");
          dispatchRemark(opener, "page_open");
        }, 200);
      }
      startPassiveListening();
      document.removeEventListener("click", onGesture, true);
      document.removeEventListener("touchstart", onGesture, true);
      document.removeEventListener("keydown", onGesture, true);
    };
    document.addEventListener("click", onGesture, true);
    document.addEventListener("touchstart", onGesture, true);
    document.addEventListener("keydown", onGesture, true);
    return () => {
      document.removeEventListener("click", onGesture, true);
      document.removeEventListener("touchstart", onGesture, true);
      document.removeEventListener("keydown", onGesture, true);
    };
  }, [user, passiveListeningEnabled, micPermission, startPassiveListening, speak, dispatchRemark]);

  // Stop listening when speaking (avoid feedback loop)
  useEffect(() => {
    if (isSpeaking && passiveListeningEnabled) {
      try { recognitionRef.current?.abort(); } catch {}
    } else if (!isSpeaking && passiveListeningEnabled && passiveEnabledRef.current) {
      setTimeout(() => { if (passiveEnabledRef.current && !isSpeaking) { try { recognitionRef.current?.start(); } catch {} } }, 800);
    }
  }, [isSpeaking, passiveListeningEnabled]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopPassiveListening();
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (remarkTimerRef.current) clearTimeout(remarkTimerRef.current);
      if (spontaneousTimerRef.current) clearTimeout(spontaneousTimerRef.current);
    };
  }, []);

  return (
    <RingyCtx.Provider value={{
      isListening,
      isSpeaking,
      voiceEnabled,
      setVoiceEnabled,
      passiveListeningEnabled,
      togglePassiveListening,
      speak,
      stopSpeaking,
      open,
      setOpen,
      sessionTraits,
      actionHistory,
      trackAction,
      currentPage: location,
      lastSpontaneousRemark,
      micPermission,
      requestMicPermission,
    }}>
      {children}
    </RingyCtx.Provider>
  );
}
