import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable, tipsTable, clawProfilesTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

router.get("/creator/analytics", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const posts = await db.select().from(postsTable).where(eq(postsTable.authorId, req.user.id));
  const tips = await db.select().from(tipsTable).where(eq(tipsTable.toUserId, req.user.id));
  const totalLikes = posts.reduce((a, p) => a + (p.likeCount || 0), 0);
  const totalDislikes = posts.reduce((a, p) => a + (p.dislikeCount || 0), 0);
  const totalComments = posts.reduce((a, p) => a + (p.commentCount || 0), 0);
  const totalViews = posts.reduce((a, p) => a + (p.viewCount || 0), 0);
  const totalTipAmount = tips.reduce((a, t) => a + (t.amount || 0), 0);
  const topPosts = posts.sort((a, b) => ((b.likeCount || 0) + (b.commentCount || 0)) - ((a.likeCount || 0) + (a.commentCount || 0))).slice(0, 5);
  const [profile] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, req.user.id)).limit(1);
  const totalPosts = posts.length;
  const followerCount = profile?.followerCount || 0;
  const followingCount = profile?.followingCount || 0;
  const engagementRate = totalViews > 0 ? ((totalLikes + totalComments) / totalViews) : 0;

  const topFormatted = await Promise.all(topPosts.map(async p => {
    return {
      id: String(p.id), authorId: p.authorId,
      author: profile ? { id: profile.userId, username: profile.username, displayName: profile.displayName, avatarUrl: profile.avatarUrl, interactionLevel: profile.interactionLevel, isVerified: profile.isVerified } : { id: req.user.id, username: "you", displayName: "You", interactionLevel: "Soft" },
      content: p.content, intentType: p.intentType, intensityLevel: p.intensityLevel,
      mediaUrl: p.mediaUrl, mediaType: p.mediaType, likeCount: p.likeCount || 0, dislikeCount: p.dislikeCount || 0,
      viewCount: p.viewCount || 0, commentCount: p.commentCount || 0, realityCheckEnabled: p.realityCheckEnabled || false,
      purgeWindowActive: p.purgeWindowActive || false, clawMarks: p.clawMarks || 0,
      isModerated: p.isModerated || false, isPurged: p.isPurged || false, createdAt: p.createdAt?.toISOString(),
    };
  }));
  res.json({
    totalPosts, totalViews, totalLikes, totalDislikes, totalComments,
    totalTipsReceived: tips.length, totalTipAmount,
    followerCount, followingCount, engagementRate,
    followerGrowth: [], topPosts: topFormatted,
  });
});

router.get("/creator/tips", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const tips = await db.select().from(tipsTable).where(eq(tipsTable.toUserId, req.user.id)).orderBy(desc(tipsTable.createdAt));
  const totalAmount = tips.reduce((a, t) => a + (t.amount || 0), 0);
  const recentTips = await Promise.all(tips.slice(0, 20).map(async t => {
    const [from] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, t.fromUserId)).limit(1);
    return {
      fromUser: from ? { id: from.userId, username: from.username, displayName: from.displayName, avatarUrl: from.avatarUrl, interactionLevel: from.interactionLevel, isVerified: from.isVerified } : { id: t.fromUserId, username: "unknown", displayName: "Unknown", interactionLevel: "Soft" },
      amount: t.amount, message: t.message, createdAt: t.createdAt?.toISOString(),
    };
  }));
  res.json({ totalReceived: tips.length, totalAmount, recentTips });
});

export default router;
