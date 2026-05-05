import { useQuery } from "@tanstack/react-query";
import { Zap, Heart, Coffee, Shield, BadgeCheck, Flame } from "lucide-react";

interface VitalsBarProps {
  userId: string;
  compact?: boolean;
}

function VitalBar({
  label, value, color, icon: Icon
}: {
  label: string;
  value: number;
  color: string;
  icon: any;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const getStatus = (v: number) => v > 60 ? "good" : v > 30 ? "warn" : "critical";
  const status = getStatus(pct);
  const barColor = status === "good" ? color : status === "warn" ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Icon className={`w-3 h-3 ${status === "critical" ? "text-red-400" : status === "warn" ? "text-yellow-400" : "text-zinc-400"}`} />
          <span className="text-xs text-zinc-500">{label}</span>
        </div>
        <span className={`text-xs font-mono ${status === "critical" ? "text-red-400" : status === "warn" ? "text-yellow-400" : "text-zinc-400"}`}>
          {pct}%
        </span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function VitalsBar({ userId, compact = false }: VitalsBarProps) {
  const { data } = useQuery({
    queryKey: ["profile-vitals", userId],
    queryFn: async () => {
      const res = await fetch(`/api/vitals/${userId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60_000,
  });

  if (!data) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-xs">
        {data.humanVerified && (
          <span className="flex items-center gap-1 text-blue-400">
            <BadgeCheck className="w-3.5 h-3.5" /> Verified Human
          </span>
        )}
        {data.isInPurgatory && (
          <span className="flex items-center gap-1 text-orange-400">
            <Flame className="w-3.5 h-3.5" /> In Purgatory
          </span>
        )}
        <span className="flex items-center gap-1 text-zinc-500">
          <Shield className="w-3 h-3" />
          <span className="text-zinc-400">{data.credibilityScore}</span>
        </span>
        <span className="text-purple-400">{data.soulzBalance} SOULZ</span>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
      {/* Badges row */}
      <div className="flex items-center gap-2 flex-wrap">
        {data.humanVerified && (
          <span className="flex items-center gap-1 text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-1 rounded-full">
            <BadgeCheck className="w-3.5 h-3.5" /> Humanity Verified
          </span>
        )}
        {data.isInPurgatory && (
          <span className="flex items-center gap-1 text-xs bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2.5 py-1 rounded-full">
            <Flame className="w-3.5 h-3.5" /> In Purgatory
          </span>
        )}
      </div>

      {/* Vitals */}
      <div className="space-y-2">
        <VitalBar label="Hunger" value={data.hunger} color="bg-green-500" icon={Coffee} />
        <VitalBar label="Health" value={data.health} color="bg-pink-500" icon={Heart} />
        <VitalBar label="Energy" value={data.energy} color="bg-blue-500" icon={Zap} />
      </div>

      {/* Credibility & SOULZ */}
      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-zinc-800">
        <div className="text-center">
          <p className="text-xs text-zinc-500 mb-0.5">Credibility</p>
          <div className="flex items-center justify-center gap-1">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-sm font-bold text-emerald-400">{data.credibilityScore}</span>
            <span className="text-xs text-zinc-600">/100</span>
          </div>
          {data.truthDebt > 0 && (
            <p className="text-xs text-red-400 mt-0.5">Truth Debt: {data.truthDebt}</p>
          )}
        </div>
        <div className="text-center">
          <p className="text-xs text-zinc-500 mb-0.5">SOULZ</p>
          <div className="flex items-center justify-center gap-1">
            <span className="text-sm font-bold text-purple-400">✦ {data.soulzBalance}</span>
          </div>
          <p className="text-xs text-zinc-600 mt-0.5">social capital</p>
        </div>
      </div>
    </div>
  );
}
