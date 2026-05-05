import { useCallback, useEffect, useRef, useState } from "react";
import { useCall } from "@/contexts/CallContext";
import { useAuth } from "@workspace/replit-auth-web";
import { Mic, MicOff, Video, VideoOff, PhoneOff, UserPlus, ChevronDown, ChevronUp } from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

interface SearchUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

function VideoTile({ stream, name, muted = false }: { stream: MediaStream | null; name: string; muted?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) {
    return (
      <div className="w-full h-full bg-black/60 rounded-xl flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-violet-900/40 border border-violet-500/30 flex items-center justify-center text-xl font-serif font-bold text-violet-300">
          {name[0]}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-black">
      <video ref={videoRef} autoPlay playsInline muted={muted} className="w-full h-full object-cover" />
      <div className="absolute bottom-1.5 left-2 text-[10px] text-white/60 font-mono truncate max-w-[80px]">{name}</div>
    </div>
  );
}

export default function ActiveCallOverlay() {
  const { user } = useAuth();
  const { activeCall, localStream, remoteStreams, isMuted, isCamOff, toggleMute, toggleCam, endCall, inviteToCall } = useCall();
  const [minimized, setMinimized] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    if (!activeCall) return;
    startTime.current = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTime.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, [activeCall?.callId]);

  useEffect(() => {
    if (!searchQ.trim() || searchQ.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      fetch(`${BASE}/api/users/search?q=${encodeURIComponent(searchQ)}&limit=5`, { credentials: "include" })
        .then(r => r.json()).then(d => setSearchResults(d.users || d || [])).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [searchQ]);

  const handleInvite = (uid: string) => {
    inviteToCall(uid);
    setInviting(false);
    setSearchQ("");
  };

  if (!activeCall) return null;

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const isVideo = activeCall.type === "video";
  const connectedPeers = activeCall.participants.filter(p => p.userId !== user?.id && p.state === "connected");
  const canInvite = activeCall.participants.length < 3;

  if (minimized) {
    return (
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl cursor-pointer select-none"
        style={{ background: "linear-gradient(135deg, #1a0f2e, #0f0f1a)", border: "1px solid rgba(139,92,246,0.4)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
        onClick={() => setMinimized(false)}
      >
        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
        <span className="text-white/80 text-sm font-mono">{formatTime(elapsed)}</span>
        <span className="text-white/50 text-xs">
          {connectedPeers.map(p => p.displayName).join(", ") || "Calling…"}
        </span>
        <ChevronUp className="w-3.5 h-3.5 text-white/40" />
        <button onClick={e => { e.stopPropagation(); endCall(); }} className="ml-1 w-7 h-7 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700">
          <PhoneOff className="w-3 h-3 text-white" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "rgba(0,0,0,0.95)" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-6 pb-3">
        <div>
          <p className="text-white/40 text-xs font-mono">{isVideo ? "Video" : "Voice"} call · {formatTime(elapsed)}</p>
          <p className="text-white text-sm font-semibold mt-0.5">
            {connectedPeers.map(p => p.displayName).join(" & ") || "Connecting…"}
          </p>
        </div>
        <button onClick={() => setMinimized(true)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10">
          <ChevronDown className="w-4 h-4 text-white/50" />
        </button>
      </div>

      {/* Video grid */}
      <div className="flex-1 px-4 pb-2">
        {isVideo ? (
          <div className={`h-full grid gap-2 ${connectedPeers.length > 0 ? "grid-cols-2" : "grid-cols-1"}`}>
            {/* Local */}
            <div className={connectedPeers.length === 0 ? "col-span-1" : ""}>
              <VideoTile stream={isCamOff ? null : localStream} name="You" muted />
            </div>
            {/* Remote peers */}
            {connectedPeers.map(p => (
              <div key={p.userId}>
                <VideoTile stream={remoteStreams.get(p.userId) || null} name={p.displayName} />
              </div>
            ))}
            {/* Ringing participants */}
            {activeCall.participants.filter(p => p.userId !== user?.id && p.state === "ringing").map(p => (
              <div key={p.userId} className="rounded-xl bg-black/60 border border-white/5 flex flex-col items-center justify-center gap-2 p-4">
                <div className="w-12 h-12 rounded-full bg-violet-900/40 border-2 border-violet-500/40 flex items-center justify-center text-xl font-bold text-violet-300 animate-pulse">
                  {p.displayName[0]}
                </div>
                <p className="text-xs text-white/30 font-mono">Ringing…</p>
              </div>
            ))}
          </div>
        ) : (
          /* Audio-only layout */
          <div className="h-full flex items-center justify-center">
            <div className={`flex flex-wrap gap-8 items-center justify-center max-w-xs ${connectedPeers.length > 1 ? "gap-6" : ""}`}>
              {[{ userId: user?.id || "", displayName: "You", avatarUrl: undefined, state: "connected" as const }, ...connectedPeers].map(p => (
                <div key={p.userId} className="flex flex-col items-center gap-3">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-violet-500/40 bg-gradient-to-br from-violet-900/50 to-purple-900/50 flex items-center justify-center text-3xl font-serif font-bold text-violet-300">
                    {p.avatarUrl ? <img src={p.avatarUrl} className="w-full h-full object-cover" alt="" /> : p.displayName[0]}
                  </div>
                  <p className="text-xs text-white/50">{p.displayName}</p>
                </div>
              ))}
              {activeCall.participants.filter(p => p.userId !== user?.id && p.state === "ringing").map(p => (
                <div key={p.userId} className="flex flex-col items-center gap-3 opacity-50">
                  <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-3xl font-bold text-white/30 animate-pulse">
                    {p.displayName[0]}
                  </div>
                  <p className="text-xs text-white/30">Ringing…</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Invite panel */}
      {inviting && (
        <div className="mx-4 mb-2 p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08]">
          <p className="text-xs text-white/40 mb-2 font-bold uppercase tracking-widest">Add to call</p>
          <input
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Search people…"
            autoFocus
            className="w-full bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 mb-2"
          />
          {searchResults.filter(u => !activeCall.participants.find(p => p.userId === u.id)).map(u => (
            <button key={u.id} onClick={() => handleInvite(u.id)}
              className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
              <div className="w-8 h-8 rounded-full bg-violet-900/40 overflow-hidden flex items-center justify-center text-sm font-bold text-violet-300">
                {u.avatarUrl ? <img src={u.avatarUrl} className="w-full h-full object-cover" alt="" /> : u.displayName[0]}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm text-white/80 font-medium">{u.displayName}</p>
                <p className="text-xs text-white/30">@{u.username}</p>
              </div>
              <UserPlus className="w-4 h-4 text-violet-400" />
            </button>
          ))}
          {searchQ.length > 1 && searchResults.length === 0 && (
            <p className="text-xs text-white/30 text-center py-2">No results</p>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="px-6 pb-10 pt-2">
        <div className="flex items-center justify-center gap-5">
          <div className="flex flex-col items-center gap-1.5">
            <button onClick={toggleMute}
              className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all ${isMuted ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-white/5 border-white/10 text-white/70 hover:text-white"}`}>
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <span className="text-[10px] text-white/30">{isMuted ? "Unmute" : "Mute"}</span>
          </div>

          {isVideo && (
            <div className="flex flex-col items-center gap-1.5">
              <button onClick={toggleCam}
                className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all ${isCamOff ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-white/5 border-white/10 text-white/70 hover:text-white"}`}>
                {isCamOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>
              <span className="text-[10px] text-white/30">{isCamOff ? "Cam on" : "Cam off"}</span>
            </div>
          )}

          {canInvite && (
            <div className="flex flex-col items-center gap-1.5">
              <button onClick={() => setInviting(i => !i)}
                className={`w-14 h-14 rounded-full flex items-center justify-center border transition-all ${inviting ? "bg-violet-500/20 border-violet-500/40 text-violet-400" : "bg-white/5 border-white/10 text-white/70 hover:text-white"}`}>
                <UserPlus className="w-5 h-5" />
              </button>
              <span className="text-[10px] text-white/30">Add</span>
            </div>
          )}

          <div className="flex flex-col items-center gap-1.5">
            <button onClick={endCall}
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-lg shadow-red-900/50 transition-all">
              <PhoneOff className="w-5 h-5 text-white" />
            </button>
            <span className="text-[10px] text-white/30">End</span>
          </div>
        </div>
      </div>
    </div>
  );
}
