import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import Layout from "@/components/Layout";
import { Search as SearchIcon, Users, FileText, Hash, Loader2, CheckCircle, UserPlus } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { useFollowUser } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";

type Tab = "all" | "people" | "posts" | "tags";

interface UserResult {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  interactionLevel?: string;
  isVerified?: boolean;
  isMember?: boolean;
  isOnline?: boolean;
}

interface PostResult {
  id: string;
  content: string;
  intentType?: string;
  intensityLevel?: string;
  likeCount: number;
  commentCount: number;
  createdAt?: string;
  author?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    isVerified?: boolean;
  };
}

function levelBadge(level?: string) {
  const map: Record<string, string> = {
    Soft: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
    Direct: "bg-violet-500/20 text-violet-300 border border-violet-500/30",
    Claw: "bg-red-500/20 text-red-300 border border-red-500/30",
  };
  return map[level || ""] || "bg-muted text-muted-foreground";
}

function intentBadge(intent?: string) {
  const map: Record<string, string> = {
    Confession: "bg-pink-500/20 text-pink-300",
    Rant: "bg-orange-500/20 text-orange-300",
    Broadcast: "bg-blue-500/20 text-blue-300",
    Question: "bg-green-500/20 text-green-300",
    Opinion: "bg-purple-500/20 text-purple-300",
    Update: "bg-cyan-500/20 text-cyan-300",
  };
  return map[intent || ""] || "bg-muted/50 text-muted-foreground";
}

