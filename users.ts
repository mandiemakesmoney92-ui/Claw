import { Router } from "express";
import { db } from "@workspace/db";
import {
  clawProfilesTable, followsTable, topConnectionsTable,
  tipsTable, dailyComplimentsTable, notificationsTable, blockedUsersTable, profileReactionsTable,
  clawCoinsTable
} from "@workspace/db/schema";
import { eq, and, or, ilike, desc, sql } from "drizzle-orm";
import { usersTable } from "@workspace/db";
import { notifyUser } from "../lib/notification-service";

const router = Router();

async function getOrCreateProfile(userId: string, replUser: { username?: string; firstName?: string | null; lastName?: string | null; profileImage?: string; profileImageUrl?: string | null }) {
  let profile = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, userId)).limit(1);
  if (profile.length === 0) {
    const username = replUser.username || `user_${userId.slice(0, 8)}`;
    const displayName = [replUser.firstName, replUser.lastName].filter(Boolean).join(" ") || username;
    await db.insert(clawProfilesTable).values({
      userId,
      username,
      displayName,
      avatarUrl: replUser.profileImage || replUser.profileImageUrl || null,
      interactionLevel: "Soft",
    });
    profile = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, userId)).limit(1);
    // Give new users 100 starter GEMZ
    await db.insert(clawCoinsTable).values({ userId, balance: 100, lifetimeSpent: 0 })
      .onConflictDoNothing();
  } else {
    // Ensure coins row exists for legacy accounts with no entry
    await db.insert(clawCoinsTable).values({ userId, balance: 100, lifetimeSpent: 0 })
      .onConflictDoNothing();
  }
  return profile[0];
}

function formatProfile(profile: typeof clawProfilesTable.$inferSelect, isFollowing = false) {
  return {
    id: profile.userId,
    username: profile.username,
    displayName: profile.displayName,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    bannerUrl: profile.bannerUrl,
    interactionLevel: profile.interactionLevel,
    profileFont: profile.profileFont,
    profileColor: profile.profileColor,
    profileLayout: profile.profileLayout,
    profileSong: profile.profileSong,
    profileSongTitle: profile.profileSongTitle,
    audioAutoplay: profile.audioAutoplay,
    isVerified: profile.isVerified,
    isSuspended: profile.isSuspended,
    shameBadge: profile.shameBadge,
    totalTipsReceived: profile.totalTipsReceived,
    followerCount: profile.followerCount,
    followingCount: profile.followingCount,
    postCount: profile.postCount,
    isFollowing,
    tipJarEnabled: profile.tipJarEnabled,
    profileTheme: profile.profileTheme,
    profileCursor: profile.profileCursor,
    purchasedThemes: (() => { try { return JSON.parse((profile as any).purchasedThemes || "[]"); } catch { return []; } })(),
    purchasedFonts: (() => { try { return JSON.parse((profile as any).purchasedFonts || "[]"); } catch { return []; } })(),
    profileFontColor: profile.profileFontColor || "#ffffff",
    profileEffect: (profile as any).profileEffect || "none",
    purchasedEffects: (() => { try { return JSON.parse((profile as any).purchasedEffects || "[]"); } catch { return []; } })(),
    ringyOutfit: (profile as any).ringyOutfit || "default",
    purchasedCursors: (() => { try { return JSON.parse((profile as any).purchasedCursors || "[]"); } catch { return []; } })(),
    soulzBalance: (profile as any).soulzBalance || 0,
    currentMood: profile.currentMood,
    moodUpdatedAt: profile.moodUpdatedAt?.toISOString(),
    // Zodiac & personality
    zodiacSign: profile.zodiacSign,
    mbtiType: profile.mbtiType,
    // Pets
    hasPets: profile.hasPets,
    petCats: profile.petCats,
    petDogs: profile.petDogs,
    petBirds: profile.petBirds,
    petFish: profile.petFish,
    petRabbits: profile.petRabbits,
    petHamsters: profile.petHamsters,
    petReptiles: profile.petReptiles,
    petOtherType: profile.petOtherType,
    petOtherCount: profile.petOtherCount,
    createdAt: profile.createdAt?.toISOString(),
  };
}

