import { Router } from "express";
import { db } from "@workspace/db";
import { clawProfilesTable, missedCallsTable } from "@workspace/db/schema";
import { usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { sendPushToUser } from "./push";

const ELEVEN_VOICE_ID = "pNInz6obpgDQGcFmaJgB"; // Adam — same voice as Ringy

// Ringy ring-audio cache (generated once per restart, served repeatedly)
let ringAudioCache: Buffer | null = null;
let ringAudioGenerating = false;

const RING_PHRASES = [
  "Oh honey, SOMEONE is desperately trying to reach you! Pick. Up. The. PHONE!",
  "WAKE UP! There's a call for you, you gorgeous disaster! Answer it NOW!",
  "Excuse me?! Someone is calling and you're just standing there?! How dare you! Answer immediately!",
  "A call! A CALL! For YOU! Don't just stand there gawking — answer it, you magnificent fool!",
  "Ringy here, darling — your phone is screaming for attention! Try not to disappoint me when you answer!",
  "Oh my CLAWS, they're calling you! This is not a drill! PICK IT UP!",
];

async function getRingAudio(): Promise<Buffer | null> {
  if (ringAudioCache) return ringAudioCache;
  if (ringAudioGenerating) return null;
  ringAudioGenerating = true;
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY not set");
    const phrase = RING_PHRASES[Math.floor(Math.random() * RING_PHRASES.length)];
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg",
        },
        body: JSON.stringify({
          text: phrase,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.35,
            similarity_boost: 0.78,
            style: 0.40,
            use_speaker_boost: true,
          },
        }),
      }
    );
    if (!response.ok) throw new Error(`ElevenLabs ${response.status}`);
    ringAudioCache = Buffer.from(await response.arrayBuffer());
  } catch (e) {
    // Non-fatal — IncomingCallModal has Web Audio oscillator fallback
  } finally {
    ringAudioGenerating = false;
  }
  return ringAudioCache;
}

// Pre-warm ring audio on startup
getRingAudio().catch(() => {});

const router = Router();

interface CallParticipant {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  state: "ringing" | "connected" | "declined" | "ended";
  res?: any;
}

interface CallSession {
  id: string;
  type: "audio" | "video";
  initiatorId: string;
  participants: Map<string, CallParticipant>;
  createdAt: number;
  noAnswerTimer?: ReturnType<typeof setTimeout>;
}

// Per-user SSE response objects
const userListeners = new Map<string, any>();

// Grace-period timers: when SSE drops, wait before cleaning up calls
const disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
const DISCONNECT_GRACE_MS = 20_000; // 20 seconds to reconnect

// Active call sessions (in-memory, max 3 participants)
const callSessions = new Map<string, CallSession>();
const MAX_CALL_PARTICIPANTS = 3;

function sendToUser(userId: string, event: string, data: any) {
  const res = userListeners.get(userId);
  if (res) {
    try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch {}
  }
}

function broadcastToCall(session: CallSession, event: string, data: any, excludeId?: string) {
  session.participants.forEach((p, uid) => {
    if (uid !== excludeId && p.state !== "declined" && p.state !== "ended") {
      sendToUser(uid, event, data);
    }
  });
}

function sessionSummary(session: CallSession) {
  return {
    callId: session.id,
    type: session.type,
    initiatorId: session.initiatorId,
    participants: Array.from(session.participants.values()).map(p => ({
      userId: p.userId,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl,
      state: p.state,
    })),
  };
}

function cleanupSession(callId: string) {
  const session = callSessions.get(callId);
  if (!session) return;
  if (session.noAnswerTimer) clearTimeout(session.noAnswerTimer);
  callSessions.delete(callId);
}

// GET /api/calls/ring-audio — Ringy's frantic ring for receivers
router.get("/calls/ring-audio", async (req, res) => {
  const buf = await getRingAudio();
  if (!buf) return res.status(503).json({ error: "Audio not ready" });
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(buf);
});

