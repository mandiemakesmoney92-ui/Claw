import { Router } from "express";
import { db } from "@workspace/db";
import { clawProfilesTable, referralsTable, clawCoinsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";

const router = Router();

const GEMZ_REWARD_REFERRER = 100;
const GEMZ_REWARD_REFERRED = 25;

function generateCode(username: string): string {
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `${username.slice(0, 6).toUpperCase()}-${suffix}`;
}

async function awardGemz(userId: string, amount: number) {
  const existing = await db.select().from(clawCoinsTable).where(eq(clawCoinsTable.userId, userId)).limit(1);
  if (existing.length === 0) {
    await db.insert(clawCoinsTable).values({ userId, balance: amount });
  } else {
    await db.update(clawCoinsTable).set({ balance: existing[0].balance + amount }).where(eq(clawCoinsTable.userId, userId));
  }
}

// GET /api/referrals/me — get my referral code and stats
router.get("/referrals/me", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const [profile] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, req.user.id)).limit(1);
  if (!profile) return res.status(404).json({ error: "Profile not found" });

  let code = profile.referralCode;

  // Auto-generate code if not exists
  if (!code) {
    code = generateCode(profile.username);
    try {
      await db.update(clawProfilesTable).set({ referralCode: code }).where(eq(clawProfilesTable.userId, req.user.id));
    } catch {
      code = generateCode(profile.username + "2");
      await db.update(clawProfilesTable).set({ referralCode: code }).where(eq(clawProfilesTable.userId, req.user.id));
    }
  }

  const referrals = await db.select().from(referralsTable).where(eq(referralsTable.referrerId, req.user.id));
  const totalGemzEarned = referrals.reduce((sum, r) => sum + (r.gemzAwarded || 0), 0);

  res.json({
    code,
    referralCount: profile.referralCount || 0,
    totalGemzEarned,
    referrals: referrals.map(r => ({
      id: r.id,
      convertedAt: r.convertedAt,
      gemzAwarded: r.gemzAwarded,
    })),
    referralUrl: `https://www.mystichiddengem.com/?ref=${code}`,
  });
});

// POST /api/referrals/claim — new user claims a referral code
router.post("/referrals/claim", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "code required" });

  const [myProfile] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, req.user.id)).limit(1);
  if (!myProfile) return res.status(404).json({ error: "Profile not found" });

  // Already claimed
  if (myProfile.referredByCode) return res.status(409).json({ error: "Already claimed a referral" });

  // Can't use your own code
  if (myProfile.referralCode === code) return res.status(400).json({ error: "Can't use your own referral code" });

  // Find referrer
  const [referrerProfile] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.referralCode, code)).limit(1);
  if (!referrerProfile) return res.status(404).json({ error: "Invalid referral code" });

  // Save referral
  await db.update(clawProfilesTable).set({ referredByCode: code }).where(eq(clawProfilesTable.userId, req.user.id));

  const now = new Date();
  await db.insert(referralsTable).values({
    referrerId: referrerProfile.userId,
    referredUserId: req.user.id,
    referralCode: code,
    gemzAwarded: GEMZ_REWARD_REFERRER,
    convertedAt: now,
  });

  // Award GEMZ
  await Promise.all([
    awardGemz(referrerProfile.userId, GEMZ_REWARD_REFERRER),
    awardGemz(req.user.id, GEMZ_REWARD_REFERRED),
    db.update(clawProfilesTable)
      .set({ referralCount: (referrerProfile.referralCount || 0) + 1 })
      .where(eq(clawProfilesTable.userId, referrerProfile.userId)),
  ]);

  res.json({
    ok: true,
    referrerDisplayName: referrerProfile.displayName,
    gemzAwarded: GEMZ_REWARD_REFERRED,
    message: `You and ${referrerProfile.displayName} both earned GEMZ!`,
  });
});

export default router;
