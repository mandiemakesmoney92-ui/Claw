import { Router, type Response } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { clawProfilesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

interface CameraParticipant {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  res?: Response; // their SSE connection (if they are a viewer)
}

interface LiveRoom {
  id: string;
  hostId: string;
  hostName: string;
  hostAvatar?: string;
  title: string;
  viewers: Map<string, { userId: string; displayName: string; avatarUrl?: string; res: Response }>;
  cameras: Map<string, CameraParticipant>; // users with camera on (including host)
  hostRes?: Response;
  chat: { id: string; userId: string; displayName: string; text: string; ts: number }[];
  startedAt: number;
  viewerCount: number;
}

const rooms = new Map<string, LiveRoom>();

function sendSSE(res: Response, event: string, data: any) {
  try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch {}
}

function broadcastRoom(room: LiveRoom, event: string, data: any, excludeId?: string) {
  room.viewers.forEach((v, uid) => {
    if (uid !== excludeId) sendSSE(v.res, event, data);
  });
  if (room.hostRes && excludeId !== room.hostId) sendSSE(room.hostRes, event, data);
}

// Send SSE to a specific user in the room
function sendToUser(room: LiveRoom, userId: string, event: string, data: any) {
  if (userId === room.hostId && room.hostRes) {
    sendSSE(room.hostRes, event, data);
    return;
  }
  const viewer = room.viewers.get(userId);
  if (viewer) sendSSE(viewer.res, event, data);
}

// ── List active rooms ─────────────────────────────────────────────────────────
router.get("/live/rooms", (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const list = Array.from(rooms.values()).map(r => ({
    id: r.id, hostId: r.hostId, hostName: r.hostName, hostAvatar: r.hostAvatar,
    title: r.title, viewerCount: r.viewers.size, startedAt: r.startedAt,
    cameraCount: r.cameras.size,
  }));
  res.json(list);
});

// ── Create a live room (host) ─────────────────────────────────────────────────
router.post("/live/rooms", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { title } = req.body;
  const existing = Array.from(rooms.values()).find(r => r.hostId === req.user.id);
  if (existing) return res.json({ roomId: existing.id });

  const [profile] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, req.user.id)).limit(1);
  const roomId = randomUUID();
  rooms.set(roomId, {
    id: roomId, hostId: req.user.id,
    hostName: profile?.displayName || "Host",
    hostAvatar: profile?.avatarUrl || undefined,
    title: String(title || "Live Stream").slice(0, 80),
    viewers: new Map(), cameras: new Map(),
    chat: [], startedAt: Date.now(), viewerCount: 0,
  });
  res.json({ roomId });
});

// ── Host SSE stream ───────────────────────────────────────────────────────────
router.get("/live/rooms/:roomId/host", (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const room = rooms.get(req.params.roomId);
  if (!room || room.hostId !== req.user.id) return res.status(403).json({ error: "Not your room" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  room.hostRes = res;
  sendSSE(res, "connected", {
    roomId: room.id, viewerCount: room.viewers.size,
    cameras: Array.from(room.cameras.values()).map(c => ({ userId: c.userId, displayName: c.displayName, avatarUrl: c.avatarUrl })),
  });

  const keepAlive = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { clearInterval(keepAlive); }
  }, 20000);

  req.on("close", () => {
    clearInterval(keepAlive);
    room.hostRes = undefined;
    room.cameras.delete(req.user.id);
    rooms.delete(room.id);
    console.log(`[Live] Room ${room.id} ended`);
  });
});

