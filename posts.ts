import { Router } from "express";
import { db } from "@workspace/db";
import {
  postsTable, clawProfilesTable, postReactionsTable, notificationsTable, postEchoReactionsTable
} from "@workspace/db/schema";
import { eq, and, desc, sql, or, SQL } from "drizzle-orm";
import { notifyUser } from "../lib/notification-service";
import { moderateClawPost, isUserClawBlocked, getClawCooldownRemaining } from "../lib/claw-moderation";

const router = Router();

async function formatPost(post: typeof postsTable.$inferSelect, currentUserId?: string) {
  const [author] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, post.authorId)).limit(1);
  let userReaction: string | undefined;
  let userEchoType: string | undefined;
  if (currentUserId) {
    const [reaction] = await db.select().from(postReactionsTable)
      .where(and(eq(postReactionsTable.postId, post.id), eq(postReactionsTable.userId, currentUserId))).limit(1);
    userReaction = reaction?.reaction;
    const [echoReaction] = await db.select().from(postEchoReactionsTable)
      .where(and(eq(postEchoReactionsTable.postId, post.id), eq(postEchoReactionsTable.userId, currentUserId))).limit(1);
    userEchoType = echoReaction?.type;
  }
  return {
    id: String(post.id),
    authorId: post.authorId,
    author: author ? { id: author.userId, username: author.username, displayName: author.displayName, avatarUrl: author.avatarUrl, interactionLevel: author.interactionLevel, isVerified: author.isVerified } : { id: post.authorId, username: "unknown", displayName: "Unknown", interactionLevel: "Soft" },
    content: post.content,
    intentType: post.intentType,
    intensityLevel: post.intensityLevel,
    mediaUrl: post.mediaUrl,
    mediaType: post.mediaType,
    likeCount: post.likeCount || 0,
    dislikeCount: post.dislikeCount || 0,
    echoCount: post.echoCount || 0,
    seenCount: post.seenCount || 0,
    commentCount: post.commentCount || 0,
    realityCheckEnabled: post.realityCheckEnabled || false,
    purgeWindowActive: post.purgeWindowActive || false,
    clawMarks: post.clawMarks || 0,
    isModerated: post.isModerated || false,
    isPurged: post.isPurged || false,
    imageUrls: (() => { try { return JSON.parse(post.imageUrls || "[]"); } catch { return []; } })(),
    youtubeUrl: post.youtubeUrl || null,
    userReaction,
    userEchoType,
    createdAt: post.createdAt?.toISOString(),
  };
}

router.get("/posts", async (req, res) => {
  const { feedType, userId, intentType, intensityLevel, limit = 20, offset = 0 } = req.query;

  const conditions: SQL[] = [eq(postsTable.isPurged, false)];

  if (userId && typeof userId === "string") {
    conditions.push(eq(postsTable.authorId, userId));
  }

  if (intentType && typeof intentType === "string") {
    conditions.push(eq(postsTable.intentType, intentType as any));
  }

  const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

  const posts = await db.select().from(postsTable)
    .where(whereClause)
    .orderBy(desc(postsTable.createdAt))
    .limit(Math.min(Number(limit), 100))
    .offset(Number(offset));

  const formatted = await Promise.all(posts.map(p => formatPost(p, req.isAuthenticated() ? req.user.id : undefined)));
  res.json(formatted);
});

router.post("/posts", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { content, intentType, intensityLevel, mediaUrl, mediaType, targetCircleId, realityCheckEnabled } = req.body;

  // Claw Mode moderation
  if (intensityLevel === "Claw" && content) {
    if (isUserClawBlocked(req.user.id)) {
      const remaining = getClawCooldownRemaining(req.user.id);
      return res.status(429).json({
        error: "claw_blocked",
        message: `Claw Mode is on cooldown. ${remaining} min remaining.`,
        remaining,
      });
    }
    const modResult = moderateClawPost(content);
    if (!modResult.allowed) {
      return res.status(422).json({
        error: "moderation_failed",
        category: modResult.category,
        message: modResult.reason,
        penancePrompt: modResult.penancePrompt,
        severity: modResult.severity,
      });
    }
  }

  const [post] = await db.insert(postsTable).values({
    authorId: req.user.id, content, intentType, intensityLevel,
    mediaUrl, mediaType, targetCircleId, realityCheckEnabled: realityCheckEnabled || false,
  }).returning();
  await db.update(clawProfilesTable).set({ postCount: sql`${clawProfilesTable.postCount} + 1` }).where(eq(clawProfilesTable.userId, req.user.id));
  res.status(201).json(await formatPost(post, req.user.id));
});

