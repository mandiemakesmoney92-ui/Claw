import { useState, useEffect } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { ensurePushSubscribed } from "@/hooks/usePushNotifications";
import { useAuth } from "@workspace/replit-auth-web";

export default function CallNotificationBanner() {
  const { user } = useAuth();
  const [status, setStatus] = useState<"unknown" | "granted" | "denied" | "dismissed">("unknown");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!("Notification" in window)) { setStatus("denied"); return; }
    const perm = Notification.permission;
    if (perm === "granted") setStatus("granted");
    else if (perm === "denied") setStatus("denied");
    else {
      // Check localStorage for dismissed state
      if (sessionStorage.getItem("claw_notif_session_dismissed") === "1") setStatus("dismissed");
      else setStatus("unknown");
    }
  }, [user]);

  if (!user) return null;
  if (status === "granted" || status === "dismissed") return null;

  const handleEnable = async () => {
    setLoading(true);
    const result = await ensurePushSubscribed();
    setLoading(false);
    setStatus(result === "granted" ? "granted" : "denied");
  };

  const handleDismiss = () => {
    sessionStorage.setItem("claw_notif_session_dismissed", "1");
    setStatus("dismissed");
  };

  return (
    <div className="relative flex items-center gap-3 px-4 py-3 text-sm"
      style={{ background: "linear-gradient(90deg,rgba(124,58,237,0.18),rgba(168,85,247,0.10))", borderBottom: "1px solid rgba(139,92,246,0.2)" }}>
      <Bell className="w-4 h-4 text-violet-400 shrink-0" />
      <span className="text-white/80 flex-1">
        {status === "denied"
          ? <><BellOff className="w-3.5 h-3.5 inline mr-1 text-red-400" />Call notifications are blocked — enable them in your browser settings so you don't miss calls.</>
          : <>Enable notifications to receive incoming calls even when the app is in the background.</>}
      </span>
      {status !== "denied" && (
        <button
          onClick={handleEnable}
          disabled={loading}
          className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
          style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "white", opacity: loading ? 0.6 : 1 }}
        >
          {loading ? "Enabling…" : "Enable"}
        </button>
      )}
      <button onClick={handleDismiss} className="shrink-0 text-white/30 hover:text-white/60 transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