router.get("/users/me", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const profile = await getOrCreateProfile(req.user.id, req.user);
  res.json(formatProfile(profile));
});

router.patch("/users/me", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const profile = await getOrCreateProfile(req.user.id, req.user);
  const allowed = ["displayName","username","bio","avatarUrl","bannerUrl","interactionLevel","profileFont","profileColor","profileLayout","profileSong","profileSongTitle","audioAutoplay","tipJarEnabled","zodiacSign","mbtiType","hasPets","petCats","petDogs","petBirds","petFish","petRabbits","petHamsters","petReptiles","petOtherType","petOtherCount","currentMood","profileTheme","profileCursor","purchasedThemes","purchasedFonts","profileFontColor","profileEffect","purchasedEffects","ringyOutfit","purchasedCursors","at3am","deepFears","moonFeeling","movingSong","comfortFood","confessedFlaws","embarrassingHabit","dirtyHabit","favScent","parentsFav","grandmaSays","familyVibe","weirdQuirks","favSlang","favAnimal","scars","traumas","deepnessLevel","dirtySecrets","peopleView","lifeStance","lifePurpose","beautyInAll","equippedMask","purchasedMasks","masqueradeActive","masqueradeUntil"];
  const updates: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key === "displayName" ? "displayName" : key] = req.body[key];
  }
  // Username uniqueness check
  if (updates.username) {
    const existing = await db.select({ userId: clawProfilesTable.userId }).from(clawProfilesTable)
      .where(eq(clawProfilesTable.username, String(updates.username).toLowerCase()))
      .limit(1);
    if (existing.length > 0 && existing[0].userId !== req.user.id) {
      return res.status(409).json({ error: "Username already taken" });
    }
    updates.username = String(updates.username).toLowerCase();
  }
  if (Object.keys(updates).length > 0) {
    await db.update(clawProfilesTable).set(updates).where(eq(clawProfilesTable.userId, req.user.id));
  }
  const updated = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, req.user.id)).limit(1);
  res.json(formatProfile(updated[0]));
});

router.get("/users/search", async (req, res) => {
  const q = String(req.query.q || "");
  if (!q) return res.json([]);
  const results = await db.select().from(clawProfilesTable)
    .where(or(ilike(clawProfilesTable.username, `%${q}%`), ilike(clawProfilesTable.displayName, `%${q}%`)))
    .limit(20);
  const ONLINE_THRESHOLD = 5 * 60 * 1000;
  res.json(results.map(p => ({
    id: p.userId, username: p.username, displayName: p.displayName, avatarUrl: p.avatarUrl,
    interactionLevel: p.interactionLevel, isVerified: p.isVerified, isMember: p.isMember,
    isOnline: p.lastSeenAt ? (Date.now() - new Date(p.lastSeenAt).getTime() < ONLINE_THRESHOLD) : false,
  })));
});

router.get("/users/me/top-friends", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const connections = await db.select().from(topConnectionsTable)
    .where(eq(topConnectionsTable.ownerId, req.user.id))
    .orderBy(topConnectionsTable.slot);
  const friends = connections.filter(c => c.connectionType === "friend");
  const haters = connections.filter(c => c.connectionType === "hater");
  async function getProfiles(items: typeof connections) {
    const profiles = [];
    for (const item of items) {
      const [p] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, item.targetId)).limit(1);
      if (p) profiles.push({ id: p.userId, username: p.username, displayName: p.displayName, avatarUrl: p.avatarUrl, interactionLevel: p.interactionLevel, isVerified: p.isVerified });
    }
    return profiles;
  }
  res.json({ topFriends: await getProfiles(friends), topHaters: await getProfiles(haters) });
});

router.post("/users/me/top-friends/set", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { userId, type, slot } = req.body;
  await db.delete(topConnectionsTable).where(
    and(eq(topConnectionsTable.ownerId, req.user.id), eq(topConnectionsTable.connectionType, type as "friend"|"hater"), eq(topConnectionsTable.slot, slot))
  );
  await db.insert(topConnectionsTable).values({ ownerId: req.user.id, targetId: userId, connectionType: type, slot });
  res.json({ success: true });
});

