import { Router } from "express";
import { db } from "@workspace/db";
import { masqueradeEventsTable, clawProfilesTable } from "@workspace/db/schema";
import { eq, and, sql, gte, lte, desc } from "drizzle-orm";

const router = Router();

// GET /api/masquerade/events — list active + upcoming masquerade events
router.get("/masquerade/events", async (req, res) => {
  const now = new Date();
  const events = await db.select().from(masqueradeEventsTable)
    .where(and(eq(masqueradeEventsTable.isActive, true), gte(masqueradeEventsTable.endTime, now)))
    .orderBy(desc(masqueradeEventsTable.startTime))
    .limit(10);

  const formatted = events.map(e => ({
    id: e.id,
    title: e.title,
    description: e.description,
    startTime: e.startTime.toISOString(),
    endTime: e.endTime.toISOString(),
    durationHours: e.durationHours,
    participantCount: e.participantCount,
    isLive: now >= e.startTime && now <= e.endTime,
    isUpcoming: now < e.startTime,
    minutesUntilStart: now < e.startTime ? Math.round((e.startTime.getTime() - now.getTime()) / 60000) : 0,
    minutesRemaining: (now >= e.startTime && now <= e.endTime) ? Math.round((e.endTime.getTime() - now.getTime()) / 60000) : 0,
  }));

  res.json(formatted);
});

// POST /api/masquerade/events — host a new masquerade event
router.post("/masquerade/events", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const { title = "The Masquerade", description, durationHours = 2, startsInMinutes = 5 } = req.body;
  const startTime = new Date(Date.now() + startsInMinutes * 60000);
  const endTime = new Date(startTime.getTime() + durationHours * 3600000);

  const [event] = await db.insert(masqueradeEventsTable).values({
    hostId: req.user.id,
    title,
    description,
    durationHours,
    startTime,
    endTime,
    isActive: true,
  }).returning();

  res.status(201).json({
    id: event.id,
    title: event.title,
    startTime: event.startTime.toISOString(),
    endTime: event.endTime.toISOString(),
    durationHours: event.durationHours,
  });
});

// POST /api/masquerade/join — put on your mask during an active event
router.post("/masquerade/join", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { eventId, mask } = req.body;

  // Find the active event
  const [event] = await db.select().from(masqueradeEventsTable)
    .where(and(eq(masqueradeEventsTable.id, Number(eventId)), eq(masqueradeEventsTable.isActive, true)))
    .limit(1);
  if (!event) return res.status(404).json({ error: "Event not found or not active" });

  const now = new Date();
  if (now < event.startTime) return res.status(400).json({ error: "Event hasn't started yet" });
  if (now > event.endTime) return res.status(400).json({ error: "Event has ended" });

  // Update user's masquerade status
  await db.update(clawProfilesTable).set({
    masqueradeActive: true,
    masqueradeUntil: event.endTime,
    equippedMask: mask || "🎭",
  }).where(eq(clawProfilesTable.userId, req.user.id));

  // Increment participant count
  await db.update(masqueradeEventsTable).set({
    participantCount: sql`${masqueradeEventsTable.participantCount} + 1`,
  }).where(eq(masqueradeEventsTable.id, event.id));

  res.json({ success: true, masqueradeUntil: event.endTime.toISOString(), equippedMask: mask || "🎭" });
});

// POST /api/masquerade/unmask — take off the mask early
router.post("/masquerade/unmask", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  await db.update(clawProfilesTable).set({
    masqueradeActive: false,
    masqueradeUntil: null,
  }).where(eq(clawProfilesTable.userId, req.user.id));
  res.json({ success: true });
});