// GET /api/calls/listen — persistent SSE connection for all call events
router.get("/calls/listen", (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).end();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const userId = req.user.id;

  // Cancel any pending disconnect cleanup for this user (reconnect)
  const existingTimer = disconnectTimers.get(userId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    disconnectTimers.delete(userId);
  }

  userListeners.set(userId, res);

  res.write(`event: ready\ndata: ${JSON.stringify({ userId })}\n\n`);

  // Replay any pending incoming calls — handles SSE reconnect within grace window
  for (const session of callSessions.values()) {
    const participant = session.participants.get(userId);
    if (participant && participant.state === "ringing") {
      try {
        res.write(`event: incoming_call\ndata: ${JSON.stringify(sessionSummary(session))}\n\n`);
      } catch {}
    }
    // If user was in an active call and just reconnected, replay state
    if (participant && participant.state === "connected") {
      try {
        res.write(`event: call_rejoined\ndata: ${JSON.stringify(sessionSummary(session))}\n\n`);
      } catch {}
    }
  }

  const keepAlive = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { clearInterval(keepAlive); }
  }, 20000);

  req.on("close", () => {
    clearInterval(keepAlive);

    // Only clean up if this is still the active SSE for this user
    if (userListeners.get(userId) !== res) return;
    userListeners.delete(userId);

    // Start grace period — don't immediately tear down calls
    // This handles network blips, page refreshes, and reconnects
    const timer = setTimeout(() => {
      disconnectTimers.delete(userId);

      // User hasn't reconnected — clean up their active/ringing sessions
      callSessions.forEach((session, callId) => {
        if (!session.participants.has(userId)) return;
        const p = session.participants.get(userId)!;

        if (p.state === "connected") {
          p.state = "ended";
          broadcastToCall(session, "call_participant_left", { callId, userId }, userId);
          const remaining = Array.from(session.participants.values())
            .filter(x => x.state === "connected");
          if (remaining.length < 2) {
            broadcastToCall(session, "call_ended", { callId, reason: "participant_left" });
            cleanupSession(callId);
          }
        } else if (p.state === "ringing" && session.initiatorId !== userId) {
          // Receiver went offline — treat as missed call
          p.state = "ended";
          sendToUser(session.initiatorId, "call_no_answer", { callId, userId });
          const stillRinging = Array.from(session.participants.values())
            .filter(x => x.state === "ringing");
          if (stillRinging.length === 0) {
            const connected = Array.from(session.participants.values())
              .filter(x => x.state === "connected");
            if (connected.length < 2) {
              broadcastToCall(session, "call_ended", { callId });
              cleanupSession(callId);
            }
          }
        } else if (p.state === "ringing" && session.initiatorId === userId) {
          // Caller dropped — cancel the call for everyone
          broadcastToCall(session, "call_ended", { callId, reason: "caller_disconnected" }, userId);
          cleanupSession(callId);
        }
      });
    }, DISCONNECT_GRACE_MS);

    disconnectTimers.set(userId, timer);
  });
});

