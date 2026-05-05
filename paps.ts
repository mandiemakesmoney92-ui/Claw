import { Router } from "express";
import { db } from "@workspace/db";
import { clawProfilesTable, notificationsTable, usersTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

const router = Router();

const papsTable = pgTable("claw_skippidy_paps", {
  id: serial("id").primaryKey(),
  fromUserId: text("from_user_id").notNull().references(() => usersTable.id),
  toUserId: text("to_user_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow(),
});

router.post("/paps/:userId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const toUserId = req.params.userId;
  if (toUserId === req.user.id) return res.status(400).json({ error: "Can't pap yourself" });

  const [fromProfile] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, req.user.id)).limit(1);
  const [toProfile] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, toUserId)).limit(1);
  if (!toProfile) return res.status(404).json({ error: "User not found" });

  await db.insert(papsTable).values({ fromUserId: req.user.id, toUserId });

  await db.insert(notificationsTable).values({
    userId: toUserId,
    type: "prank",
    actorId: req.user.id,
    message: `🐾 ${fromProfile?.displayName || "Someone"} skippidy papped you!`,
    isRead: false,
  });

  res.json({ ok: true, message: `Skippidy pap sent to ${toProfile.displayName}!` });
});

router.get("/paps/received", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const rows = await db.select({
    count: sql<number>`count(*)`,
  }).from(papsTable).where(eq(papsTable.toUserId, req.user.id));

  const recent = await db.select({
    id: papsTable.id,
    fromUserId: papsTable.fromUserId,
    createdAt: papsTable.createdAt,
    fromUsername: clawProfilesTable.username,
    fromDisplayName: clawProfilesTable.displayName,
    fromAvatar: clawProfilesTable.avatarUrl,
  })
    .from(papsTable)
    .leftJoin(clawProfilesTable, eq(papsTable.fromUserId, clawProfilesTable.userId))
    .where(eq(papsTable.toUserId, req.user.id))
    .orderBy(desc(papsTable.createdAt))
    .limit(20);

  res.json({ totalCount: Number(rows[0]?.count || 0), recent });
});

export default router;
