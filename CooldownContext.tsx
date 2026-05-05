import { createContext, useContext, useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";

const HIGH_INTENSITY_PAGES = ["/purge-arena", "/purgatory"];
const BURNOUT_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const COOLDOWN_BLOCK_MS = 15 * 60 * 1000;    // 15 min Claw block
const STORAGE_KEY = "claw_intensity_session";

interface CooldownState {
  activeMs: number;
  cooldownUntil: number | null;
  clawBlockUntil: number | null;
}

interface CooldownContextValue {
  isDesaturated: boolean;
  isClawBlocked: boolean;
  clawBlockRemaining: number;
  burnoutPct: number;
  triggerCooldown: () => void;
  resetCooldown: () => void;
  trackClawInteraction: () => void;
}

const CooldownCtx = createContext<CooldownContextValue | null>(null);

export function useCooldown() {
  const ctx = useContext(CooldownCtx);
  if (!ctx) throw new Error("useCooldown must be inside CooldownProvider");
  return ctx;
}

function loadState(): CooldownState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as CooldownState;
  } catch {}
  return { activeMs: 0, cooldownUntil: null, clawBlockUntil: null };
}

function saveState(s: CooldownState) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

export function CooldownProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();
  const [state, setState] = useState<CooldownState>(loadState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pageEnteredRef = useRef<number | null>(null);
  const ringyFiredRef = useRef(false);

  const isIntensePage = HIGH_INTENSITY_PAGES.some(p => location.startsWith(p));

  const isDesaturated = !!(state.cooldownUntil && Date.now() < state.cooldownUntil);
  const isClawBlocked = !!(state.clawBlockUntil && Date.now() < state.clawBlockUntil);
  const clawBlockRemaining = isClawBlocked
    ? Math.ceil((state.clawBlockUntil! - Date.now()) / 60000)
    : 0;
  const burnoutPct = Math.min(100, Math.round((state.activeMs / BURNOUT_THRESHOLD_MS) * 100));

  const updateState = useCallback((patch: Partial<CooldownState>) => {
    setState(prev => {
      const next = { ...prev, ...patch };
      saveState(next);
      return next;
    });
  }, []);

  const triggerCooldown = useCallback(() => {
    const now = Date.now();
    updateState({
      cooldownUntil: now + COOLDOWN_BLOCK_MS,
      clawBlockUntil: now + COOLDOWN_BLOCK_MS,
      activeMs: 0,
    });
    // Ringy message
    window.dispatchEvent(new CustomEvent("ringy:remark", {
      detail: {
        text: "the air is getting thin. go to the lounge or do some shadow work to recalibrate.",
        category: "cooldown",
      }
    }));
    window.dispatchEvent(new CustomEvent("claw:cooldown-active"));
  }, [updateState]);

  const resetCooldown = useCallback(() => {
    updateState({ cooldownUntil: null, clawBlockUntil: null, activeMs: 0 });
    ringyFiredRef.current = false;
  }, [updateState]);

  const trackClawInteraction = useCallback(() => {
    if (!user) return;
    updateState({ activeMs: state.activeMs + 2 * 60 * 1000 }); // Claw interaction = +2 min equiv
  }, [user, state.activeMs, updateState]);

  // Track time on intense pages
  useEffect(() => {
    if (!user) return;
    if (isIntensePage) {
      pageEnteredRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        setState(prev => {
          const next = { ...prev, activeMs: prev.activeMs + 5000 };
          saveState(next);
          return next;
        });
      }, 5000);
    } else {
      if (pageEnteredRef.current !== null) {
        pageEnteredRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isIntensePage, user, location]);

  // Check threshold
  useEffect(() => {
    if (!user) return;
    if (state.activeMs >= BURNOUT_THRESHOLD_MS && !state.cooldownUntil && !ringyFiredRef.current) {
      ringyFiredRef.current = true;
      triggerCooldown();
    }
  }, [state.activeMs, state.cooldownUntil, triggerCooldown, user]);

  // Expire cooldown automatically
  useEffect(() => {
    if (!state.cooldownUntil) return;
    const remaining = state.cooldownUntil - Date.now();
    if (remaining <= 0) {
      updateState({ cooldownUntil: null, clawBlockUntil: null });
      ringyFiredRef.current = false;
      return;
    }
    const t = setTimeout(() => {
      updateState({ cooldownUntil: null, clawBlockUntil: null });
      ringyFiredRef.current = false;
      window.dispatchEvent(new CustomEvent("ringy:remark", {
        detail: { text: "you're back. how do you feel now.", category: "cooldown_end" }
      }));
    }, remaining);
    return () => clearTimeout(t);
  }, [state.cooldownUntil, updateState]);

  // Apply desaturation to body
  useEffect(() => {
    const html = document.documentElement;
    if (isDesaturated) {
      html.style.filter = "saturate(0.15) brightness(0.85)";
      html.style.transition = "filter 3s ease";
    } else {
      html.style.filter = "";
      html.style.transition = "filter 2s ease";
    }
    return () => {
      html.style.filter = "";
      html.style.transition = "";
    };
  }, [isDesaturated]);

  return (
    <CooldownCtx.Provider value={{
      isDesaturated,
      isClawBlocked,
      clawBlockRemaining,
      burnoutPct,
      triggerCooldown,
      resetCooldown,
      trackClawInteraction,
    }}>
      {children}
      {isDesaturated && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full mx-4 px-5 py-4 rounded-2xl border border-zinc-600/60 shadow-2xl text-center"
          style={{ background: "rgba(15,15,20,0.92)", backdropFilter: "blur(16px)" }}
        >
          <p className="text-xs text-zinc-400 font-semibold uppercase tracking-widest mb-1">Psychological Cooldown</p>
          <p className="text-sm text-white leading-snug mb-3">
            the air is getting thin in here.<br />
            <span className="text-zinc-400">claw posts blocked for {clawBlockRemaining} more min.</span>
          </p>
          <div className="flex gap-2 justify-center">
            <a href="/shadow-work"
              className="px-4 py-1.5 rounded-xl bg-indigo-700/60 hover:bg-indigo-600/60 text-white text-xs font-semibold transition-colors">
              Shadow Work
            </a>
            <a href="/feed"
              className="px-4 py-1.5 rounded-xl bg-zinc-700/50 hover:bg-zinc-600/50 text-white text-xs font-semibold transition-colors">
              The Lounge
            </a>
          </div>
        </div>
      )}
    </CooldownCtx.Provider>
  );
}
