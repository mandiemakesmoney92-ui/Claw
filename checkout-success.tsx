import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import Layout from "@/components/Layout";
import { CheckCircle, Loader2, Sparkles } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

export default function CheckoutSuccess() {
  useSEO({ title: "Purchase Complete", description: "Your CLAW purchase was successful.", noIndex: true, canonical: "/checkout/success" });

  const [location] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session_id");
  const item = params.get("item");

  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [unlockedItem, setUnlockedItem] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) { setStatus("error"); return; }
    fetch(`${BASE_URL}/api/stripe/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ sessionId }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setUnlockedItem(data.unlockedItem);
          setStatus("success");
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, [sessionId]);

  return (
    <Layout>
      <div className="max-w-md mx-auto p-8 flex flex-col items-center text-center gap-6 mt-12">
        {status === "verifying" && (
          <>
            <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
            <p className="text-white/60">Verifying your purchase…</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Purchase Complete!</h1>
            <div className="flex items-center gap-2 text-purple-300">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm">
                {unlockedItem?.startsWith("coins_")
                  ? "Your GEMZ have been added to your balance. Spend them wisely."
                  : unlockedItem
                    ? `"${unlockedItem.replace(/_/g, " ")}" has been unlocked on your profile.`
                    : "Your item has been unlocked."}
              </span>
            </div>
            <p className="text-white/50 text-sm">
              Thank you for supporting CLAW. Every purchase keeps this platform alive and growing.
            </p>
            {unlockedItem?.startsWith("coins_") ? (
              <Link href="/creator">
                <button className="px-6 py-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors">
                  Back to Creator Hub
                </button>
              </Link>
            ) : (
              <Link href="/profile/edit">
                <button className="px-6 py-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors">
                  Apply it to your profile
                </button>
              </Link>
            )}
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="text-xl font-bold text-white">Something went wrong</h1>
            <p className="text-white/50 text-sm">We couldn't verify your payment. If you were charged, please reach out.</p>
            <Link href="/creator">
              <button className="px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors">
                Go back
              </button>
            </Link>
          </>
        )}
      </div>
    </Layout>
  );
}
