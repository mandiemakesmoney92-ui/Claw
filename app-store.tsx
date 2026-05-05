import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { useSEO } from "@/hooks/useSEO";
import { useAuth } from "@workspace/replit-auth-web";
import { Store, Coins, Check, Gamepad2, Sparkles, Users, ShoppingBag, Zap, Cat, MousePointer2, Type } from "lucide-react";
import { toast } from "sonner";

const CATEGORY_ICONS: Record<string, any> = {
  social: Users,
  game: Gamepad2,
  profile: Sparkles,
  effects: Zap,
  ringy: Cat,
  cursors: MousePointer2,
  fonts: Type,
};

const CATEGORY_LABELS: Record<string, string> = {
  social: "Social",
  game: "Mini Games",
  profile: "Profile Add-ons",
  effects: "Glitch Effects",
  ringy: "Ringy Outfits",
  cursors: "Cursor Packs",
  fonts: "Fonts & Colors",
};

export default function AppStore() {
  useSEO({
    title: "CLAW App Store — Unlock Social Features with GEMZ | Mystic Hidden Gem",
    description:
      "Browse CLAW's App Store. Spend GEMZ to unlock mini games, profile themes, font packs, Dream Catcher soulmate matching, graffiti walls, and more social platform features.",
    canonical: "/app-store",
    noIndex: false,
  });

  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["app-store"],
    queryFn: async () => {
      const res = await fetch("/api/app-store", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{ catalog: any[]; owned: string[] }>;
    },
  });

  const { data: coinsData } = useQuery({
    queryKey: ["coins-balance"],
    queryFn: async () => {
      const res = await fetch("/api/coins/me", { credentials: "include" });
      if (!res.ok) return { balance: 0 };
      return res.json();
    },
    enabled: !!user,
  });

  const purchase = useMutation({
    mutationFn: async (appId: string) => {
      const res = await fetch("/api/app-store/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ appId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Purchase failed");
      return data;
    },
    onSuccess: (_, appId) => {
      qc.invalidateQueries({ queryKey: ["app-store"] });
      qc.invalidateQueries({ queryKey: ["coins-balance"] });
      toast.success("App unlocked! 🎉");
    },
    onError: (err: any) => {
      toast.error(err.message || "Not enough GEMZ");
    },
  });

  const catalog = data?.catalog || [];
  const owned = data?.owned || [];
  const balance = coinsData?.balance ?? 0;

  const categories = ["all", ...Array.from(new Set(catalog.map((a: any) => a.category)))];
  const filtered = activeCategory === "all" ? catalog : catalog.filter((a: any) => a.category === activeCategory);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <Store className="w-7 h-7 text-purple-400" />
            <h1 className="text-3xl font-serif font-bold text-white">App Store</h1>
          </div>
          <p className="text-white/40 text-sm max-w-md mx-auto">
            Unlock mini games, profile widgets, and social features with GEMZ.
            Add them to your profile and let visitors play.
          </p>
          {user && (
            <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-1.5">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-white/70">Your balance: <span className="text-yellow-400 font-bold">{balance.toLocaleString()} GEMZ</span></span>
            </div>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map(cat => {
            const Icon = cat === "all" ? ShoppingBag : (CATEGORY_ICONS[cat] || Sparkles);
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                  activeCategory === cat
                    ? "bg-purple-600 text-white"
                    : "bg-white/5 text-white/40 hover:text-white/70 hover:bg-white/8"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat === "all" ? "All Apps" : CATEGORY_LABELS[cat] || cat}
              </button>
            );
          })}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((app: any) => {
              const isOwned = owned.includes(app.id);
              const canAfford = balance >= app.coinCost;
              return (
                <div
                  key={app.id}
                  className={`bg-[#0d0d1a] border rounded-2xl p-5 space-y-3 transition-all ${isOwned ? "border-purple-500/40 bg-purple-500/5" : "border-white/8 hover:border-white/15"}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{app.icon}</span>
                      <div>
                        <div className="font-semibold text-white text-sm">{app.name}</div>
                        <div className="text-xs text-white/30 capitalize">{CATEGORY_LABELS[app.category] || app.category}</div>
                      </div>
                    </div>
                    {isOwned && (
                      <div className="flex items-center gap-1 bg-purple-500/20 text-purple-400 text-xs px-2 py-1 rounded-lg">
                        <Check className="w-3 h-3" /> Owned
                      </div>
                    )}
                  </div>

                  <p className="text-white/50 text-xs leading-relaxed">{app.description}</p>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5 text-yellow-400 font-bold text-sm">
                      <Coins className="w-4 h-4" />
                      {app.coinCost.toLocaleString()}
                    </div>
                    {!isOwned && user && (
                      <button
                        onClick={() => purchase.mutate(app.id)}
                        disabled={!canAfford || purchase.isPending}
                        className={`px-4 py-1.5 rounded-xl text-xs font-medium transition-all ${
                          canAfford
                            ? "bg-purple-600 hover:bg-purple-500 text-white"
                            : "bg-white/5 text-white/20 cursor-not-allowed"
                        }`}
                      >
                        {purchase.isPending ? "..." : canAfford ? "Unlock" : "Need more coins"}
                      </button>
                    )}
                    {!user && (
                      <span className="text-xs text-white/25">Sign in to buy</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Get coins CTA */}
        <div className="bg-gradient-to-r from-yellow-500/10 to-purple-500/10 border border-yellow-500/20 rounded-2xl p-6 text-center space-y-3">
          <div className="text-2xl">🪙</div>
          <div className="text-white font-semibold">Need more GEMZ?</div>
          <p className="text-white/40 text-sm">Earn GEMZ by engaging with the community, or purchase a bundle from the Shop.</p>
          <a href="/shop" className="inline-block px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold text-sm rounded-xl transition-colors">
            Get Coins
          </a>
        </div>

        {/* Tip Mandie — subtle, heartfelt */}
        <div className="border border-white/5 rounded-2xl p-5 text-center space-y-2">
          <p className="text-white/25 text-xs italic leading-relaxed max-w-sm mx-auto">
            CLAW was built by one person, with a lot of love and very little sleep. 
            If this place has meant something to you, a tip to Mandie means the world. 💜
          </p>
          <a href="/shop?tab=support" className="text-xs text-purple-400/60 hover:text-purple-400 transition-colors underline underline-offset-2">
            Tip the creator →
          </a>
        </div>
      </div>
    </Layout>
  );
}
