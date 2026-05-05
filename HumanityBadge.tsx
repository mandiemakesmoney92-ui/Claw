import { useState } from "react";

interface HumanityBadgeProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = {
  sm: { badge: "w-4 h-4", text: "text-[8px]", tooltip: "text-xs" },
  md: { badge: "w-5 h-5", text: "text-[9px]", tooltip: "text-xs" },
  lg: { badge: "w-7 h-7", text: "text-[11px]", tooltip: "text-sm" },
};

export default function HumanityBadge({ size = "sm", className = "" }: HumanityBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const s = SIZE_MAP[size];

  return (
    <span
      className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={() => setShowTooltip(true)}
      onBlur={() => setShowTooltip(false)}
      tabIndex={0}
      role="img"
      aria-label="Humanity Verified"
    >
      {/* Outer pulse ring */}
      <span
        className={`absolute inset-0 rounded-full bg-emerald-500/20 humanity-pulse ${s.badge}`}
        aria-hidden="true"
      />
      {/* Badge body */}
      <span
        className={`relative flex items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/60 shadow-[0_0_6px_rgba(52,211,153,0.4)] ${s.badge}`}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className={`${s.badge} text-emerald-400`}
          style={{ width: "100%", height: "100%" }}
        >
          <path
            d="M8 1.5C8 1.5 5 3 2.5 3C2.5 3 2 9 5 12C6.2 13.3 7.1 13.8 8 14C8.9 13.8 9.8 13.3 11 12C14 9 13.5 3 13.5 3C11 3 8 1.5 8 1.5Z"
            fill="currentColor"
            fillOpacity="0.25"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path
            d="M5.5 8L7.2 9.7L10.5 6.5"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      {/* Tooltip */}
      {showTooltip && (
        <span
          className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-zinc-900 border border-emerald-500/30 rounded-xl px-3 py-2.5 text-zinc-200 shadow-xl z-50 pointer-events-none ${s.tooltip}`}
          role="tooltip"
        >
          <span className="block font-semibold text-emerald-400 mb-0.5">✦ Humanity Verified</span>
          <span className="text-zinc-400 leading-snug">
            This user has passed biometric and behavioural verification. Confirmed human — not a bot.
          </span>
          <span className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-zinc-900 border-r border-b border-emerald-500/30 rotate-45 block" />
        </span>
      )}
    </span>
  );
}
