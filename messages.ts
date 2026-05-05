import { Router } from "express";
import { db } from "@workspace/db";
import { conversationsTable, messagesTable, clawProfilesTable, userBadgesTable, notificationsTable } from "@workspace/db/schema";
import { eq, and, or, desc, sql, count } from "drizzle-orm";
import { notifyUser } from "../lib/notification-service";

async function tryAwardBadge(userId: string, badgeId: string) {
  try {
    const [existing] = await db.select().from(userBadgesTable)
      .where(and(eq(userBadgesTable.userId, userId), eq(userBadgesTable.badgeId, badgeId))).limit(1);
    if (!existing) {
      await db.insert(userBadgesTable).values({ userId, badgeId });
    }
  } catch {}
}

const router = Router();

async function formatConversation(conv: typeof conversationsTable.$inferSelect, currentUserId: string) {
  const otherUserId = conv.participant1Id === currentUserId ? conv.participant2Id : conv.participant1Id;
  const [other] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, otherUserId)).limit(1);
  const isParticipant1 = conv.participant1Id === currentUserId;
  const unreadCount = isParticipant1 ? (conv.unreadForParticipant1 ?? 0) : (conv.unreadForParticipant2 ?? 0);
  return {
    id: String(conv.id),
    participants: other ? [{ id: other.userId, username: other.username, displayName: other.displayName, avatarUrl: other.avatarUrl, interactionLevel: other.interactionLevel, isVerified: other.isVerified }] : [],
    lastMessage: conv.lastMessage,
    lastMessageAt: conv.lastMessageAt?.toISOString(),
    unreadCount,
  };
}

router.get("/messages/conversations", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const convs = await db.select().from(conversationsTable)
    .where(or(eq(conversationsTable.participant1Id, req.user.id), eq(conversationsTable.participant2Id, req.user.id)))
    .orderBy(desc(conversationsTable.lastMessageAt));
  const formatted = await Promise.all(convs.map(c => formatConversation(c, req.user.id)));
  res.json(formatted);
});

router.get("/messages/unread-count", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const convs = await db.select().from(conversationsTable)
    .where(or(eq(conversationsTable.participant1Id, req.user.id), eq(conversationsTable.participant2Id, req.user.id)));
  let total = 0;
  for (const c of convs) {
    const isParticipant1 = c.participant1Id === req.user.id;
    total += isParticipant1 ? (c.unreadForParticipant1 ?? 0) : (c.unreadForParticipant2 ?? 0);
  }
  res.json({ count: total });
});

router.post("/messages/start", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { targetUserId } = req.body;
  const [existing] = await db.select().from(conversationsTable)
    .where(or(
      and(eq(conversationsTable.participant1Id, req.user.id), eq(conversationsTable.participant2Id, targetUserId)),
      and(eq(conversationsTable.participant1Id, targetUserId), eq(conversationsTable.participant2Id, req.user.id))
    )).limit(1);
  if (existing) return res.status(201).json(await formatConversation(existing, req.user.id));
  const [conv] = await db.insert(conversationsTable).values({ participant1Id: req.user.id, participant2Id: targetUserId }).returning();
  res.status(201).json(await formatConversation(conv, req.user.id));
});

router.post("/messages/:conversationId/read", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const convId = Number(req.params.conversationId);
  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, convId)).limit(1);
  if (!conv) return res.status(404).json({ error: "Not found" });
  const isParticipant1 = conv.participant1Id === req.user.id;
  if (isParticipant1) {
    await db.update(conversationsTable).set({ unreadForParticipant1: 0 }).where(eq(conversationsTable.id, convId));
  } else {
    await db.update(conversationsTable).set({ unreadForParticipant2: 0 }).where(eq(conversationsTable.id, convId));
  }
  res.json({ ok: true });
});

router.get("/messages/:conversationId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const convId = Number(req.params.conversationId);
  const messages = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, convId)).orderBy(messagesTable.createdAt);
  const formatted = await Promise.all(messages.map(async m => {
    const [sender] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, m.senderId)).limit(1);
    return {
      id: String(m.id), conversationId: String(m.conversationId), senderId: m.senderId,
      sender: sender ? { id: sender.userId, username: sender.username, displayName: sender.displayName, avatarUrl: sender.avatarUrl, interactionLevel: sender.interactionLevel, isVerified: sender.isVerified } : { id: m.senderId, username: "unknown", displayName: "Unknown", interactionLevel: "Soft" },
      content: m.content, createdAt: m.createdAt?.toISOString(),
    };
  }));
  res.json(formatted);
});

