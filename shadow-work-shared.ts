import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { randomBytes } from "crypto";

const router = Router();

const SHADOW_PROMPTS = [
  "What is a secret you're keeping from yourself?",
  "Who in your life do you secretly envy, and why?",
  "What emotion do you perform most often that isn't real?",
  "What would you say to someone if there were zero consequences?",
  "What part of yourself do you hide on every social platform?",
  "What do you need to forgive yourself for?",
  "What truth have you been avoiding for the longest time?",
  "Who are you when no one is watching?",
  "What feeling do you dismiss in yourself that you'd never dismiss in a friend?",
  "What would you say differently if you knew it was the last time?",
  "What relationship in your life is built on performance rather than truth?",
  "What are you pretending is fine when it isn't?",
  "What story about yourself are you most afraid is true?",
  "What do you want that you're too afraid to admit out loud?",
  "Who have you outgrown but haven't let go of yet?",
  "What version of you died somewhere along the way?",
  "What do you wish someone would just say to you directly?",
  "What are you waiting for that you could start today?",
  "What would you post if no one knew it was you?",
];

const MAX_MEMBERS = 4;
const ROOM_HOURS = 24;

function todayPrompt() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return SHADOW_PROMPTS[dayOfYear % SHADOW_PROMPTS.length];
}

// POST /api/shadow-work/shared/join
// Matches user to an open room (< 4 members, today's prompt), or creates one
router.post("/shadow-work/shared/join", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const userId = (req.user as any).id;
  const prompt = todayPrompt();

  try {
    // Check if user is already in a room for this prompt
    const existing = await db.execute(sql`
      SELECT r.id, r.room_code, r.prompt, r.status, r.expires_at,
             (SELECT COUNT(*) FROM claw_shared_reflection_members WHERE room_id = r.id) AS member_count,
             (SELECT COUNT(*) FROM claw_shared_reflection_responses WHERE room_id = r.id) AS response_count
      FROM claw_shared_reflection_rooms r
      JOIN claw_shared_reflection_members m ON m.room_id = r.id
      WHERE m.user_id = ${userId}
        AND r.prompt = ${prompt}
        AND r.expires_at > NOW()
      LIMIT 1
    `);

    if (existing.rows.length > 0) {
      return res.json({ room: existing.rows[0], alreadyJoined: true });
    }

    // Find an open room with space
    const open = await db.execute(sql`
      SELECT r.id, r.room_code, r.prompt, r.status, r.expires_at,
             (SELECT COUNT(*) FROM claw_shared_reflection_members WHERE room_id = r.id) AS member_count
      FROM claw_shared_reflection_rooms r
      WHERE r.prompt = ${prompt}
        AND r.status = 'waiting'
        AND r.expires_at > NOW()
        AND (SELECT COUNT(*) FROM claw_shared_reflection_members WHERE room_id = r.id) < ${MAX_MEMBERS}
      ORDER BY r.created_at ASC
      LIMIT 1
    `);

    let roomId: number;
    let roomCode: string;

    if (open.rows.length > 0) {
      roomId = (open.rows[0] as any).id;
      roomCode = (open.rows[0] as any).room_code;
    } else {
      // Create a new room
      roomCode = randomBytes(4).toString("hex").toUpperCase();
      const newRoom = await db.execute(sql`
        INSERT INTO claw_shared_reflection_rooms (room_code, prompt, status, max_members, expires_at)
        VALUES (${roomCode}, ${prompt}, 'waiting', ${MAX_MEMBERS}, NOW() + INTERVAL '${sql.raw(String(ROOM_HOURS))} hours')
        RETURNING id, room_code, prompt, status, expires_at
      `);
      roomId = (newRoom.rows[0] as any).id;
    }

    // Add user as member
    await db.execute(sql`
      INSERT INTO claw_shared_reflection_members (room_id, user_id)
      VALUES (${roomId}, ${userId})
      ON CONFLICT (room_id, user_id) DO NOTHING
    `);

    // Check if room is now full → update status
    const count = await db.execute(sql`
      SELECT COUNT(*) AS cnt FROM claw_shared_reflection_members WHERE room_id = ${roomId}
    `);
    const memberCount = Number((count.rows[0] as any).cnt);
    if (memberCount >= MAX_MEMBERS) {
      await db.execute(sql`
        UPDATE claw_shared_reflection_rooms SET status = 'active' WHERE id = ${roomId}
      `);
    }

    const room = await db.execute(sql`
      SELECT r.id, r.room_code, r.prompt, r.status, r.expires_at,
             (SELECT COUNT(*) FROM claw_shared_reflection_members WHERE room_id = r.id) AS member_count,
             (SELECT COUNT(*) FROM claw_shared_reflection_responses WHERE room_id = r.id) AS response_count
      FROM claw_shared_reflection_rooms r WHERE r.id = ${roomId}
    `);

    return res.json({ room: room.rows[0], alreadyJoined: false });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to join room" });
  }
});

