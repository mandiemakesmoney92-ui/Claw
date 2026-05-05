import { useState, useRef, useEffect } from "react";
import { AlertTriangle } from "lucide-react";

interface ClawModeGuardProps {
  isSelected: boolean;
  onSelect: () => void;
  onRevertToSoft: () => void;
}

export default function ClawModeGuard({ isSelected, onSelect, onRevertToSoft }: ClawModeGuardProps) {
  const [showWarning, setShowWarning] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverActiveRef = useRef(false);

  const handleMouseEnter = () => {
    if (isSelected) return; // already selected — no need to warn
    hoverActiveRef.current = true;
    hoverTimerRef.current = setTimeout(() => {
      if (hoverActiveRef.current) setShowWarning(true);
    }, 10000);
  };

  const handleMouseLeave = () => {
    hoverActiveRef.current = false;
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (!isSelected) setShowWarning(false);
  };

  const handleClick = () => {
    setShowWarning(false);
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    onSelect();
  };

  const handleNotYet = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowWarning(false);
    onRevertToSoft();
  };

  // Dismiss if user selected something else
  useEffect(() => {
    if (!isSelected) setShowWarning(false);
  }, [isSelected]);

  // Fire Ringy remark when warning shows
  useEffect(() => {
    if (showWarning) {
      window.dispatchEvent(new CustomEvent("ringy:remark", {
        detail: {
          text: "careful. it's sharp in there.",
          category: "claw_mode_warning",
        }
      }));
    }
  }, [showWarning]);

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        onClick={handleClick}
        className={`w-full py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
          isSelected
            ? "border-red-500/60 bg-red-500/20 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.2)]"
            : "border-border bg-muted text-muted-foreground hover:border-red-500/40 hover:text-red-300"
        }`}
      >
        Claw
      </button>

      {showWarning && (
        <div
          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 w-64 rounded-2xl border border-red-500/30 shadow-2xl shadow-black/60 p-4"
          style={{ background: "rgba(12,6,18,0.96)", backdropFilter: "blur(16px)" }}
        >
          {/* Ringy cat icon */}
          <div className="flex items-start gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-red-900/40 border border-red-500/30 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              <span className="text-red-400 font-semibold">Careful, it's sharp in there.</span>
              <br />
              Claw Mode is for unfiltered honesty — are you sure your skin is thick enough today?
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleClick}
              className="flex-1 py-1.5 rounded-xl bg-red-600/70 hover:bg-red-500/70 text-white text-xs font-bold transition-colors"
            >
              Yes, I'm ready
            </button>
            <button
              onClick={handleNotYet}
              className="flex-1 py-1.5 rounded-xl bg-zinc-700/60 hover:bg-zinc-600/60 text-zinc-300 text-xs font-semibold transition-colors"
            >
              Not yet
            </button>
          </div>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
            style={{ borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "6px solid rgba(239,68,68,0.3)" }} />
        </div>
      )}
    </div>
  );
}
