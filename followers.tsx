import { useParams, Link } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import Layout from "@/components/Layout";
import { useSEO } from "@/hooks/useSEO";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

interface FollowUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isMember?: boolean;
}

interface FollowersPageProps {
  mode: "followers" | "following";
}

export function FollowersPage({ mode }: FollowersPageProps) {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;
  useSEO({ title: mode === "followers" ? "Followers" : "Following", description: mode === "followers" ? "People who follow this user on CLAW." : "People this user follows on CLAW." });

  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetch(`${BASE}/api/users/${userId}/${mode}`, { credentials: "include" })
      .then(r => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then(d => { setUsers(Array.isArray(d) ? d : d.users || []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [userId, mode]);

  return (
    <Layout>
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/profile/${userId}`}>
            <button className="p-2 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors">
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </button>
          </Link>
          <h1 className="font-serif font-bold text-xl text-foreground capitalize">{mode}</h1>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <div className="text-center py-12 text-muted-foreground text-sm">{error}</div>
        )}

        {!loading && !error && users.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">
              {mode === "followers" ? "No followers yet" : "Not following anyone yet"}
            </p>
          </div>
        )}

        <div className="space-y-2">
          {users.map(u => (
            <Link key={u.id} href={`/profile/${u.id}`}>
              <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 flex-shrink-0 overflow-hidden">
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} alt={u.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-base font-serif font-bold text-primary">
                      {(u.displayName || u.username || "?")[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground text-sm truncate">{u.displayName || u.username}</span>
                    {u.isMember && <span className="text-xs" title="CLAW Member">🐾</span>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}

export function FollowersListPage() {
  return <FollowersPage mode="followers" />;
}

export function FollowingListPage() {
  return <FollowersPage mode="following" />;
}
