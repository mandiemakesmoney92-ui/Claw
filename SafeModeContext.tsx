import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface SafeModeContextValue {
  safeMode: boolean;
  toggleSafeMode: () => void;
  setSafeMode: (on: boolean) => void;
}

const SafeModeContext = createContext<SafeModeContextValue>({
  safeMode: false,
  toggleSafeMode: () => {},
  setSafeMode: () => {},
});

export function SafeModeProvider({ children }: { children: ReactNode }) {
  const [safeMode, setSafeModeState] = useState<boolean>(() => {
    try { return localStorage.getItem("claw_safe_mode") === "1"; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem("claw_safe_mode", safeMode ? "1" : "0"); } catch {}
    const root = document.documentElement;
    if (safeMode) {
      root.classList.add("safe-mode");
    } else {
      root.classList.remove("safe-mode");
    }
  }, [safeMode]);

  const toggleSafeMode = () => setSafeModeState(p => !p);
  const setSafeMode = (on: boolean) => setSafeModeState(on);

  return (
    <SafeModeContext.Provider value={{ safeMode, toggleSafeMode, setSafeMode }}>
      {children}
    </SafeModeContext.Provider>
  );
}

export function useSafeMode() {
  return useContext(SafeModeContext);
}
