import { Router } from "express";
import { db } from "@workspace/db";
import { pushSubscriptionsTable, kvStoreTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import webpush from "web-push";

const router = Router();

// ── VAPID Key Management — stored in DB so they survive restarts ──────────────
async function getOrCreateVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  // Env overrides always win
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  }
  try {
    // Try loading from DB
    const [row] = await db.select().from(kvStoreTable).where(eq(kvStoreTable.key, "vapid_keys")).limit(1);
    if (row) {
      const parsed = JSON.parse(row.value);
      if (parsed.publicKey && parsed.privateKey) return parsed;
    }
    // Generate new keys and persist them
    const keys = webpush.generateVAPIDKeys();
    await db.insert(kvStoreTable).values({
      key: "vapid_keys",
      value: JSON.stringify(keys),
    }).onConflictDoNothing();
    console.log("[Push] Generated and stored new VAPID keys in DB");
    return keys;
  } catch (err) {
    console.error("[Push] DB error loading VAPID keys, generating ephemeral:", err);
    return webpush.generateVAPIDKeys();
  }
}

// Initialize synchronously with a bootstrap promise so we can export vapidKeys
let vapidKeys = { publicKey: "", privateKey: "" };
const vapidReady = getOrCreateVapidKeys().then(keys => {
  vapidKeys = keys;
  webpush.setVapidDetails("mailto:hello@mystichiddengem.com", keys.publicKey, keys.privateKey);
  console.log("[Push] VAPID ready. Public key:", keys.publicKey.slice(0, 20) + "…");
}).catch(err => console.error("[Push] Failed to init VAPID:", err));

export { vapidKeys, webpush, vapidReady };

// ── Get public VAPID key ──────────────────────────────────────────────────────
router.get("/push/vapid-key", async (_req, res) => {
  await vapidReady;
  res.json({ publicKey: vapidKeys.publicKey });
});

// ── Subscribe to push notifications ──────────────────────────────────────────
router.post("/push/subscribe", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: "Invalid subscription" });
  }

  await db.insert(pushSubscriptionsTable).values({
    userId: req.user.id,
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
  }).onConflictDoUpdate({
    target: pushSubscriptionsTable.endpoint,
    set: { userId: req.user.id, p256dh: keys.p256dh, auth: keys.auth },
  });

  res.json({ ok: true });
});

// ── Unsubscribe ───────────────────────────────────────────────────────────────
router.delete("/push/subscribe", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { endpoint } = req.body;
  if (!endpoint) return res.status(400).json({ error: "endpoint required" });
  await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, endpoint));
  res.json({ ok: true });
});

// ── Internal helper: send push to a user ──────────────────────────────────────
export async function sendPushToUser(userId: string, payload: {
  title: string; body: string; icon?: string; url?: string;
  tag?: string; callId?: string; type?: string;
}) {
  await vapidReady; // ensure keys are initialized
  try {
    const subs = await db.select().from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.userId, userId));
    console.log(`[Push] Sending to user ${userId}: ${subs.length} subscriptions`);
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ ...payload, icon: payload.icon || "/icons/icon-192.png" })
        );
        console.log(`[Push] Delivered to ${sub.endpoint.slice(0, 40)}…`);
      } catch (err: any) {
        console.warn(`[Push] Failed for endpoint: ${err.statusCode} ${err.message}`);
        if (err.statusCode === 410 || err.statusCode === 404) {
          await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, sub.endpoint));
        }
      }
    }
  } catch (err) {
    console.error("[Push] sendPushToUser error:", err);
  }
}

export default router;
