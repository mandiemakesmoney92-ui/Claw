import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { useSEO } from "@/hooks/useSEO";
import { useAuth } from "@workspace/replit-auth-web";
import { Flame, Lock, Heart, Trash2, Clock, Plus, X } from "lucide-react";

const MOODS = [
  { emoji: "😤", label: "Frustrated" },
  { emoji: "💔", label: "Heartbroken" },
  { emoji: "😭", label: "Crying" },
  { emoji: "😠", label: "Angry" },
  { emoji: "😩", label: "Exhausted" },
  { emoji: "🥺", label: "Sad" },
  { emoji: "😶", label: "Numb" },
  { emoji: "🌪️", label: "Chaotic" },
];

function timeLeft(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "expired";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function PurgeArena() {
  useSEO({
    title: "Purge Arena — Unfiltered Truth Community Challenges | CLAW",
    description:
      "Submit your most raw, unfiltered take in CLAW's Purge Arena. Weekly community truth challenges where the most authentic voice wins — GEMZ rewards and recognition for real honesty.",
    canonical: "/purge-arena",
    noIndex: false,
  });

  const { user } = useAuth();
  const qc = useQueryClient();
  const [composing, setComposing] = useState(false);
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["purge-posts"],
    queryFn: async () => {
      const res = await fetch("/api/purge", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const createPost = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["purge-posts"] });
      setContent("");
      setSelectedMood(null);
      setComposing(false);
    },
  });

  const likePost = useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/purge/${id}/like`, { method: "POST", credentials: "include" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purge-posts"] }),
  });

  const handleSubmit = () => {
    if (!content.trim()) return;
    createPost.mutate({ content, isAnonymous, mood: selectedMood });
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <Flame className="w-8 h-8 text-orange-400" />
            <h1 className="text-3xl font-serif font-bold text-white">Purge Arena</h1>
            <Flame className="w-8 h-8 text-orange-400" />
          </div>
          <p className="text-white/50 text-sm max-w-md mx-auto leading-relaxed">
            This is a safe place to release what's weighing on you. No judgment. Everything vanishes in 24 hours. 
            Say it. Let it go. Breathe.
          </p>
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-1.5">
            <Clock className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-xs text-orange-400">All posts auto-purge in 24 hours</span>
          </div>
        </div>

        {/* Compose */}
        {user && (
          composing ? (
            <div className="bg-[#0d0d1a] border border-white/10 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white/70">What are you releasing?</span>
                <button onClick={() => setComposing(false)} className="text-white/30 hover:text-white/60">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mood */}
              <div className="flex flex-wrap gap-2">
                {MOODS.map(m => (
                  <button
                    key={m.label}
                    onClick={() => setSelectedMood(selectedMood === m.label ? null : m.label)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${selectedMood === m.label ? "border-orange-400/60 bg-orange-400/10 text-orange-300" : "border-white/10 text-white/40 hover:border-white/20"}`}
                  >
                    {m.emoji} {m.label}
                  </button>
                ))}
              </div>

              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Say what you need to say. It's safe here."
                maxLength={1000}
                rows={5}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white/90 placeholder-white/25 focus:outline-none focus:border-orange-400/40 resize-none"
              />

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => setIsAnonymous(!isAnonymous)}
                    className={`w-10 h-5 rounded-full transition-colors relative ${isAnonymous ? "bg-orange-500" : "bg-white/10"}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${isAnonymous ? "left-5" : "left-0.5"}`} />
                  </div>
                  <span className="text-xs text-white/50 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Anonymous
                  </span>
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/20">{content.length}/1000</span>
                  <button
                    onClick={handleSubmit}
                    disabled={!content.trim() || createPost.isPending}
                    className="px-5 py-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    {createPost.isPending ? "Releasing..." : "Release It"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setComposing(true)}
              className="w-full flex items-center gap-3 bg-[#0d0d1a] hover:bg-[#12121f] border border-white/10 hover:border-orange-400/30 rounded-2xl px-5 py-4 text-left transition-all group"
            >
              <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Plus className="w-4 h-4 text-orange-400" />
              </div>
              <span className="text-sm text-white/30 group-hover:text-white/50">What needs to leave your chest today?</span>
            </button>
          )
        )}

        {/* Posts */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Flame className="w-12 h-12 text-orange-400/20 mx-auto" />
            <p className="text-white/30 text-sm">The arena is quiet. Be the first to release.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post: any) => (
              <div key={post.id} className="bg-[#0d0d1a] border border-white/8 rounded-2xl p-5 space-y-3 hover:border-orange-400/20 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {post.mood && <span className="text-sm">{MOODS.find(m => m.label === post.mood)?.emoji || "🔥"}</span>}
                    <span className="text-xs text-white/25 flex items-center gap-1">
                      {post.isAnonymous ? <><Lock className="w-3 h-3" /> Anonymous</> : "Anonymous"}
                    </span>
                    {post.mood && <span className="text-xs text-orange-400/60">{post.mood}</span>}
                  </div>
                  <span className="text-xs text-white/20 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {timeLeft(post.expiresAt)} left
                  </span>
                </div>

                <p className="text-white/80 text-sm leading-relaxed">{post.content}</p>

                <div className="flex items-center gap-4 pt-1">
                  <button
                    onClick={() => likePost.mutate(post.id)}
                    className="flex items-center gap-1.5 text-xs text-white/30 hover:text-orange-400 transition-colors"
                  >
                    <Heart className="w-3.5 h-3.5" />
                    <span>{post.likeCount || 0}</span>
                    <span className="text-white/20">I feel this</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom note */}
        <div className="text-center py-4">
          <p className="text-white/20 text-xs italic">
            "You don't have to carry everything. Release it here and walk away lighter." — Ringy
          </p>
        </div>
      </div>
    </Layout>
  );
}
