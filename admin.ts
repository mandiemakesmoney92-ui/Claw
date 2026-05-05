import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable, clawProfilesTable, notificationsTable } from "@workspace/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

const router = Router();

// GET /api/admin/vibe-check — returns Soft/Direct/Claw post counts for last 24h
router.get("/admin/vibe-check", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const [softRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(postsTable)
    .where(and(
      eq(postsTable.isPurged, false),
      eq(postsTable.intensityLevel, "Soft"),
      sql`${postsTable.createdAt} > NOW() - INTERVAL '24 hours'`
    ));
  const [directRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(postsTable)
    .where(and(
      eq(postsTable.isPurged, false),
      eq(postsTable.intensityLevel, "Direct"),
      sql`${postsTable.createdAt} > NOW() - INTERVAL '24 hours'`
    ));
  const [clawRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(postsTable)
    .where(and(
      eq(postsTable.isPurged, false),
      eq(postsTable.intensityLevel, "Claw"),
      sql`${postsTable.createdAt} > NOW() - INTERVAL '24 hours'`
    ));

  const soft = Number(softRow?.count || 0);
  const direct = Number(directRow?.count || 0);
  const claw = Number(clawRow?.count || 0);
  const total = soft + direct + claw;

  const clawPct = total > 0 ? Math.round((claw / total) * 100) : 0;
  const directPct = total > 0 ? Math.round((direct / total) * 100) : 0;
  const softPct = total > 0 ? Math.round((soft / total) * 100) : 0;

  // Hourly breakdown (last 12h)
  const hourlyRows = await db.execute(sql`
    SELECT
      date_trunc('hour', created_at) AS hour,
      intensity_level,
      count(*) AS cnt
    FROM claw_posts
    WHERE is_purged = false AND created_at > NOW() - INTERVAL '12 hours'
    GROUP BY 1, 2
    ORDER BY 1 ASC
  `);

  res.json({
    soft, direct, claw, total,
    softPct, directPct, clawPct,
    clawAlert: clawPct >= 60,
    hourly: hourlyRows.rows || [],
  });
});

// POST /api/admin/vibe-check/trigger-shadow-prompt
// Sends a system-wide notification pushing users toward shadow work
router.post("/admin/vibe-check/trigger-shadow-prompt", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const PROMPTS = [
    "The site is running hot tonight. Before you post — what are you actually feeling underneath the anger?",
    "Community vibe check: high intensity across the board. Take a breath. What would you say if no one was watching?",
    "Something's charged in here right now. The most powerful thing you can do is pause. What's really going on with you today?",
    "Before the next Claw post — sit with this: what would you write if you weren't trying to win?",
    "The arena's been loud. Shadow Work is open if you need somewhere quieter to process.",
  ];

  const prompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];

  // Get all active users from last 24h
  const activeProfiles = await db
    .select({ userId: clawProfilesTable.userId })
    .from(clawProfilesTable)
    .where(eq(clawProfilesTable.isSuspended, false))
    .limit(500);

  const notifications = activeProfiles.map(p => ({
    userId: p.userId,
    type: "broadcast" as const,
    message: `✦ System Shadow Prompt — ${prompt}`,
    isRead: false,
    url: "/shadow-work",
    tag: `shadow-prompt-${Date.now()}`,
  }));

  // Batch insert in chunks of 100
  for (let i = 0; i < notifications.length; i += 100) {
    await db.insert(notificationsTable).values(notifications.slice(i, i + 100));
  }

  res.json({ sent: notifications.length, prompt });
});

// GET /api/admin/moderation-queue — posts flagged as harassment
router.get("/admin/moderation-queue", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const flagged = await db
    .select()
    .from(postsTable)
    .where(and(eq(postsTable.isModerated, true), eq(postsTable.isPurged, false)))
    .orderBy(desc(postsTable.createdAt))
    .limit(50);

  res.json(flagged);
});

export default router;
