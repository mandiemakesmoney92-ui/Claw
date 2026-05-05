import { useEffect, useState } from "react";
import { Eye, Loader2, Ghost, Waves } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";
import { Link } from "wouter";
import { useSEO } from "@/hooks/useSEO";
import Layout from "@/components/Layout";
import { useRingy } from "@/contexts/RingyContext";

interface WitnessPost {
  id: string;
  authorId: string;
  content: string;
  seenCount: number;
  echoCount: number;
  intentType: string;
  intensityLevel: string;
  createdAt: string;
  author?: {
    displayName: string;
    username: string;
    avatarUrl?: string;
    interactionLevel?: string;
    isVerified?: boolean;
  };
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function WitnessWall() {
  useSEO({
    title: "Witness Wall — Posts That Actually Got Seen | CLAW",
    description:
      "The Witness Wall on CLAW shows posts that received 10 or more Seen reactions. Not the loudest posts — the ones that made people stop. No comments. Just presence.",
    canonical: "/witness-wall",
    keywords:
      "witness wall, CLAW witness wall, seen reactions, most witnessed posts, honest social media posts",
  });
  const { user } = useAuth();
  const { speak } = useRingy();
  const [posts, setPosts] = useState<WitnessPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/witness-wall", { credentials: "include" });
        if (res.ok) setPosts(await res.json());
      } finally {
        setLoading(false);
      }
    };
    if (user) load();
  }, [user]);

  useEffect(() => {
    if (loading || posts.length === 0) return;
    const delay = setTimeout(() => {
      speak("these weren't the loudest. they were the ones that actually landed.", "normal");
    }, 2500);
    return () => clearTimeout(delay);
  }, [loading, posts.length]);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-2">
          <Eye className="w-7 h-7 text-sky-400" />
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Witness Wall</h1>
            <p className="text-xs text-muted-foreground">posts that at least 10 people stopped to witness</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground/70 mb-8 leading-relaxed">
          these weren't the loudest. they were the ones that got <span className="text-sky-400">seen</span>. no comments. just presence.
        </p>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <Ghost className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <p className="text-muted-foreground text-sm">nothing has been witnessed yet.</p>
            <p className="text-muted-foreground/50 text-xs">mark posts as <Eye className="w-3 h-3 inline" /> Seen to help them appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post, i) => (
              <div
                key={post.id}
                className="bg-card border border-sky-400/10 rounded-2xl p-5 shadow-sm hover:border-sky-400/25 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Link href={`/profile/${post.authorId}`}>
                    <div className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden cursor-pointer hover:border-sky-400/40 transition-colors flex-shrink-0">
                      {post.author?.avatarUrl ? (
                        <img src={post.author.avatarUrl} alt={post.author?.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-muted-foreground">{post.author?.displayName?.slice(0, 1) || "?"}</span>
                      )}
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/profile/${post.authorId}`}>
                      <span className="text-sm font-medium text-foreground hover:text-sky-400 transition-colors cursor-pointer">
                        {post.author?.displayName || "unknown"}
                      </span>
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {post.createdAt ? timeAgo(post.createdAt) : ""}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-sky-400 font-semibold">
                      <Eye className="w-4 h-4" />
                      <span className="text-base">{post.seenCount}</span>
                    </div>
                    {post.echoCount > 0 && (
                      <div className="flex items-center gap-1 text-violet-400 text-sm">
                        <Waves className="w-3.5 h-3.5" />
                        <span>{post.echoCount}</span>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {post.content}
                </p>

                <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center gap-3 flex-wrap">
                  {post.intentType && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                      {post.intentType}
                    </span>
                  )}
                  {post.intensityLevel && (
                    <span className="text-[10px] text-muted-foreground/60">{post.intensityLevel}</span>
                  )}
                  <span className="text-[10px] text-sky-400/60 ml-auto">#{i + 1} most witnessed</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
