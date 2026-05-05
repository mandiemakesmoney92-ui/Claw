import { useState, useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import Layout from "@/components/Layout";
import { useSEO } from "@/hooks/useSEO";
import { Link2, Copy, Check, Gift, Users, Zap, Loader2, ChevronLeft, Share2, Star } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ReferralData {
  code: string;
  referralCount: number;
  totalGemzEarned: number;
  referralUrl: string;
}

export default function ReferralsPage() {
  useSEO({ title: "Invite Friends — CLAW", description: "Earn GEMZ by inviting friends to CLAW" });
  const { user } = useAuth();
  const { toast } = useToast();

  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [claimCode, setClaimCode] = useState("");
  const [claiming, setClaiming] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/referrals/me`, { credentials: "include" });
      if (r.ok) setData(await r.json());
    } catch {}
    setLoading(false);
  };

  const copyCode = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      toast({ title: "Link copied!", description: "Share it anywhere to earn 100 GEMZ per sign-up" });
    } catch {}
  };

  const shareLink = async () => {
    if (!data) return;
    if (navigator.share) {
      await navigator.share({
        title: "Join me on CLAW",
        text: "I found the most unhinged social platform. Come see.",
        url: data.referralUrl,
      });
    } else {
      copyCode();
    }
  };

  const claimReferral = async () => {
    if (!claimCode.trim()) return;
    setClaiming(true);
    try {
      const r = await fetch(`${API}/api/referrals/claim`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: claimCode.trim().toUpperCase() }),
      });
      const result = await r.json();
      if (!r.ok) throw new Error(result.error || "Failed to claim");
      toast({ title: `+${result.gemzAwarded} GEMZ!`, description: result.message });
      setClaimCode("");
      fetchData();
    } catch (err: any) {
      toast({ title: "Couldn't claim", description: err.message, variant: "destructive" });
    } finally {
      setClaiming(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/profile" className="p-2 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors">
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-serif text-foreground flex items-center gap-2">
              <Gift className="w-6 h-6 text-primary" /> Invite & Earn
            </h1>
            <p className="text-sm text-muted-foreground">Earn 100 GEMZ for every friend you bring in</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-muted-foreground" /></div>
        ) : data ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-primary/20 rounded-2xl p-4 text-center">
                <div className="text-3xl font-bold text-primary">{data.referralCount}</div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1"><Users className="w-3 h-3" /> Friends invited</div>
              </div>
              <div className="bg-card border border-yellow-500/20 rounded-2xl p-4 text-center">
                <div className="text-3xl font-bold text-yellow-400">{data.totalGemzEarned}</div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1"><Zap className="w-3 h-3" /> GEMZ earned</div>
              </div>
            </div>

            {/* Referral link */}
            <div className="bg-card border border-primary/20 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Link2 className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">Your referral link</h3>
              </div>

              <div className="bg-background border border-border rounded-xl px-4 py-3 font-mono text-sm text-primary/80 break-all select-all">
                {data.referralUrl}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={copyCode}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm transition-all hover:bg-primary/80"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy Link"}
                </button>
                <button
                  onClick={shareLink}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border hover:border-primary/40 text-foreground font-medium text-sm transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              </div>

              <div className="text-xs text-muted-foreground font-mono text-center">
                Code: <span className="text-primary font-bold tracking-widest">{data.code}</span>
              </div>
            </div>

            {/* How it works */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <h3 className="font-semibold text-foreground">How it works</h3>
              {[
                { emoji: "📤", step: "Share your link anywhere" },
                { emoji: "🐱", step: "Friend signs up and joins CLAW" },
                { emoji: "✨", step: "You both earn GEMZ — 100 for you, 25 for them" },
                { emoji: "🔁", step: "No limit. Invite as many as you want." },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="text-xl">{s.emoji}</span>
                  <span className="text-foreground/80">{s.step}</span>
                </div>
              ))}
            </div>

            {/* Claim a code someone gave you */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400" /> Got a referral code?
              </h3>
              <p className="text-sm text-muted-foreground">Enter the code of whoever invited you to earn bonus GEMZ.</p>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 font-mono tracking-wider uppercase"
                  placeholder="FRIEND-ABC123"
                  value={claimCode}
                  onChange={e => setClaimCode(e.target.value.toUpperCase())}
                  maxLength={12}
                />
                <button
                  onClick={claimReferral}
                  disabled={!claimCode.trim() || claiming}
                  className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm transition-all hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : "Claim"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">Failed to load referral data.</div>
        )}
      </div>
    </Layout>
  );
}
