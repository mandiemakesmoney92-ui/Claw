import { Router } from "express";
import { db } from "@workspace/db";
import { circlesTable, circleMembersTable, clawProfilesTable } from "@workspace/db/schema";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

const CIRCLE_DEFAULTS = [
  { name: "Inner Circle", type: "Inner" as const },
  { name: "Network", type: "Network" as const },
  { name: "Opposition", type: "Opposition" as const },
];

router.post("/circles/ensure-defaults", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const existing = await db.select().from(circlesTable).where(eq(circlesTable.ownerId, req.user.id));
  const existingTypes = new Set(existing.map(c => c.type));
  const created: string[] = [];
  for (const def of CIRCLE_DEFAULTS) {
    if (!existingTypes.has(def.type)) {
      await db.insert(circlesTable).values({ ownerId: req.user.id, name: def.name, type: def.type });
      created.push(def.type);
    }
  }
  res.json({ created, existing: existing.length });
});

router.get("/circles", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const circles = await db.select().from(circlesTable).where(eq(circlesTable.ownerId, req.user.id));
  const formatted = await Promise.all(circles.map(async c => {
    const members = await db.select().from(circleMembersTable).where(eq(circleMembersTable.circleId, c.id)).limit(20);
    const memberProfiles = await Promise.all(members.map(async m => {
      const [p] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, m.userId)).limit(1);
      return p ? { id: p.userId, memberId: p.userId, username: p.username, displayName: p.displayName, avatarUrl: p.avatarUrl, interactionLevel: p.interactionLevel, isVerified: p.isVerified } : null;
    }));
    return { id: String(c.id), name: c.name, type: c.type, memberCount: c.memberCount || 0, members: memberProfiles.filter(Boolean), createdAt: c.createdAt?.toISOString() };
  }));
  res.json(formatted);
});

router.post("/circles", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const [circle] = await db.insert(circlesTable).values({ ownerId: req.user.id, name: req.body.name, type: req.body.type }).returning();
  res.status(201).json({ id: String(circle.id), name: circle.name, type: circle.type, memberCount: 0, members: [], createdAt: circle.createdAt?.toISOString() });
});

router.post("/circles/:circleId/members", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const circleId = Number(req.params.circleId);
  const [circle] = await db.select().from(circlesTable).where(and(eq(circlesTable.id, circleId), eq(circlesTable.ownerId, req.user.id))).limit(1);
  if (!circle) return res.status(403).json({ error: "Circle not found" });
  await db.insert(circleMembersTable).values({ circleId, userId: req.body.userId }).onConflictDoNothing();
  await db.update(circlesTable).set({ memberCount: sql`${circlesTable.memberCount} + 1` }).where(eq(circlesTable.id, circleId));
  res.json({ success: true });
});

router.delete("/circles/:circleId/members/:userId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const circleId = Number(req.params.circleId);
  const [circle] = await db.select().from(circlesTable).where(and(eq(circlesTable.id, circleId), eq(circlesTable.ownerId, req.user.id))).limit(1);
  if (!circle) return res.status(403).json({ error: "Circle not found" });
  await db.delete(circleMembersTable).where(and(eq(circleMembersTable.circleId, circleId), eq(circleMembersTable.userId, req.params.userId)));
  await db.update(circlesTable).set({ memberCount: sql`GREATEST(${circlesTable.memberCount} - 1, 0)` }).where(eq(circlesTable.id, circleId));
  res.json({ success: true });
});

export default router;