function UserCard({ u }: { u: UserResult }) {
  const { user: me } = useAuth();
  const followMut = useFollowUser();
  const [followed, setFollowed] = useState(false);

  const handleFollow = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!me || me.id === u.id) return;
    setFollowed(f => !f);
    followMut.mutate({ userId: u.id, data: { action: followed ? "unfollow" : "follow" } });
  };

  return (
    <Link href={`/profile/${u.id}`}>
      <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 cursor-pointer group">
        <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 flex-shrink-0 overflow-hidden">
          {u.avatarUrl ? (
            <img src={u.avatarUrl} alt={u.displayName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-lg font-serif font-bold text-primary">
              {(u.displayName || u.username || "?")[0].toUpperCase()}
            </div>
          )}
          {u.isOnline && (
            <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-card" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-foreground truncate">{u.displayName || u.username}</span>
            {u.isVerified && <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
            {u.isMember && <span className="text-sm" title="CLAW Member">🐾</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground truncate">@{u.username}</span>
            {u.interactionLevel && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${levelBadge(u.interactionLevel)}`}>
                {u.interactionLevel}
              </span>
            )}
          </div>
        </div>
        {me && me.id !== u.id && (
          <button
            onClick={handleFollow}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              followed
                ? "bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                : "bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30"
            }`}
          >
            <UserPlus className="w-3 h-3" />
            {followed ? "Following" : "Follow"}
          </button>
        )}
      </div>
    </Link>
  );
}

function PostCard({ p }: { p: PostResult }) {
  return (
    <div className="p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-all duration-200">
      {p.author && (
        <Link href={`/profile/${p.author.id}`}>
          <div className="flex items-center gap-3 mb-3 cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 overflow-hidden flex-shrink-0">
              {p.author.avatarUrl ? (
                <img src={p.author.avatarUrl} alt={p.author.displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-bold text-primary">
                  {(p.author.displayName || "?")[0]}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-foreground">{p.author.displayName}</span>
                {p.author.isVerified && <CheckCircle className="w-3 h-3 text-primary" />}
              </div>
              <span className="text-xs text-muted-foreground">@{p.author.username}</span>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              {p.intentType && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${intentBadge(p.intentType)}`}>
                  {p.intentType}
                </span>
              )}
              {p.intensityLevel && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${levelBadge(p.intensityLevel)}`}>
                  {p.intensityLevel}
                </span>
              )}
            </div>
          </div>
        </Link>
      )}
      <p className="text-foreground text-sm leading-relaxed">{p.content}</p>
      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <span>{p.likeCount} likes</span>
        <span>{p.commentCount} comments</span>
        {p.createdAt && (
          <span className="ml-auto">{new Date(p.createdAt).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  );
}

function HashtagSection({ query }: { query: string }) {
  const tags = query
    ? [query, `${query}_vibes`, `real_${query}`, `${query}_claw`, `truth_${query}`].slice(0, 5)
    : ["confession", "realitycheck", "claw_fire", "truths", "inner_circle", "soft_launch", "direct_hit", "chaos_mode"];

  return (
    <div className="space-y-2">
      {tags.map(tag => (
        <div
          key={tag}
          className="flex items-center gap-4 p-3 rounded-xl bg-card border border-border hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <Hash className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="font-medium text-foreground">#{tag}</div>
            <div className="text-xs text-muted-foreground">Trending on CLAW</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SearchPage() {
  useSEO({
    title: "Search People and Truths | CLAW",
    description:
      "Find real people, honest posts, and communities on CLAW. Search by name, keyword, or topic — connect with humans who communicate on your level.",
    canonical: "/search",
  });
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [people, setPeople] = useState<UserResult[]>([]);
  const [posts, setPosts] = useState<PostResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = async (q: string) => {
    if (!q.trim()) {
      setPeople([]);
      setPosts([]);
      return;
    }
    setLoading(true);
    try {
      const [usersRes, postsRes] = await Promise.all([
        fetch(`/api/users/search?q=${encodeURIComponent(q)}&limit=10`, { credentials: "include" }),
        fetch(`/api/posts/search?q=${encodeURIComponent(q)}&limit=20`, { credentials: "include" }),
      ]);
      if (usersRes.ok) setPeople(await usersRes.json());
      if (postsRes.ok) setPosts(await postsRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "all", label: "All", icon: <SearchIcon className="w-4 h-4" /> },
    { key: "people", label: "People", icon: <Users className="w-4 h-4" /> },
    { key: "posts", label: "Posts", icon: <FileText className="w-4 h-4" /> },
    { key: "tags", label: "Tags", icon: <Hash className="w-4 h-4" /> },
  ];

  const showPeople = tab === "all" || tab === "people";
  const showPosts = tab === "all" || tab === "posts";
  const showTags = tab === "all" || tab === "tags";

  const empty = !loading && query.trim() && people.length === 0 && posts.length === 0;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="pt-4">
          <h1 className="text-3xl font-serif font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent mb-1">
            Search
          </h1>
          <p className="text-muted-foreground text-sm">Find people, posts, and trending topics</p>
        </div>

        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search CLAW..."
            className="w-full pl-12 pr-4 py-3.5 bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:bg-primary/5 transition-all text-sm"
            autoFocus
          />
          {loading && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
          )}
        </div>

        <div className="flex gap-1 p-1 bg-card border border-border rounded-xl">
          {tabs.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === key
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {!query.trim() && (
          <div className="space-y-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1">Trending Tags</div>
            <HashtagSection query="" />
          </div>
        )}

        {query.trim() && (
          <div className="space-y-6">
            {showPeople && people.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground uppercase tracking-widest">People</h2>
                  <span className="text-xs text-muted-foreground">({people.length})</span>
                </div>
                {people.map(u => <UserCard key={u.id} u={u} />)}
              </section>
            )}

            {showPosts && posts.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground uppercase tracking-widest">Posts</h2>
                  <span className="text-xs text-muted-foreground">({posts.length})</span>
                </div>
                {posts.map(p => <PostCard key={p.id} p={p} />)}
              </section>
            )}

            {showTags && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground uppercase tracking-widest">Tags</h2>
                </div>
                <HashtagSection query={query.replace(/\s+/g, "_").toLowerCase()} />
              </section>
            )}

            {empty && (
              <div className="text-center py-16">
                <SearchIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground font-serif text-lg">Nothing found for "{query}"</p>
                <p className="text-muted-foreground/60 text-sm mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
