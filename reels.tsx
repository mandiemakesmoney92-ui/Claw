import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import Layout from "@/components/Layout";
import { useSEO } from "@/hooks/useSEO";
import { CheckCircle, ThumbsUp, ThumbsDown, MessageCircle, Upload, X, Play, Pause, Volume2, VolumeX, Loader2 } from "lucide-react";
import { useAuth } from "@workspace/replit-auth-web";

interface ReelPost {
  id: string;
  content: string;
  mediaUrl: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    isVerified?: boolean;
  };
  likeCount: number;
  dislikeCount: number;
  commentCount: number;
  createdAt?: string;
  userReaction?: string;
}

function ReelCard({ reel, active }: { reel: ReelPost; active: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [reaction, setReaction] = useState(reel.userReaction || "");

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) {
      v.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      v.pause();
      setPlaying(false);
    }
  }, [active]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) { v.pause(); setPlaying(false); }
    else { v.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  const handleReact = async (r: "like" | "dislike") => {
    const newR = reaction === r ? "none" : r;
    setReaction(newR === "none" ? "" : newR);
    await fetch(`/api/posts/${reel.id}/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ reaction: newR }),
    });
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        src={reel.mediaUrl}
        loop
        muted={muted}
        playsInline
        className="w-full h-full object-contain"
        onClick={togglePlay}
      />

      {!playing && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30"
        >
          <div className="w-16 h-16 rounded-full bg-black/50 border border-white/20 flex items-center justify-center backdrop-blur">
            <Play className="w-8 h-8 text-white ml-1" />
          </div>
        </button>
      )}

      <div className="absolute top-4 right-4 z-10">
        <button onClick={() => setMuted(m => !m)} className="w-10 h-10 rounded-full bg-black/50 border border-white/20 flex items-center justify-center backdrop-blur">
          {muted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
        </button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
        <Link href={`/profile/${reel.author.id}`}>
          <div className="flex items-center gap-3 mb-3 cursor-pointer">
            <div className="w-10 h-10 rounded-full border-2 border-white/30 overflow-hidden bg-muted flex-shrink-0">
              {reel.author.avatarUrl ? (
                <img src={reel.author.avatarUrl} alt={reel.author.displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-white text-sm">
                  {reel.author.displayName[0]}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-white font-semibold text-sm">{reel.author.displayName}</span>
                {reel.author.isVerified && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
              </div>
              <span className="text-white/60 text-xs">@{reel.author.username}</span>
            </div>
          </div>
        </Link>
        {reel.content && (
          <p className="text-white/90 text-sm leading-relaxed mb-3 line-clamp-2">{reel.content}</p>
        )}
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleReact("like")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur border transition-all ${
              reaction === "like" ? "bg-primary/40 border-primary text-white" : "bg-black/40 border-white/20 text-white/80 hover:border-white/40"
            }`}
          >
            <ThumbsUp className="w-4 h-4" />
            <span className="text-xs font-medium">{reel.likeCount}</span>
          </button>
          <button
            onClick={() => handleReact("dislike")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur border transition-all ${
              reaction === "dislike" ? "bg-red-500/40 border-red-400 text-white" : "bg-black/40 border-white/20 text-white/80 hover:border-white/40"
            }`}
          >
            <ThumbsDown className="w-4 h-4" />
            <span className="text-xs font-medium">{reel.dislikeCount}</span>
          </button>
          <div className="flex items-center gap-1.5 text-white/60 text-xs">
            <MessageCircle className="w-4 h-4" />
            <span>{reel.commentCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadReelModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: () => void }) {
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("video/")) { setError("Only video files allowed."); return; }
    if (f.size > 200 * 1024 * 1024) { setError("Max 200MB for reels."); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError(null);
  };

  const upload = async () => {
    if (!file) return;
    setUploading(true); setProgress(5);
    try {
      const metaRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!metaRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await metaRes.json();
      setProgress(30);
      const putRes = await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!putRes.ok) throw new Error("Upload failed");
      setProgress(70);
      const serveUrl = `/api/storage/objects${objectPath.replace(/^\/objects/, "")}`;
      await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content: caption || "",
          intentType: "Broadcast",
          intensityLevel: "Soft",
          mediaUrl: serveUrl,
          mediaType: "reel",
        }),
      });
      setProgress(100);
      onUploaded();
    } catch (e: any) {
      setError(e.message || "Upload failed");
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-serif font-bold text-foreground text-lg">Upload a Reel</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!file ? (
          <label className="block">
            <div className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all">
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-medium mb-1">Drop a video here</p>
              <p className="text-xs text-muted-foreground">MP4, MOV, WebM — up to 200MB</p>
            </div>
            <input type="file" accept="video/*" className="hidden" onChange={handleFile} />
          </label>
        ) : (
          <div className="mb-4">
            <video src={preview!} controls className="w-full rounded-xl aspect-[9/16] object-cover bg-black" />
            <button onClick={() => { setFile(null); setPreview(null); }} className="text-xs text-muted-foreground hover:text-foreground mt-2">
              Change video
            </button>
          </div>
        )}

        <textarea
          value={caption}
          onChange={e => setCaption(e.target.value)}
          placeholder="Add a caption..."
          rows={3}
          className="w-full mt-4 bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 resize-none"
        />

        {error && <p className="text-red-400 text-xs mt-2">{error}</p>}

        {uploading && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Uploading...</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <button
          onClick={upload}
          disabled={!file || uploading}
          className="w-full mt-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-accent transition-colors disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Post Reel"}
        </button>
      </div>
    </div>
  );
}

export default function Reels() {
  useSEO({
    title: "Reels — Real Short Videos Without the Algorithm | CLAW",
    description:
      "Watch short-form videos from verified humans on CLAW. No algorithm pushing viral slop — just raw, real, honest community moments. React, comment, and share your own.",
    canonical: "/reels",
  });
  const { user } = useAuth();
  const [reels, setReels] = useState<ReelPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchReels = async () => {
    setLoading(true);
    const res = await fetch("/api/posts?feedType=reels&limit=20", { credentials: "include" });
    if (res.ok) {
      const all = await res.json() as ReelPost[];
      setReels(all.filter((p: any) => p.mediaType === "reel" && p.mediaUrl));
    }
    setLoading(false);
  };

  useEffect(() => { fetchReels(); }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const idx = Math.round(container.scrollTop / container.clientHeight);
      setActiveIndex(idx);
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <Layout>
      <div className="relative h-[calc(100vh-57px)] lg:h-screen flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <h1 className="text-lg font-serif font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Reels
          </h1>
          {user && (
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-primary/20 text-primary border border-primary/30 text-sm font-medium hover:bg-primary/30 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        ) : reels.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mb-5">
              <Play className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-serif font-bold text-foreground mb-2">No reels yet</h2>
            <p className="text-muted-foreground text-sm mb-6">Be the first to upload a reel to CLAW.</p>
            {user && (
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-accent transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload First Reel
              </button>
            )}
          </div>
        ) : (
          <div
            ref={containerRef}
            className="flex-1 overflow-y-scroll snap-y snap-mandatory"
            style={{ scrollbarWidth: "none" }}
          >
            {reels.map((reel, i) => (
              <div key={reel.id} className="w-full h-full snap-start snap-always flex-shrink-0" style={{ height: "calc(100vh - 57px - 57px)" }}>
                <ReelCard reel={reel} active={i === activeIndex} />
              </div>
            ))}
          </div>
        )}

        {showUpload && (
          <UploadReelModal
            onClose={() => setShowUpload(false)}
            onUploaded={() => { setShowUpload(false); fetchReels(); }}
          />
        )}
      </div>
    </Layout>
  );
}
