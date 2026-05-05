import { Router } from "express";
import { db } from "@workspace/db";
import { confessionsTable, clawProfilesTable, notificationsTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.post("/confessions", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { content, targetIdentifier, isAnonymous, targetUserId } = req.body;
  let toUserId = targetUserId;
  if (!toUserId && targetIdentifier) {
    const [profile] = await db.select().from(clawProfilesTable)
      .where(eq(clawProfilesTable.username, targetIdentifier)).limit(1);
    toUserId = profile?.userId;
  }
  await db.insert(confessionsTable).values({
    fromUserId: req.user.id, toUserId, targetIdentifier, content, isAnonymous,
    isPending: !toUserId,
  });
  if (toUserId) {
    await db.insert(notificationsTable).values({
      userId: toUserId, type: "confession",
      message: isAnonymous ? "You received an anonymous confession" : "Someone confessed something to you",
      fromUserId: isAnonymous ? null : req.user.id
    }).catch(() => {});
  }
  res.status(201).json({ success: true });
});

router.get("/confessions/received", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const confessions = await db.select().from(confessionsTable)
    .where(eq(confessionsTable.toUserId, req.user.id))
    .orderBy(desc(confessionsTable.createdAt));
  const formatted = await Promise.all(confessions.map(async c => {
    let fromUser = undefined;
    if (!c.isAnonymous && c.fromUserId && c.isRevealed) {
      const [p] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, c.fromUserId)).limit(1);
      if (p) fromUser = { id: p.userId, username: p.username, displayName: p.displayName, avatarUrl: p.avatarUrl, interactionLevel: p.interactionLevel, isVerified: p.isVerified };
    }
    return {
      id: String(c.id), content: c.content, isAnonymous: c.isAnonymous,
      fromUserId: c.isRevealed ? c.fromUserId : undefined,
      fromUser, isRevealed: c.isRevealed || false,
      createdAt: c.createdAt?.toISOString(),
    };
  }));
  res.json(formatted);
});

router.post("/confessions/:confessionId/reveal", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const confessionId = Number(req.params.confessionId);
  await db.update(confessionsTable).set({ isRevealed: true }).where(eq(confessionsTable.id, confessionId));
  const [updated] = await db.select().from(confessionsTable).where(eq(confessionsTable.id, confessionId)).limit(1);
  let fromUser = undefined;
  if (updated?.fromUserId) {
    const [p] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, updated.fromUserId)).limit(1);
    if (p) fromUser = { id: p.userId, username: p.username, displayName: p.displayName, avatarUrl: p.avatarUrl, interactionLevel: p.interactionLevel, isVerified: p.isVerified };
  }
  res.json({
    id: String(updated?.id), content: updated?.content, isAnonymous: updated?.isAnonymous,
    fromUserId: updated?.fromUserId, fromUser, isRevealed: true, createdAt: updated?.createdAt?.toISOString(),
  });
});

export default router;