router.get("/posts/trending", async (req, res) => {
  const posts = await db.select().from(postsTable)
    .where(eq(postsTable.isPurged, false))
    .orderBy(desc(sql`${postsTable.likeCount} + ${postsTable.commentCount} * 2`))
    .limit(20);
  const formatted = await Promise.all(posts.map(p => formatPost(p, req.isAuthenticated() ? req.user.id : undefined)));
  res.json(formatted);
});

router.get("/posts/broadcasts", async (req, res) => {
  const posts = await db.select().from(postsTable)
    .where(and(eq(postsTable.isPurged, false), eq(postsTable.intentType, "Broadcast")))
    .orderBy(desc(postsTable.createdAt))
    .limit(20);
  const formatted = await Promise.all(posts.map(p => formatPost(p, req.isAuthenticated() ? req.user.id : undefined)));
  res.json(formatted);
});

router.post("/posts/broadcasts", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { content, isAnonymous } = req.body;
  const authorId = isAnonymous ? "anonymous" : req.user.id;
  const [post] = await db.insert(postsTable).values({
    authorId: req.user.id, content, intentType: "Broadcast", intensityLevel: "Direct",
  }).returning();
  res.status(201).json(await formatPost(post, req.user.id));
});

router.get("/posts/search", async (req, res) => {
  const { q, limit = 20, offset = 0 } = req.query;
  if (!q || typeof q !== "string" || q.trim().length === 0) return res.json([]);
  const term = `%${q.toLowerCase().trim()}%`;
  const posts = await db.select().from(postsTable)
    .where(and(eq(postsTable.isPurged, false), sql`LOWER(${postsTable.content}) LIKE ${term}`))
    .orderBy(desc(postsTable.likeCount), desc(postsTable.createdAt))
    .limit(Math.min(Number(limit), 50))
    .offset(Number(offset));
  const formatted = await Promise.all(posts.map(p => formatPost(p, req.isAuthenticated() ? req.user.id : undefined)));
  res.json(formatted);
});

router.get("/posts/feed", async (req, res) => {
  const { intentType, intensityLevel, limit = 20, offset = 0 } = req.query;
  const conditions: SQL[] = [eq(postsTable.isPurged, false)];
  if (intentType && typeof intentType === "string") {
    conditions.push(eq(postsTable.intentType, intentType as any));
  }
  const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
  const posts = await db.select().from(postsTable)
    .where(whereClause)
    .orderBy(desc(postsTable.createdAt))
    .limit(Math.min(Number(limit), 100))
    .offset(Number(offset));
  const formatted = await Promise.all(posts.map(p => formatPost(p, req.isAuthenticated() ? req.user.id : undefined)));
  res.json(formatted);
});

router.get("/posts/:postId", async (req, res) => {
  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, Number(req.params.postId))).limit(1);
  if (!post) return res.status(404).json({ error: "Not found" });
  await db.update(postsTable).set({ viewCount: sql`${postsTable.viewCount} + 1` }).where(eq(postsTable.id, post.id));
  res.json(await formatPost(post, req.isAuthenticated() ? req.user.id : undefined));
});

router.delete("/posts/:postId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  await db.delete(postsTable).where(and(eq(postsTable.id, Number(req.params.postId)), eq(postsTable.authorId, req.user.id)));
  res.json({ success: true });
});

