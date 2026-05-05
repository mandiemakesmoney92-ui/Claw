import { Router } from "express";
import { db } from "@workspace/db";
import {
  pranksTable,
  clawProfilesTable,
  notificationsTable,
  prankTypeEnum,
} from "@workspace/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

const router = Router();

const PRANK_META: Record<string, { emoji: string; name: string; label: string }> = {
  waterBalloon: { emoji: "💦", name: "Water Balloon", label: "hurled a water balloon at" },
  pie:          { emoji: "🥧", name: "Cream Pie",     label: "smashed a cream pie into the face of" },
  dogPoop:      { emoji: "💩", name: "Flaming Poop Bag", label: "ding-dong-ditched a flaming bag of doom on" },
  glitterBomb:  { emoji: "✨", name: "Glitter Bomb",  label: "exploded a glitter bomb all over" },
};

const PRANK_PACKS = [
  { id: "pack5",  count: 5,  cost: 15, label: "5-Pack",  description: "Five pranks. Use wisely." },
  { id: "pack10", count: 10, cost: 25, label: "10-Pack", description: "Ten pranks. Absolute chaos." },
];

// ── Get prank inventory ───────────────────────────────────────────────────────
router.get("/pranks/inventory", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const [profile] = await db.select().from(clawProfilesTable)
    .where(eq(clawProfilesTable.userId, req.user.id)).limit(1);
  const raw = (profile as any)?.prankInventory || "{}";
  let inventory: Record<string, number> = {};
  try { inventory = JSON.parse(raw); } catch {}
  res.json({ inventory, packs: PRANK_PACKS });
});

// ── Buy a prank pack (spend GEMZ) ─────────────────────────────────────────────
router.post("/pranks/buy", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { packId, prankType } = req.body;

  const pack = PRANK_PACKS.find(p => p.id === packId);
  if (!pack) return res.status(400).json({ error: "Invalid pack" });
  const meta = PRANK_META[prankType];
  if (!meta) return res.status(400).json({ error: "Invalid prank type" });

  const [profile] = await db.select().from(clawProfilesTable)
    .where(eq(clawProfilesTable.userId, req.user.id)).limit(1);
  if (!profile) return res.status(404).json({ error: "Profile not found" });

  const gemz = (profile as any).gemz ?? 0;
  if (gemz < pack.cost) return res.status(400).json({ error: "Not enough GEMZ" });

  let inventory: Record<string, number> = {};
  try { inventory = JSON.parse((profile as any).prankInventory || "{}"); } catch {}
  inventory[prankType] = (inventory[prankType] || 0) + pack.count;

  await db.update(clawProfilesTable).set({
    gemz: gemz - pack.cost,
    prankInventory: JSON.stringify(inventory),
  } as any).where(eq(clawProfilesTable.userId, req.user.id));

  res.json({ ok: true, inventory, gemzRemaining: gemz - pack.cost });
});

// ── Send a prank ──────────────────────────────────────────────────────────────
router.post("/pranks/send", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { toUserId, prankType, message } = req.body;
  if (!toUserId || !prankType) return res.status(400).json({ error: "toUserId and prankType required" });

  const meta = PRANK_META[prankType];
  if (!meta) return res.status(400).json({ error: "Invalid prank type" });

  const [senderProfile] = await db.select().from(clawProfilesTable)
    .where(eq(clawProfilesTable.userId, req.user.id)).limit(1);
  if (!senderProfile) return res.status(404).json({ error: "Profile not found" });

  let inventory: Record<string, number> = {};
  try { inventory = JSON.parse((senderProfile as any).prankInventory || "{}"); } catch {}
  const count = inventory[prankType] || 0;
  if (count <= 0) return res.status(400).json({ error: "No pranks of this type left. Buy a pack!" });

  inventory[prankType] = count - 1;

  await db.update(clawProfilesTable).set({
    prankInventory: JSON.stringify(inventory),
  } as any).where(eq(clawProfilesTable.userId, req.user.id));

  const [prank] = await db.insert(pranksTable).values({
    fromUserId: req.user.id,
    toUserId,
    type: prankType as any,
    message: message ? String(message).slice(0, 200) : null,
  }).returning();

  const senderName = (senderProfile as any).displayName || "Someone";
  await db.insert(notificationsTable).values({
    userId: toUserId,
    type: "prank" as any,
    fromUserId: req.user.id,
    message: `${senderName} ${meta.label} you ${meta.emoji}${message ? ` — "${message}"` : ""}`,
  } as any);

  res.json({ ok: true, prank, inventoryRemaining: inventory[prankType] });
});

// ── Get received pranks ───────────────────────────────────────────────────────
router.get("/pranks/received", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const received = await db
    .select({
      id: pranksTable.id,
      type: pranksTable.type,
      message: pranksTable.message,
      createdAt: pranksTable.createdAt,
      fromDisplayName: clawProfilesTable.displayName,
      fromAvatarUrl: clawProfilesTable.avatarUrl,
    })
    .from(pranksTable)
    .leftJoin(clawProfilesTable, eq(pranksTable.fromUserId, clawProfilesTable.userId))
    .where(eq(pranksTable.toUserId, req.user.id))
    .orderBy(desc(pranksTable.createdAt))
    .limit(50);
  res.json(received.map(p => ({ ...p, meta: PRANK_META[p.type] })));
});

// ── Get prank types catalog ───────────────────────────────────────────────────
router.get("/pranks/catalog", (_req, res) => {
  res.json(PRANK_META);
});

export default router;
