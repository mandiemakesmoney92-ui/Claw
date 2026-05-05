import { Router } from "express";
import { db } from "@workspace/db";
import { commentsTable, clawProfilesTable, postsTable, notificationsTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { notifyUser } from "../lib/notification-service";

const router = Router();

router.get("/posts/:postId/comments", async (req, res) => {
  const postId = Number(req.params.postId);
  const comments = await db.select().from(commentsTable).where(eq(commentsTable.postId, postId)).orderBy(desc(commentsTable.createdAt));
  const formatted = await Promise.all(comments.map(async (c) => {
    const [author] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, c.authorId)).limit(1);
    return {
      id: String(c.id), postId: String(c.postId), authorId: c.authorId,
      parentId: c.parentId ? String(c.parentId) : null,
      author: author ? { id: author.userId, username: author.username, displayName: author.displayName, avatarUrl: author.avatarUrl, interactionLevel: author.interactionLevel, isVerified: author.isVerified } : { id: c.authorId, username: "unknown", displayName: "Unknown", interactionLevel: "Soft" },
      content: c.content, likeCount: c.likeCount || 0, clawMarks: c.clawMarks || 0,
      createdAt: c.createdAt?.toISOString(),
    };
  }));
  res.json(formatted);
});

router.post("/posts/:postId/comments", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const postId = Number(req.params.postId);
  const parentId = req.body.parentId ? Number(req.body.parentId) : null;
  const [comment] = await db.insert(commentsTable).values({ postId, authorId: req.user.id, content: req.body.content, parentId }).returning();
  await db.update(postsTable).set({ commentCount: sql`${postsTable.commentCount} + 1` }).where(eq(postsTable.id, postId));
  const [author] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, req.user.id)).limit(1);
  // Notify the post author (but not if they're commenting on their own post)
  const [post] = await db.select({ authorId: postsTable.authorId }).from(postsTable).where(eq(postsTable.id, postId)).limit(1);
  if (post && post.authorId !== req.user.id) {
    const commenterName = author?.displayName || "Someone";
    const preview = req.body.content?.slice(0, 60) || "";
    notifyUser(post.authorId, "comment",
      `${commenterName} commented: "${preview}${preview.length >= 60 ? "…" : ""}"`,
      { fromUserId: req.user.id, postId, url: `/post/${postId}`, tag: `comment-${postId}-${req.user.id}` }
    ).catch(() => {});
  }
  res.status(201).json({
    id: String(comment.id), postId: String(comment.postId), authorId: comment.authorId,
    parentId: comment.parentId ? String(comment.parentId) : null,
    author: author ? { id: author.userId, username: author.username, displayName: author.displayName, avatarUrl: author.avatarUrl, interactionLevel: author.interactionLevel, isVerified: author.isVerified } : { id: req.user.id, username: "you", displayName: "You", interactionLevel: "Soft" },
    content: comment.content, likeCount: 0, clawMarks: 0, createdAt: comment.createdAt?.toISOString(),
  });
});

router.patch("/posts/:postId/comments/:commentId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const commentId = Number(req.params.commentId);
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: "Content required" });
  const [existing] = await db.select().from(commentsTable).where(eq(commentsTable.id, commentId)).limit(1);
  if (!existing || existing.authorId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
  await db.update(commentsTable).set({ content: content.trim() }).where(eq(commentsTable.id, commentId));
  res.json({ success: true });
});

router.delete("/posts/:postId/comments/:commentId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const commentId = Number(req.params.commentId);
  const postId = Number(req.params.postId);
  const [existing] = await db.select().from(commentsTable).where(eq(commentsTable.id, commentId)).limit(1);
  if (!existing || existing.authorId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
  await db.delete(commentsTable).where(eq(commentsTable.id, commentId));
  await db.update(postsTable).set({ commentCount: sql`GREATEST(${postsTable.commentCount} - 1, 0)` }).where(eq(postsTable.id, postId));
  res.json({ success: true });
});

export default router;
