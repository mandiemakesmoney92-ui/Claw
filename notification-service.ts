import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db/schema";
import { sendPushToUser } from "../routes/push";

// SSE listeners keyed by userId — real-time in-app delivery
const notifListeners = new Map<string, import("express").Response>();

export function registerNotifListener(userId: string, res: import("express").Response) {
  notifListeners.set(userId, res);
}

export function removeNotifListener(userId: string, res: import("express").Response) {
  if (notifListeners.get(userId) === res) notifListeners.delete(userId);
}

export function sendNotifSSE(userId: string, payload: object) {
  const res = notifListeners.get(userId);
  if (res) {
    try { res.write(`event: notification\ndata: ${JSON.stringify(payload)}\n\n`); } catch {}
  }
}

export interface NotifyOptions {
  fromUserId?: string;
  postId?: number;
  url?: string;
  tag?: string;
}

export async function notifyUser(
  userId: string,
  type: "like" | "dislike" | "comment" | "follow" | "confession" | "tip" | "compliment" | "claw_mark" | "purge" | "broadcast" | "message" | "frequency_match" | "prank",
  message: string,
  opts: NotifyOptions = {}
) {
  // Always write to DB
  let notifId: number | undefined;
  try {
    const [row] = await db.insert(notificationsTable).values({
      userId,
      type,
      message,
      fromUserId: opts.fromUserId,
      postId: opts.postId,
    }).returning({ id: notificationsTable.id });
    notifId = row?.id;
  } catch {}

  const payload = {
    id: notifId ? String(notifId) : String(Date.now()),
    type,
    message,
    fromUserId: opts.fromUserId,
    postId: opts.postId ? String(opts.postId) : undefined,
    isRead: false,
    createdAt: new Date().toISOString(),
  };

  // Real-time SSE to active in-app user
  sendNotifSSE(userId, payload);

  // Push notification (fires even if app is open — browser suppresses if in focus)
  const notifIcons: Record<string, string> = {
    like: "❤️", dislike: "👎", comment: "💬", follow: "➕",
    message: "📩", tip: "💎", compliment: "💌", prank: "🎭",
    confession: "🌑", broadcast: "📡", claw_mark: "🐾",
    frequency_match: "✨", purge: "🔥",
  };
  const icon = notifIcons[type] || "🐾";

  await sendPushToUser(userId, {
    title: `${icon} ${message.slice(0, 60)}`,
    body: message,
    url: opts.url || "/",
    tag: opts.tag || `notif-${type}-${userId}`,
    type,
  });
}
