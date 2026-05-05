import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import Layout from "@/components/Layout";
import { useSEO } from "@/hooks/useSEO";
import {
  Video, VideoOff, Mic, MicOff, Radio, Users, Send,
  X, Play, Loader2, Eye, PhoneOff, Camera, CameraOff
} from "lucide-react";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

const STUN_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

interface Room {
  id: string;
  hostId: string;
  hostName: string;
  hostAvatar?: string;
  title: string;
  viewerCount: number;
  startedAt: number;
  cameraCount: number;
}

interface ChatMsg {
  id: string;
  userId: string;
  displayName: string;
  text: string;
  ts: number;
}

interface CameraParticipant {
  userId: string;
  displayName: string;
  avatarUrl?: string;
}

export default function LivePage() {
  const { user } = useAuth();
  useSEO({ title: "Live — CLAW", description: "Go live or join live video rooms on CLAW" });

  const [mode, setMode] = useState<"lobby" | "hosting" | "viewing">("lobby");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [liveTitle, setLiveTitle] = useState("");
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [viewerCount, setViewerCount] = useState(0);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Viewer camera state
  const [viewerCamOn, setViewerCamOn] = useState(false);
  const [viewerMicOn, setViewerMicOn] = useState(true);
  const [viewerCamError, setViewerCamError] = useState<string | null>(null);
  const [cameraParticipants, setCameraParticipants] = useState<CameraParticipant[]>([]);

  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null); // host stream for viewers
  const localStreamRef = useRef<MediaStream | null>(null);
  const viewerLocalStreamRef = useRef<MediaStream | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const peerRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const participantVideoRefs = useRef<Map<string, HTMLVideoElement | null>>(new Map());
  const [participantStreams, setParticipantStreams] = useState<Map<string, MediaStream>>(new Map());
  const roomIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | undefined>(undefined);

  useEffect(() => { userIdRef.current = user?.id; }, [user?.id]);

  const fetchRooms = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/live/rooms`, { credentials: "include" });
      if (r.ok) setRooms(await r.json());
    } catch {}
    setLoadingRooms(false);
  }, []);

  useEffect(() => { fetchRooms(); const t = setInterval(fetchRooms, 8000); return () => clearInterval(t); }, [fetchRooms]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  useEffect(() => {
    if (mode === "hosting" && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
      localVideoRef.current.play().catch(() => {});
    }
  }, [mode]);

  useEffect(() => {
    if (previewVideoRef.current && previewStream) {
      previewVideoRef.current.srcObject = previewStream;
      previewVideoRef.current.play().catch(() => {});
    }
  }, [previewStream]);

  useEffect(() => {
    participantVideoRefs.current.forEach((el, uid) => {
      if (el && participantStreams.has(uid)) {
        el.srcObject = participantStreams.get(uid)!;
        el.play().catch(() => {});
      }
    });
  }, [participantStreams]);

  useEffect(() => {
    return () => {
      previewStream?.getTracks().forEach(t => t.stop());
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      viewerLocalStreamRef.current?.getTracks().forEach(t => t.stop());
      sseRef.current?.close();
      peerRef.current.forEach(pc => pc.close());
    };
  }, []);

  const sendSignal = useCallback(async (roomId: string, payload: any) => {
    await fetch(`${API}/api/live/rooms/${roomId}/signal`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }, []);

  const makePC = useCallback((roomId: string, toUserId: string, localStream?: MediaStream) => {
    const existing = peerRef.current.get(toUserId);
    if (existing) existing.close();

    const pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
    const stream = localStream || localStreamRef.current || viewerLocalStreamRef.current;
    if (stream) stream.getTracks().forEach(t => pc.addTrack(t, stream));

    pc.onicecandidate = e => {
      if (e.candidate) sendSignal(roomId, { type: "ice", data: e.candidate, toUser: toUserId });
    };

    pc.ontrack = e => {
      if (e.streams[0]) {
        setParticipantStreams(prev => new Map(prev).set(toUserId, e.streams[0]));
      }
    };

    peerRef.current.set(toUserId, pc);
    return pc;
  }, [sendSignal]);

  const startPreview = async () => {
    setPreviewError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setPreviewStream(stream);
    } catch (err: any) {
      setPreviewError(err.name === "NotAllowedError" ? "Camera permission denied." : err.message || "Could not access camera");
    }
  };

  const stopPreview = () => { previewStream?.getTracks().forEach(t => t.stop()); setPreviewStream(null); };

  const startStream = async () => {
    if (!liveTitle.trim()) return;
    setIsConnecting(true);
    setStreamError(null);
    try {
      let stream = previewStream;
      if (!stream) stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setPreviewStream(null);

      const r = await fetch(`${API}/api/live/rooms`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: liveTitle }),
      });
      const { roomId } = await r.json();
      setCurrentRoomId(roomId);
      roomIdRef.current = roomId;
      setMode("hosting");

      // Register host camera
      await fetch(`${API}/api/live/rooms/${roomId}/camera-on`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      const sse = new EventSource(`${API}/api/live/rooms/${roomId}/host`, { withCredentials: true });
      sseRef.current = sse;

      sse.addEventListener("viewer_joined", async (e) => {
        const { viewerId } = JSON.parse(e.data);
        const pc = makePC(roomId, viewerId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal(roomId, { type: "offer", data: offer, toUser: viewerId });
      });

      sse.addEventListener("participant_camera_on", async (e) => {
        const { userId } = JSON.parse(e.data);
        if (userId === userIdRef.current) return;
        setCameraParticipants(prev => {
          const data = JSON.parse(e.data);
          if (prev.find(p => p.userId === userId)) return prev;
          return [...prev, { userId, displayName: data.displayName, avatarUrl: data.avatarUrl }];
        });
        // Host offers to receive viewer camera
        const pc = makePC(roomId, userId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal(roomId, { type: "offer", data: offer, toUser: userId });
      });

      sse.addEventListener("participant_camera_off", (e) => {
        const { userId } = JSON.parse(e.data);
        setCameraParticipants(prev => prev.filter(p => p.userId !== userId));
        setParticipantStreams(prev => { const m = new Map(prev); m.delete(userId); return m; });
        peerRef.current.get(userId)?.close();
        peerRef.current.delete(userId);
      });

      sse.addEventListener("signal", async (e) => {
        const { type, data, from } = JSON.parse(e.data);
        const pc = peerRef.current.get(from);
        if (!pc) return;
        if (type === "answer") await pc.setRemoteDescription(new RTCSessionDescription(data));
        else if (type === "ice") await pc.addIceCandidate(new RTCIceCandidate(data)).catch(() => {});
      });

      sse.addEventListener("viewer_count", (e) => { setViewerCount(JSON.parse(e.data).count); });
      sse.addEventListener("chat", (e) => { setChat(prev => [...prev, JSON.parse(e.data)].slice(-100)); });

      await fetch(`${API}/api/badges/award`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ badgeId: "first_live" }) });
    } catch (err: any) {
      setStreamError(err.message || "Failed to start stream");
    } finally {
      setIsConnecting(false);
    }
  };

  const joinStream = async (roomId: string) => {
    setIsConnecting(true);
    setStreamError(null);
    setCurrentRoomId(roomId);
    roomIdRef.current = roomId;

    try {
      // Create PC to receive host stream
      const hostPc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
      peerRef.current.set("__host__", hostPc);

      hostPc.ontrack = e => {
        if (remoteVideoRef.current && e.streams[0]) {
          remoteVideoRef.current.srcObject = e.streams[0];
        }
      };
      hostPc.onicecandidate = e => {
        if (e.candidate) sendSignal(roomId, { type: "ice", data: e.candidate, toUser: "__host__", fromViewer: user?.id });
      };

      setMode("viewing");

      const sse = new EventSource(`${API}/api/live/rooms/${roomId}/join`, { withCredentials: true });
      sseRef.current = sse;

      sse.addEventListener("room_info", (e) => {
        const data = JSON.parse(e.data);
        setChat(data.chat || []);
        setViewerCount(data.viewerCount);
        setCameraParticipants(data.cameras || []);
      });

      sse.addEventListener("participant_camera_on", async (e) => {
        const { userId, displayName, avatarUrl } = JSON.parse(e.data);
        if (userId === userIdRef.current) return;
        setCameraParticipants(prev => {
          if (prev.find(p => p.userId === userId)) return prev;
          return [...prev, { userId, displayName, avatarUrl }];
        });
        // If we have our own camera on, connect with this new participant
        if (viewerLocalStreamRef.current) {
          const pc = makePC(roomId, userId, viewerLocalStreamRef.current);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendSignal(roomId, { type: "offer", data: offer, toUser: userId });
        }
      });

      sse.addEventListener("participant_camera_off", (e) => {
        const { userId } = JSON.parse(e.data);
        setCameraParticipants(prev => prev.filter(p => p.userId !== userId));
        setParticipantStreams(prev => { const m = new Map(prev); m.delete(userId); return m; });
        peerRef.current.get(userId)?.close();
        peerRef.current.delete(userId);
      });

      sse.addEventListener("signal", async (e) => {
        const { type, data, from } = JSON.parse(e.data);
        // Determine which PC to use
        const pcKey = from === "host" || from === room?.hostId ? "__host__" : from;
        let pc = peerRef.current.get(pcKey);

        if (type === "offer") {
          if (!pc) {
            pc = new RTCPeerConnection({ iceServers: STUN_SERVERS });
            const myStream = viewerLocalStreamRef.current;
            if (myStream) myStream.getTracks().forEach(t => pc!.addTrack(t, myStream));
            pc.ontrack = e => {
              if (e.streams[0]) setParticipantStreams(prev => new Map(prev).set(from, e.streams[0]));
            };
            pc.onicecandidate = ev => {
              if (ev.candidate) sendSignal(roomId, { type: "ice", data: ev.candidate, toUser: from });
            };
            peerRef.current.set(pcKey, pc);
          }
          await pc.setRemoteDescription(new RTCSessionDescription(data));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal(roomId, { type: "answer", data: answer, toUser: from });
        } else if (type === "answer" && pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(data));
        } else if (type === "ice" && pc) {
          await pc.addIceCandidate(new RTCIceCandidate(data)).catch(() => {});
        }
      });

      sse.addEventListener("viewer_count", (e) => { setViewerCount(JSON.parse(e.data).count); });
      sse.addEventListener("chat", (e) => { setChat(prev => [...prev, JSON.parse(e.data)].slice(-100)); });
      sse.addEventListener("stream_ended", () => { endSession(); });
    } catch (err: any) {
      setStreamError(err.message || "Failed to join stream");
      setMode("lobby");
    } finally {
      setIsConnecting(false);
    }
  };

  // Reference to the room for signal routing
  const room = rooms.find(r => r.id === currentRoomId);

  const toggleViewerCam = async () => {
    const roomId = roomIdRef.current;
    if (!roomId) return;

    if (viewerCamOn) {
      // Turn off camera
      viewerLocalStreamRef.current?.getTracks().forEach(t => t.stop());
      viewerLocalStreamRef.current = null;
      setViewerCamOn(false);
      await fetch(`${API}/api/live/rooms/${roomId}/camera-off`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" } });
    } else {
      // Turn on camera
      setViewerCamError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: viewerMicOn });
        viewerLocalStreamRef.current = stream;
        setViewerCamOn(true);

        // Notify server and get existing camera participants
        const r = await fetch(`${API}/api/live/rooms/${roomId}/camera-on`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        const { existingCameras } = await r.json();

        // Connect to each existing camera participant
        for (const cam of existingCameras) {
          if (cam.userId === user?.id) continue;
          const pc = makePC(roomId, cam.userId, stream);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendSignal(roomId, { type: "offer", data: offer, toUser: cam.userId });
        }
      } catch (err: any) {
        setViewerCamError(err.name === "NotAllowedError" ? "Camera permission denied." : "Could not access camera");
      }
    }
  };

  const toggleViewerMic = () => {
    viewerLocalStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setViewerMicOn(prev => !prev);
  };

  const endSession = async () => {
    sseRef.current?.close();
    sseRef.current = null;
    peerRef.current.forEach(pc => pc.close());
    peerRef.current.clear();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    viewerLocalStreamRef.current?.getTracks().forEach(t => t.stop());
    viewerLocalStreamRef.current = null;
    stopPreview();
    setViewerCamOn(false);
    setCameraParticipants([]);
    setParticipantStreams(new Map());

    if (mode === "hosting" && currentRoomId) {
      await fetch(`${API}/api/live/rooms/${currentRoomId}`, { method: "DELETE", credentials: "include" });
    } else if (mode === "viewing" && currentRoomId && viewerCamOn) {
      await fetch(`${API}/api/live/rooms/${currentRoomId}/camera-off`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" } });
    }

    setMode("lobby");
    setCurrentRoomId(null);
    roomIdRef.current = null;
    setChat([]);
    setViewerCount(0);
    fetchRooms();
  };

  const sendChat = async () => {
    if (!chatInput.trim() || !currentRoomId) return;
    await fetch(`${API}/api/live/rooms/${currentRoomId}/chat`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: chatInput }),
    });
    setChatInput("");
  };

  const toggleCam = () => { localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; }); setCamOn(p => !p); };
  const toggleMic = () => { localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; }); setMicOn(p => !p); };

  // ── Session view (hosting or viewing) ─────────────────────────────────────
  if (mode === "hosting" || mode === "viewing") {
    // Build participant grid: host stream + viewer camera streams
    const gridParticipants = cameraParticipants.filter(p => p.userId !== user?.id);

    return (
      <Layout>
        <div className="max-w-6xl mx-auto p-4 h-[calc(100vh-80px)] flex gap-4">
          <div className="flex-1 flex flex-col gap-3 min-w-0">

            {/* Main video area */}
            <div className={`grid gap-2 ${gridParticipants.length > 0 ? "grid-cols-2" : "grid-cols-1"}`}>
              {/* Host / main stream */}
              <div className="relative bg-black rounded-2xl overflow-hidden aspect-video">
                {mode === "hosting" ? (
                  <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                ) : (
                  <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                )}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                    <Radio className="w-3 h-3" /> LIVE
                  </span>
                  <span className="bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Eye className="w-3 h-3" /> {viewerCount}
                  </span>
                </div>
                {mode === "viewing" && (
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full">
                    {rooms.find(r => r.id === currentRoomId)?.hostName || "Host"}
                  </div>
                )}
              </div>

              {/* Camera participants */}
              {gridParticipants.map(p => (
                <div key={p.userId} className="relative bg-black rounded-2xl overflow-hidden aspect-video">
                  <video
                    ref={(el: any) => { participantVideoRefs.current.set(p.userId, el); }}
                    autoPlay playsInline
                    className="w-full h-full object-cover"
                  />
                  {!participantStreams.has(p.userId) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                      {p.avatarUrl ? (
                        <img src={p.avatarUrl} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-xl">
                          {p.displayName[0]}
                        </div>
                      )}
                      <p className="text-white/60 text-xs">Connecting...</p>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full">
                    {p.displayName}
                  </div>
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                </div>
              ))}

              {/* Viewer's own camera preview (when camera is on) */}
              {mode === "viewing" && viewerCamOn && viewerLocalStreamRef.current && (
                <div className="relative bg-black rounded-2xl overflow-hidden aspect-video">
                  <video
                    autoPlay muted playsInline
                    className="w-full h-full object-cover"
                    ref={el => { if (el && viewerLocalStreamRef.current) { el.srcObject = viewerLocalStreamRef.current; el.play().catch(() => {}); }}}
                  />
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full">
                    You
                  </div>
                  <span className="absolute top-2 left-2 bg-green-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">● ON AIR</span>
                </div>
              )}
            </div>

            {/* Controls */}
            {mode === "hosting" && (
              <div className="flex gap-2 flex-wrap">
                <button onClick={toggleCam} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${camOn ? "bg-card border border-border text-foreground" : "bg-red-900/40 border border-red-500/50 text-red-400"}`}>
                  {camOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                  {camOn ? "Cam On" : "Cam Off"}
                </button>
                <button onClick={toggleMic} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${micOn ? "bg-card border border-border text-foreground" : "bg-red-900/40 border border-red-500/50 text-red-400"}`}>
                  {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  {micOn ? "Mic On" : "Mic Off"}
                </button>
                <button onClick={endSession} className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-all">
                  <PhoneOff className="w-4 h-4" /> End Stream
                </button>
              </div>
            )}

            {mode === "viewing" && (
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={toggleViewerCam}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${viewerCamOn ? "bg-green-900/40 border border-green-500/50 text-green-400" : "bg-card border border-border text-foreground hover:border-primary/40"}`}
                >
                  {viewerCamOn ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
                  {viewerCamOn ? "Camera On" : "Join with Camera"}
                </button>
                {viewerCamOn && (
                  <button onClick={toggleViewerMic} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${viewerMicOn ? "bg-card border border-border text-foreground" : "bg-red-900/40 border border-red-500/50 text-red-400"}`}>
                    {viewerMicOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    {viewerMicOn ? "Mic On" : "Mic Off"}
                  </button>
                )}
                {viewerCamError && (
                  <span className="text-red-400 text-xs flex items-center gap-1">
                    <CameraOff className="w-3 h-3" /> {viewerCamError}
                  </span>
                )}
                <button onClick={endSession} className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border hover:border-red-500/50 text-muted-foreground text-sm font-medium transition-all">
                  <X className="w-4 h-4" /> Leave
                </button>
              </div>
            )}

            {cameraParticipants.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Camera className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400 font-medium">{cameraParticipants.length}</span> on camera
                {cameraParticipants.slice(0, 4).map(p => (
                  <span key={p.userId} className="px-2 py-0.5 rounded-full bg-green-900/20 border border-green-500/20 text-green-300/70">
                    {p.displayName}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Chat sidebar */}
          <div className="w-80 flex-shrink-0 flex flex-col bg-card border border-border rounded-2xl overflow-hidden">
            <div className="p-3 border-b border-border flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{viewerCount} watching</span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chat.map(msg => (
                <div key={msg.id} className="text-sm">
                  <span className="text-primary font-medium">{msg.displayName}: </span>
                  <span className="text-foreground/80">{msg.text}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 border-t border-border flex gap-2">
              <input
                className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                placeholder="Say something..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendChat()}
              />
              <button onClick={sendChat} className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/80 transition-all">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ── Lobby ──────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-1">
            <Radio className="w-8 h-8 text-red-500" />
            <h1 className="text-3xl font-bold font-serif text-foreground">Live on CLAW</h1>
          </div>
          <p className="text-muted-foreground">Go live or join — everyone can turn on their camera</p>
        </div>

        <div className="bg-card border border-primary/20 rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" /> Start Your Live Stream
          </h2>
          <div className="relative bg-black rounded-xl overflow-hidden aspect-video w-full">
            <video ref={previewVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ display: previewStream ? "block" : "none" }} />
            {!previewStream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <VideoOff className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground/60">Camera preview off</p>
                <button onClick={startPreview} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border hover:border-primary/50 text-sm text-foreground transition-all">
                  <Video className="w-4 h-4 text-primary" /> Preview Camera
                </button>
              </div>
            )}
            {previewStream && (
              <>
                <div className="absolute top-2 left-2"><span className="bg-black/70 text-green-400 text-[10px] font-bold px-2 py-1 rounded-full border border-green-500/30">● PREVIEW</span></div>
                <button onClick={stopPreview} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"><X className="w-3.5 h-3.5 text-white" /></button>
              </>
            )}
          </div>

          {previewError && <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/20 rounded-lg px-3 py-2 flex items-start gap-2"><VideoOff className="w-4 h-4 flex-shrink-0 mt-0.5" />{previewError}</div>}

          <input
            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 text-sm"
            placeholder="What's your stream about? (e.g. 'late night chat', 'music vibes')"
            value={liveTitle}
            onChange={e => setLiveTitle(e.target.value)}
            maxLength={80}
          />

          {streamError && <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/20 rounded-lg px-3 py-2">{streamError}</div>}

          <button
            onClick={startStream}
            disabled={isConnecting || !liveTitle.trim()}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all"
          >
            {isConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Radio className="w-5 h-5" />}
            {isConnecting ? "Starting..." : "Go Live"}
          </button>

          <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
            <Camera className="w-3.5 h-3.5 text-green-400" />
            Viewers can also turn on their camera and mic to join the conversation
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground flex items-center gap-2"><Radio className="w-5 h-5 text-red-500" /> Live Right Now</h2>
            <button onClick={fetchRooms} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Refresh</button>
          </div>

          {loadingRooms ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : rooms.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <Radio className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nobody's live right now.</p>
              <p className="text-muted-foreground/60 text-xs mt-1">Be the first to go live — your community is waiting.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {rooms.map(room => (
                <div key={room.id} className="bg-card border border-border hover:border-primary/30 rounded-2xl p-5 flex flex-col gap-3 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                      {room.hostAvatar ? (
                        <img src={room.hostAvatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-lg">{room.hostName[0]}</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{room.hostName}</p>
                      <p className="text-muted-foreground text-xs truncate">{room.title}</p>
                    </div>
                    <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                      <Radio className="w-2.5 h-2.5" /> LIVE
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {room.viewerCount}</span>
                      {room.cameraCount > 0 && (
                        <span className="flex items-center gap-1 text-green-400"><Camera className="w-3 h-3" /> {room.cameraCount} on cam</span>
                      )}
                    </div>
                    <button
                      onClick={() => joinStream(room.id)}
                      disabled={isConnecting || room.hostId === user?.id}
                      className="flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-xs font-medium px-3 py-1.5 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Play className="w-3 h-3" /> Join
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
