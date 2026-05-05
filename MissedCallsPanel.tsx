import { Phone, Video, X, PhoneMissed } from "lucide-react";
import { useCall } from "@/contexts/CallContext";
import { formatDistanceToNow } from "date-fns";

export function MissedCallsBadge() {
  const { unseenMissedCount } = useCall();
  if (unseenMissedCount === 0) return null;
  return (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
      {unseenMissedCount > 9 ? "9+" : unseenMissedCount}
    </span>
  );
}

export default function MissedCallsPanel({ onClose }: { onClose: () => void }) {
  const { missedCalls, markMissedCallsSeen, initiateCall } = useCall();

  const handleOpen = () => {
    markMissedCallsSeen();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
      onPointerDown={e => { if (e.target === e.currentTarget) { markMissedCallsSeen(); onClose(); } }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { markMissedCallsSeen(); onClose(); }} />

      <div className="relative w-full max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden"
        style={{ background: "linear-gradient(160deg, #0f0f1a, #1a0f2e)", border: "1px solid rgba(139,92,246,0.25)" }}>

        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <PhoneMissed className="w-5 h-5 text-red-400" />
            <h2 className="text-white font-bold text-base">Missed Calls</h2>
          </div>
          <button onClick={() => { markMissedCallsSeen(); onClose(); }} className="text-white/30 hover:text-white/70 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto px-2 pb-5">
          {missedCalls.length === 0 ? (
            <p className="text-white/40 text-sm text-center py-8">No missed calls</p>
          ) : (
            <div className="space-y-1">
              {missedCalls.map(mc => (
                <div
                  key={mc.id}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${!mc.seenAt ? "bg-red-500/10 border border-red-500/20" : "hover:bg-white/5"}`}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white" }}>
                    {mc.callerAvatar
                      ? <img src={mc.callerAvatar} className="w-full h-full rounded-full object-cover" alt="" />
                      : (mc.callerName || "?")[0].toUpperCase()
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{mc.callerName || "Unknown"}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <PhoneMissed className="w-3 h-3 text-red-400 shrink-0" />
                      <span className="text-red-400/80 text-xs">
                        Missed {mc.callType} call · {formatDistanceToNow(new Date(mc.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => initiateCall([mc.callerId], mc.callType as "audio" | "video")}
                    className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                    style={{ background: "linear-gradient(135deg,#16a34a,#22c55e)", boxShadow: "0 4px 12px rgba(34,197,94,0.4)" }}
                    title="Call back"
                  >
                    {mc.callType === "video" ? <Video className="w-4 h-4 text-white" /> : <Phone className="w-4 h-4 text-white" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
