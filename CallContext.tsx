import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useSession } from "@clerk/react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
// ICE servers: STUN for discovery + free TURN for NAT traversal across networks
const STUN = { iceServers: [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  // OpenRelay free TURN — enables cross-network calls
  { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
] };

export interface CallParticipant {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  state: "ringing" | "connected" | "declined" | "ended";
}

export interface CallSession {
  callId: string;
  type: "audio" | "video";
  initiatorId: string;
  participants: CallParticipant[];
}

export type CallerStatus =
  | "ringing"     // waiting for answer
  | "declined"    // all callees declined
  | "no_answer"   // timed out without answer
  | "failed";     // network/permission error

export interface MissedCallEntry {
  id: number;
  callId: string;
  callerId: string;
  callType: string;
  callerName: string | null;
  callerAvatar: string | null;
  seenAt: string | null;
  createdAt: string;
}

interface CallContextValue {
  // Outgoing (caller side, before answer)
  outgoingCall: CallSession | null;
  callerStatus: CallerStatus | null;
  // Incoming (receiver side, awaiting decision)
  incomingCall: CallSession | null;
  // Active (connected call)
  activeCall: CallSession | null;

  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  isMuted: boolean;
  isCamOff: boolean;

  missedCalls: MissedCallEntry[];
  unseenMissedCount: number;
  markMissedCallsSeen: () => void;

  initiateCall: (toUserIds: string[], type?: "audio" | "video") => Promise<void>;
  cancelCall: () => void;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  inviteToCall: (toUserId: string) => void;
  toggleMute: () => void;
  toggleCam: () => void;
  attachVideo: (userId: string, el: HTMLVideoElement | null) => void;
}

const CallContext = createContext<CallContextValue | null>(null);

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
}

// ─── Audio: US phone dial-tone ring (440+480 Hz, 2s on / 4s off) ───────────

