import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useReactToPost, useGetComments, useCreateComment, useToggleRealityCheck, useActivatePurgeWindow, getGetFeedQueryKey, getGetTrendingPostsQueryKey } from "@workspace/api-client-react";
import type { Post, Comment } from "@workspace/api-client-react";
import { ThumbsUp, ThumbsDown, MessageCircle, Eye, Flame, Zap, AlertTriangle, ChevronDown, ChevronUp, Send, Shield, Sparkles, Loader2, Repeat2, Pencil, Trash2, X, Check, CheckCircle, Radio } from "lucide-react";
import HumanityBadge from "@/components/HumanityBadge";
import { useQueryClient } from "@tanstack/react-query";
import { checkTriggers, shouldHaveHiddenFragment, pickFragment, getEchoVisitCount } from "@/lib/lachrymal-echoes";

const INTENT_STYLES: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  Insight: { label: "Insight", color: "text-blue-400 border-blue-400/30 bg-blue-400/10", icon: <Eye className="w-3 h-3" /> },
  Honesty: { label: "Honesty", color: "text-orange-400 border-orange-400/30 bg-orange-400/10", icon: <AlertTriangle className="w-3 h-3" /> },
  PressureTest: { label: "Pressure Test", color: "text-red-400 border-red-400/30 bg-red-400/10", icon: <Flame className="w-3 h-3" /> },
  Broadcast: { label: "Broadcast", color: "text-purple-400 border-purple-400/30 bg-purple-400/10", icon: <Zap className="w-3 h-3" /> },
};

const INTENSITY_CLASS: Record<string, string> = {
  Soft: "glow-soft border",
  Direct: "glow-direct border",
  Claw: "glow-claw border",
};

interface PostCardProps {
  post: Post;
  currentUserId?: string;
}