// GET /api/shadow-work/shared/:roomId
// Get room details + responses (only revealed after all members have responded)
router.get("/shadow-work/shared/:roomId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const userId = (req.user as any).id;
  const roomId = Number(req.params.roomId);

  try {
    // Verify user is a member
    const membership = await db.execute(sql`
      SELECT 1 FROM claw_shared_reflection_members
      WHERE room_id = ${roomId} AND user_id = ${userId}
    `);
    if (membership.rows.length === 0) return res.status(403).json({ error: "Not a member" });

    const room = await db.execute(sql`
      SELECT r.id, r.room_code, r.prompt, r.status, r.expires_at,
             (SELECT COUNT(*) FROM claw_shared_reflection_members WHERE room_id = r.id) AS member_count,
             (SELECT COUNT(*) FROM claw_shared_reflection_responses WHERE room_id = r.id) AS response_count
      FROM claw_shared_reflection_rooms r WHERE r.id = ${roomId}
    `);

    if (room.rows.length === 0) return res.status(404).json({ error: "Room not found" });

    const r = room.rows[0] as any;
    const allResponded = Number(r.response_count) >= Number(r.member_count) && Number(r.member_count) > 0;

    const myResponse = await db.execute(sql`
      SELECT response FROM claw_shared_reflection_responses
      WHERE room_id = ${roomId} AND user_id = ${userId}
    `);

    // Only reveal all responses when everyone has submitted
    let responses: any[] = [];
    if (allResponded) {
      const resp = await db.execute(sql`
        SELECT response, created_at FROM claw_shared_reflection_responses
        WHERE room_id = ${roomId}
        ORDER BY created_at ASC
      `);
      responses = resp.rows;
    }

    return res.json({
      ...r,
      allResponded,
      myResponse: myResponse.rows[0]?.response ?? null,
      responses,
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to get room" });
  }
});

// POST /api/shadow-work/shared/:roomId/respond
router.post("/shadow-work/shared/:roomId/respond", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const userId = (req.user as any).id;
  const roomId = Number(req.params.roomId);
  const { response } = req.body;

  if (!response || response.trim().length < 5) {
    return res.status(400).json({ error: "Response too short" });
  }

  try {
    // Verify membership
    const membership = await db.execute(sql`
      SELECT 1 FROM claw_shared_reflection_members
      WHERE room_id = ${roomId} AND user_id = ${userId}
    `);
    if (membership.rows.length === 0) return res.status(403).json({ error: "Not a member" });

    await db.execute(sql`
      INSERT INTO claw_shared_reflection_responses (room_id, user_id, response)
      VALUES (${roomId}, ${userId}, ${response.trim()})
      ON CONFLICT (room_id, user_id) DO UPDATE SET response = EXCLUDED.response
    `);

    // Check if all responded → purge timer starts from now + 24h
    const counts = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM claw_shared_reflection_members WHERE room_id = ${roomId}) AS members,
        (SELECT COUNT(*) FROM claw_shared_reflection_responses WHERE room_id = ${roomId}) AS responses
    `);
    const { members, responses: respCount } = counts.rows[0] as any;
    const allDone = Number(respCount) >= Number(members);

    if (allDone) {
      await db.execute(sql`
        UPDATE claw_shared_reflection_rooms
        SET status = 'revealed', expires_at = NOW() + INTERVAL '24 hours'
        WHERE id = ${roomId}
      `);
    }

    return res.json({ ok: true, allResponded: allDone });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to submit response" });
  }
});

export default router;
