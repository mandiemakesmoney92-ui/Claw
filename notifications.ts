import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable, clawProfilesTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { registerNotifListener, removeNotifListener } from "../lib/notification-service";

const router = Router();

// GET /api/notifications/listen — SSE stream for real-time in-app notifications
router.get("/notifications/listen", (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).end();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const userId = req.user.id;
  registerNotifListener(userId, res);

  res.write(`event: ready\ndata: ${JSON.stringify({ userId })}\n\n`);

  const keepAlive = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { clearInterval(keepAlive); }
  }, 20000);

  req.on("close", () => {
    clearInterval(keepAlive);
    removeNotifListener(userId, res);
  });
});

router.get("/notifications", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const notifications = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.userId, req.user.id))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);
  const formatted = await Promise.all(notifications.map(async n => {
    let fromUser = undefined;
    if (n.fromUserId) {
      const [p] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, n.fromUserId)).limit(1);
      if (p) fromUser = { id: p.userId, username: p.username, displayName: p.displayName, avatarUrl: p.avatarUrl, interactionLevel: p.interactionLevel, isVerified: p.isVerified };
    }
    return { id: String(n.id), type: n.type, message: n.message, fromUser, postId: n.postId ? String(n.postId) : undefined, isRead: n.isRead || false, createdAt: n.createdAt?.toISOString() };
  }));
  res.json(formatted);
});

router.post("/notifications/read", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.userId, req.user.id));
  res.json({ success: true });
});

export default router;
