import { Router } from "express";
import { db } from "@workspace/db";
import { clawCoinsTable, postBoostsTable, postsTable, clawProfilesTable } from "@workspace/db/schema";
import { eq, and, gt, desc, sql } from "drizzle-orm";

const router = Router();

const COIN_PACKAGES = [
  { id: "starter", coins: 50, price: 0.99, label: "Starter Pack" },
  { id: "claw", coins: 150, price: 1.99, label: "Claw Pack" },
  { id: "chaos", coins: 500, price: 4.99, label: "Chaos Pack" },
  { id: "legend", coins: 1500, price: 9.99, label: "Legend Pack" },
];

const BOOST_TYPES = [
  { id: "spotlight", label: "Spotlight", durationHours: 1, coins: 10, desc: "Top of feed for 1 hour" },
  { id: "prime", label: "Prime Spotlight", durationHours: 6, coins: 25, desc: "Top of feed for 6 hours" },
  { id: "viral", label: "Viral Push", durationHours: 24, coins: 50, desc: "Top of feed for 24 hours" },
];

async function getOrCreateCoins(userId: string) {
  let [row] = await db.select().from(clawCoinsTable).where(eq(clawCoinsTable.userId, userId)).limit(1);
  if (!row) {
    [row] = await db.insert(clawCoinsTable).values({ userId, balance: 0, lifetimeSpent: 0 }).returning();
  }
  return row;
}

router.get("/coins/me", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const coins = await getOrCreateCoins(req.user.id);
  res.json({ balance: coins.balance, lifetimeSpent: coins.lifetimeSpent, packages: COIN_PACKAGES, boostTypes: BOOST_TYPES });
});

// Coin purchases now go through Stripe — see /api/stripe/checkout
router.post("/coins/purchase", (_req, res) => {
  res.status(410).json({ error: "Use /api/stripe/checkout to purchase GEMZ coins." });
});

router.post("/posts/:postId/boost", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const postId = Number(req.params.postId);
  const { boostType = "spotlight" } = req.body;
  const boost = BOOST_TYPES.find(b => b.id === boostType);
  if (!boost) return res.status(400).json({ error: "Invalid boost type" });
  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  if (!post) return res.status(404).json({ error: "Post not found" });
  const coins = await getOrCreateCoins(req.user.id);
  if (coins.balance < boost.coins) return res.status(402).json({ error: "Insufficient CLAW Coins", balance: coins.balance, required: boost.coins });
  await db.update(clawCoinsTable).set({
    balance: sql`${clawCoinsTable.balance} - ${boost.coins}`,
    lifetimeSpent: sql`${clawCoinsTable.lifetimeSpent} + ${boost.coins}`,
    updatedAt: new Date(),
  }).where(eq(clawCoinsTable.userId, req.user.id));
  const expiresAt = new Date(Date.now() + boost.durationHours * 60 * 60 * 1000);
  const [newBoost] = await db.insert(postBoostsTable).values({
    postId, userId: req.user.id, coinsCost: boost.coins, boostType: boost.id, expiresAt,
  }).returning();
  res.json({ success: true, boost: newBoost, expiresAt: expiresAt.toISOString() });
});

router.get("/posts/boosted", async (req, res) => {
  const now = new Date();
  const boosts = await db.select().from(postBoostsTable)
    .where(gt(postBoostsTable.expiresAt, now))
    .orderBy(desc(postBoostsTable.createdAt))
    .limit(20);
  const postIds = [...new Set(boosts.map(b => b.postId))];
  if (!postIds.length) return res.json([]);
  const boostedPosts = await Promise.all(postIds.map(async id => {
    const [post] = await db.select().from(postsTable).where(eq(postsTable.id, id)).limit(1);
    if (!post || post.isPurged) return null;
    const [author] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, post.authorId)).limit(1);
    const activeBoost = boosts.find(b => b.postId === id);
    return { ...post, id: String(post.id), author: author ? { id: author.userId, username: author.username, displayName: author.displayName, avatarUrl: author.avatarUrl, isVerified: author.isVerified } : null, isBoosted: true, boostType: activeBoost?.boostType, boostExpiresAt: activeBoost?.expiresAt?.toISOString() };
  }));
  res.json(boostedPosts.filter(Boolean));
});

export default router;