export default function PostCard({ post, currentUserId }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showBoostMenu, setShowBoostMenu] = useState(false);
  const [boosting, setBoosting] = useState(false);
  const [boostMsg, setBoostMsg] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState(post.content || "");
  const [editSaving, setEditSaving] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null);
  const [localComments, setLocalComments] = useState<any[] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [localEchoType, setLocalEchoType] = useState<"echo" | "seen" | undefined>((post as any).userEchoType);
  const [localEchoCount, setLocalEchoCount] = useState<number>((post as any).echoCount || 0);
  const [localSeenCount, setLocalSeenCount] = useState<number>((post as any).seenCount || 0);
  const [echoRipple, setEchoRipple] = useState(false);
  const [showEcho, setShowEcho] = useState(false);
  const [echoText, setEchoText] = useState("");
  const [echoPosting, setEchoPosting] = useState(false);
  const [echoMsg, setEchoMsg] = useState<string | null>(null);
  const qc = useQueryClient();
  const reactMut = useReactToPost();
  const toggleRC = useToggleRealityCheck();
  const activatePurge = useActivatePurgeWindow();
  const createComment = useCreateComment();
  const { data: comments, refetch: refetchComments } = useGetComments(String(post.id), { query: { enabled: showComments, queryKey: ["comments", post.id] } });

  const handleSaveEdit = async () => {
    if (!editContent.trim() || editContent.trim() === post.content) { setEditMode(false); return; }
    setEditSaving(true);
    try {
      await fetch(`/api/posts/${post.id}`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: editContent.trim() }) });
      qc.invalidateQueries({ queryKey: getGetFeedQueryKey() });
      qc.invalidateQueries({ queryKey: getGetTrendingPostsQueryKey() });
      setEditMode(false);
    } catch {} finally { setEditSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000); return; }
    setDeleting(true);
    try {
      await fetch(`/api/posts/${post.id}`, { method: "DELETE", credentials: "include" });
      qc.invalidateQueries({ queryKey: getGetFeedQueryKey() });
      qc.invalidateQueries({ queryKey: getGetTrendingPostsQueryKey() });
    } catch {} finally { setDeleting(false); setConfirmDelete(false); }
  };

  const intent = INTENT_STYLES[post.intentType] || INTENT_STYLES.Insight;
  const intensityClass = INTENSITY_CLASS[post.intensityLevel] || "";

  const echoVisits = getEchoVisitCount();
  const hiddenFragmentText = useRef<string | null>(null);
  if (hiddenFragmentText.current === null) {
    hiddenFragmentText.current = shouldHaveHiddenFragment(post.id, echoVisits)
      ? pickFragment(echoVisits)
      : null;
  }

  useEffect(() => {
    if (!post.content) return;
    const result = checkTriggers(post.content);
    if (!result) return;
    const delay = 4000 + Math.random() * 9000;
    const t = setTimeout(() => {
      document.dispatchEvent(new CustomEvent("echo:trigger", { detail: result }));
    }, delay);
    return () => clearTimeout(t);
  }, [post.id]);

  const handleReact = (reaction: "like" | "dislike") => {
    const newReaction = post.userReaction === reaction ? "none" : reaction;
    reactMut.mutate(
      { postId: String(post.id), data: { reaction: newReaction as any } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetFeedQueryKey() });
          qc.invalidateQueries({ queryKey: getGetTrendingPostsQueryKey() });
        }
      }
    );
  };

  const handleEchoReact = async (type: "echo" | "seen") => {
    const newType = localEchoType === type ? "none" : type;
    const prevType = localEchoType;
    const prevEcho = localEchoCount;
    const prevSeen = localSeenCount;
    // Optimistic update
    setLocalEchoType(newType === "none" ? undefined : newType as "echo" | "seen");
    if (newType === "none") {
      if (prevType === "echo") setLocalEchoCount(c => Math.max(0, c - 1));
      if (prevType === "seen") setLocalSeenCount(c => Math.max(0, c - 1));
    } else if (prevType) {
      if (newType === "echo") { setLocalEchoCount(c => c + 1); setLocalSeenCount(c => Math.max(0, c - 1)); }
      else { setLocalSeenCount(c => c + 1); setLocalEchoCount(c => Math.max(0, c - 1)); }
    } else {
      if (newType === "echo") setLocalEchoCount(c => c + 1);
      else setLocalSeenCount(c => c + 1);
    }
    if (newType === "echo") { setEchoRipple(true); setTimeout(() => setEchoRipple(false), 600); }
    try {
      const res = await fetch(`/api/posts/${post.id}/echo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ type: newType }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLocalEchoCount(data.echoCount);
      setLocalSeenCount(data.seenCount);
      setLocalEchoType(data.userEchoType);
    } catch {
      // Rollback
      setLocalEchoType(prevType);
      setLocalEchoCount(prevEcho);
      setLocalSeenCount(prevSeen);
    }
  };

  const handleComment = () => {
    if (!commentText.trim()) return;
    createComment.mutate(
      { postId: String(post.id), data: { content: commentText } },
      {
        onSuccess: () => {
          setCommentText("");
          refetchComments();
        }
      }
    );
  };

  const handleSaveCommentEdit = async (commentId: string) => {
    if (!editingCommentText.trim()) return;
    await fetch(`/api/posts/${post.id}/comments/${commentId}`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editingCommentText.trim() }),
    });
    setEditingCommentId(null);
    setLocalComments(prev => prev
      ? prev.map(c => c.id === commentId ? { ...c, content: editingCommentText.trim() } : c)
      : null
    );
    refetchComments();
  };

  const handleDeleteComment = async (commentId: string) => {
    await fetch(`/api/posts/${post.id}/comments/${commentId}`, {
      method: "DELETE", credentials: "include",
    });
    setLocalComments(prev => prev ? prev.filter(c => c.id !== commentId) : null);
    refetchComments();
  };

  const handleEcho = async () => {
    if (!echoText.trim()) return;
    setEchoPosting(true);
    try {
      const authorName = (post as any).author?.displayName || (post as any).author?.username || "someone";
      const quoted = `"${post.content?.slice(0, 120)}${(post.content?.length || 0) > 120 ? "..." : ""}" — @${authorName}`;
      const fullContent = `${echoText}\n\n${quoted}`;
      await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content: fullContent,
          intentType: post.intentType || "Broadcast",
          intensityLevel: post.intensityLevel || "Soft",
        }),
      });
      setEchoMsg("Echoed to your feed!");
      setEchoText("");
      setShowEcho(false);
      qc.invalidateQueries({ queryKey: getGetFeedQueryKey() });
      setTimeout(() => setEchoMsg(null), 3000);
    } finally {
      setEchoPosting(false);
    }
  };

  const handleBoost = async (boostType: string) => {
    setBoosting(true);
    setShowBoostMenu(false);
    try {
      const r = await fetch(`/api/posts/${post.id}/boost`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ boostType }),
      });
      const d = await r.json();
      if (r.ok) {
        setBoostMsg("Boosted! Your post is now at the top.");
      } else if (r.status === 402) {
        setBoostMsg(`Not enough GEMZ. Need ${d.required}, have ${d.balance}.`);
      } else {
        setBoostMsg("Boost failed. Try again.");
      }
    } catch {
      setBoostMsg("Boost failed. Try again.");
    } finally {
      setBoosting(false);
      setTimeout(() => setBoostMsg(null), 4000);
    }
  };

  return (
    <div className={`bg-card rounded-xl p-5 mb-4 border ${intensityClass} relative transition-all duration-200 hover:bg-card/80 ${post.purgeWindowActive ? "purge-pulse" : ""}`}>
      {post.isModerated && (
        <div className="absolute top-2 right-2 flex items-center gap-1 text-red-400 text-xs">
          <Shield className="w-3 h-3" />
          <span>Moderated</span>
        </div>
      )}

      <div className="flex items-start gap-3 mb-3">
        <Link href={`/profile/${post.authorId}`}>
          <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center cursor-pointer overflow-hidden flex-shrink-0 hover:border-primary transition-colors">
            {post.author?.avatarUrl ? (
              <img src={post.author.avatarUrl} alt={post.author.displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-muted-foreground">{post.author?.displayName?.slice(0, 1) || "?"}</span>
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/profile/${post.authorId}`}>
              <span className="font-semibold text-foreground hover:text-primary transition-colors cursor-pointer">
                {post.author?.displayName || "Unknown"}
              </span>
            </Link>
            {post.author?.isVerified && <HumanityBadge size="sm" />}
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${intent.color}`}>
              {intent.icon} {intent.label}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              post.intensityLevel === "Soft" ? "text-blue-300 bg-blue-400/10" :
              post.intensityLevel === "Direct" ? "text-orange-300 bg-orange-400/10" :
              "text-red-300 bg-red-400/10"
            }`}>
              {post.intensityLevel}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ""}
          </span>
        </div>
      </div>

      {editMode ? (
        <div className="mb-3">
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            rows={4}
            autoFocus
            className="w-full bg-muted border border-primary/40 rounded-xl px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:border-primary"
          />
          <div className="flex gap-2 mt-2">
            <button onClick={handleSaveEdit} disabled={editSaving} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 disabled:opacity-50">
              {editSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
            </button>
            <button onClick={() => { setEditMode(false); setEditContent(post.content || ""); }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground">
              <X className="w-3 h-3" /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-foreground mb-3 leading-relaxed whitespace-pre-wrap break-words">
          {post.content}
          {hiddenFragmentText.current && (
            <span className="echo-hidden" aria-hidden="true">{" "}{hiddenFragmentText.current}</span>
          )}
        </p>
      )}

      {/* Multi-image grid */}
      {(() => {
        const imgs: string[] = (post as any).imageUrls?.filter(Boolean) || [];
        if (imgs.length > 0) {
          return (
            <div className={`mb-3 rounded-lg overflow-hidden border border-border grid gap-0.5 ${
              imgs.length === 1 ? "grid-cols-1" :
              imgs.length === 2 ? "grid-cols-2" :
              imgs.length >= 3 ? "grid-cols-2" : "grid-cols-1"
            }`}>
              {imgs.slice(0, 4).map((url, i) => (
                <div key={url} className={`relative ${imgs.length === 3 && i === 0 ? "col-span-2" : ""}`}>
                  <img
                    src={url}
                    alt={`Post image ${i + 1}`}
                    className="w-full h-full object-cover"
                    style={{ maxHeight: imgs.length === 1 ? "400px" : "220px" }}
                  />
                  {i === 3 && imgs.length > 4 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white text-xl font-bold">+{imgs.length - 4}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        }
        return null;
      })()}

      {/* Single media */}
      {post.mediaUrl && (
        <div className="mb-3 rounded-lg overflow-hidden border border-border">
          {post.mediaType === "image" && <img src={post.mediaUrl} alt="Post media" className="max-w-full h-auto" loading="lazy" />}
          {(post.mediaType === "video" || post.mediaType === "reel") && (
            <video src={post.mediaUrl} controls className="w-full max-h-96" />
          )}
          {post.mediaType === "audio" && (
            <audio src={post.mediaUrl} controls className="w-full" />
          )}
        </div>
      )}

      {/* YouTube embed */}
      {(post as any).youtubeUrl && (() => {
        const url = (post as any).youtubeUrl as string;
        const match = url.match(/(?:v=|youtu\.be\/)([^&\s]+)/);
        if (!match) return null;
        const videoId = match[1];
        return (
          <div className="mb-3 rounded-lg overflow-hidden border border-border aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              className="w-full h-full"
              allowFullScreen
              loading="lazy"
              title="YouTube video"
            />
          </div>
        );
      })()}

      {post.realityCheckEnabled && (
        <div className="mb-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-yellow-400" />
          <span className="text-xs text-yellow-400 font-medium">Reality Check Active</span>
        </div>
      )}

      <div className="flex items-center gap-3 pt-3 border-t border-border flex-wrap">
        <button
          onClick={() => handleReact("like")}
          className={`flex items-center gap-1.5 text-sm transition-colors hover:text-green-400 ${post.userReaction === "like" ? "text-green-400" : "text-muted-foreground"}`}
        >
          <ThumbsUp className="w-4 h-4" />
          <span>{post.likeCount}</span>
        </button>
        <button
          onClick={() => handleReact("dislike")}
          className={`flex items-center gap-1.5 text-sm transition-colors hover:text-red-400 ${post.userReaction === "dislike" ? "text-red-400" : "text-muted-foreground"}`}
        >
          <ThumbsDown className="w-4 h-4" />
          <span>{post.dislikeCount}</span>
        </button>

        {currentUserId && currentUserId !== post.authorId && (
          <>
            <button
              onClick={() => handleEchoReact("echo")}
              title="Echo — this hit different"
              className={`flex items-center gap-1.5 text-sm transition-all ${echoRipple ? "scale-125" : ""} ${localEchoType === "echo" ? "text-violet-400" : "text-muted-foreground hover:text-violet-400"}`}
            >
              <Radio className={`w-4 h-4 ${echoRipple ? "animate-ping absolute opacity-75" : ""}`} />
              {echoRipple && <Radio className="w-4 h-4 relative text-violet-400" />}
              <span>{localEchoCount > 0 ? localEchoCount : ""}</span>
            </button>
            <button
              onClick={() => handleEchoReact("seen")}
              title="Seen — I witnessed this"
              className={`flex items-center gap-1.5 text-sm transition-colors ${localEchoType === "seen" ? "text-sky-400" : "text-muted-foreground hover:text-sky-400"}`}
            >
              <Eye className="w-4 h-4" />
              <span>{localSeenCount > 0 ? localSeenCount : ""}</span>
            </button>
          </>
        )}

        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{post.commentCount}</span>
          {showComments ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {currentUserId && currentUserId !== post.authorId && (
          <button
            onClick={() => setShowEcho(!showEcho)}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors ${showEcho ? "border-accent/50 text-accent bg-accent/10" : "border-border text-muted-foreground hover:border-accent/40 hover:text-accent"}`}
          >
            <Repeat2 className="w-3 h-3" />
            Echo
          </button>
        )}

        {echoMsg && <span className="text-xs text-accent ml-1 animate-pulse">{echoMsg}</span>}

        {currentUserId === post.authorId && (
          <>
            <button
              onClick={() => { setEditMode(true); setEditContent(post.content || ""); }}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-border text-muted-foreground hover:border-blue-400/50 hover:text-blue-400 transition-colors"
            >
              <Pencil className="w-3 h-3" /> Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors ${
                confirmDelete
                  ? "border-red-500/60 text-red-400 bg-red-500/10 animate-pulse"
                  : "border-border text-muted-foreground hover:border-red-400/50 hover:text-red-400"
              }`}
            >
              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              {confirmDelete ? "Confirm?" : "Delete"}
            </button>
            <button
              onClick={() => toggleRC.mutate({ postId: String(post.id) })}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border transition-colors ${
                post.realityCheckEnabled
                  ? "border-yellow-400/50 text-yellow-400 bg-yellow-400/10"
                  : "border-border text-muted-foreground hover:border-yellow-400/50 hover:text-yellow-400"
              }`}
            >
              <CheckCircle className="w-3 h-3" />
              Reality Check
            </button>
            {!post.purgeWindowActive && (
              <button
                onClick={() => activatePurge.mutate({ postId: String(post.id) })}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10 transition-colors"
              >
                <Flame className="w-3 h-3" />
                Purge Window
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setShowBoostMenu(!showBoostMenu)}
                disabled={boosting}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
              >
                {boosting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Boost
              </button>
              {showBoostMenu && (
                <div className="absolute bottom-full mb-1 left-0 w-52 bg-card border border-primary/30 rounded-xl shadow-2xl shadow-black/60 z-20 overflow-hidden">
                  <div className="px-3 pt-2.5 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Choose Boost</div>
                  {[
                    { id: "spotlight", label: "Spotlight", coins: 10, desc: "1 hour" },
                    { id: "prime", label: "Prime Spotlight", coins: 25, desc: "6 hours" },
                    { id: "viral", label: "Viral Push", coins: 50, desc: "24 hours" },
                  ].map(b => (
                    <button
                      key={b.id}
                      onClick={() => handleBoost(b.id)}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-primary/10 transition-colors text-left"
                    >
                      <div>
                        <div className="text-xs font-medium text-foreground">{b.label}</div>
                        <div className="text-[10px] text-muted-foreground">{b.desc}</div>
                      </div>
                      <div className="text-xs font-bold text-primary">{b.coins} coins</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
        {boostMsg && (
          <span className="text-xs text-primary ml-auto animate-pulse">{boostMsg}</span>
        )}
        {!boostMsg && post.clawMarks != null && post.clawMarks > 0 && (
          <span className="text-xs text-red-400 ml-auto">{post.clawMarks} claw mark{post.clawMarks > 1 ? "s" : ""}</span>
        )}
      </div>

      {showEcho && (
        <div className="mt-3 border-t border-border pt-3">
          <div className="text-xs text-muted-foreground italic mb-2 line-clamp-2 border-l-2 border-accent/40 pl-2">
            "{post.content?.slice(0, 100)}{(post.content?.length || 0) > 100 ? "..." : ""}"
          </div>
          <div className="flex gap-2">
            <textarea
              value={echoText}
              onChange={e => setEchoText(e.target.value)}
              placeholder="Add your take before echoing..."
              rows={2}
              className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent resize-none"
            />
            <button
              onClick={handleEcho}
              disabled={!echoText.trim() || echoPosting}
              className="text-accent hover:text-primary disabled:text-muted-foreground transition-colors p-2 self-start"
            >
              {echoPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Repeat2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {showComments && (
        <div className="mt-4 space-y-3 border-t border-border pt-3">
          {currentUserId && (
            <div className="flex gap-2">
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleComment()}
                placeholder="Add a comment..."
                className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
              <button
                onClick={handleComment}
                disabled={!commentText.trim()}
                className="text-primary hover:text-accent disabled:text-muted-foreground transition-colors p-2"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}
          {(localComments ?? comments)?.map(c => {
            const commentHiddenText = shouldHaveHiddenFragment(c.id, echoVisits)
              ? pickFragment(echoVisits)
              : null;
            const isMyComment = currentUserId && c.authorId === currentUserId;
            const isEditing = editingCommentId === c.id;
            return (
              <div
                key={c.id}
                className="flex gap-2 group/comment"
                onMouseEnter={() => setHoveredCommentId(c.id)}
                onMouseLeave={() => setHoveredCommentId(null)}
              >
                <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-bold text-muted-foreground overflow-hidden flex-shrink-0 mt-0.5">
                  {c.author?.avatarUrl ? (
                    <img src={c.author.avatarUrl} alt={c.author.displayName} className="w-full h-full object-cover" />
                  ) : (
                    (c.author?.displayName || "?").slice(0, 1)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex gap-2 items-center">
                      <input
                        autoFocus
                        value={editingCommentText}
                        onChange={e => setEditingCommentText(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleSaveCommentEdit(c.id); if (e.key === "Escape") setEditingCommentId(null); }}
                        className="flex-1 bg-muted border border-primary/40 rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none"
                      />
                      <button onClick={() => handleSaveCommentEdit(c.id)} className="text-primary hover:opacity-80"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditingCommentId(null)} className="text-muted-foreground hover:opacity-80"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-1.5">
                      <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2">
                        <span className="text-xs font-semibold text-primary mr-2">{c.author?.displayName || "Unknown"}</span>
                        <span className="text-sm text-foreground">
                          {c.content}
                          {commentHiddenText && (
                            <span className="echo-hidden" aria-hidden="true">{" "}{commentHiddenText}</span>
                          )}
                        </span>
                      </div>
                      {isMyComment && hoveredCommentId === c.id && (
                        <div className="flex gap-1 mt-1.5 flex-shrink-0">
                          <button
                            onClick={() => { setEditingCommentId(c.id); setEditingCommentText(c.content || ""); }}
                            className="w-6 h-6 rounded-md bg-muted/80 border border-border flex items-center justify-center hover:border-primary/50 transition-colors"
                            title="Edit comment"
                          >
                            <Pencil className="w-3 h-3 text-muted-foreground" />
                          </button>
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="w-6 h-6 rounded-md bg-muted/80 border border-border flex items-center justify-center hover:border-red-500/50 hover:text-red-400 transition-colors"
                            title="Delete comment"
                          >
                            <Trash2 className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
