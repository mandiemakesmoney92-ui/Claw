import { useEffect, useRef, useState } from "react";
import { PhoneOff, Video, Mic, MicOff, Camera, CameraOff } from "lucide-react";
import { useCall } from "@/contexts/CallContext";

function PulsingRings() {
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      {[0, 1, 2].map(i => (
        <div
          key={i}
          className="absolute rounded-full border border-violet-500/40"
          style={{
            inset: `-${(i + 1) * 14}px`,
            animation: `ping 2s cubic-bezier(0,0,0.2,1) ${i * 0.5}s infinite`,
          }}
        />
      ))}
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold"
        style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow: "0 0 40px rgba(139,92,246,0.5)" }}
      >
        {/* Callee initials / avatars */}
      </div>
    </div>
  );
}

export default function OutgoingCallOverlay() {
  const { outgoingCall, callerStatus, cancelCall, localStream, isMuted, isCamOff, toggleMute, toggleCam } = useCall();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [elapsed, setElapsed] = useState(0);

  // Attach local camera preview if video call
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Elapsed-time counter for "Ringing…"
  useEffect(() => {
    if (!outgoingCall) { setElapsed(0); return; }
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [outgoingCall]);

  if (!outgoingCall) return null;

  const callees = outgoingCall.participants.filter(p => p.userId !== outgoingCall.initiatorId);
  const isVideo = outgoingCall.type === "video";

  const statusLabel =
    callerStatus === "declined" ? "Call Declined" :
    callerStatus === "no_answer" ? "No Answer" :
    callerStatus === "failed" ? "Call Failed" :
    elapsed < 3 ? "Calling…" :
    "Ringing…";

  const statusColor =
    callerStatus === "declined" ? "text-red-400" :
    callerStatus === "no_answer" ? "text-amber-400" :
    callerStatus === "failed" ? "text-red-400" :
    "text-white/70";

  const isDismissing = callerStatus === "declined" || callerStatus === "no_answer" || callerStatus === "failed";

  return (
    <div
      className="fixed inset-0 z-[300] flex flex-col items-center justify-between"
      style={{ background: "linear-gradient(160deg,#0a0a14,#120b24,#0d0a1f)" }}
    >
      {/* Subtle animated background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(124,58,237,0.12), transparent)",
          animation: "pulse 3s ease-in-out infinite",
        }}
      />

      {/* Local camera preview (video calls only) */}
      {isVideo && localStream && (
        <div className="absolute top-4 right-4 w-28 h-40 rounded-2xl overflow-hidden border border-violet-500/30 z-10"
          style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
          <video ref={localVideoRef} autoPlay muted playsInline
            className={`w-full h-full object-cover ${isCamOff ? "opacity-0" : "opacity-100"}`}
          />
          {isCamOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
              <CameraOff className="w-8 h-8 text-white/30" />
            </div>
          )}
        </div>
      )}

      {/* Top label */}
      <div className="pt-safe w-full flex items-center justify-center pt-16">
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-semibold tracking-widest uppercase text-violet-400/70">
            {isVideo ? "Video Call" : "Voice Call"}
          </span>
        </div>
      </div>

      {/* Center: Callee avatars + status */}
      <div className="flex flex-col items-center gap-8">
        {/* Callee avatars with pulse rings */}
        <div className="relative flex items-center justify-center">
          {/* Outer pulse rings */}
          {!isDismissing && [0, 1, 2].map(i => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                inset: 0,
                width: `${128 + (i + 1) * 32}px`,
                height: `${128 + (i + 1) * 32}px`,
                top: `${-((i + 1) * 16)}px`,
                left: `${-((i + 1) * 16)}px`,
                border: `1px solid rgba(139,92,246,${0.3 - i * 0.08})`,
                borderRadius: "50%",
                animation: `ping 2.5s cubic-bezier(0,0,0.2,1) ${i * 0.55}s infinite`,
              }}
            />
          ))}

          {/* Callee avatar stack */}
          <div className={`flex ${callees.length > 1 ? "-space-x-6" : ""}`}>
            {callees.map((callee, idx) => (
              <div
                key={callee.userId}
                className="w-32 h-32 rounded-full border-4 border-[#0d0a1f] flex items-center justify-center text-3xl font-bold text-white overflow-hidden"
                style={{
                  background: callee.avatarUrl ? "transparent" : `linear-gradient(135deg,#7c3aed,#a855f7)`,
                  zIndex: callees.length - idx,
                  boxShadow: isDismissing ? "none" : "0 0 40px rgba(139,92,246,0.45)",
                  transition: "box-shadow 0.5s ease",
                }}
              >
                {callee.avatarUrl
                  ? <img src={callee.avatarUrl} alt={callee.displayName} className="w-full h-full object-cover" />
                  : (callee.displayName || "?")[0].toUpperCase()
                }
              </div>
            ))}
          </div>
        </div>

        {/* Callee name(s) */}
        <div className="flex flex-col items-center gap-2 text-center px-8">
          <h1 className="text-white text-2xl font-bold tracking-tight">
            {callees.length === 1
              ? callees[0].displayName
              : callees.map(c => c.displayName).join(", ")
            }
          </h1>

          {/* Status */}
          <div className="flex items-center gap-2">
            {!isDismissing && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
              </span>
            )}
            <p className={`text-base font-medium transition-colors duration-300 ${statusColor}`}>
              {statusLabel}
            </p>
          </div>

          {/* Participant status chips (if multiple callees) */}
          {callees.length > 1 && (
            <div className="flex flex-wrap gap-2 justify-center mt-1">
              {callees.map(callee => (
                <span
                  key={callee.userId}
                  className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{
                    background: callee.state === "declined"
                      ? "rgba(239,68,68,0.15)"
                      : callee.state === "ended"
                        ? "rgba(100,100,100,0.2)"
                        : "rgba(139,92,246,0.15)",
                    color: callee.state === "declined"
                      ? "#f87171"
                      : callee.state === "ended"
                        ? "#999"
                        : "#c4b5fd",
                    border: `1px solid ${callee.state === "declined" ? "rgba(239,68,68,0.25)" : "rgba(139,92,246,0.25)"}`,
                  }}
                >
                  {callee.displayName.split(" ")[0]}
                  {callee.state === "declined" && " · Declined"}
                  {callee.state === "ringing" && " · Ringing…"}
                  {callee.state === "connected" && " · Joined"}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom controls */}
      <div className="pb-safe pb-16 flex flex-col items-center gap-8 w-full">
        {/* Secondary controls (mute, cam) — only if the call is still ringing */}
        {!isDismissing && (
          <div className="flex items-center gap-6">
            <button
              onClick={toggleMute}
              className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95"
              style={{
                background: isMuted ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.08)",
                border: `1px solid ${isMuted ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.12)"}`,
              }}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted
                ? <MicOff className="w-5 h-5 text-red-400" />
                : <Mic className="w-5 h-5 text-white/70" />
              }
            </button>

            {isVideo && (
              <button
                onClick={toggleCam}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95"
                style={{
                  background: isCamOff ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.08)",
                  border: `1px solid ${isCamOff ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.12)"}`,
                }}
                title={isCamOff ? "Turn camera on" : "Turn camera off"}
              >
                {isCamOff
                  ? <CameraOff className="w-5 h-5 text-red-400" />
                  : <Camera className="w-5 h-5 text-white/70" />
                }
              </button>
            )}
          </div>
        )}

        {/* Cancel / End call button */}
        <button
          onClick={cancelCall}
          className="w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{
            background: isDismissing
              ? "rgba(100,100,100,0.3)"
              : "linear-gradient(135deg,#dc2626,#ef4444)",
            boxShadow: isDismissing ? "none" : "0 8px 32px rgba(220,38,38,0.45)",
          }}
          title="Cancel"
          aria-label="Cancel call"
        >
          <PhoneOff className="w-8 h-8 text-white" />
        </button>

        {isDismissing && (
          <p className="text-white/40 text-sm">Tap to dismiss</p>
        )}
      </div>
    </div>
  );
}