// GET /api/masquerade/me — check my masquerade status
router.get("/masquerade/me", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const [profile] = await db.select({
    masqueradeActive: clawProfilesTable.masqueradeActive,
    masqueradeUntil: clawProfilesTable.masqueradeUntil,
    equippedMask: clawProfilesTable.equippedMask,
    purchasedMasks: clawProfilesTable.purchasedMasks,
  }).from(clawProfilesTable).where(eq(clawProfilesTable.userId, req.user.id)).limit(1);

  if (!profile) return res.json({ masqueradeActive: false });

  // Auto-expire if past time
  if (profile.masqueradeActive && profile.masqueradeUntil && new Date() > profile.masqueradeUntil) {
    await db.update(clawProfilesTable).set({ masqueradeActive: false, masqueradeUntil: null }).where(eq(clawProfilesTable.userId, req.user.id));
    return res.json({ masqueradeActive: false, equippedMask: profile.equippedMask });
  }

  res.json({
    masqueradeActive: profile.masqueradeActive,
    masqueradeUntil: profile.masqueradeUntil?.toISOString() || null,
    equippedMask: profile.equippedMask,
    purchasedMasks: JSON.parse(profile.purchasedMasks || "[]"),
  });
});

// ─── Audio Rooms (Black Room experience) ──────────────────────────────────────
interface AudioParticipant {
  id: string;
  mask: string;
  alias: string;
  res: any;
}
interface AudioRoom {
  id: string;
  title: string;
  createdAt: number;
  participants: Map<string, AudioParticipant>;
}

const audioRooms = new Map<string, AudioRoom>();
const MAX_AUDIO_ROOM = 20;

function sendSSE(res: any, event: string, data: any) {
  try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch {}
}

function broadcastRoom(room: AudioRoom, event: string, data: any, excludeId?: string) {
  room.participants.forEach((p) => {
    if (p.id !== excludeId) sendSSE(p.res, event, data);
  });
}

function roomList() {
  return Array.from(audioRooms.values()).map(r => ({
    id: r.id,
    title: r.title,
    participantCount: r.participants.size,
    createdAt: new Date(r.createdAt).toISOString(),
  }));
}

router.get("/masquerade/audio/rooms", (req, res) => {
  res.json(roomList());
});

router.post("/masquerade/audio/rooms", (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { title = "The Void" } = req.body;
  const roomId = Math.random().toString(36).slice(2, 10);
  const room: AudioRoom = { id: roomId, title: String(title).slice(0, 50), createdAt: Date.now(), participants: new Map() };
  audioRooms.set(roomId, room);
  res.json({ id: roomId, title: room.title, participantCount: 0, createdAt: new Date(room.createdAt).toISOString() });
});

router.get("/masquerade/audio/join", (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { roomId, mask = "🎭", alias = "Stranger" } = req.query as Record<string, string>;
  const room = audioRooms.get(roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (room.participants.size >= MAX_AUDIO_ROOM) return res.status(400).json({ error: "Room is full" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const userId = req.user.id;
  const participant: AudioParticipant = { id: userId, mask, alias, res };
  room.participants.set(userId, participant);

  const partsData = Array.from(room.participants.values()).map(p => ({ id: p.id, mask: p.mask, alias: p.alias }));
  sendSSE(res, "participants", partsData.filter(p => p.id !== userId));
  broadcastRoom(room, "joined", { id: userId, mask, alias }, userId);

  const keepAlive = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { clearInterval(keepAlive); }
  }, 20000);

  req.on("close", () => {
    clearInterval(keepAlive);
    room.participants.delete(userId);
    broadcastRoom(room, "left", { id: userId });
    if (room.participants.size === 0) audioRooms.delete(roomId);
  });
});

router.post("/masquerade/audio/signal", (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { roomId, toId, type, data } = req.body;
  const room = audioRooms.get(roomId);
  if (!room) return res.status(404).json({ error: "Room not found" });
  const target = room.participants.get(toId);
  if (target) sendSSE(target.res, "signal", { fromId: req.user.id, type, data });
  res.json({ ok: true });
});

router.post("/masquerade/audio/leave", (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { roomId } = req.body;
  const room = audioRooms.get(roomId);
  if (room) {
    room.participants.delete(req.user.id);
    broadcastRoom(room, "left", { id: req.user.id });
    if (room.participants.size === 0) audioRooms.delete(roomId);
  }
  res.json({ ok: true });
});

export default router;
