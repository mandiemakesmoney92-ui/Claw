import { useGetTrendingPosts } from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import Layout from "@/components/Layout";
import { useSEO } from "@/hooks/useSEO";
import PostCard from "@/components/PostCard";
import { TrendingUp, Loader2 } from "lucide-react";

export default function Trending() {
  useSEO({
    title: "Trending — What Real People Are Actually Saying | CLAW",
    description:
      "No algorithm, no paid promotion. Trending on CLAW is pure community signal — the most resonant honest social posts right now from verified humans across the platform.",
    canonical: "/trending",
  });
  const { user } = useAuth();
  const { data: posts, isLoading } = useGetTrendingPosts();

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-serif font-bold text-foreground">Trending</h2>
        </div>
        <p className="text-muted-foreground text-sm mb-6">The most engaged posts right now</p>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : posts?.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="font-serif text-lg">Quiet out here</p>
            <p className="text-sm mt-2">Nothing is trending yet. Be the spark.</p>
          </div>
        ) : (
          posts?.map((post, i) => (
            <div key={post.id} className="relative">
              <div className="absolute -left-2 top-5 w-6 h-6 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-xs font-bold text-primary z-10">
                {i + 1}
              </div>
              <div className="ml-6">
                <PostCard post={post} currentUserId={user?.id} />
              </div>
            </div>
          ))
        )}
      </div>
    </Layout>
  );
}
