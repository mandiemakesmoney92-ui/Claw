import { useState, useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import Layout from "@/components/Layout";
import { useSEO } from "@/hooks/useSEO";
import { ShoppingBag, Zap, AlertTriangle, Loader2, ChevronLeft, Package, Inbox } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface PrankItem {
  type: string;
  emoji: string;
  name: string;
  description: string;
  count: number;
}

interface ReceivedPrank {
  id: number;
  prankType: string;
  senderDisplayName: string;
  message?: string;
  createdAt: string;
  viewed: boolean;
}

const PRANK_META: Record<string, { emoji: string; label: string; color: string }> = {
  waterBalloon: { emoji: "💦", label: "Water Balloon", color: "text-blue-400" },
  pie:          { emoji: "🥧", label: "Cream Pie", color: "text-yellow-300" },
  dogPoop:      { emoji: "💩", label: "Dog Poop Bag", color: "text-amber-700" },
  glitterBomb:  { emoji: "✨", label: "Glitter Bomb", color: "text-fuchsia-400" },
};

export default function PranksPage() {
  useSEO({ title: "Prank Shop — CLAW", description: "Buy and send hilarious pranks to your friends on CLAW" });
  const { user } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<"shop" | "inventory" | "inbox">("shop");
  const [catalog, setCatalog] = useState<any[]>([]);
  const [inventory, setInventory] = useState<PrankItem[]>([]);
  const [received, setReceived] = useState<ReceivedPrank[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [targetUsername, setTargetUsername] = useState("");
  const [selectedPrank, setSelectedPrank] = useState<string | null>(null);
  const [prankMsg, setPrankMsg] = useState("");
  const [throwing, setThrowing] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [catR, invR, recR] = await Promise.all([
        fetch(`${API}/api/pranks/catalog`, { credentials: "include" }),
        fetch(`${API}/api/pranks/inventory`, { credentials: "include" }),
        fetch(`${API}/api/pranks/received`, { credentials: "include" }),
      ]);
      if (catR.ok) setCatalog(await catR.json());
      if (invR.ok) setInventory(await invR.json());
      if (recR.ok) setReceived(await recR.json());
    } catch {}
    setLoading(false);
  };

  const buyPack = async (packId: string) => {
    setBuying(packId);
    try {
      const r = await fetch(`${API}/api/pranks/buy`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Purchase failed");
      toast({ title: "Pack purchased! 🎉", description: `${data.count} pranks added to your inventory` });
      fetchAll();
    } catch (err: any) {
      toast({ title: "Purchase failed", description: err.message, variant: "destructive" });
    } finally {
      setBuying(null);
    }
  };

  const sendPrank = async () => {
    if (!selectedPrank || !targetUsername.trim()) return;
    setThrowing(true);
    try {
      const r = await fetch(`${API}/api/pranks/send`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prankType: selectedPrank, targetUsername: targetUsername.trim(), message: prankMsg }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed to send");
      const meta = PRANK_META[selectedPrank];
      toast({ title: `${meta?.emoji || "🎯"} Prank launched!`, description: `You got ${targetUsername}!` });
      setSelectedPrank(null);
      setTargetUsername("");
      setPrankMsg("");
      fetchAll();
    } catch (err: any) {
      toast({ title: "Prank failed", description: err.message, variant: "destructive" });
    } finally {
      setThrowing(false);
    }
  };

  const inventoryMap = new Map(inventory.map(i => [i.type, i.count]));

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/profile" className="p-2 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-serif text-foreground flex items-center gap-2">
              🎯 Prank Armory
            </h1>
            <p className="text-sm text-muted-foreground">Buy packs, load up, and let loose on your friends</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-card border border-border rounded-xl p-1">
          {([
            { id: "shop", label: "Shop", icon: ShoppingBag },
            { id: "inventory", label: "Inventory", icon: Package },
            { id: "inbox", label: "Inbox", icon: Inbox },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {t.id === "inbox" && received.filter(r => !r.viewed).length > 0 && (
                <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {received.filter(r => !r.viewed).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div>
        ) : tab === "shop" ? (
          <div className="space-y-4">
            {/* Send a prank form */}
            {inventory.length > 0 && (
              <div className="bg-card border border-primary/20 rounded-2xl p-5 space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" /> Launch a Prank
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {inventory.map(item => {
                    const meta = PRANK_META[item.type] || { emoji: "🎯", label: item.type, color: "text-foreground" };
                    return (
                      <button
                        key={item.type}
                        onClick={() => setSelectedPrank(selectedPrank === item.type ? null : item.type)}
                        disabled={item.count === 0}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${selectedPrank === item.type ? "border-primary bg-primary/10" : "border-border bg-background hover:border-primary/40"} disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        <span className="text-2xl">{meta.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{meta.label}</p>
                          <p className={`text-xs ${meta.color}`}>×{item.count}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedPrank && (
                  <div className="space-y-3 pt-2 border-t border-border">
                    <input
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                      placeholder="Target's username (e.g. @mysteryclaw)"
                      value={targetUsername}
                      onChange={e => setTargetUsername(e.target.value.replace(/^@/, ""))}
                    />
                    <input
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                      placeholder="Optional message (optional)"
                      value={prankMsg}
                      onChange={e => setPrankMsg(e.target.value)}
                      maxLength={140}
                    />
                    <button
                      onClick={sendPrank}
                      disabled={!targetUsername.trim() || throwing}
                      className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground font-semibold py-2.5 rounded-xl transition-all"
                    >
                      {throwing ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-lg">{PRANK_META[selectedPrank]?.emoji}</span>}
                      {throwing ? "Launching..." : `Fire ${PRANK_META[selectedPrank]?.label}!`}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Prank packs */}
            <div className="grid gap-3">
              {catalog.map((pack: any) => (
                <div key={pack.id} className="bg-card border border-border hover:border-primary/30 rounded-2xl p-5 flex items-center gap-4 transition-all">
                  <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center text-3xl flex-shrink-0">
                    {PRANK_META[pack.prankType]?.emoji || "🎯"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{PRANK_META[pack.prankType]?.label || pack.name}</p>
                    <p className="text-sm text-muted-foreground">{pack.description}</p>
                    <p className="text-xs text-primary/80 mt-1">
                      {pack.count}× pranks · <span className="font-bold text-yellow-400">{pack.price} GEMZ</span>
                    </p>
                  </div>
                  <button
                    onClick={() => buyPack(pack.id)}
                    disabled={buying === pack.id}
                    className="flex-shrink-0 flex items-center gap-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary font-medium px-4 py-2 rounded-xl text-sm transition-all disabled:opacity-50"
                  >
                    {buying === pack.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShoppingBag className="w-3.5 h-3.5" />}
                    Buy
                  </button>
                </div>
              ))}
            </div>
          </div>

        ) : tab === "inventory" ? (
          <div className="grid gap-3">
            {inventory.length === 0 ? (
              <div className="bg-card border border-dashed border-border rounded-2xl p-10 text-center">
                <Package className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Inventory empty</p>
                <p className="text-muted-foreground/60 text-xs mt-1">Head to the shop and stock up on ammunition</p>
                <button onClick={() => setTab("shop")} className="mt-4 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-sm">Browse Shop</button>
              </div>
            ) : inventory.map(item => {
              const meta = PRANK_META[item.type] || { emoji: "🎯", label: item.type, color: "text-foreground" };
              return (
                <div key={item.type} className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
                  <span className="text-3xl">{meta.emoji}</span>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{meta.label}</p>
                    <p className={`text-sm ${meta.color}`}>{item.count} remaining</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">{item.description}</p>
                  </div>
                  <button
                    onClick={() => { setSelectedPrank(item.type); setTab("shop"); }}
                    disabled={item.count === 0}
                    className="px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Zap className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

        ) : (
          /* Inbox */
          <div className="space-y-3">
            {received.length === 0 ? (
              <div className="bg-card border border-dashed border-border rounded-2xl p-10 text-center">
                <Inbox className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No pranks received yet</p>
                <p className="text-muted-foreground/60 text-xs mt-1">Clearly you have no enemies. Flex.</p>
              </div>
            ) : received.map(p => {
              const meta = PRANK_META[p.prankType] || { emoji: "🎯", label: p.prankType, color: "text-foreground" };
              const ago = (() => {
                const diff = Date.now() - new Date(p.createdAt).getTime();
                if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
                if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
                return `${Math.floor(diff / 86400000)}d ago`;
              })();
              return (
                <div key={p.id} className={`bg-card border rounded-2xl p-5 flex gap-4 transition-all ${!p.viewed ? "border-primary/30 bg-primary/5" : "border-border"}`}>
                  <span className="text-3xl flex-shrink-0">{meta.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      <span className="text-primary">{p.senderDisplayName}</span> hit you with a {meta.label}
                    </p>
                    {p.message && <p className="text-sm text-muted-foreground italic mt-1">"{p.message}"</p>}
                    <p className="text-xs text-muted-foreground/50 mt-1">{ago}</p>
                  </div>
                  {!p.viewed && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                </div>
              );
            })}
          </div>
        )}

        {/* Consent note */}
        <div className="flex items-start gap-2 text-xs text-muted-foreground/50 p-3 bg-card/50 rounded-xl border border-border/50">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>Pranks are all in fun. Targets are notified who threw them. Block/report if it's not cool. Be chill.</span>
        </div>
      </div>
    </Layout>
  );
}
