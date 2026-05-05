import { Router } from "express";
import { db } from "@workspace/db";
import { clawProfilesTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

const router = Router();

// Compute decayed vitals based on time elapsed
function decayVitals(profile: any) {
  const now = Date.now();
  const last = new Date(profile.vitalsUpdatedAt || profile.createdAt).getTime();
  const hoursElapsed = (now - last) / (1000 * 60 * 60);
  // Decay rates per hour
  const hungerDecay = Math.min(hoursElapsed * 3, 100);   // Hungry after ~33h
  const energyDecay = Math.min(hoursElapsed * 2, 100);   // Tired after ~50h
  const healthDecay = Math.min(hoursElapsed * 0.5, 100); // Health slow decay
  return {
    hunger: Math.max(0, (profile.hunger ?? 100) - hungerDecay),
    health: Math.max(0, (profile.health ?? 100) - healthDecay),
    energy: Math.max(0, (profile.energy ?? 100) - energyDecay),
  };
}

// GET /api/vitals/:userId
router.get("/vitals/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const [profile] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, userId));
    if (!profile) return res.status(404).json({ error: "Profile not found" });
    const current = decayVitals(profile);
    res.json({
      hunger: Math.round(current.hunger),
      health: Math.round(current.health),
      energy: Math.round(current.energy),
      credibilityScore: profile.credibilityScore ?? 50,
      truthDebt: profile.truthDebt ?? 0,
      soulzBalance: profile.soulzBalance ?? 0,
      humanVerified: profile.humanVerified ?? false,
      isInPurgatory: profile.isInPurgatory ?? false,
      penanceCompleted: profile.penanceCompleted ?? 0,
      penanceRequired: profile.penanceRequired ?? 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vitals/me/restore — restore vitals after positive action
router.post("/vitals/me/restore", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { action } = req.body; // "compliment", "post", "confession", "login"
  const boosts: Record<string, { hunger: number; energy: number; health: number }> = {
    compliment: { hunger: 5, energy: 10, health: 5 },
    post: { hunger: 2, energy: -5, health: 2 },
    confession: { hunger: 3, energy: 5, health: 10 },
    login: { hunger: 10, energy: 20, health: 5 },
    penance: { hunger: 15, energy: 15, health: 20 },
  };
  const boost = boosts[action] || { hunger: 2, energy: 2, health: 2 };
  try {
    const [profile] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, req.user.id));
    if (!profile) return res.status(404).json({ error: "Profile not found" });
    const current = decayVitals(profile);
    await db.update(clawProfilesTable).set({
      hunger: Math.min(100, Math.round(current.hunger) + boost.hunger),
      energy: Math.min(100, Math.round(current.energy) + boost.energy),
      health: Math.min(100, Math.round(current.health) + boost.health),
      vitalsUpdatedAt: new Date(),
    }).where(eq(clawProfilesTable.userId, req.user.id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vitals/me/earn-soulz — earn social capital
router.post("/vitals/me/earn-soulz", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { amount, reason } = req.body;
  const safeAmount = Math.min(Math.max(1, parseInt(amount) || 1), 50);
  try {
    await db.update(clawProfilesTable)
      .set({ soulzBalance: sql`soulz_balance + ${safeAmount}` })
      .where(eq(clawProfilesTable.userId, req.user.id));
    res.json({ earned: safeAmount, reason });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/vitals/me/humanity-verify — mark as human verified with optional score
router.post("/vitals/me/humanity-verify", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { humanityScore } = req.body;
  const score = typeof humanityScore === "number" ? humanityScore : 60;
  try {
    // Score < 30: flag for manual review (don't grant badge yet)
    if (score < 30) {
      await db.update(clawProfilesTable).set({
        credibilityScore: sql`GREATEST(credibility_score - 5, 0)`,
      }).where(eq(clawProfilesTable.userId, req.user.id));
      return res.json({ success: false, flagged: true, score, message: "Flagged for manual review" });
    }
    await db.update(clawProfilesTable).set({
      humanVerified: true,
      humanVerifiedAt: new Date(),
      soulzBalance: sql`soulz_balance + 100`,
      credibilityScore: sql`LEAST(credibility_score + ${score >= 80 ? 20 : 10}, 100)`,
    }).where(eq(clawProfilesTable.userId, req.user.id));
    res.json({ success: true, score, flagged: false, message: "Humanity Verified — 100 SOULZ awarded" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
