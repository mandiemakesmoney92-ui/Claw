import { useState, useRef } from "react";
import { useCreatePost, getGetFeedQueryKey, getGetTrendingPostsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Zap, Eye, AlertTriangle, Flame, Paperclip, X, Loader2, Shield } from "lucide-react";
import { useCooldown } from "@/contexts/CooldownContext";

const INTENT_TYPES = [
  { value: "Insight", label: "Insight", icon: Eye, desc: "Share a perspective" },
  { value: "Honesty", label: "Honesty", icon: AlertTriangle, desc: "Speak your truth" },
  { value: "PressureTest", label: "Pressure Test", icon: Flame, desc: "Challenge something" },
];

const INTENSITY_LEVELS = [
  { value: "Soft", label: "Soft", color: "text-blue-400", ring: "ring-blue-400/50" },
  { value: "Direct", label: "Direct", color: "text-orange-400", ring: "ring-orange-400/50" },
  { value: "Claw", label: "Claw", color: "text-red-400", ring: "ring-red-400/50" },
];

interface PostCreateProps {
  onClose?: () => void;
  initialContent?: string;
}

export default function PostCreate({ onClose, initialContent }: PostCreateProps) {
  const [content, setContent] = useState(initialContent || "");
  const [intent, setIntent] = useState<"Insight" | "Honesty" | "PressureTest">("Insight");
  const [intensity, setIntensity] = useState<"Soft" | "Direct" | "Claw">("Soft");
  const [rcEnabled, setRcEnabled] = useState(false);
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<string | undefined>(undefined);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [moderationError, setModerationError] = useState<{
    message: string;
    penancePrompt: string | null;
    category: string;
  } | null>(null);
  const [penanceAnswer, setPenanceAnswer] = useState("");
  const [penanceDone, setPenanceDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const createPost = useCreatePost();
  const { isClawBlocked, clawBlockRemaining, trackClawInteraction } = useCooldown();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlRes.json();
      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const serveUrl = `/api/storage/objects${objectPath.replace(/^\/objects/, "")}`;
      setMediaUrl(serveUrl);
      const detectedType = file.type.startsWith("video") ? "video" : file.type.startsWith("audio") ? "audio" : "image";
      setMediaType(detectedType);
      setMediaPreview(URL.createObjectURL(file));
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const clearMedia = () => {
    setMediaUrl("");
    setMediaType(undefined);
    setMediaPreview(null);
    setUploadError(null);
  };

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setModerationError(null);

    if (intensity === "Claw") {
      if (isClawBlocked) return;
      trackClawInteraction();
    }

    // Use raw fetch so we can read custom error fields
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content,
          intentType: intent,
          intensityLevel: intensity,
          realityCheckEnabled: rcEnabled,
          mediaUrl: mediaUrl || undefined,
          mediaType: mediaType as any,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.error === "moderation_failed") {
          setModerationError({
            message: err.message || "Content moderation failed.",
            penancePrompt: err.penancePrompt || null,
            category: err.category || "harassment",
          });
          return;
        }
        if (err.error === "claw_blocked") {
          setModerationError({
            message: err.message || "Claw Mode on cooldown.",
            penancePrompt: null,
            category: "cooldown",
          });
          return;
        }
        throw new Error(err.message || "Post failed");
      }

      setContent("");
      setMediaUrl("");
      setMediaType(undefined);
      setMediaPreview(null);
      setModerationError(null);
      setPenanceAnswer("");
      setPenanceDone(false);
      qc.invalidateQueries({ queryKey: getGetFeedQueryKey() });
      qc.invalidateQueries({ queryKey: getGetTrendingPostsQueryKey() });
      onClose?.();
    } catch (err: any) {
      setUploadError(err.message || "Post failed");
    }
  };

  const handlePenanceComplete = () => {
    if (penanceAnswer.trim().length < 15) return;
    setPenanceDone(true);
    setModerationError(null);
    // revert to Direct so user can post
    setIntensity("Direct");
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h3 className="font-serif text-lg text-primary mb-4">New Post</h3>

      {/* Penance prompt — shown when Claw content is blocked */}
      {moderationError && (
        <div className="mb-4 bg-red-900/20 border border-red-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-red-300 font-semibold">Purgatory AI blocked this post</p>
              <p className="text-xs text-red-400/80 mt-0.5 leading-relaxed">{moderationError.message}</p>
            </div>
          </div>
          {moderationError.penancePrompt && !penanceDone && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-400 font-semibold uppercase tracking-widest">Rehabilitation Prompt</p>
              <p className="text-sm text-zinc-300 italic leading-relaxed">"{moderationError.penancePrompt}"</p>
              <textarea
                value={penanceAnswer}
                onChange={e => setPenanceAnswer(e.target.value)}
                placeholder="Respond honestly to continue..."
                rows={3}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500/60 resize-none"
              />
              <button
                onClick={handlePenanceComplete}
                disabled={penanceAnswer.trim().length < 15}
                className="px-4 py-2 bg-red-700/60 hover:bg-red-600/60 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-colors"
              >
                Complete & Unlock Post (as Direct)
              </button>
            </div>
          )}
          {penanceDone && (
            <p className="text-xs text-green-400">Penance complete. Post unlocked — posting as Direct mode.</p>
          )}
        </div>
      )}

      {/* Claw cooldown banner */}
      {intensity === "Claw" && isClawBlocked && (
        <div className="mb-4 bg-zinc-900/80 border border-zinc-700 rounded-xl p-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-zinc-400" />
          <p className="text-xs text-zinc-400">
            Claw Mode is on cooldown for {clawBlockRemaining} more min. Switch to Direct or Soft to post.
          </p>
        </div>
      )}

      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="What's on your mind? Be honest."
        rows={3}
        className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none text-sm mb-4"
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {INTENT_TYPES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setIntent(value as typeof intent)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all ${
              intent === value
                ? "border-primary/60 bg-primary/20 text-primary"
                : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
            }`}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {INTENSITY_LEVELS.map(({ value, label, color, ring }) => (
          <button
            key={value}
            onClick={() => {
              if (value === "Claw" && isClawBlocked) return;
              setIntensity(value as typeof intensity);
            }}
            title={value === "Claw" && isClawBlocked ? `Cooldown: ${clawBlockRemaining} min remaining` : undefined}
            className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
              intensity === value
                ? `border-current ${color} bg-current/10 ring-1 ${ring}`
                : "border-border text-muted-foreground hover:text-foreground"
            } ${color} ${value === "Claw" && isClawBlocked ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            {label}
            {value === "Claw" && isClawBlocked && ` (${clawBlockRemaining}m)`}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4 mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={rcEnabled}
            onChange={e => setRcEnabled(e.target.checked)}
            className="w-4 h-4 rounded border-border bg-muted accent-primary"
          />
          <span className="text-xs text-muted-foreground">Reality Check</span>
        </label>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*"
          className="hidden"
          onChange={handleFileChange}
        />
        {!mediaPreview ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:border-primary/40 hover:text-foreground text-xs transition-all disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
            {uploading ? "Uploading..." : "Attach Media"}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="relative rounded-lg overflow-hidden border border-border w-14 h-14 flex-shrink-0 bg-muted">
              {mediaType === "image" && <img src={mediaPreview} alt="preview" className="w-full h-full object-cover" />}
              {mediaType === "video" && <video src={mediaPreview} className="w-full h-full object-cover" />}
              {mediaType === "audio" && <div className="w-full h-full flex items-center justify-center text-xs text-primary font-medium">Audio</div>}
            </div>
            <button type="button" onClick={clearMedia} className="text-muted-foreground hover:text-destructive transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {uploadError && (
        <p className="text-xs text-destructive mb-3">{uploadError}</p>
      )}

      <div className="flex gap-2 justify-end">
        {onClose && (
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-muted-foreground hover:text-foreground border border-border hover:border-primary/30 text-sm transition-colors">
            Cancel
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || (intensity === "Claw" && isClawBlocked)}
          className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-accent transition-colors disabled:opacity-50"
        >
          Post
        </button>
      </div>
    </div>
  );
}