router.get("/users/me/daily-compliment", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const today = new Date().toISOString().slice(0, 10);
  const existing = await db.select().from(dailyComplimentsTable)
    .where(and(eq(dailyComplimentsTable.fromUserId, req.user.id), eq(dailyComplimentsTable.completedDate, today)))
    .limit(1);
  const completed = existing.length > 0;
  const profiles = await db.select().from(clawProfilesTable)
    .where(sql`${clawProfilesTable.userId} != ${req.user.id}`)
    .limit(20);
  if (profiles.length === 0) {
    return res.json({ targetUser: null, completed });
  }
  const seed = today.replace(/-/g, "") + req.user.id;
  const idx = seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % profiles.length;
  const p = profiles[idx];
  res.json({
    canSpin: !completed,
    targetUser: { id: p.userId, username: p.username, displayName: p.displayName, avatarUrl: p.avatarUrl, interactionLevel: p.interactionLevel, isVerified: p.isVerified },
    completed,
    completedAt: existing[0]?.createdAt?.toISOString(),
    completedDate: existing[0]?.completedDate,
  });
});

router.post("/users/me/daily-compliment/submit", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const today = new Date().toISOString().slice(0, 10);
  const { targetUserId, message } = req.body;
  await db.insert(dailyComplimentsTable).values({
    fromUserId: req.user.id, toUserId: targetUserId, message, completedDate: today
  }).onConflictDoNothing();
  await db.insert(notificationsTable).values({
    userId: targetUserId, type: "compliment", message: `You received a compliment: "${message}"`, fromUserId: req.user.id
  }).catch(() => {});
  res.json({ success: true });
});

router.post("/users/:userId/block", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { userId } = req.params;
  if (userId === req.user.id) return res.status(400).json({ error: "Cannot block yourself" });
  const { action } = req.body;
  if (action === "unblock") {
    await db.delete(blockedUsersTable).where(
      and(eq(blockedUsersTable.blockerId, req.user.id), eq(blockedUsersTable.blockedId, userId))
    );
    return res.json({ blocked: false });
  }
  await db.insert(blockedUsersTable).values({ blockerId: req.user.id, blockedId: userId }).onConflictDoNothing();
  await db.delete(followsTable).where(
    or(
      and(eq(followsTable.followerId, req.user.id), eq(followsTable.followingId, userId)),
      and(eq(followsTable.followerId, userId), eq(followsTable.followingId, req.user.id))
    )
  );
  res.json({ blocked: true });
});

router.get("/users/me/block-status/:userId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ blocked: false });
  const [row] = await db.select().from(blockedUsersTable)
    .where(and(eq(blockedUsersTable.blockerId, req.user.id), eq(blockedUsersTable.blockedId, req.params.userId)))
    .limit(1);
  res.json({ blocked: !!row });
});

router.patch("/users/me/mood", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { mood } = req.body;
  if (!mood || typeof mood !== "string" || mood.length > 80) return res.status(400).json({ error: "Invalid mood" });
  await db.update(clawProfilesTable)
    .set({ currentMood: mood, moodUpdatedAt: new Date() })
    .where(eq(clawProfilesTable.userId, req.user.id));
  res.json({ mood });
});

router.get("/users/:userId/profile-reactions", async (req, res) => {
  const reactions = await db.select().from(profileReactionsTable)
    .where(eq(profileReactionsTable.profileUserId, req.params.userId));
  const counts: Record<string, number> = {};
  const myReaction = req.isAuthenticated()
    ? reactions.find(r => r.reactorId === (req as any).user.id)?.emoji || null
    : null;
  for (const r of reactions) {
    counts[r.emoji] = (counts[r.emoji] || 0) + 1;
  }
  res.json({ counts, myReaction, total: reactions.length });
});