function createDialTone(ctx: AudioContext): { start(): void; stop(): void } {
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();
  osc1.frequency.value = 440;
  osc2.frequency.value = 480;
  gain.gain.value = 0;
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(ctx.destination);
  osc1.start();
  osc2.start();

  let alive = false;
  let rafId = 0;
  const tick = () => {
    if (!alive) return;
    const phase = ctx.currentTime % 6;
    gain.gain.setValueAtTime(phase < 2 ? 0.12 : 0, ctx.currentTime);
    rafId = requestAnimationFrame(tick);
  };

  return {
    start() { alive = true; tick(); },
    stop() {
      alive = false;
      cancelAnimationFrame(rafId);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      try { osc1.stop(); osc2.stop(); } catch {}
    },
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { session } = useSession();

  const [outgoingCall, setOutgoingCall] = useState<CallSession | null>(null);
  const [callerStatus, setCallerStatus] = useState<CallerStatus | null>(null);
  const [incomingCall, setIncomingCall] = useState<CallSession | null>(null);
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [missedCalls, setMissedCalls] = useState<MissedCallEntry[]>([]);

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const activeCallRef = useRef<CallSession | null>(null);
  const outgoingCallRef = useRef<CallSession | null>(null);
  const incomingCallRef = useRef<CallSession | null>(null);
  const pendingCandidates = useRef<Map<string, RTCIceCandidate[]>>(new Map());
  const videoElements = useRef<Map<string, HTMLVideoElement>>(new Map());
  const sessionRef = useRef(session);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep refs in sync
  activeCallRef.current = activeCall;
  outgoingCallRef.current = outgoingCall;
  incomingCallRef.current = incomingCall;
  useEffect(() => { sessionRef.current = session; }, [session]);

  // ─── Audio ──────────────────────────────────────────────────────────────────

  const audioCtxRef = useRef<AudioContext | null>(null);
  const dialToneRef = useRef<ReturnType<typeof createDialTone> | null>(null);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  const stopAllAudio = useCallback(() => {
    dialToneRef.current?.stop();
    dialToneRef.current = null;
  }, []);

  const startDialTone = useCallback(() => {
    stopAllAudio();
    const ctx = getAudioCtx();
    const tone = createDialTone(ctx);
    dialToneRef.current = tone;
    tone.start();
  }, [getAudioCtx, stopAllAudio]);

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const getToken = useCallback(async (): Promise<string | null> => {
    try { return sessionRef.current ? await sessionRef.current.getToken() : null; } catch { return null; }
  }, []);

  const apiCall = useCallback(async (path: string, body?: object): Promise<any> => {
    const token = await getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      credentials: "include",
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  }, [getToken]);

  // ─── Media ──────────────────────────────────────────────────────────────────

  const getMedia = useCallback(async (type: "audio" | "video") => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: type === "video",
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  // ─── Cleanup ─────────────────────────────────────────────────────────────────

  const cleanupCall = useCallback(() => {
    stopAllAudio();
    if (statusTimerRef.current) { clearTimeout(statusTimerRef.current); statusTimerRef.current = null; }
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
    setRemoteStreams(new Map());
    setActiveCall(null);
    setOutgoingCall(null);
    setIncomingCall(null);
    setCallerStatus(null);
    pendingCandidates.current.clear();
    setIsMuted(false);
    setIsCamOff(false);
  }, [stopAllAudio]);

  // ─── WebRTC Peer Management ───────────────────────────────────────────────────

  const makePeer = useCallback((peerId: string, callId: string, initiating: boolean) => {
    // Avoid duplicate peer connections
    const existing = peerConnections.current.get(peerId);
    if (existing && existing.signalingState !== "closed") return existing;
    if (existing) existing.close();

    const pc = new RTCPeerConnection(STUN);
    peerConnections.current.set(peerId, pc);

    // Add local tracks
    localStreamRef.current?.getTracks().forEach(t =>
      pc.addTrack(t, localStreamRef.current!)
    );

    pc.onicecandidate = async e => {
      if (!e.candidate) return;
      const token = await getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      fetch(`${BASE}/api/calls/signal`, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify({ callId, toId: peerId, type: "ice", data: e.candidate }),
      }).catch(() => {});
    };

    pc.ontrack = e => {
      const stream = e.streams[0];
      if (!stream) return;
      setRemoteStreams(prev => new Map(prev).set(peerId, stream));
      const el = videoElements.current.get(peerId);
      if (el) el.srcObject = stream;
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        // Attempt ICE restart
        if (initiating && pc.signalingState !== "closed") {
          pc.createOffer({ iceRestart: true }).then(offer => {
            pc.setLocalDescription(offer);
            getToken().then(token => {
              const headers: Record<string, string> = { "Content-Type": "application/json" };
              if (token) headers["Authorization"] = `Bearer ${token}`;
              fetch(`${BASE}/api/calls/signal`, {
                method: "POST", credentials: "include", headers,
                body: JSON.stringify({ callId, toId: peerId, type: "offer", data: offer }),
              }).catch(() => {});
            });
          }).catch(() => {});
        }
      }
    };

    if (initiating) {
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        getToken().then(token => {
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (token) headers["Authorization"] = `Bearer ${token}`;
          fetch(`${BASE}/api/calls/signal`, {
            method: "POST", credentials: "include", headers,
            body: JSON.stringify({ callId, toId: peerId, type: "offer", data: offer }),
          }).catch(() => {});
        });
      }).catch(() => {});
    }

    return pc;
  }, [getToken]);

  const handleSignal = useCallback(async (fromId: string, type: string, data: any, callId: string) => {
    let pc = peerConnections.current.get(fromId);

    if (type === "offer") {
      if (!pc || pc.signalingState === "closed") pc = makePeer(fromId, callId, false);
      await pc.setRemoteDescription(new RTCSessionDescription(data));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      const token = await getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      fetch(`${BASE}/api/calls/signal`, {
        method: "POST", credentials: "include", headers,
        body: JSON.stringify({ callId, toId: fromId, type: "answer", data: answer }),
      }).catch(() => {});

      // Drain pending ICE
      const pending = pendingCandidates.current.get(fromId) || [];
      for (const c of pending) await pc.addIceCandidate(c).catch(() => {});
      pendingCandidates.current.delete(fromId);

    } else if (type === "answer" && pc) {
      if (pc.signalingState === "have-local-offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(data));
        const pending = pendingCandidates.current.get(fromId) || [];
        for (const c of pending) await pc.addIceCandidate(c).catch(() => {});
        pendingCandidates.current.delete(fromId);
      }

    } else if (type === "ice") {
      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(data)).catch(() => {});
      } else {
        const arr = pendingCandidates.current.get(fromId) || [];
        arr.push(new RTCIceCandidate(data));
        pendingCandidates.current.set(fromId, arr);
      }
    }
  }, [makePeer, getToken]);

  // ─── Service Worker message listener ─────────────────────────────────────────

  useEffect(() => {
    if (!user || !("serviceWorker" in navigator)) return;

    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === "CALL_ACCEPTED_FROM_NOTIFICATION") {
        const incoming = incomingCallRef.current;
        if (incoming) {
          stopAllAudio();
          getMedia(incoming.type).then(() => {
            setActiveCall(incoming);
            setIncomingCall(null);
          }).catch(() => {});
        }
      }
    };

    navigator.serviceWorker.addEventListener("message", handleSWMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleSWMessage);
  }, [user, stopAllAudio, getMedia]);

  // ─── SSE listener ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    let es: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let unmounted = false;

    const connect = async () => {
      if (unmounted) return;

      // Build SSE URL — credentials via cookies (Clerk sets __session cookie)
      const url = `${BASE}/api/calls/listen`;
      es = new EventSource(url, { withCredentials: true });

      es.addEventListener("ready", () => {
        // SSE connected — clear any stale state
      });

      // ── Incoming call (receiver) ─────────────────────────────────────────────
      es.addEventListener("incoming_call", (e: any) => {
        const session: CallSession = JSON.parse(e.data);

        // If already in an active call — auto-decline (busy)
        if (activeCallRef.current) {
          apiCall("/api/calls/decline", { callId: session.callId }).catch(() => {});
          return;
        }

        setIncomingCall(session);
      });

      // ── Call accepted (fired to all participants when someone accepts) ────────
      es.addEventListener("call_accepted", (e: any) => {
        const data: { callId: string; userId: string } & CallSession = JSON.parse(e.data);

        if (data.userId === user.id) {
          // WE accepted — already handled by acceptCall(). No-op here.
          return;
        }

        // CALLER path: transition outgoing → active
        const outgoing = outgoingCallRef.current;
        if (outgoing && outgoing.callId === data.callId) {
          stopAllAudio();
          const updatedSession: CallSession = {
            callId: data.callId,
            type: data.type,
            initiatorId: data.initiatorId,
            participants: data.participants,
          };
          setActiveCall(updatedSession);
          setOutgoingCall(null);
          setCallerStatus(null);

          // Create WebRTC peer to newly connected participant
          if (localStreamRef.current) {
            makePeer(data.userId, data.callId, true);
          }
          return;
        }

        // ACTIVE call: someone new joined (3-way) — update participants
        if (activeCallRef.current && activeCallRef.current.callId === data.callId) {
          setActiveCall(prev => prev ? { ...prev, participants: data.participants } : prev);
          if (localStreamRef.current) {
            makePeer(data.userId, data.callId, true);
          }
        }
      });

      // ── Call declined ────────────────────────────────────────────────────────
      es.addEventListener("call_declined", (e: any) => {
        const { callId, userId: whoDeclined } = JSON.parse(e.data);

        // Update outgoing call
        setOutgoingCall(prev => {
          if (!prev || prev.callId !== callId) return prev;
          const updated = {
            ...prev,
            participants: prev.participants.map(p =>
              p.userId === whoDeclined ? { ...p, state: "declined" as const } : p
            ),
          };
          // Check if all non-initiator participants have declined
          const callees = updated.participants.filter(p => p.userId !== user.id);
          const allHandled = callees.every(p => p.state === "declined" || p.state === "ended");
          if (allHandled) {
            stopAllAudio();
            setCallerStatus("declined");
            // Auto-dismiss after 3s
            if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
            statusTimerRef.current = setTimeout(() => {
              cleanupCall();
            }, 3000);
          }
          return updated;
        });

        // Update active call (3-way scenario)
        setActiveCall(prev => prev && prev.callId === callId
          ? { ...prev, participants: prev.participants.map(p => p.userId === whoDeclined ? { ...p, state: "declined" as const } : p) }
          : prev
        );
      });

      // ── Call ended (broadcast) ────────────────────────────────────────────────
      es.addEventListener("call_ended", () => {
        stopAllAudio();
        cleanupCall();
      });

      // ── Participant left active call ──────────────────────────────────────────
      es.addEventListener("call_participant_left", (e: any) => {
        const { callId, userId: leftId } = JSON.parse(e.data);
        const pc = peerConnections.current.get(leftId);
        pc?.close();
        peerConnections.current.delete(leftId);
        setRemoteStreams(prev => { const m = new Map(prev); m.delete(leftId); return m; });
        setActiveCall(prev => prev && prev.callId === callId
          ? { ...prev, participants: prev.participants.map(p => p.userId === leftId ? { ...p, state: "ended" as const } : p) }
          : prev
        );
      });

      // ── WebRTC signal ────────────────────────────────────────────────────────
      es.addEventListener("call_signal", (e: any) => {
        const { fromId, type, data, callId } = JSON.parse(e.data);
        handleSignal(fromId, type, data, callId).catch(() => {});
      });

      // ── No answer (30s timeout fired — sent to caller) ───────────────────────
      es.addEventListener("call_no_answer", () => {
        stopAllAudio();
        setCallerStatus("no_answer");
        if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
        statusTimerRef.current = setTimeout(() => cleanupCall(), 3000);
      });

      // ── Missed call (sent to callee who didn't answer) — refetch for real IDs ──
      es.addEventListener("missed_call", () => {
        setIncomingCall(null); // dismiss incoming call if still showing
        getToken().then(token => {
          const headers: Record<string, string> = {};
          if (token) headers["Authorization"] = `Bearer ${token}`;
          return fetch(`${BASE}/api/calls/missed`, { credentials: "include", headers });
        }).then(r => r?.json())
          .then(data => { if (Array.isArray(data)) setMissedCalls(data); })
          .catch(() => {});
      });

      // ── Rejoined active call (SSE reconnect replay) ───────────────────────────
      es.addEventListener("call_rejoined", (e: any) => {
        const session: CallSession = JSON.parse(e.data);
        if (activeCallRef.current || outgoingCallRef.current) return; // already know about it
        // We were in an active call — restore it
        setActiveCall(session);
      });

      es.onerror = () => {
        es?.close();
        if (!unmounted) {
          retryTimeout = setTimeout(connect, 5000);
        }
      };
    };

    connect();

    return () => {
      unmounted = true;
      es?.close();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [user?.id]);

  // ─── Fetch missed calls on mount ──────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    getToken().then(token => {
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      return fetch(`${BASE}/api/calls/missed`, { credentials: "include", headers });
    }).then(r => r?.json())
      .then(data => { if (Array.isArray(data)) setMissedCalls(data); })
      .catch(() => {});
  }, [user?.id]);

  // ─── Actions ──────────────────────────────────────────────────────────────────

  const initiateCall = useCallback(async (toUserIds: string[], type: "audio" | "video" = "audio") => {
    if (outgoingCallRef.current || activeCallRef.current) {
      throw new Error("Already in a call");
    }

    // Get media — this handles permission AND the actual stream (one getUserMedia, not two)
    try {
      await getMedia(type);
    } catch {
      throw new Error("Microphone access is required to make a call. Please allow microphone access in your browser and try again.");
    }

    const data = await apiCall("/api/calls/initiate", { toUserIds, type });
    setOutgoingCall(data);
    setCallerStatus("ringing");
    startDialTone();
  }, [getMedia, apiCall, startDialTone]);

  const cancelCall = useCallback(() => {
    const call = outgoingCallRef.current || activeCallRef.current;
    if (!call) return;
    stopAllAudio();
    apiCall("/api/calls/cancel", { callId: call.callId }).catch(() => {});
    cleanupCall();
  }, [apiCall, stopAllAudio, cleanupCall]);

  const acceptCall = useCallback(async () => {
    const incoming = incomingCallRef.current;
    if (!incoming) return;
    stopAllAudio();

    await getMedia(incoming.type);
    const data = await apiCall("/api/calls/accept", { callId: incoming.callId });

    setActiveCall(data);
    setIncomingCall(null);

    // Connect to all currently connected participants (the caller)
    data.participants?.forEach((p: CallParticipant) => {
      if (p.userId !== user?.id && p.state === "connected") {
        makePeer(p.userId, incoming.callId, false); // wait for caller's offer
      }
    });
  }, [getMedia, apiCall, stopAllAudio, user?.id, makePeer]);

  const declineCall = useCallback(() => {
    const incoming = incomingCallRef.current;
    if (!incoming) return;
    stopAllAudio();
    apiCall("/api/calls/decline", { callId: incoming.callId }).catch(() => {});
    setIncomingCall(null);
  }, [apiCall, stopAllAudio]);

  const endCall = useCallback(() => {
    const call = activeCallRef.current;
    if (!call) return;
    stopAllAudio();
    apiCall("/api/calls/end", { callId: call.callId }).catch(() => {});
    cleanupCall();
  }, [apiCall, stopAllAudio, cleanupCall]);

  const inviteToCall = useCallback((toUserId: string) => {
    const call = activeCallRef.current;
    if (!call) return;
    apiCall("/api/calls/invite", { callId: call.callId, toUserId }).catch(() => {});
  }, [apiCall]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;
      localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !newMuted; });
      return newMuted;
    });
  }, []);

  const toggleCam = useCallback(() => {
    setIsCamOff(prev => {
      const newOff = !prev;
      localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !newOff; });
      return newOff;
    });
  }, []);

  const attachVideo = useCallback((userId: string, el: HTMLVideoElement | null) => {
    if (!el) { videoElements.current.delete(userId); return; }
    videoElements.current.set(userId, el);
    const stream = remoteStreams.get(userId);
    if (stream) el.srcObject = stream;
  }, [remoteStreams]);

  const markMissedCallsSeen = useCallback(() => {
    const unseen = missedCalls.filter(m => !m.seenAt);
    if (unseen.length === 0) return;
    const ids = unseen.map(m => m.id);
    apiCall("/api/calls/missed/seen", { ids }).catch(() => {});
    setMissedCalls(prev => prev.map(m => m.seenAt ? m : { ...m, seenAt: new Date().toISOString() }));
  }, [missedCalls, apiCall]);

  const unseenMissedCount = missedCalls.filter(m => !m.seenAt).length;

  return (
    <CallContext.Provider value={{
      outgoingCall, callerStatus,
      incomingCall, activeCall,
      localStream, remoteStreams,
      isMuted, isCamOff,
      missedCalls, unseenMissedCount, markMissedCallsSeen,
      initiateCall, cancelCall, acceptCall, declineCall, endCall, inviteToCall,
      toggleMute, toggleCam, attachVideo,
    }}>
      {children}
    </CallContext.Provider>
  );
}