router.post("/posts/:postId/react", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const postId = Number(req.params.postId);
  const { reaction } = req.body;
  const [existing] = await db.select().from(postReactionsTable)
    .where(and(eq(postReactionsTable.postId, postId), eq(postReactionsTable.userId, req.user.id))).limit(1);
  if (existing) {
    if (reaction === "none") {
      await db.delete(postReactionsTable).where(eq(postReactionsTable.id, existing.id));
      if (existing.reaction === "like") await db.update(postsTable).set({ likeCount: sql`GREATEST(${postsTable.likeCount} - 1, 0)` }).where(eq(postsTable.id, postId));
      if (existing.reaction === "dislike") await db.update(postsTable).set({ dislikeCount: sql`GREATEST(${postsTable.dislikeCount} - 1, 0)` }).where(eq(postsTable.id, postId));
    } else if (existing.reaction !== reaction) {
      await db.update(postReactionsTable).set({ reaction }).where(eq(postReactionsTable.id, existing.id));
      if (reaction === "like") {
        await db.update(postsTable).set({ likeCount: sql`${postsTable.likeCount} + 1`, dislikeCount: sql`GREATEST(${postsTable.dislikeCount} - 1, 0)` }).where(eq(postsTable.id, postId));
      } else {
        await db.update(postsTable).set({ dislikeCount: sql`${postsTable.dislikeCount} + 1`, likeCount: sql`GREATEST(${postsTable.likeCount} - 1, 0)` }).where(eq(postsTable.id, postId));
      }
    }
  } else if (reaction !== "none") {
    await db.insert(postReactionsTable).values({ postId, userId: req.user.id, reaction });
    if (reaction === "like") await db.update(postsTable).set({ likeCount: sql`${postsTable.likeCount} + 1` }).where(eq(postsTable.id, postId));
    if (reaction === "dislike") await db.update(postsTable).set({ dislikeCount: sql`${postsTable.dislikeCount} + 1` }).where(eq(postsTable.id, postId));
    // Notify post author on new like (not for own posts)
    const [post] = await db.select({ authorId: postsTable.authorId, content: postsTable.content }).from(postsTable).where(eq(postsTable.id, postId)).limit(1);
    if (post && post.authorId !== req.user.id && reaction === "like") {
      const [reactor] = await db.select({ displayName: clawProfilesTable.displayName, username: clawProfilesTable.username }).from(clawProfilesTable).where(eq(clawProfilesTable.userId, req.user.id)).limit(1);
      const preview = (post.content || "").slice(0, 40);
      notifyUser(post.authorId, "like",
        `${reactor?.displayName || "Someone"} liked your post: "${preview}${preview.length >= 40 ? "…" : ""}"`,
        { fromUserId: req.user.id, postId, url: `/post/${postId}`, tag: `like-${postId}-${req.user.id}` }
      ).catch(() => {});
    }
  }
  const [updated] = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  res.json({ likeCount: updated?.likeCount || 0, dislikeCount: updated?.dislikeCount || 0, userReaction: reaction === "none" ? undefined : reaction });
});