router.post("/users/:userId/profile-reaction", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { emoji } = req.body;
  const VALID = ["fire", "heart", "star", "skull", "crown", "cat"];
  if (!VALID.includes(emoji)) return res.status(400).json({ error: "Invalid emoji" });
  const { userId } = req.params;
  if (userId === req.user.id) return res.status(400).json({ error: "Cannot react to yourself" });
  const existing = await db.select().from(profileReactionsTable)
    .where(and(eq(profileReactionsTable.profileUserId, userId), eq(profileReactionsTable.reactorId, req.user.id)))
    .limit(1);
  if (existing.length > 0) {
    if (existing[0].emoji === emoji) {
      await db.delete(profileReactionsTable).where(eq(profileReactionsTable.id, existing[0].id));
      return res.json({ action: "removed", emoji });
    }
    await db.update(profileReactionsTable).set({ emoji }).where(eq(profileReactionsTable.id, existing[0].id));
    return res.json({ action: "changed", emoji });
  }
  await db.insert(profileReactionsTable).values({ profileUserId: userId, reactorId: req.user.id, emoji });
  res.json({ action: "added", emoji });
});

router.get("/users/:userId/top-connections", async (req, res) => {
  const { userId } = req.params;
  const connections = await db.select().from(topConnectionsTable)
    .where(eq(topConnectionsTable.ownerId, userId))
    .orderBy(topConnectionsTable.slot);
  const friends = connections.filter(c => c.connectionType === "friend");
  const haters = connections.filter(c => c.connectionType === "hater");
  const getProfiles = async (list: typeof connections) => {
    return Promise.all(list.map(async c => {
      const [p] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, c.targetId)).limit(1);
      return p ? { id: p.userId, username: p.username, displayName: p.displayName, avatarUrl: p.avatarUrl, interactionLevel: p.interactionLevel, isVerified: p.isVerified, slot: c.slot } : null;
    }));
  };
  res.json({
    topFriends: (await getProfiles(friends)).filter(Boolean),
    topHaters: (await getProfiles(haters)).filter(Boolean),
  });
});

router.post("/users/:userId/set-connection", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { userId } = req.params;
  const { connectionType, slot, remove } = req.body;
  if (remove) {
    await db.delete(topConnectionsTable).where(
      and(eq(topConnectionsTable.ownerId, req.user.id), eq(topConnectionsTable.targetId, userId))
    );
    return res.json({ success: true, removed: true });
  }
  const validType = connectionType === "hater" ? "hater" : "friend";
  const validSlot = Math.max(1, Math.min(Number(slot), validType === "friend" ? 13 : 3));
  await db.delete(topConnectionsTable).where(
    and(eq(topConnectionsTable.ownerId, req.user.id), eq(topConnectionsTable.connectionType, validType), eq(topConnectionsTable.slot, validSlot))
  );
  await db.insert(topConnectionsTable).values({
    ownerId: req.user.id, targetId: userId, connectionType: validType, slot: validSlot,
  }).onConflictDoNothing();
  res.json({ success: true });
});

router.get("/users/:userId", async (req, res) => {
  const { userId } = req.params;
  let profile = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, userId)).limit(1);
  if (profile.length === 0) {
    profile = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.username, userId)).limit(1);
  }
  // If still not found, try to auto-create from the auth users table
  if (profile.length === 0) {
    const authUser = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1).catch(() => []);
    if (authUser.length > 0) {
      const u = authUser[0];
      const displayName = [u.firstName, u.lastName].filter(Boolean).join(" ") || `User`;
      const stub = `user_${userId.slice(0, 8)}`;
      profile = await db.insert(clawProfilesTable).values({
        userId,
        username: stub,
        displayName,
        avatarUrl: u.profileImageUrl || null,
        interactionLevel: "Soft",
      }).returning().catch(() => []);
      if (profile.length > 0) {
        await db.insert(clawCoinsTable).values({ userId, balance: 100, lifetimeSpent: 0 }).onConflictDoNothing().catch(() => {});
      }
    }
  }
  if (profile.length === 0) return res.status(404).json({ error: "Not found" });
  let isFollowing = false;
  if (req.isAuthenticated()) {
    const follow = await db.select().from(followsTable).where(and(eq(followsTable.followerId, req.user.id), eq(followsTable.followingId, profile[0].userId))).limit(1);
    isFollowing = follow.length > 0;
  }
  res.json(formatProfile(profile[0], isFollowing));
});