// ── Viewer SSE stream ─────────────────────────────────────────────────────────
router.get("/live/rooms/:roomId/join", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const room = rooms.get(req.params.roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });

  const [profile] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, req.user.id)).limit(1);
  const displayName = profile?.displayName || "Viewer";
  const avatarUrl = profile?.avatarUrl || undefined;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const viewerId = req.user.id;
  room.viewers.set(viewerId, { userId: viewerId, displayName, avatarUrl, res });

  sendSSE(res, "room_info", {
    roomId: room.id, hostId: room.hostId, hostName: room.hostName, hostAvatar: room.hostAvatar,
    title: room.title, chat: room.chat.slice(-50), viewerCount: room.viewers.size,
    cameras: Array.from(room.cameras.values()).map(c => ({ userId: c.userId, displayName: c.displayName, avatarUrl: c.avatarUrl })),
  });

  if (room.hostRes) sendSSE(room.hostRes, "viewer_joined", { viewerId, displayName, avatarUrl, viewerCount: room.viewers.size });
  broadcastRoom(room, "viewer_count", { count: room.viewers.size }, viewerId);

  const keepAlive = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { clearInterval(keepAlive); }
  }, 20000);

  req.on("close", () => {
    clearInterval(keepAlive);
    room.viewers.delete(viewerId);
    // If they had camera on, turn it off
    if (room.cameras.has(viewerId)) {
      room.cameras.delete(viewerId);
      broadcastRoom(room, "participant_camera_off", { userId: viewerId });
    }
    if (room.hostRes) sendSSE(room.hostRes, "viewer_left", { viewerId, viewerCount: room.viewers.size });
    broadcastRoom(room, "viewer_count", { count: room.viewers.size });
  });
});

// ── Camera ON ─────────────────────────────────────────────────────────────────
router.post("/live/rooms/:roomId/camera-on", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const room = rooms.get(req.params.roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });

  const [profile] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, req.user.id)).limit(1);
  const displayName = profile?.displayName || "Participant";
  const avatarUrl = profile?.avatarUrl || undefined;

  const existing = Array.from(room.cameras.values());
  room.cameras.set(req.user.id, { userId: req.user.id, displayName, avatarUrl });

  // Broadcast to everyone that this user has camera on
  broadcastRoom(room, "participant_camera_on", { userId: req.user.id, displayName, avatarUrl }, req.user.id);

  // Return list of existing camera participants so new one can connect to them
  res.json({
    ok: true,
    existingCameras: existing.map(c => ({ userId: c.userId, displayName: c.displayName, avatarUrl: c.avatarUrl })),
  });
});

// ── Camera OFF ────────────────────────────────────────────────────────────────
router.post("/live/rooms/:roomId/camera-off", (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const room = rooms.get(req.params.roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });

  room.cameras.delete(req.user.id);
  broadcastRoom(room, "participant_camera_off", { userId: req.user.id });
  res.json({ ok: true });
});

// ── WebRTC Signaling (any user → any user) ────────────────────────────────────
router.post("/live/rooms/:roomId/signal", (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const room = rooms.get(req.params.roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });

  const { type, data, toUser, toViewer, fromViewer } = req.body;
  const fromId = req.user.id;

  // New any-to-any routing
  if (toUser) {
    sendToUser(room, toUser, "signal", { type, data, from: fromId });
  }
  // Legacy host→viewer routing (backwards compat)
  else if (room.hostId === fromId && toViewer) {
    const viewer = room.viewers.get(toViewer);
    if (viewer) sendSSE(viewer.res, "signal", { type, data, from: "host" });
  }
  // Legacy viewer→host routing (backwards compat)
  else if (fromViewer && room.hostRes) {
    sendSSE(room.hostRes, "signal", { type, data, from: fromId });
  }

  res.json({ ok: true });
});

// ── Chat ─────────────────────────────────────────────────────────────────────
router.post("/live/rooms/:roomId/chat", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const room = rooms.get(req.params.roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });

  const { text } = req.body;
  if (!text || typeof text !== "string") return res.status(400).json({ error: "text required" });

  const [profile] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, req.user.id)).limit(1);
  const displayName = profile?.displayName || "User";

  const msg = { id: randomUUID(), userId: req.user.id, displayName, text: String(text).slice(0, 200), ts: Date.now() };
  room.chat.push(msg);
  if (room.chat.length > 200) room.chat.shift();

  broadcastRoom(room, "chat", msg);
  res.json({ ok: true });
});

// ── End room (host) ───────────────────────────────────────────────────────────
router.delete("/live/rooms/:roomId", (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const room = rooms.get(req.params.roomId);
  if (!room || room.hostId !== req.user.id) return res.status(403).json({ error: "Forbidden" });

  broadcastRoom(room, "stream_ended", {});
  rooms.delete(room.id);
  res.json({ ok: true });
});

export default router;
