import { Router } from "express";
import { db } from "@workspace/db";
import { ghostLettersTable, clawProfilesTable } from "@workspace/db/schema";
import { eq, and, desc, lte } from "drizzle-orm";
import { sql } from "drizzle-orm";

const router = Router();

const SOULZ_PER_LETTER = 10;

router.get("/ghost-letters", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const letters = await db.select()
    .from(ghostLettersTable)
    .where(eq(ghostLettersTable.userId, req.user.id))
    .orderBy(desc(ghostLettersTable.createdAt));

  const now = new Date();
  const formatted = letters.map(l => {
    const createdAt = l.createdAt || new Date();
    const ageMs = now.getTime() - createdAt.getTime();
    const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
    const isResurfaceable = ageDays >= 30 && !l.surfacedAt;
    return {
      id: String(l.id),
      title: l.title,
      content: l.content,
      toName: l.toName,
      soulzEarned: l.soulzEarned,
      createdAt: createdAt.toISOString(),
      ageDays,
      isResurfaceable,
      surfacedAt: l.surfacedAt?.toISOString() || null,
    };
  });
  res.json(formatted);
});

router.post("/ghost-letters", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { title, content, toName } = req.body;
  if (!title?.trim() || !content?.trim()) return res.status(400).json({ error: "Title and content required" });

  // Only award SOULZ on the very first ghost letter
  const existing = await db.select({ id: ghostLettersTable.id })
    .from(ghostLettersTable)
    .where(eq(ghostLettersTable.userId, req.user.id))
    .limit(1);
  const isFirstLetter = existing.length === 0;
  const soulzToAward = isFirstLetter ? SOULZ_PER_LETTER : 0;

  const [letter] = await db.insert(ghostLettersTable).values({
    userId: req.user.id,
    title: title.trim(),
    content: content.trim(),
    toName: toName?.trim() || null,
    soulzEarned: soulzToAward,
  }).returning();

  if (isFirstLetter) {
    (async () => {
      try {
        await db.update(clawProfilesTable)
          .set({ soulzBalance: sql`${clawProfilesTable.soulzBalance} + ${SOULZ_PER_LETTER}` })
          .where(eq(clawProfilesTable.userId, req.user.id));
      } catch {}
    })();
  }

  res.status(201).json({
    id: String(letter.id),
    title: letter.title,
    content: letter.content,
    toName: letter.toName,
    soulzEarned: soulzToAward,
    isFirstLetter,
    createdAt: letter.createdAt?.toISOString(),
    ageDays: 0,
    isResurfaceable: false,
    surfacedAt: null,
  });
});

router.delete("/ghost-letters/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const id = Number(req.params.id);
  const [letter] = await db.select().from(ghostLettersTable)
    .where(and(eq(ghostLettersTable.id, id), eq(ghostLettersTable.userId, req.user.id))).limit(1);
  if (!letter) return res.status(404).json({ error: "Not found" });
  await db.delete(ghostLettersTable).where(eq(ghostLettersTable.id, id));
  res.json({ success: true });
});

// Mark a letter as surfaced (Ringy resurfaced it)
router.post("/ghost-letters/:id/surface", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const id = Number(req.params.id);
  const [letter] = await db.select().from(ghostLettersTable)
    .where(and(eq(ghostLettersTable.id, id), eq(ghostLettersTable.userId, req.user.id))).limit(1);
  if (!letter) return res.status(404).json({ error: "Not found" });
  await db.update(ghostLettersTable).set({ surfacedAt: new Date() }).where(eq(ghostLettersTable.id, id));
  res.json({ success: true });
});

export default router;
