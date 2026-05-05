import { Router } from "express";
import { db } from "@workspace/db";
import { dreamEntriesTable, userBadgesTable } from "@workspace/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

const router = Router();

router.get("/dreams/:userId", async (req, res) => {
  const { userId } = req.params;
  const isOwner = req.isAuthenticated() && req.user.id === userId;
  try {
    const entries = await db
      .select()
      .from(dreamEntriesTable)
      .where(
        isOwner
          ? eq(dreamEntriesTable.userId, userId)
          : and(eq(dreamEntriesTable.userId, userId), eq(dreamEntriesTable.isPublic, true))
      )
      .orderBy(desc(dreamEntriesTable.createdAt))
      .limit(20);
    res.json(entries);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/dreams", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { title, content, dreamType = "dream", mood, isPublic = true } = req.body;
  if (!title?.trim() || !content?.trim()) return res.status(400).json({ error: "Title and content required" });
  try {
    const [entry] = await db.insert(dreamEntriesTable).values({
      userId: req.user.id,
      title: title.trim(),
      content: content.trim(),
      dreamType,
      mood: mood || null,
      isPublic: !!isPublic,
    }).returning();

    // Badge: Dream Weaver (15+ entries)
    const countResult = await db.select({ count: sql<number>`count(*)` })
      .from(dreamEntriesTable)
      .where(eq(dreamEntriesTable.userId, req.user.id));
    const count = Number(countResult[0]?.count || 0);
    if (count >= 15) {
      const existing = await db.select().from(userBadgesTable)
        .where(eq(userBadgesTable.userId, req.user.id));
      if (!existing.some(b => b.badgeId === "dream_weaver")) {
        await db.insert(userBadgesTable).values({ userId: req.user.id, badgeId: "dream_weaver" });
      }
    }

    res.json(entry);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/dreams/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const id = parseInt(req.params.id);
  try {
    await db.delete(dreamEntriesTable)
      .where(and(eq(dreamEntriesTable.id, id), eq(dreamEntriesTable.userId, req.user.id)));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
