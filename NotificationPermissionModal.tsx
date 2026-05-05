import { useState, useEffect } from "react";
import { Bell, Phone, X, PhoneMissed } from "lucide-react";
import { ensurePushSubscribed } from "@/hooks/usePushNotifications";

interface Props {
  onGranted: () => void;
  onDismiss: () => void;
  reason?: "first-login" | "missed-call";
}

export default function NotificationPermissionModal({ onGranted, onDismiss, reason = "first-login" }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleEnable = async () => {
    setLoading(true);
    setError(false);
    const result = await ensurePushSubscribed();
    setLoading(false);
    if (result === "granted") {
      onGranted();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}>
      <div className="relative w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: "linear-gradient(160deg,#1a0a2e 0%,#0d0d1a 100%)", border: "1px solid rgba(139,92,246,0.3)" }}>

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-white/30 hover:text-white/70 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header glow */}
        <div className="absolute top-0 left-0 right-0 h-32 opacity-40"
          style={{ background: "radial-gradient(ellipse at 50% -10%, #7c3aed 0%, transparent 70%)" }} />

        <div className="relative px-6 pt-8 pb-6 text-center">
          {/* Icon */}
          <div className="mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow: "0 0 30px rgba(124,58,237,0.5)" }}>
            {reason === "missed-call"
              ? <PhoneMissed className="w-8 h-8 text-white" />
              : <Bell className="w-8 h-8 text-white" />}
          </div>

          <h2 className="text-xl font-bold text-white mb-2">
            {reason === "missed-call" ? "You missed a call!" : "Enable Call Notifications"}
          </h2>

          <p className="text-white/60 text-sm leading-relaxed mb-6">
            {reason === "missed-call"
              ? "You missed a call because notifications were off. Enable them now so CLAW can wake your device when someone calls — even if the app is closed."
              : "CLAW needs to notify you when someone calls, even when the app is in the background or your screen is off. Without this, you'll miss calls silently."}
          </p>

          {/* Feature bullets */}
          <div className="text-left space-y-2.5 mb-6 px-2">
            {[
              { icon: Phone, text: "Get alerted for incoming voice & video calls" },
              { icon: Bell, text: "Receive missed call alerts when offline" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(139,92,246,0.3)" }}>
                  <Icon className="w-3.5 h-3.5 text-violet-400" />
                </div>
                <span className="text-white/70 text-sm">{text}</span>
              </div>
            ))}
          </div>

          {error && (
            <p className="text-red-400 text-xs mb-4">
              Notifications were blocked. Go to your browser settings → Site settings → Notifications and allow this site.
            </p>
          )}

          <button
            onClick={handleEnable}
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-white text-base transition-all active:scale-95 mb-3"
            style={{
              background: loading ? "rgba(124,58,237,0.5)" : "linear-gradient(135deg,#7c3aed,#a855f7)",
              boxShadow: loading ? "none" : "0 4px 20px rgba(124,58,237,0.4)",
            }}
          >
            {loading ? "Checking…" : "Enable Notifications"}
          </button>

          <button
            onClick={onDismiss}
            className="w-full py-2.5 text-sm text-white/30 hover:text-white/50 transition-colors"
          >
            Skip — I'll miss calls
          </button>
        </div>
      </div>
    </div>
  );
}