// POST /api/calls/initiate — start a new outgoing call
router.post("/calls/initiate", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { toUserIds, type = "audio" } = req.body;

  if (!Array.isArray(toUserIds) || toUserIds.length === 0) {
    return res.status(400).json({ error: "Provide toUserIds array" });
  }
  if (toUserIds.length > MAX_CALL_PARTICIPANTS - 1) {
    return res.status(400).json({ error: `Max ${MAX_CALL_PARTICIPANTS - 1} people to call` });
  }

  // Prevent caller from starting a new call if already in one
  for (const session of callSessions.values()) {
    const p = session.participants.get(req.user.id);
    if (p && (p.state === "connected" || p.state === "ringing")) {
      return res.status(409).json({ error: "You are already in a call" });
    }
  }

  const [myProfile] = await db.select({
    displayName: clawProfilesTable.displayName,
    avatarUrl: clawProfilesTable.avatarUrl,
  }).from(clawProfilesTable).where(eq(clawProfilesTable.userId, req.user.id)).limit(1);

  const callId = Math.random().toString(36).slice(2, 12);
  const session: CallSession = {
    id: callId,
    type: type as "audio" | "video",
    initiatorId: req.user.id,
    participants: new Map(),
    createdAt: Date.now(),
  };

  // Initiator starts as "connected" (outgoing, waiting for answer)
  session.participants.set(req.user.id, {
    userId: req.user.id,
    displayName: myProfile?.displayName || "Unknown",
    avatarUrl: myProfile?.avatarUrl,
    state: "connected",
  });

  // Callees start as "ringing"
  for (const uid of toUserIds) {
    const [profile] = await db.select({
      displayName: clawProfilesTable.displayName,
      avatarUrl: clawProfilesTable.avatarUrl,
    }).from(clawProfilesTable).where(eq(clawProfilesTable.userId, uid)).limit(1);

    session.participants.set(uid, {
      userId: uid,
      displayName: profile?.displayName || "Unknown",
      avatarUrl: profile?.avatarUrl,
      state: "ringing",
    });
  }

  callSessions.set(callId, session);

  const summary = sessionSummary(session);
  const callerName = myProfile?.displayName || "Someone";
  const callTypeLabel = type === "video" ? "video" : "voice";

  // Notify callees via SSE + push
  for (const uid of toUserIds) {
    sendToUser(uid, "incoming_call", summary);
    sendPushToUser(uid, {
      title: `📞 Incoming ${callTypeLabel} call`,
      body: `${callerName} is calling you…`,
      url: "/",
      tag: `call-${callId}`,
      callId,
      type: "incoming_call",
    });
  }

  // Auto-timeout for unanswered calls (30 seconds)
  const noAnswerTimer = setTimeout(async () => {
    const s = callSessions.get(callId);
    if (!s) return;

    const callerProfile = await db.select({ displayName: clawProfilesTable.displayName })
      .from(clawProfilesTable).where(eq(clawProfilesTable.userId, s.initiatorId)).limit(1)
      .then(r => r[0]);

    let anyStillRinging = false;
    for (const [uid, p] of s.participants.entries()) {
      if (p.state !== "ringing") continue;
      anyStillRinging = true;
      p.state = "ended";

      // Tell caller: no answer from this person
      sendToUser(s.initiatorId, "call_no_answer", { callId, userId: uid });

      // Tell callee: missed call
      sendToUser(uid, "missed_call", {
        callId,
        callerId: s.initiatorId,
        callerName: callerProfile?.displayName || "Someone",
        callType: s.type,
      });

      // Persist missed call
      try {
        await db.insert(missedCallsTable).values({
          callId,
          callerId: s.initiatorId,
          calleeId: uid,
          callType: s.type,
        });
      } catch {}

      // Push missed-call notification
      sendPushToUser(uid, {
        title: "📞 Missed call",
        body: `You missed a ${s.type} call from ${callerProfile?.displayName || "someone"}`,
        url: "/",
        type: "missed_call",
        tag: `missed-${callId}`,
      });
    }

    if (anyStillRinging) {
      const connected = Array.from(s.participants.values()).filter(x => x.state === "connected");
      if (connected.length < 2) {
        // No one answered and caller is alone — end the call
        sendToUser(s.initiatorId, "call_ended", { callId, reason: "no_answer" });
        cleanupSession(callId);
      }
    }
  }, 30_000);

  session.noAnswerTimer = noAnswerTimer;

  res.json(summary);
});

// POST /api/calls/accept — receiver accepts the call
router.post("/calls/accept", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { callId } = req.body;
  const session = callSessions.get(callId);
  if (!session) return res.status(404).json({ error: "Call not found or expired" });

  const participant = session.participants.get(req.user.id);
  if (!participant) return res.status(403).json({ error: "Not in this call" });
  if (participant.state !== "ringing") return res.status(409).json({ error: "Call already handled" });

  participant.state = "connected";
  const summary = sessionSummary(session);

  // Broadcast to all participants (including caller)
  broadcastToCall(session, "call_accepted", {
    callId,
    userId: req.user.id,
    ...summary,
  });

  res.json(summary);
});

// POST /api/calls/decline — receiver declines
router.post("/calls/decline", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { callId } = req.body;
  const session = callSessions.get(callId);
  if (!session) return res.json({ ok: true });

  const participant = session.participants.get(req.user.id);
  if (!participant) return res.json({ ok: true });

  participant.state = "declined";

  // Broadcast decline to all active participants
  broadcastToCall(session, "call_declined", {
    callId,
    userId: req.user.id,
  }, req.user.id);

  // Save missed call for the decliner
  try {
    await db.insert(missedCallsTable).values({
      callId,
      callerId: session.initiatorId,
      calleeId: req.user.id,
      callType: session.type,
    });
  } catch {}

  // Check if there's no one left to answer
  const canAnswer = Array.from(session.participants.values())
    .filter(p => p.state === "ringing");
  const inCall = Array.from(session.participants.values())
    .filter(p => p.state === "connected");

  if (canAnswer.length === 0 && inCall.length < 2) {
    broadcastToCall(session, "call_ended", { callId, reason: "declined" });
    cleanupSession(callId);
  }

  res.json({ ok: true });
});

