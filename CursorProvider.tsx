import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

const makeCursorUrl = (svg: string, x: number, y: number) =>
  `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${x} ${y}, auto`;

const catPaw = makeCursorUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><ellipse cx="16" cy="21" rx="7" ry="6" fill="#e879a0" opacity="0.95"/><ellipse cx="9" cy="14" rx="3.5" ry="3" fill="#e879a0" opacity="0.95"/><ellipse cx="14" cy="11" rx="3" ry="2.5" fill="#e879a0" opacity="0.95"/><ellipse cx="19" cy="11" rx="3" ry="2.5" fill="#e879a0" opacity="0.95"/><ellipse cx="24" cy="14" rx="3.5" ry="3" fill="#e879a0" opacity="0.95"/></svg>`,
  16, 21
);
const clawMark = makeCursorUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32"><path d="M4 2 C3 10 2 20 4 30" stroke="#9b59b6" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M12 0 C11 10 10 20 12 32" stroke="#9b59b6" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M20 2 C21 10 22 20 20 30" stroke="#9b59b6" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`,
  12, 31
);
const ghostCursor = makeCursorUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="30" viewBox="0 0 24 30"><path d="M12 2 C6 2 2 7 2 13 L2 28 L5 25 L8 28 L12 25 L16 28 L19 25 L22 28 L22 13 C22 7 18 2 12 2Z" fill="white" opacity="0.9" stroke="#9b59b6" stroke-width="0.5"/><circle cx="8.5" cy="14" r="2" fill="#1a1a2e"/><circle cx="15.5" cy="14" r="2" fill="#1a1a2e"/></svg>`,
  12, 4
);
const eyeCursor = makeCursorUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="20" viewBox="0 0 36 20"><path d="M2 10 Q18 0 34 10 Q18 20 2 10Z" fill="#1a1a2e" stroke="#9b59b6" stroke-width="1"/><circle cx="18" cy="10" r="6" fill="#7c3aed"/><circle cx="18" cy="10" r="3" fill="#0a0a1a"/><circle cx="20" cy="8" r="1.5" fill="white" opacity="0.8"/></svg>`,
  18, 10
);
const voidCursor = makeCursorUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#0a0a1a" stroke="#7c3aed" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="#7c3aed" opacity="0.6"/><circle cx="12" cy="12" r="1.5" fill="#e879a0"/></svg>`,
  12, 12
);
const starCursor = makeCursorUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2 L14.5 9.5 L22 9.5 L16 14 L18.5 22 L12 17 L5.5 22 L8 14 L2 9.5 L9.5 9.5 Z" fill="#f59e0b" opacity="0.95"/></svg>`,
  12, 12
);
const daggerCursor = makeCursorUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="32" viewBox="0 0 12 32"><path d="M6 30 L2 12 L6 2 L10 12 Z" fill="#e2e8f0" opacity="0.95"/><path d="M1 16 L11 16 L10 18 L2 18 Z" fill="#9b59b6"/><rect x="3" y="18" width="6" height="4" rx="1" fill="#7c3aed"/></svg>`,
  6, 30
);
const moonCursor = makeCursorUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M20 13.5C19.2 17.3 15.8 20 12 20C7.6 20 4 16.4 4 12C4 8.2 6.7 4.8 10.5 4C9.1 5.5 8.3 7.6 8.3 9.8C8.3 14.6 12.2 18.5 17 18.5C18.1 18.5 19.1 18.3 20 17.9V13.5Z" fill="#a78bfa" opacity="0.95"/></svg>`,
  12, 12
);

export const CURSOR_DEFS: Record<string, { label: string; emoji: string; css: string }> = {
  default:  { label: "Default",     emoji: "🖱️", css: "auto" },
  catpaw:   { label: "Cat Paw",     emoji: "🐾", css: catPaw },
  claw:     { label: "Claw Marks",  emoji: "⚔️", css: clawMark },
  ghost:    { label: "Ghost",       emoji: "👻", css: ghostCursor },
  eye:      { label: "Mystic Eye",  emoji: "👁️", css: eyeCursor },
  void:     { label: "Void",        emoji: "⚫", css: voidCursor },
  star:     { label: "Stardust",    emoji: "✨", css: starCursor },
  dagger:   { label: "Dagger",      emoji: "🗡️", css: daggerCursor },
  moon:     { label: "Moon",        emoji: "🌙", css: moonCursor },
};

interface CursorContextValue {
  cursorKey: string;
  setCursorKey: (k: string) => void;
}

const CursorCtx = createContext<CursorContextValue>({ cursorKey: "default", setCursorKey: () => {} });

export function useCursor() {
  return useContext(CursorCtx);
}

export function CursorProvider({ children }: { children: ReactNode }) {
  const [cursorKey, setCursorKeyState] = useState(() => {
    try { return localStorage.getItem("claw-cursor") || "default"; } catch { return "default"; }
  });

  const setCursorKey = useCallback((k: string) => {
    setCursorKeyState(k);
    try { localStorage.setItem("claw-cursor", k); } catch {}
  }, []);

  useEffect(() => {
    const styleId = "claw-cursor-style";
    let el = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = styleId;
      document.head.appendChild(el);
    }
    const css = CURSOR_DEFS[cursorKey]?.css ?? "auto";
    if (cursorKey === "default") {
      el.textContent = "";
    } else {
      el.textContent = `*, *::before, *::after { cursor: ${css} !important; }`;
    }
  }, [cursorKey]);

  return (
    <CursorCtx.Provider value={{ cursorKey, setCursorKey }}>
      {children}
    </CursorCtx.Provider>
  );
}

export function CursorPicker() {
  const { cursorKey, setCursorKey } = useCursor();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        title="Change cursor"
        className="w-9 h-9 rounded-xl bg-card border border-border hover:border-primary/40 flex items-center justify-center text-base transition-all hover:bg-primary/10"
      >
        {CURSOR_DEFS[cursorKey]?.emoji ?? "🖱️"}
      </button>
      {open && (
        <div className="absolute bottom-full mb-2 right-0 bg-card border border-border rounded-xl p-3 shadow-2xl z-[200] w-52">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Cursor Style</div>
          <div className="grid grid-cols-3 gap-1.5">
            {Object.entries(CURSOR_DEFS).map(([k, def]) => (
              <button
                key={k}
                onClick={() => { setCursorKey(k); setOpen(false); }}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all text-center ${
                  cursorKey === k
                    ? "border-primary/60 bg-primary/15"
                    : "border-border hover:border-primary/30 hover:bg-muted"
                }`}
              >
                <span className="text-lg leading-none">{def.emoji}</span>
                <span className="text-[9px] text-muted-foreground leading-tight">{def.label}</span>
              </button>
            ))}
          </div>
          <div className="text-[9px] text-muted-foreground text-center mt-2 opacity-60">Saved automatically</div>
        </div>
      )}
    </div>
  );
}
