import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Sparkles, Loader2, ShoppingBag, Heart, Palette, MousePointer } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { useAuth } from "@workspace/replit-auth-web";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

interface ShopItem {
  id: string;
  name: string;
  amount: number;
  description: string;
  priceDisplay: string;
}

const CATEGORY_ICONS: Record<string, any> = {
  theme: Palette,
  cursor: MousePointer,
  support: Heart,
};

function itemCategory(id: string) {
  if (id.startsWith("theme_")) return "theme";
  if (id.startsWith("cursor_")) return "cursor";
  return "support";
}

function itemEmoji(id: string) {
  const map: Record<string, string> = {
    theme_eclipse: "🌑",
    theme_moonrise: "🌙",
    theme_abyss: "🌊",
    theme_inferno: "🔥",
    theme_sakura: "🌸",
    theme_galaxy: "🌌",
    theme_obsidian: "⬛",
    cursor_paw: "🐾",
    cursor_crystal: "💎",
    cursor_flame: "🕯️",
    support_small: "☕",
    support_medium: "🩷",
    support_large: "⭐",
  };
  return map[id] || "✨";
}

export default function Shop() {
  useSEO({
    title: "GEMZ Shop — Premium Themes and Social Upgrades | CLAW",
    description:
      "Buy GEMZ to unlock dark mystic profile themes, font packs, custom cursors, and platform upgrades on CLAW. Support the anti-algorithm social platform that keeps it real.",
    canonical: "/shop",
  });

  const { user } = useAuth();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [purchased, setPurchased] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"theme" | "cursor" | "support">("theme");

  useEffect(() => {
    fetch(`${BASE_URL}/api/stripe/items`, { credentials: "include" })
      .then(r => r.json())
      .then(data => setItems(data.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));

    // Load purchased items from profile
    fetch(`${BASE_URL}/api/users/me`, { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.purchasedThemes)) {
          setPurchased(data.purchasedThemes);
        }
      })
      .catch(() => {});
  }, []);

  const handleBuy = async (item: ShopItem) => {
    if (!user) return;
    setPurchasing(item.id);
    try {
      const res = await fetch(`${BASE_URL}/api/stripe/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ itemId: item.id }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setPurchasing(null);
    }
  };

  const filteredItems = items.filter(i => itemCategory(i.id) === activeTab);

  const tabs: { key: "theme" | "cursor" | "support"; label: string; emoji: string }[] = [
    { key: "theme", label: "Themes", emoji: "🎨" },
    { key: "cursor", label: "Cursors", emoji: "🖱️" },
    { key: "support", label: "Support CLAW", emoji: "💜" },
  ];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4 pb-20">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ShoppingBag className="w-6 h-6 text-purple-400" />
            <h1 className="text-2xl font-bold text-white">CLAW Shop</h1>
          </div>
          <p className="text-white/50 text-sm max-w-sm mx-auto">
            Unlock premium themes and cursors for your profile. Every purchase directly supports the creator behind CLAW.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-white/10 pb-3">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-purple-600/80 text-white"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              {tab.emoji} {tab.label}
            </button>
          ))}
        </div>

        {/* Support note */}
        {activeTab === "support" && (
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 mb-6 text-sm text-purple-200/80 leading-relaxed">
            <p className="font-semibold text-purple-300 mb-1">From the creator of CLAW</p>
            <p>
              CLAW is free forever — no paywalls, no ads. If this platform has meant something to you,
              a small tip means the world and helps keep it running. Thank you for being here.
            </p>
          </div>
        )}

        {/* Items */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredItems.map(item => {
              const isOwned = purchased.includes(item.id);
              const isBuying = purchasing === item.id;
              return (
                <div
                  key={item.id}
                  className={`relative rounded-2xl border p-5 flex flex-col gap-3 transition-all ${
                    isOwned
                      ? "border-purple-500/40 bg-purple-500/10"
                      : "border-white/10 bg-white/[0.03] hover:border-purple-500/30 hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{itemEmoji(item.id)}</span>
                      <div>
                        <h3 className="text-white font-semibold text-sm leading-tight">{item.name}</h3>
                        <p className="text-white/40 text-xs mt-0.5">{item.description}</p>
                      </div>
                    </div>
                    {isOwned && (
                      <span className="text-xs text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded-full shrink-0">Owned</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-purple-300 font-bold text-sm">{item.priceDisplay}</span>
                    {isOwned ? (
                      <span className="text-xs text-white/30 italic">Already unlocked</span>
                    ) : (
                      <button
                        onClick={() => handleBuy(item)}
                        disabled={isBuying || !user}
                        className="px-4 py-1.5 rounded-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold transition-all flex items-center gap-1.5"
                      >
                        {isBuying ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                        {isBuying ? "Loading…" : "Unlock"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!user && (
          <p className="text-center text-white/40 text-sm mt-8">Sign in to make purchases</p>
        )}

        <p className="text-center text-white/20 text-xs mt-10">
          Payments powered by Stripe. Secure checkout. No subscription required.
        </p>
      </div>
    </Layout>
  );
}
