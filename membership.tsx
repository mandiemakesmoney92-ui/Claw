import { useState, useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import Layout from "@/components/Layout";
import { useSEO } from "@/hooks/useSEO";
import { Loader2, Check, Crown, Sparkles, Shield } from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

interface MembershipStatus {
  isMember: boolean;
  membershipExpiresAt: string | null;
  purgatoryFreeCard: boolean;
  memberRareThemes: string[];
  memberCursors: string[];
}

const PERKS = [
  { icon: "🐾", label: "Paw Print Badge", desc: "Exclusive paw print displayed next to your name everywhere on CLAW" },
  { icon: "🎨", label: "3 Rare Themes", desc: "Velvet Midnight · Golden Blood · Abyssal Jade — exclusive member-only themes" },
  { icon: "🖱️", label: "2 Unique Cursors", desc: "Golden Paw · Crystal Claw — rare cursors only for members" },
  { icon: "🃏", label: "Purgatory Free Card", desc: "One get-out-of-purgatory free card, renewed monthly" },
  { icon: "👑", label: "Monthly Kat Spotlight", desc: "Eligible for the Influential Kat of the Month spotlight at the top of the feed" },
];

export default function MembershipPage() {
  const { user } = useAuth();
  useSEO({ title: "CLAW Membership", description: "Join CLAW Membership for $5/month and unlock exclusive perks" });

  const [status, setStatus] = useState<MembershipStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [usingFreeCard, setUsingFreeCard] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const successParam = new URLSearchParams(window.location.search).get("success");

  useEffect(() => {
    if (!user) return;
    fetch(`${BASE}/api/membership/me`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { setStatus(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (successParam === "1") setMessage("🐾 You're now a CLAW Member! Your paw badge and perks are active.");
  }, [successParam]);

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const r = await fetch(`${BASE}/api/membership/subscribe`, { method: "POST", credentials: "include" });
      const d = await r.json();
      if (d.url) window.location.href = d.url;
      else setMessage(d.error || "Something went wrong");
    } finally {
      setSubscribing(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel your membership?")) return;
    setCancelling(true);
    try {
      await fetch(`${BASE}/api/membership/cancel`, { method: "POST", credentials: "include" });
      setStatus(prev => prev ? { ...prev, isMember: false } : prev);
      setMessage("Membership cancelled. Your perks remain active until the billing period ends.");
    } finally {
      setCancelling(false);
    }
  };

  const handleUseFreeCard = async () => {
    setUsingFreeCard(true);
    try {
      const r = await fetch(`${BASE}/api/membership/use-free-card`, { method: "POST", credentials: "include" });
      const d = await r.json();
      setMessage(d.message || d.error);
      if (r.ok) setStatus(prev => prev ? { ...prev, purgatoryFreeCard: false } : prev);
    } finally {
      setUsingFreeCard(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🐾</div>
          <h1 className="text-3xl font-serif font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            CLAW Membership
          </h1>
          <p className="text-muted-foreground text-sm">
            $5 / month · Cancel anytime
          </p>
        </div>

        {message && (
          <div className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/30 text-primary text-sm text-center">
            {message}
          </div>
        )}

        {/* Perks */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
          <div className="p-5 border-b border-border">
            <h2 className="font-semibold text-foreground">What you get</h2>
          </div>
          <div className="divide-y divide-border">
            {PERKS.map(perk => (
              <div key={perk.label} className="flex items-start gap-4 p-4">
                <span className="text-2xl flex-shrink-0">{perk.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{perk.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{perk.desc}</p>
                </div>
                {status?.isMember && <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 ml-auto mt-0.5" />}
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : status?.isMember ? (
          /* Active member state */
          <div className="space-y-4">
            <div className="bg-primary/10 border border-primary/30 rounded-2xl p-5 text-center">
              <div className="text-3xl mb-2">🐾</div>
              <p className="font-semibold text-primary">You're a CLAW Member</p>
              {status.membershipExpiresAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Renews {new Date(status.membershipExpiresAt).toLocaleDateString()}
                </p>
              )}
            </div>

            {status.purgatoryFreeCard && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-amber-400 text-sm">🃏 Purgatory Free Card</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Use it to escape purgatory instantly</p>
                </div>
                <button
                  onClick={handleUseFreeCard}
                  disabled={usingFreeCard}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-semibold hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                >
                  {usingFreeCard ? <Loader2 className="w-3 h-3 animate-spin" /> : "Use Card"}
                </button>
              </div>
            )}

            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="w-full py-3 rounded-xl text-muted-foreground border border-border hover:border-red-500/30 hover:text-red-400 text-sm transition-colors"
            >
              {cancelling ? "Cancelling…" : "Cancel membership"}
            </button>
          </div>
        ) : (
          /* Non-member CTA */
          <div className="space-y-4">
            <div className="bg-muted/30 rounded-2xl p-5 text-center space-y-2">
              <p className="text-2xl font-bold font-serif text-foreground">$5<span className="text-sm font-normal text-muted-foreground">/month</span></p>
              <p className="text-xs text-muted-foreground">Billed monthly · Cancel anytime · All perks active instantly</p>
            </div>
            <button
              onClick={handleSubscribe}
              disabled={subscribing || !user}
              className="w-full py-4 rounded-2xl text-base font-bold transition-all disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                color: "white",
                boxShadow: "0 4px 20px rgba(124,58,237,0.4)",
              }}
            >
              {subscribing ? (
                <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Processing…</span>
              ) : (
                "🐾 Join for $5/month"
              )}
            </button>
            {!user && <p className="text-xs text-muted-foreground text-center">Sign in to subscribe</p>}
          </div>
        )}

        {/* Fine print */}
        <p className="text-[10px] text-muted-foreground/40 text-center mt-6 leading-relaxed">
          Membership renews automatically each month. Cancel anytime from this page. Perks remain active until the end of the billing cycle.
        </p>
      </div>
    </Layout>
  );
}
