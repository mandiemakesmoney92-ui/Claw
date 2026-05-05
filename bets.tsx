import { useState, useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import Layout from "@/components/Layout";
import { Loader2, Plus, TrendingUp, Trophy, X, ChevronDown, ChevronUp, Coins } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BetCreator { id: string; username: string; displayName: string; avatarUrl?: string; }
interface BetSide { id: number; userId: string; side: string; amount: number; payout: number; }
interface Bet {
  id: number; creatorId: string; creator: BetCreator | null;
  title: string; description?: string; stakeAmount: number;
  status: string; winningSide?: string;
  forCount: number; againstCount: number; totalPot: number;
  platformCutPct: number; settledAt?: string; createdAt: string;
  mySide?: string; sides: BetSide[];
}

function BetCard({ bet, currentUserId, onRefresh }: { bet: Bet; currentUserId?: string; onRefresh: () => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showSettle, setShowSettle] = useState(false);
  const total = bet.forCount + bet.againstCount;
  const forPct = total > 0 ? Math.round((bet.forCount / total) * 100) : 50;
  const isCreator = bet.creatorId === currentUserId;
  const hasBet = !!bet.mySide;
  const isOpen = bet.status === "open";
  const canBet = isOpen && !isCreator && !hasBet;

  async function placeBet(side: "for" | "against") {
    setLoading(true);
    try {
      const r = await fetch(`/api/bets/${bet.id}/side`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ side }),
      });
      const data = await r.json();
      if (!r.ok) { toast({ title: "Can't place bet", description: data.error, variant: "destructive" }); return; }
      toast({ title: `Bet placed ${side === "for" ? "FOR" : "AGAINST"}!`, description: `${bet.stakeAmount} SOULZ staked` });
      onRefresh();
    } finally { setLoading(false); }
  }

  async function settleBet(winningSide: "for" | "against") {
    setLoading(true);
    try {
      const r = await fetch(`/api/bets/${bet.id}/settle`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winningSide }),
      });
      const data = await r.json();
      if (!r.ok) { toast({ title: "Settle failed", description: data.error, variant: "destructive" }); return; }
      toast({ title: "Bet settled!", description: `${winningSide.toUpperCase()} side wins. SOULZ distributed.` });
      setShowSettle(false);
      onRefresh();
    } finally { setLoading(false); }
  }

  const statusColor = bet.status === "open" ? "text-green-400 bg-green-400/10" : bet.status === "settled" ? "text-purple-400 bg-purple-400/10" : "text-gray-400 bg-gray-400/10";

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusColor}`}>
              {bet.status}
            </span>
            {bet.winningSide && (
              <span className="text-[10px] font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full uppercase">
                {bet.winningSide} won
              </span>
            )}
          </div>
          <h3 className="font-semibold text-foreground mt-1.5 leading-tight">{bet.title}</h3>
          {bet.description && <p className="text-sm text-muted-foreground mt-1">{bet.description}</p>}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-sm font-bold text-purple-400">✦ {bet.totalPot}</div>
          <div className="text-[10px] text-muted-foreground">total pot</div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {bet.creator?.avatarUrl ? (
          <img src={bet.creator.avatarUrl} className="w-5 h-5 rounded-full" alt="" />
        ) : (
          <div className="w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center text-[10px]">
            {(bet.creator?.displayName || "?")[0]}
          </div>
        )}
        <span>{bet.creator?.displayName ?? "Unknown"}</span>
        <span>·</span>
        <span>{bet.stakeAmount} SOULZ/side</span>
        <span>·</span>
        <span>{new Date(bet.createdAt).toLocaleDateString()}</span>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="text-green-400 font-medium">FOR ({bet.forCount})</span>
          <span className="text-red-400 font-medium">AGAINST ({bet.againstCount})</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500" style={{ width: `${forPct}%` }} />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{forPct}%</span>
          <span>{100 - forPct}%</span>
        </div>
      </div>

      {hasBet && (
        <div className={`text-xs px-3 py-1.5 rounded-lg font-medium ${bet.mySide === "for" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
          You bet {bet.mySide === "for" ? "FOR" : "AGAINST"} — {bet.stakeAmount} SOULZ staked
        </div>
      )}

      {canBet && (
        <div className="flex gap-2">
          <button
            onClick={() => placeBet("for")}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-semibold transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `✓ FOR  (${bet.stakeAmount} SOULZ)`}
          </button>
          <button
            onClick={() => placeBet("against")}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-semibold transition-all"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `✗ AGAINST  (${bet.stakeAmount} SOULZ)`}
          </button>
        </div>
      )}

      {isCreator && isOpen && (
        <div>
          <button
            onClick={() => setShowSettle(!showSettle)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-yellow-500/30 text-yellow-400 text-sm hover:bg-yellow-500/10 transition-colors"
          >
            <Trophy className="w-4 h-4" />
            Settle Bet
            {showSettle ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showSettle && (
            <div className="mt-2 flex gap-2">
              <button onClick={() => settleBet("for")} disabled={loading} className="flex-1 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-300 text-sm font-bold transition-all">
                ✓ FOR Won
              </button>
              <button onClick={() => settleBet("against")} disabled={loading} className="flex-1 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-sm font-bold transition-all">
                ✗ AGAINST Won
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CreateBetForm({ onCreated }: { onCreated: () => void }) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stake, setStake] = useState(10);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleCreate() {
    if (!title.trim()) return;
    setLoading(true);
    try {
      const r = await fetch("/api/bets", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined, stakeAmount: stake }),
      });
      if (!r.ok) {
        const d = await r.json();
        toast({ title: "Failed", description: d.error, variant: "destructive" });
        return;
      }
      toast({ title: "Bet created!", description: "Others can now bet against you." });
      setTitle(""); setDescription(""); setStake(10); setOpen(false);
      onCreated();
    } finally { setLoading(false); }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-primary/40 text-primary hover:bg-primary/10 transition-colors text-sm font-medium"
      >
        <Plus className="w-4 h-4" />
        Create a Bet
      </button>
    );
  }

  return (
    <div className="bg-card border border-primary/30 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground text-sm">Create a Bet</h3>
        <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
      </div>
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="What are you betting on? e.g. 'I'll finish my project by Friday'"
        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
        maxLength={200}
      />
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Add context or rules (optional)"
        rows={2}
        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
        maxLength={500}
      />
      <div className="flex items-center gap-3">
        <label className="text-xs text-muted-foreground flex-shrink-0">Stake per side:</label>
        <select
          value={stake}
          onChange={e => setStake(Number(e.target.value))}
          className="bg-background border border-border rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none"
        >
          {[5, 10, 25, 50, 100, 250, 500, 1000].map(v => (
            <option key={v} value={v}>{v} SOULZ</option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">(3% platform cut on winnings)</span>
      </div>
      <button
        onClick={handleCreate}
        disabled={loading || !title.trim()}
        className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Post Bet"}
      </button>
    </div>
  );
}

export default function BetsPage() {
  const { user } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "mine">("all");

  async function loadBets() {
    setLoading(true);
    try {
      const url = tab === "mine" ? "/api/bets/mine" : "/api/bets";
      const r = await fetch(url, { credentials: "include" });
      if (r.ok) setBets(await r.json());
    } finally { setLoading(false); }
  }

  useEffect(() => { loadBets(); }, [tab]);

  const open = bets.filter(b => b.status === "open");
  const settled = bets.filter(b => b.status !== "open");

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4 space-y-5">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <TrendingUp className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-serif font-bold text-foreground">SOULZ Betting</h1>
          </div>
          <p className="text-sm text-muted-foreground">Stake SOULZ on anything. If someone bets against you and you win, you take their SOULZ minus a 3% house cut.</p>
        </div>

        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3 text-xs text-yellow-400/80">
          <strong>How it works:</strong> Create a bet with a stake amount. Others bet FOR or AGAINST. When you settle, the winning side splits the losing side's pot (3% goes to the platform). You can only win if someone bets against you.
        </div>

        <CreateBetForm onCreated={loadBets} />

        <div className="flex gap-2">
          {(["all", "mine"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-sm border transition-all ${tab === t ? "bg-primary/20 border-primary/50 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {t === "all" ? "All Bets" : "My Bets"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : bets.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Coins className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-serif text-lg mb-2">No bets yet</p>
            <p className="text-sm">Be the first to put your SOULZ on the line.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {open.length > 0 && (
              <div>
                <div className="text-xs font-bold text-green-400 uppercase tracking-widest mb-3">Open Bets</div>
                <div className="space-y-3">
                  {open.map(b => <BetCard key={b.id} bet={b} currentUserId={user?.id} onRefresh={loadBets} />)}
                </div>
              </div>
            )}
            {settled.length > 0 && (
              <div>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Settled</div>
                <div className="space-y-3 opacity-70">
                  {settled.map(b => <BetCard key={b.id} bet={b} currentUserId={user?.id} onRefresh={loadBets} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
