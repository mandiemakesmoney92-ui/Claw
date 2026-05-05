import { Router } from "express";
import { db } from "@workspace/db";
import { betsTable, betSidesTable, clawProfilesTable } from "@workspace/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

const router = Router();

async function formatBet(bet: typeof betsTable.$inferSelect, currentUserId?: string) {
  const [creator] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, bet.creatorId)).limit(1);
  const sides = await db.select().from(betSidesTable).where(eq(betSidesTable.betId, bet.id));
  const myBet = currentUserId ? sides.find(s => s.userId === currentUserId) : null;
  return {
    id: bet.id,
    creatorId: bet.creatorId,
    creator: creator ? { id: creator.userId, username: creator.username, displayName: creator.displayName, avatarUrl: creator.avatarUrl } : null,
    title: bet.title,
    description: bet.description,
    stakeAmount: bet.stakeAmount,
    status: bet.status,
    winningSide: bet.winningSide,
    forCount: bet.forCount,
    againstCount: bet.againstCount,
    totalPot: bet.totalPot,
    platformCutPct: bet.platformCutPct,
    settledAt: bet.settledAt?.toISOString() ?? null,
    createdAt: bet.createdAt?.toISOString() ?? null,
    mySide: myBet?.side ?? null,
    sides: sides.map(s => ({ id: s.id, userId: s.userId, side: s.side, amount: s.amount, payout: s.payout })),
  };
}

router.get("/bets", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const bets = await db.select().from(betsTable).orderBy(desc(betsTable.createdAt)).limit(50);
  const formatted = await Promise.all(bets.map(b => formatBet(b, req.user.id)));
  res.json(formatted);
});

router.get("/bets/mine", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const mySides = await db.select().from(betSidesTable).where(eq(betSidesTable.userId, req.user.id));
  const createdBets = await db.select().from(betsTable).where(eq(betsTable.creatorId, req.user.id));
  const sideBetIds = mySides.map(s => s.betId);
  const all = new Map<number, typeof betsTable.$inferSelect>();
  for (const b of createdBets) all.set(b.id, b);
  if (sideBetIds.length > 0) {
    const participated = await db.select().from(betsTable).where(sql`${betsTable.id} = ANY(${sideBetIds})`);
    for (const b of participated) all.set(b.id, b);
  }
  const formatted = await Promise.all(Array.from(all.values()).map(b => formatBet(b, req.user.id)));
  res.json(formatted.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()));
});

router.post("/bets", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { title, description, stakeAmount } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: "Title required" });
  const stake = Math.max(5, Math.min(10000, Number(stakeAmount) || 10));
  const [bet] = await db.insert(betsTable).values({
    creatorId: req.user.id,
    title: title.trim(),
    description: description?.trim() || null,
    stakeAmount: stake,
    status: "open",
    totalPot: 0,
  }).returning();
  res.status(201).json(await formatBet(bet, req.user.id));
});

router.post("/bets/:betId/side", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const betId = Number(req.params.betId);
  const { side } = req.body;
  if (!["for", "against"].includes(side)) return res.status(400).json({ error: "Side must be 'for' or 'against'" });

  const [bet] = await db.select().from(betsTable).where(eq(betsTable.id, betId)).limit(1);
  if (!bet) return res.status(404).json({ error: "Bet not found" });
  if (bet.status !== "open") return res.status(400).json({ error: "Bet is no longer open" });
  if (bet.creatorId === req.user.id) return res.status(400).json({ error: "Cannot bet on your own bet" });

  const [existing] = await db.select().from(betSidesTable).where(and(eq(betSidesTable.betId, betId), eq(betSidesTable.userId, req.user.id))).limit(1);
  if (existing) return res.status(400).json({ error: "You already placed a bet on this" });

  const [profile] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, req.user.id)).limit(1);
  if (!profile) return res.status(400).json({ error: "Profile not found" });
  if ((profile.soulzBalance ?? 0) < bet.stakeAmount) return res.status(400).json({ error: `Not enough SOULZ — you need ${bet.stakeAmount}` });

  await db.update(clawProfilesTable).set({ soulzBalance: (profile.soulzBalance ?? 0) - bet.stakeAmount }).where(eq(clawProfilesTable.userId, req.user.id));
  await db.insert(betSidesTable).values({ betId, userId: req.user.id, side, amount: bet.stakeAmount });
  await db.update(betsTable).set({
    forCount: side === "for" ? bet.forCount + 1 : bet.forCount,
    againstCount: side === "against" ? bet.againstCount + 1 : bet.againstCount,
    totalPot: bet.totalPot + bet.stakeAmount,
  }).where(eq(betsTable.id, betId));

  const [updated] = await db.select().from(betsTable).where(eq(betsTable.id, betId)).limit(1);
  res.status(201).json(await formatBet(updated, req.user.id));
});

router.post("/bets/:betId/settle", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const betId = Number(req.params.betId);
  const { winningSide } = req.body;
  if (!["for", "against"].includes(winningSide)) return res.status(400).json({ error: "winningSide must be 'for' or 'against'" });

  const [bet] = await db.select().from(betsTable).where(eq(betsTable.id, betId)).limit(1);
  if (!bet) return res.status(404).json({ error: "Bet not found" });
  if (bet.creatorId !== req.user.id) return res.status(403).json({ error: "Only the creator can settle" });
  if (bet.status !== "open") return res.status(400).json({ error: "Bet already settled" });

  const sides = await db.select().from(betSidesTable).where(eq(betSidesTable.betId, betId));
  const winners = sides.filter(s => s.side === winningSide);
  const losers = sides.filter(s => s.side !== winningSide);

  if (winners.length === 0) {
    await db.update(betsTable).set({ status: "cancelled", settledAt: new Date() }).where(eq(betsTable.id, betId));
    for (const s of sides) {
      await db.update(clawProfilesTable).set({ soulzBalance: sql`${clawProfilesTable.soulzBalance} + ${s.amount}` }).where(eq(clawProfilesTable.userId, s.userId));
    }
    return res.json({ message: "No winners — all SOULZ refunded", status: "cancelled" });
  }

  const loserPool = losers.reduce((acc, s) => acc + s.amount, 0);
  const platformCut = Math.floor(loserPool * (bet.platformCutPct / 100));
  const distributable = loserPool - platformCut;
  const perWinner = Math.floor(distributable / winners.length);

  for (const w of winners) {
    const totalPayout = w.amount + perWinner;
    await db.update(clawProfilesTable).set({ soulzBalance: sql`${clawProfilesTable.soulzBalance} + ${totalPayout}` }).where(eq(clawProfilesTable.userId, w.userId));
    await db.update(betSidesTable).set({ payout: totalPayout }).where(eq(betSidesTable.id, w.id));
  }

  await db.update(betsTable).set({ status: "settled", winningSide, settledAt: new Date() }).where(eq(betsTable.id, betId));
  const [updated] = await db.select().from(betsTable).where(eq(betsTable.id, betId)).limit(1);
  res.json(await formatBet(updated, req.user.id));
});

router.delete("/bets/:betId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const betId = Number(req.params.betId);
  const [bet] = await db.select().from(betsTable).where(eq(betsTable.id, betId)).limit(1);
  if (!bet) return res.status(404).json({ error: "Bet not found" });
  if (bet.creatorId !== req.user.id) return res.status(403).json({ error: "Only creator can cancel" });
  if (bet.totalPot > 0) return res.status(400).json({ error: "Cannot cancel after bets placed — settle it instead" });
  await db.delete(betsTable).where(eq(betsTable.id, betId));
  res.json({ message: "Bet cancelled" });
});

export default router;
