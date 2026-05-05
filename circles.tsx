import { useState, useEffect, useRef } from "react";
import { useGetCircles, useGetTopFriends, getGetCirclesQueryKey } from "@workspace/api-client-react";
import { useSEO } from "@/hooks/useSEO";
import { useAuth } from "@workspace/replit-auth-web";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Circle, Loader2, Crown, Shield, Users, UserPlus, Search, X, Check, Trash2 } from "lucide-react";
import { Link } from "wouter";

const CIRCLE_CONFIG = {
  Inner: { label: "Inner Circle", icon: Crown, color: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10", border: "border-yellow-400/20", desc: "Your closest, most trusted people", max: 10 },
  Network: { label: "Network", icon: Users, color: "text-blue-400 border-blue-400/30 bg-blue-400/10", border: "border-blue-400/10", desc: "Acquaintances and collaborators", max: 50 },
  Opposition: { label: "Opposition", icon: Shield, color: "text-red-400 border-red-400/30 bg-red-400/10", border: "border-red-400/20", desc: "Keep your enemies closer", max: 10 },
};

function AddMemberModal({
  circleId,
  circleType,
  onClose,
  onAdded,
}: {
  circleId: string;
  circleType: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, { credentials: "include" });
        const d = await r.json();
        setResults(d);
      } finally {
        setLoading(false);
      }
    }, 350);
  }, [query]);

  const handleAdd = async (userId: string) => {
    setAdding(userId);
    try {
      await fetch(`/api/circles/${circleId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId }),
      });
      setAdded(prev => new Set([...prev, userId]));
      onAdded();
    } finally {
      setAdding(null);
    }
  };

  const config = CIRCLE_CONFIG[circleType as keyof typeof CIRCLE_CONFIG];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl shadow-black/50 overflow-hidden" style={{ animation: "ringyFadeIn 0.2s ease-out" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            {config && <config.icon className={`w-4 h-4 ${config.color.split(" ")[0]}`} />}
            <h3 className="font-serif font-semibold text-foreground">Add to {config?.label || circleType}</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name or username..."
              className="w-full bg-muted border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60"
            />
            {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />}
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {results.length === 0 && query.trim() && !loading && (
              <p className="text-center text-sm text-muted-foreground py-8 italic">No users found for "{query}"</p>
            )}
            {results.length === 0 && !query.trim() && (
              <p className="text-center text-sm text-muted-foreground py-8 italic">Start typing to search CLAW users</p>
            )}
            {results.map(u => (
              <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50 border border-border hover:border-primary/30 transition-colors">
                <div className="w-9 h-9 rounded-full bg-muted border border-border overflow-hidden flex-shrink-0">
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} alt={u.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold text-primary font-serif">
                      {u.displayName?.[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{u.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                </div>
                <button
                  onClick={() => handleAdd(u.id)}
                  disabled={!!adding || added.has(u.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    added.has(u.id)
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : "bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 disabled:opacity-50"
                  }`}
                >
                  {adding === u.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : added.has(u.id) ? (
                    <><Check className="w-3 h-3" /> Added</>
                  ) : (
                    <><UserPlus className="w-3 h-3" /> Add</>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes ringyFadeIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

export default function Circles() {
  useSEO({
    title: "Social Circles — Private Groups for Trusted Connections | CLAW",
    description:
      "Manage your private social circles on CLAW. Invite-only groups where consent-based honesty thrives — Top Friends, custom circles, and full control over who sees your truth.",
    canonical: "/circles",
  });
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: circles, isLoading: loadingCircles, refetch } = useGetCircles();
  const { data: topFriends } = useGetTopFriends();
  const [activeModal, setActiveModal] = useState<{ circleId: string; circleType: string } | null>(null);
  const [ensured, setEnsured] = useState(false);
  const [removingMember, setRemovingMember] = useState<string | null>(null);

  useEffect(() => {
    if (!user || ensured) return;
    fetch("/api/circles/ensure-defaults", { method: "POST", credentials: "include" })
      .then(() => { setEnsured(true); refetch(); })
      .catch(() => setEnsured(true));
  }, [user, ensured]);

  const circlesByType: Record<string, any> = {};
  circles?.forEach(c => { circlesByType[c.type as string] = c; });

  const handleRemoveMember = async (circleId: string, memberId: string) => {
    setRemovingMember(memberId);
    try {
      await fetch(`/api/circles/${circleId}/members/${memberId}`, {
        method: "DELETE",
        credentials: "include",
      });
      refetch();
    } finally {
      setRemovingMember(null);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-4 space-y-6 pb-16">
        <div className="flex items-center gap-3 mb-1">
          <Circle className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-serif font-bold text-foreground">Social Circles</h2>
        </div>
        <p className="text-muted-foreground text-sm -mt-4">Organize who you keep close — and who you watch</p>

        {(["Inner", "Network", "Opposition"] as const).map(type => {
          const config = CIRCLE_CONFIG[type];
          const Icon = config.icon;
          const circle = circlesByType[type];
          const members = circle?.members || [];
          const circleId = circle?.id;

          return (
            <div key={type} className={`bg-card border rounded-2xl overflow-hidden ${config.border}`}>
              <div className={`flex items-center justify-between px-5 py-4 border-b ${config.border}`}>
                <div className="flex items-center gap-3">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium ${config.color}`}>
                    <Icon className="w-4 h-4" />
                    {config.label}
                  </div>
                  <span className="text-xs text-muted-foreground hidden sm:block">{config.desc}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{members.length}/{config.max}</span>
                  {user && circleId && (
                    <button
                      onClick={() => setActiveModal({ circleId, circleType: type })}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Add Members
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4">
                {loadingCircles ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                ) : members.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    <Icon className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    <p className="italic">Empty. Add someone using the button above.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {members.map((m: any) => (
                      <div key={m.id || m.memberId} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl border border-border hover:border-primary/30 transition-colors group">
                        <Link href={`/profile/${m.id || m.memberId}`}>
                          <div className="w-9 h-9 rounded-full bg-muted border border-border overflow-hidden flex-shrink-0 cursor-pointer">
                            {m.avatarUrl ? (
                              <img src={m.avatarUrl} alt={m.displayName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-sm font-bold text-muted-foreground">
                                {m.displayName?.slice(0, 1) || "?"}
                              </div>
                            )}
                          </div>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link href={`/profile/${m.id || m.memberId}`}>
                            <p className="text-sm font-medium text-foreground truncate cursor-pointer hover:text-primary transition-colors">{m.displayName || "Unknown"}</p>
                          </Link>
                          <p className="text-xs text-muted-foreground truncate">@{m.username || "..."}</p>
                        </div>
                        {user && circleId && (
                          <button
                            onClick={() => handleRemoveMember(circleId, m.id || m.memberId)}
                            disabled={removingMember === (m.id || m.memberId)}
                            className="flex-shrink-0 p-1.5 rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
                            title="Remove from circle"
                          >
                            {removingMember === (m.id || m.memberId) ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {topFriends && topFriends.topFriends && topFriends.topFriends.length > 0 && (
          <div className="bg-card border border-yellow-400/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="w-5 h-5 text-yellow-400" />
              <h3 className="font-serif font-semibold text-foreground">Top Connections</h3>
            </div>
            <ol className="space-y-2">
              {topFriends.topFriends.map((u, i) => (
                <li key={(u as any).id || i} className="flex items-center gap-3">
                  <span className={`w-5 text-xs font-bold text-right ${i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-orange-400" : "text-muted-foreground"}`}>{i + 1}.</span>
                  <Link href={`/profile/${(u as any).id}`}>
                    <div className="w-7 h-7 rounded-full bg-muted border border-border overflow-hidden cursor-pointer hover:border-yellow-400/50 transition-colors">
                      {(u as any).avatarUrl ? <img src={(u as any).avatarUrl} alt={(u as any).displayName} className="w-full h-full object-cover" /> : <span className="flex items-center justify-center w-full h-full text-xs font-bold">{(u as any).displayName?.slice(0, 1)}</span>}
                    </div>
                  </Link>
                  <Link href={`/profile/${(u as any).id}`}>
                    <span className="text-sm text-foreground hover:text-yellow-400 cursor-pointer transition-colors">{(u as any).displayName}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {activeModal && (
        <AddMemberModal
          circleId={activeModal.circleId}
          circleType={activeModal.circleType}
          onClose={() => setActiveModal(null)}
          onAdded={() => refetch()}
        />
      )}
    </Layout>
  );
}