router.post("/users/:userId/follow", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { userId } = req.params;
  const { action } = req.body;
  if (action === "follow") {
    await db.insert(followsTable).values({ followerId: req.user.id, followingId: userId }).onConflictDoNothing();
    await db.update(clawProfilesTable).set({ followerCount: sql`${clawProfilesTable.followerCount} + 1` }).where(eq(clawProfilesTable.userId, userId));
    await db.update(clawProfilesTable).set({ followingCount: sql`${clawProfilesTable.followingCount} + 1` }).where(eq(clawProfilesTable.userId, req.user.id));
    // Get follower name for the notification message
    db.select({ displayName: clawProfilesTable.displayName })
      .from(clawProfilesTable).where(eq(clawProfilesTable.userId, req.user.id)).limit(1)
      .then(([follower]) => {
        notifyUser(userId, "follow",
          `${follower?.displayName || "Someone"} started following you`,
          { fromUserId: req.user.id, url: `/profile/${req.user.id}`, tag: `follow-${req.user.id}` }
        );
      }).catch(() => {});
    res.json({ following: true });
  } else {
    await db.delete(followsTable).where(and(eq(followsTable.followerId, req.user.id), eq(followsTable.followingId, userId)));
    await db.update(clawProfilesTable).set({ followerCount: sql`GREATEST(${clawProfilesTable.followerCount} - 1, 0)` }).where(eq(clawProfilesTable.userId, userId));
    await db.update(clawProfilesTable).set({ followingCount: sql`GREATEST(${clawProfilesTable.followingCount} - 1, 0)` }).where(eq(clawProfilesTable.userId, req.user.id));
    res.json({ following: false });
  }
});

// GET /api/users/:userId/followers
router.get("/users/:userId/followers", async (req, res) => {
  const { userId } = req.params;
  const rows = await db.select({
    id: usersTable.id,
    username: clawProfilesTable.username,
    displayName: clawProfilesTable.displayName,
    avatarUrl: clawProfilesTable.avatarUrl,
    isMember: clawProfilesTable.isMember,
  })
    .from(followsTable)
    .innerJoin(usersTable, eq(usersTable.id, followsTable.followerId))
    .innerJoin(clawProfilesTable, eq(clawProfilesTable.userId, followsTable.followerId))
    .where(eq(followsTable.followingId, userId))
    .limit(200);
  res.json(rows);
});

// GET /api/users/:userId/following
router.get("/users/:userId/following", async (req, res) => {
  const { userId } = req.params;
  const rows = await db.select({
    id: usersTable.id,
    username: clawProfilesTable.username,
    displayName: clawProfilesTable.displayName,
    avatarUrl: clawProfilesTable.avatarUrl,
    isMember: clawProfilesTable.isMember,
  })
    .from(followsTable)
    .innerJoin(usersTable, eq(usersTable.id, followsTable.followingId))
    .innerJoin(clawProfilesTable, eq(clawProfilesTable.userId, followsTable.followingId))
    .where(eq(followsTable.followerId, userId))
    .limit(200);
  res.json(rows);
});

router.post("/users/:userId/tip", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { userId } = req.params;
  const { amount, message } = req.body;
  await db.insert(tipsTable).values({ fromUserId: req.user.id, toUserId: userId, amount, message });
  await db.update(clawProfilesTable).set({ totalTipsReceived: sql`${clawProfilesTable.totalTipsReceived} + ${amount}` }).where(eq(clawProfilesTable.userId, userId));
  await db.insert(notificationsTable).values({ userId, type: "tip", message: `You received a tip of ${amount} CLAW coins!`, fromUserId: req.user.id }).catch(() => {});
  const myTips = await db.select().from(tipsTable).where(eq(tipsTable.fromUserId, req.user.id));
  res.json({ success: true, totalTipsGiven: myTips.length });
});

export default router;
