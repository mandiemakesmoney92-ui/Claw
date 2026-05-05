import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import Layout from "@/components/Layout";
import { useSEO } from "@/hooks/useSEO";
import { Mic, MicOff, PhoneOff, Users, Volume2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const MAX_ROOM_SIZE = 20;

const MASKS = [
  { id: "🎭", name: "The Classic" },
  { id: "👑", name: "Shadow Crown" },
  { id: "🐱", name: "The Claw" },
  { id: "👻", name: "The Phantom" },
  { id: "🌙", name: "Moon Face" },
  { id: "🔥", name: "Inferno" },
  { id: "💎", name: "Diamond" },
  { id: "🐺", name: "The Wolf" },
  { id: "🦋", name: "Silk Wings" },
  { id: "🕷️", name: "The Spider" },
  { id: "🎪", name: "The Jester" },
  { id: "🌊", name: "The Deep" },
];

const ALIASES = [
  "VoidWalker", "SilentOne", "NightShade", "EchoSoul", "GhostKat",
  "DarkMatter", "MoonChild", "ShadowSelf", "LostInk", "TruthSeeker",
  "HiddenGem", "AbyssalOne", "TheMystic", "NeonGhost", "CrimsonVeil",
];

interface AudioRoom {
  id: string;
  title: string;
  participantCount: number;
  createdAt: string;
}

interface Participant {
  id: string;
  mask: string;
  alias: string;
  isSpeaking?: boolean;
  isMuted?: boolean;
}

function BlackRoom({ room, myMask, myAlias, onLeave }: {
  room: AudioRoom;
  myMask: string;
  myAlias: string;
  onLeave: () => void;
}) {
  const { user } = useAuth();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const eventSourceRef = useRef<EventSource | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRefs = useRef<Map<string, AnalyserNode>>(new Map());
  const speakingTimersRef = useRef<Map<string, number>>(new Map());
  const [speakingIds, setSpeakingIds] = useState<Set<string>>(new Set());

  const sendSignal = useCallback(async (payload: any) => {
    await fetch(`${BASE}/api/masquerade/audio/signal`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: room.id, ...payload }),
    });
  }, [room.id]);

  const makePeer = useCallback((peerId: string) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    peerConnections.current.set(peerId, pc);

    localStreamRef.current?.getAudioTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current!);
    });

    pc.onicecandidate = e => {
      if (e.candidate) sendSignal({ type: "ice", toId: peerId, data: e.candidate });
    };

    pc.ontrack = e => {
      const audio = document.createElement("audio");
      audio.srcObject = e.streams[0];
      audio.autoplay = true;
      document.body.appendChild(audio);

      const ctx = audioCtxRef.current || new AudioContext();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(e.streams[0]);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRefs.current.set(peerId, analyser);
    };

    return pc;
  }, [sendSignal]);

  useEffect(() => {
    let active = true;

    const setup = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStreamRef.current = stream;

        const es = new EventSource(`${BASE}/api/masquerade/audio/join?roomId=${room.id}&mask=${encodeURIComponent(myMask)}&alias=${encodeURIComponent(myAlias)}`, { withCredentials: true });
        eventSourceRef.current = es;

        es.onopen = () => { if (active) setConnected(true); };
        es.onerror = () => { if (active) setError("Connection lost"); };

        es.addEventListener("participants", (e: any) => {
          if (!active) return;
          const parts: Participant[] = JSON.parse(e.data);
          setParticipants(parts);
        });

        es.addEventListener("joined", async (e: any) => {
          if (!active) return;
          const { id: peerId } = JSON.parse(e.data);
          if (peerId === user?.id) return;
          const pc = makePeer(peerId);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendSignal({ type: "offer", toId: peerId, data: offer });
        });

        es.addEventListener("signal", async (e: any) => {
          if (!active) return;
          const { fromId, type, data } = JSON.parse(e.data);
          let pc = peerConnections.current.get(fromId);
          if (type === "offer") {
            if (!pc) pc = makePeer(fromId);
            await pc.setRemoteDescription(new RTCSessionDescription(data));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            sendSignal({ type: "answer", toId: fromId, data: answer });
          } else if (type === "answer" && pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(data));
          } else if (type === "ice" && pc) {
            await pc.addIceCandidate(new RTCIceCandidate(data));
          }
        });

        es.addEventListener("left", (e: any) => {
          if (!active) return;
          const { id: peerId } = JSON.parse(e.data);
          const pc = peerConnections.current.get(peerId);
          pc?.close();
          peerConnections.current.delete(peerId);
          analyserRefs.current.delete(peerId);
        });

        const detectSpeaking = () => {
          const speaking = new Set<string>();
          analyserRefs.current.forEach((analyser, id) => {
            const data = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(data);
            const avg = data.reduce((a, b) => a + b, 0) / data.length;
            if (avg > 15) speaking.add(id);
          });
          setSpeakingIds(speaking);
          if (active) requestAnimationFrame(detectSpeaking);
        };
        requestAnimationFrame(detectSpeaking);

      } catch (err: any) {
        if (active) setError(err.message || "Could not access microphone");
      }
    };

    setup();

    return () => {
      active = false;
      eventSourceRef.current?.close();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      peerConnections.current.forEach(pc => pc.close());
      peerConnections.current.clear();
      audioCtxRef.current?.close();
    };
  }, [room.id, myMask, myAlias, makePeer, sendSignal, user?.id]);

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = isMuted; });
    setIsMuted(!isMuted);
  };

  const handleLeave = async () => {
    await fetch(`${BASE}/api/masquerade/audio/leave`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: room.id }),
    });
    onLeave();
  };

  const allParts = [{ id: user?.id || "me", mask: myMask, alias: myAlias + " (you)", isMuted }, ...participants.filter(p => p.id !== user?.id)];

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-between p-6 z-50">
      <div className="text-center">
        <h2 className="text-white/30 text-xs tracking-widest uppercase font-mono">{room.title}</h2>
        <p className="text-white/15 text-[10px] mt-0.5">{allParts.length} / {MAX_ROOM_SIZE} in the void</p>
        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
        {!connected && !error && <p className="text-white/30 text-xs animate-pulse mt-2">Connecting to the void…</p>}
      </div>

      <div className="flex-1 flex items-center justify-center w-full max-w-md">
        <div className="relative w-72 h-72">
          {allParts.slice(0, MAX_ROOM_SIZE).map((p, i) => {
            const angle = (i / Math.max(allParts.length, 1)) * 2 * Math.PI - Math.PI / 2;
            const radius = allParts.length === 1 ? 0 : 110;
            const x = 50 + (radius / 1.5) * Math.cos(angle);
            const y = 50 + (radius / 1.5) * Math.sin(angle);
            const speaking = speakingIds.has(p.id);

            return (
              <div
                key={p.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all duration-150 ${
                    speaking
                      ? "ring-2 ring-white/60 ring-offset-2 ring-offset-black scale-110"
                      : "ring-1 ring-white/10"
                  }`}
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  {p.mask}
                  {p.isMuted && <span className="absolute -bottom-0.5 -right-0.5 text-[10px]">🔇</span>}
                </div>
                <span className="text-[9px] text-white/30 font-mono truncate max-w-[64px] text-center">{p.alias}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleMute}
          className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all ${
            isMuted ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-white/5 border-white/10 text-white/60 hover:text-white"
          }`}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
        <button
          onClick={handleLeave}
          className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white transition-all"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default function MasqueradePage() {
  const { user } = useAuth();
  useSEO({ title: "Black Room — CLAW Masquerade", description: "Anonymous 20-person audio rooms on CLAW" });

  const [rooms, setRooms] = useState<AudioRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMask, setSelectedMask] = useState(MASKS[0].id);
  const [alias] = useState(() => ALIASES[Math.floor(Math.random() * ALIASES.length)]);
  const [roomTitle, setRoomTitle] = useState("The Void");
  const [joining, setJoining] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [activeRoom, setActiveRoom] = useState<AudioRoom | null>(null);

  const fetchRooms = useCallback(async () => {
    const r = await fetch(`${BASE}/api/masquerade/audio/rooms`, { credentials: "include" });
    if (r.ok) setRooms(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchRooms();
    const t = setInterval(fetchRooms, 8000);
    return () => clearInterval(t);
  }, [user, fetchRooms]);

  const handleCreate = async () => {
    setCreating(true);
    const r = await fetch(`${BASE}/api/masquerade/audio/rooms`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: roomTitle }),
    });
    if (r.ok) {
      const room = await r.json();
      setActiveRoom(room);
    }
    setCreating(false);
  };

  const handleJoin = async (room: AudioRoom) => {
    setJoining(room.id);
    setActiveRoom(room);
    setJoining(null);
  };

  if (activeRoom) {
    return <BlackRoom room={activeRoom} myMask={selectedMask} myAlias={alias} onLeave={() => { setActiveRoom(null); fetchRooms(); }} />;
  }

  return (
    <Layout>
      <div className="max-w-xl mx-auto px-4 py-8">

        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎭</div>
          <h1 className="text-2xl font-serif font-bold text-white mb-2">The Black Room</h1>
          <p className="text-white/40 text-sm max-w-sm mx-auto leading-relaxed">
            You can't see anyone. Everyone's mic is on. 20 strangers in the dark — only your voice survives.
          </p>
        </div>

        {/* Pick your mask */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 mb-5">
          <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Pick your mask · You'll be "{alias}"</p>
          <div className="grid grid-cols-6 gap-2">
            {MASKS.map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedMask(m.id)}
                title={m.name}
                className={`aspect-square rounded-xl flex items-center justify-center text-xl transition-all ${
                  selectedMask === m.id
                    ? "bg-violet-500/20 ring-1 ring-violet-500/60"
                    : "bg-white/5 hover:bg-white/10"
                }`}
              >
                {m.id}
              </button>
            ))}
          </div>
        </div>

        {/* Live rooms */}
        {rooms.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
              <span className="text-xs text-white/40 uppercase tracking-widest font-bold">Rooms in the Void</span>
            </div>
            {rooms.map(room => (
              <div key={room.id} className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] mb-2 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/80">{room.title}</p>
                  <div className="flex items-center gap-1.5 text-xs text-white/30 mt-0.5">
                    <Users className="w-3 h-3" />
                    {room.participantCount} / {MAX_ROOM_SIZE}
                  </div>
                </div>
                <button
                  onClick={() => handleJoin(room)}
                  disabled={room.participantCount >= MAX_ROOM_SIZE || joining === room.id}
                  className="px-4 py-2 rounded-xl bg-violet-600/80 hover:bg-violet-600 text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {room.participantCount >= MAX_ROOM_SIZE ? "Full" : joining === room.id ? "Entering…" : "Enter"}
                </button>
              </div>
            ))}
          </div>
        )}

        {!loading && rooms.length === 0 && (
          <div className="text-center py-8 mb-5">
            <p className="text-white/25 text-sm">No rooms right now</p>
            <p className="text-white/15 text-xs mt-1">Create one and wait in the dark</p>
          </div>
        )}

        {/* Create room */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
          <p className="text-xs text-white/40 uppercase tracking-widest mb-3">Create a room</p>
          <input
            value={roomTitle}
            onChange={e => setRoomTitle(e.target.value)}
            placeholder="Name your void…"
            maxLength={50}
            className="w-full bg-black/30 border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 mb-3"
          />
          <button
            onClick={handleCreate}
            disabled={creating || !roomTitle.trim()}
            className="w-full py-3 rounded-xl font-semibold text-sm text-white/90 transition-all disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.5), rgba(109,40,217,0.3))", border: "1px solid rgba(139,92,246,0.25)" }}
          >
            {creating ? "Opening the void…" : `${selectedMask} Enter as "${alias}"`}
          </button>
          <p className="text-[10px] text-white/20 text-center mt-3">
            You're anonymous. No names. No faces. 20-person limit. Mic is live.
          </p>
        </div>
      </div>
    </Layout>
  );
}