router.post("/messages/:conversationId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const convId = Number(req.params.conversationId);
  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, convId)).limit(1);
  if (!conv) return res.status(404).json({ error: "Conversation not found" });

  const [msg] = await db.insert(messagesTable).values({ conversationId: convId, senderId: req.user.id, content: req.body.content }).returning();

  // Auto-award messaging badges (fire-and-forget)
  (async () => {
    try {
      // first_hello: first ever message sent
      const [{ total }] = await db.select({ total: count() }).from(messagesTable).where(eq(messagesTable.senderId, req.user.id));
      if (total === 1) await tryAwardBadge(req.user.id, "first_hello");
      // conversation_starter: sent messages in 3+ different conversations
      const convRes = await db.select({ convId: messagesTable.conversationId }).from(messagesTable)
        .where(eq(messagesTable.senderId, req.user.id)).groupBy(messagesTable.conversationId);
      if (convRes.length >= 3) await tryAwardBadge(req.user.id, "conversation_starter");
      if (convRes.length >= 10) await tryAwardBadge(req.user.id, "connector");
    } catch {}
  })();

  const isParticipant1 = conv.participant1Id === req.user.id;
  const recipientId = isParticipant1 ? conv.participant2Id : conv.participant1Id;
  if (isParticipant1) {
    await db.update(conversationsTable).set({
      lastMessage: req.body.content,
      lastMessageAt: new Date(),
      unreadForParticipant2: (conv.unreadForParticipant2 ?? 0) + 1,
    }).where(eq(conversationsTable.id, convId));
  } else {
    await db.update(conversationsTable).set({
      lastMessage: req.body.content,
      lastMessageAt: new Date(),
      unreadForParticipant1: (conv.unreadForParticipant1 ?? 0) + 1,
    }).where(eq(conversationsTable.id, convId));
  }
  // Fire-and-forget: notify recipient of new message (SSE + push)
  (async () => {
    try {
      const [senderProfile] = await db.select({ displayName: clawProfilesTable.displayName }).from(clawProfilesTable).where(eq(clawProfilesTable.userId, req.user.id)).limit(1);
      const preview = (req.body.content || "").slice(0, 50);
      await notifyUser(recipientId, "message",
        `${senderProfile?.displayName || "Someone"}: ${preview}${preview.length >= 50 ? "…" : ""}`,
        { fromUserId: req.user.id, url: `/messages`, tag: `msg-${convId}` }
      );
    } catch {}
  })();

  const [sender] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, req.user.id)).limit(1);
  res.status(201).json({
    id: String(msg.id), conversationId: String(msg.conversationId), senderId: msg.senderId,
    sender: sender ? { id: sender.userId, username: sender.username, displayName: sender.displayName, avatarUrl: sender.avatarUrl, interactionLevel: sender.interactionLevel, isVerified: sender.isVerified } : { id: req.user.id, username: "you", displayName: "You", interactionLevel: "Soft" },
    content: msg.content, createdAt: msg.createdAt?.toISOString(),
  });
});

router.delete("/messages/conversations/:conversationId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const convId = Number(req.params.conversationId);
  const [conv] = await db.select().from(conversationsTable).where(eq(conversationsTable.id, convId)).limit(1);
  if (!conv) return res.status(404).json({ error: "Not found" });
  if (conv.participant1Id !== req.user.id && conv.participant2Id !== req.user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  await db.delete(messagesTable).where(eq(messagesTable.conversationId, convId));
  await db.delete(conversationsTable).where(eq(conversationsTable.id, convId));
  res.json({ success: true });
});

router.delete("/messages/:messageId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const messageId = Number(req.params.messageId);
  const [msg] = await db.select().from(messagesTable).where(eq(messagesTable.id, messageId)).limit(1);
  if (!msg) return res.status(404).json({ error: "Not found" });
  if (msg.senderId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
  await db.update(messagesTable).set({ content: "🗑️ This message was deleted" }).where(eq(messagesTable.id, messageId));
  res.json({ success: true });
});

router.patch("/messages/:messageId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const messageId = Number(req.params.messageId);
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: "Content required" });
  const [msg] = await db.select().from(messagesTable).where(eq(messagesTable.id, messageId)).limit(1);
  if (!msg) return res.status(404).json({ error: "Not found" });
  if (msg.senderId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
  const [updated] = await db.update(messagesTable).set({ content: content.trim() }).where(eq(messagesTable.id, messageId)).returning();
  res.json(updated);
});

export default router;