// POST /api/calls/cancel — caller cancels before anyone answers
router.post("/calls/cancel", (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { callId } = req.body;
  const session = callSessions.get(callId);
  if (!session) return res.json({ ok: true });

  if (session.initiatorId !== req.user.id) {
    return res.status(403).json({ error: "Only the initiator can cancel" });
  }

  // Notify all callees that the call was cancelled
  broadcastToCall(session, "call_ended", { callId, reason: "cancelled" }, req.user.id);
  cleanupSession(callId);
  res.json({ ok: true });
});

// POST /api/calls/end — end an active call
router.post("/calls/end", (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { callId } = req.body;
  const session = callSessions.get(callId);
  if (!session) return res.json({ ok: true });

  if (!session.participants.has(req.user.id)) {
    return res.status(403).json({ error: "Not in this call" });
  }

  broadcastToCall(session, "call_ended", { callId, reason: "ended" });
  cleanupSession(callId);
  res.json({ ok: true });
});

// POST /api/calls/signal — WebRTC signaling relay
router.post("/calls/signal", (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { callId, toId, type, data } = req.body;

  const session = callSessions.get(callId);
  if (!session) return res.status(404).json({ error: "Call not found" });
  if (!session.participants.has(req.user.id)) return res.status(403).json({ error: "Not in this call" });

  sendToUser(toId, "call_signal", { callId, fromId: req.user.id, type, data });
  res.json({ ok: true });
});

// POST /api/calls/invite — add a 3rd person to an active call
router.post("/calls/invite", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { callId, toUserId } = req.body;
  const session = callSessions.get(callId);
  if (!session) return res.status(404).json({ error: "Call not found" });
  if (!session.participants.has(req.user.id)) return res.status(403).json({ error: "Not in this call" });
  if (session.participants.size >= MAX_CALL_PARTICIPANTS) {
    return res.status(400).json({ error: "Call is full (max 3 people)" });
  }
  if (session.participants.has(toUserId)) {
    return res.status(400).json({ error: "Already in this call" });
  }

  const [profile] = await db.select({
    displayName: clawProfilesTable.displayName,
    avatarUrl: clawProfilesTable.avatarUrl,
  }).from(clawProfilesTable).where(eq(clawProfilesTable.userId, toUserId)).limit(1);

  session.participants.set(toUserId, {
    userId: toUserId,
    displayName: profile?.displayName || "Unknown",
    avatarUrl: profile?.avatarUrl,
    state: "ringing",
  });

  const summary = sessionSummary(session);
  sendToUser(toUserId, "incoming_call", summary);

  const inviter = session.participants.get(req.user.id);
  sendPushToUser(toUserId, {
    title: `📞 You're being added to a call`,
    body: `${inviter?.displayName || "Someone"} wants you to join a ${session.type} call`,
    url: "/",
    callId,
    type: "incoming_call",
  });

  res.json(summary);
});

// GET /api/calls/missed — list missed calls for current user
router.get("/calls/missed", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const rows = await db.select({
      id: missedCallsTable.id,
      callId: missedCallsTable.callId,
      callerId: missedCallsTable.callerId,
      callType: missedCallsTable.callType,
      seenAt: missedCallsTable.seenAt,
      createdAt: missedCallsTable.createdAt,
      callerName: clawProfilesTable.displayName,
      callerAvatar: clawProfilesTable.avatarUrl,
    })
      .from(missedCallsTable)
      .leftJoin(clawProfilesTable, eq(missedCallsTable.callerId, clawProfilesTable.userId))
      .where(eq(missedCallsTable.calleeId, req.user.id))
      .orderBy(desc(missedCallsTable.createdAt))
      .limit(50);
    res.json(rows);
  } catch (err) {
    console.error("[calls/missed] Error:", err);
    res.status(500).json({ error: "Failed to fetch missed calls" });
  }
});

// POST /api/calls/missed/seen — mark missed calls as seen
router.post("/calls/missed/seen", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.json({ ok: true });
  try {
    for (const id of ids) {
      await db.update(missedCallsTable)
        .set({ seenAt: new Date() })
        .where(eq(missedCallsTable.id, id));
    }
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to mark as seen" });
  }
});

export default router;
