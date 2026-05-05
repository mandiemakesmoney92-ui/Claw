import { Router } from "express";
import { db } from "@workspace/db";
import { purgePostsTable, userBadgesTable } from "@workspace/db/schema";
import { eq, desc, gt, sql } from "drizzle-orm";

const router = Router();

router.get("/purge", async (req, res) => {
  try {
    const now = new Date();
    const posts = await db
      .select()
      .from(purgePostsTable)
      .where(gt(purgePostsTable.expiresAt, now))
      .orderBy(desc(purgePostsTable.createdAt))
      .limit(50);
    res.json(posts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/purge", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { content, isAnonymous = true, mood } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: "Content required" });
  if (content.length > 1000) return res.status(400).json({ error: "Too long (max 1000 chars)" });
  try {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const [post] = await db.insert(purgePostsTable).values({
      authorId: req.user.id,
      content: content.trim(),
      isAnonymous: !!isAnonymous,
      mood: mood || null,
      expiresAt,
    }).returning();

    // Check badge: Purge Warrior (25+ purge posts)
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(purgePostsTable)
      .where(eq(purgePostsTable.authorId, req.user.id));
    const count = Number(countResult[0]?.count || 0);
    if (count >= 25) {
      const existing = await db.select().from(userBadgesTable)
        .where(eq(userBadgesTable.userId, req.user.id));
      const hasBadge = existing.some(b => b.badgeId === "purge_warrior");
      if (!hasBadge) {
        await db.insert(userBadgesTable).values({ userId: req.user.id, badgeId: "purge_warrior" });
      }
    }

    res.json(post);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/purge/:id/like", async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await db.update(purgePostsTable)
      .set({ likeCount: sql`${purgePostsTable.likeCount} + 1` })
      .where(eq(purgePostsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/purge/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const id = parseInt(req.params.id);
  try {
    await db.delete(purgePostsTable)
      .where(eq(purgePostsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