router.post("/posts/:postId/echo", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const postId = Number(req.params.postId);
  const { type } = req.body; // "echo" | "seen" | "none"
  if (!["echo", "seen", "none"].includes(type)) return res.status(400).json({ error: "type must be echo, seen, or none" });

  const [existing] = await db.select().from(postEchoReactionsTable)
    .where(and(eq(postEchoReactionsTable.postId, postId), eq(postEchoReactionsTable.userId, req.user.id))).limit(1);

  if (type === "none") {
    if (existing) {
      await db.delete(postEchoReactionsTable).where(eq(postEchoReactionsTable.id, existing.id));
      if (existing.type === "echo") await db.update(postsTable).set({ echoCount: sql`GREATEST(${postsTable.echoCount} - 1, 0)` }).where(eq(postsTable.id, postId));
      if (existing.type === "seen") await db.update(postsTable).set({ seenCount: sql`GREATEST(${postsTable.seenCount} - 1, 0)` }).where(eq(postsTable.id, postId));
    }
  } else if (existing) {
    if (existing.type !== type) {
      await db.update(postEchoReactionsTable).set({ type }).where(eq(postEchoReactionsTable.id, existing.id));
      if (type === "echo") await db.update(postsTable).set({ echoCount: sql`${postsTable.echoCount} + 1`, seenCount: sql`GREATEST(${postsTable.seenCount} - 1, 0)` }).where(eq(postsTable.id, postId));
      else await db.update(postsTable).set({ seenCount: sql`${postsTable.seenCount} + 1`, echoCount: sql`GREATEST(${postsTable.echoCount} - 1, 0)` }).where(eq(postsTable.id, postId));
    }
  } else {
    await db.insert(postEchoReactionsTable).values({ postId, userId: req.user.id, type });
    if (type === "echo") await db.update(postsTable).set({ echoCount: sql`${postsTable.echoCount} + 1` }).where(eq(postsTable.id, postId));
    else await db.update(postsTable).set({ seenCount: sql`${postsTable.seenCount} + 1` }).where(eq(postsTable.id, postId));
  }

  const [updated] = await db.select({ echoCount: postsTable.echoCount, seenCount: postsTable.seenCount }).from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  res.json({ echoCount: updated?.echoCount || 0, seenCount: updated?.seenCount || 0, userEchoType: type === "none" ? undefined : type });
});

router.post("/posts/:postId/reality-check", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const postId = Number(req.params.postId);
  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  if (!post || post.authorId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
  await db.update(postsTable).set({ realityCheckEnabled: !post.realityCheckEnabled }).where(eq(postsTable.id, postId));
  res.json({ success: true });
});

router.patch("/posts/:postId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const postId = Number(req.params.postId);
  const { content } = req.body;
  if (!content || typeof content !== "string" || !content.trim()) return res.status(400).json({ error: "Content required" });
  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  if (!post) return res.status(404).json({ error: "Post not found" });
  if (post.authorId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
  const [updated] = await db.update(postsTable).set({ content: content.trim() }).where(eq(postsTable.id, postId)).returning();
  res.json(updated);
});

router.delete("/posts/:postId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const postId = Number(req.params.postId);
  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  if (!post) return res.status(404).json({ error: "Post not found" });
  if (post.authorId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
  await db.update(postsTable).set({ isPurged: true, content: "[deleted]" }).where(eq(postsTable.id, postId));
  await db.update(clawProfilesTable).set({ postCount: sql`GREATEST(${clawProfilesTable.postCount} - 1, 0)` }).where(eq(clawProfilesTable.userId, req.user.id));
  res.json({ success: true });
});

router.post("/posts/:postId/purge-window", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const postId = Number(req.params.postId);
  const endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await db.update(postsTable).set({ purgeWindowActive: true, purgeWindowEndsAt: endsAt }).where(eq(postsTable.id, postId));
  res.json({ success: true });
});

router.get("/stats/feed-summary", async (req, res) => {
  const [totalPosts] = await db.select({ count: sql<number>`count(*)` }).from(postsTable).where(eq(postsTable.isPurged, false));
  const [hotToday] = await db.select({ count: sql<number>`count(*)` }).from(postsTable)
    .where(and(eq(postsTable.isPurged, false), sql`${postsTable.createdAt} > NOW() - INTERVAL '24 hours'`));
  const [broadcasts] = await db.select({ count: sql<number>`count(*)` }).from(postsTable).where(eq(postsTable.intentType, "Broadcast"));
  const [purge] = await db.select({ count: sql<number>`count(*)` }).from(postsTable).where(eq(postsTable.purgeWindowActive, true));
  res.json({
    totalPosts: Number(totalPosts?.count || 0),
    hotToday: Number(hotToday?.count || 0),
    activeBroadcasts: Number(broadcasts?.count || 0),
    activePurgeWindows: Number(purge?.count || 0),
    newConfessions: 0,
  });
});

export default router;
