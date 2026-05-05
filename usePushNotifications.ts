import { useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");
const VAPID_KEY_LS = "claw_vapid_public_key";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

async function doSubscribe(reg: ServiceWorkerRegistration, publicKey: string) {
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  });
  await fetch(`${API}/api/push/subscribe`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub.toJSON()),
  });
  localStorage.setItem(VAPID_KEY_LS, publicKey);
}

export async function ensurePushSubscribed(): Promise<"granted" | "denied" | "unsupported"> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";

  try {
    const permission = Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
    if (permission !== "granted") return "denied";

    const r = await fetch(`${API}/api/push/vapid-key`, { credentials: "include" });
    if (!r.ok) return "denied";
    const { publicKey } = await r.json();

    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();

    // Check if our stored VAPID key matches the server's current one
    const storedKey = localStorage.getItem(VAPID_KEY_LS);
    if (existing && storedKey === publicKey) {
      // Already subscribed with current key — re-POST subscription to ensure server has it
      // (handles case where server DB was wiped)
      await fetch(`${API}/api/push/subscribe`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(existing.toJSON()),
      }).catch(() => {});
      return "granted";
    }

    // VAPID key changed or no subscription — resubscribe
    if (existing) await existing.unsubscribe().catch(() => {});
    await doSubscribe(reg, publicKey);
    return "granted";
  } catch (err) {
    console.warn("[Push] Subscription error:", err);
    return "denied";
  }
}

export function usePushNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    // Auto-attempt on login if permission already granted (no prompt)
    if (Notification.permission === "granted") {
      ensurePushSubscribed().catch(() => {});
    }
  }, [user?.id]);
}
