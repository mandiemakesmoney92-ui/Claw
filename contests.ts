import { Router } from "express";
import { db } from "@workspace/db";
import { contestsTable, contestEntriesTable, clawProfilesTable, usersTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

async function formatContest(c: typeof contestsTable.$inferSelect) {
  let winner = undefined;
  if (c.winnerId) {
    const [p] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, c.winnerId)).limit(1);
    if (p) winner = { id: p.userId, username: p.username, displayName: p.displayName, avatarUrl: p.avatarUrl };
  }
  return {
    id: String(c.id), title: c.title, description: c.description, contestType: c.contestType,
    endDate: c.endDate?.toISOString(), entryCount: c.entryCount || 0, winner, isActive: c.isActive ?? true,
    createdAt: c.createdAt?.toISOString(),
  };
}

router.get("/contests", async (req, res) => {
  const all = (req.query.all === "1");
  const contests = all
    ? await db.select().from(contestsTable).orderBy(desc(contestsTable.createdAt))
    : await db.select().from(contestsTable).where(eq(contestsTable.isActive, true)).orderBy(desc(contestsTable.createdAt));
  res.json(await Promise.all(contests.map(formatContest)));
});

router.post("/contests", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { title, description, contestType, endDate } = req.body;
  if (!title || !description || !contestType || !endDate) return res.status(400).json({ error: "Missing fields" });
  const [created] = await db.insert(contestsTable).values({
    title, description, contestType, endDate: new Date(endDate), isActive: true,
  }).returning();
  res.status(201).json(await formatContest(created));
});

router.get("/contests/:contestId/entries", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const contestId = Number(req.params.contestId);
  const entries = await db.select().from(contestEntriesTable)
    .where(eq(contestEntriesTable.contestId, contestId))
    .orderBy(desc(contestEntriesTable.createdAt));
  const enriched = await Promise.all(entries.map(async e => {
    const [p] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, e.userId)).limit(1);
    return {
      id: String(e.id), content: e.content, mediaUrl: e.mediaUrl, voteCount: e.voteCount || 0,
      createdAt: e.createdAt?.toISOString(),
      author: p ? { id: p.userId, username: p.username, displayName: p.displayName, avatarUrl: p.avatarUrl } : null,
    };
  }));
  res.json(enriched);
});

router.post("/contests/:contestId/winner", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const contestId = Number(req.params.contestId);
  const { winnerId } = req.body;
  if (!winnerId) return res.status(400).json({ error: "winnerId required" });
  await db.update(contestsTable).set({ winnerId, isActive: false }).where(eq(contestsTable.id, contestId));
  const [updated] = await db.select().from(contestsTable).where(eq(contestsTable.id, contestId)).limit(1);
  res.json(await formatContest(updated));
});

router.patch("/contests/:contestId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const contestId = Number(req.params.contestId);
  const { isActive } = req.body;
  await db.update(contestsTable).set({ isActive }).where(eq(contestsTable.id, contestId));
  const [updated] = await db.select().from(contestsTable).where(eq(contestsTable.id, contestId)).limit(1);
  res.json(await formatContest(updated));
});

router.post("/contests/:contestId/submit", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const contestId = Number(req.params.contestId);
  await db.insert(contestEntriesTable).values({ contestId, userId: req.user.id, content: req.body.content, mediaUrl: req.body.mediaUrl });
  await db.update(contestsTable).set({ entryCount: sql`${contestsTable.entryCount} + 1` }).where(eq(contestsTable.id, contestId));
  res.status(201).json({ success: true });
});

export default router;
