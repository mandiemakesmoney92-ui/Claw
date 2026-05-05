import { useState, useRef, useEffect } from "react";
import { Image, Upload, Download, Save, Send, Loader2, RotateCcw } from "lucide-react";
import { useUpdateMyProfile } from "@workspace/api-client-react";

interface PhotoStudioProps {
  onPostCreated?: () => void;
}

const PRESETS = [
  { name: "Neon Glow", filters: { brightness: 110, contrast: 130, saturation: 180, hue: 280, blur: 0, sepia: 0 } },
  { name: "Void", filters: { brightness: 60, contrast: 150, saturation: 0, hue: 0, blur: 0, sepia: 80 } },
  { name: "Glitch", filters: { brightness: 120, contrast: 200, saturation: 120, hue: 180, blur: 0, sepia: 0 } },
  { name: "Vintage", filters: { brightness: 90, contrast: 90, saturation: 70, hue: 30, blur: 0, sepia: 60 } },
  { name: "Chaos", filters: { brightness: 130, contrast: 180, saturation: 220, hue: 120, blur: 0, sepia: 0 } },
  { name: "Ghost", filters: { brightness: 150, contrast: 80, saturation: 20, hue: 200, blur: 1, sepia: 20 } },
];

const DEFAULT_FILTERS = { brightness: 100, contrast: 100, saturation: 100, hue: 0, blur: 0, sepia: 0 };

export default function PhotoStudio({ onPostCreated }: PhotoStudioProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const updateProfile = useUpdateMyProfile();

  const filterString = () =>
    `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) hue-rotate(${filters.hue}deg) blur(${filters.blur}px) sepia(${filters.sepia}%)`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageUrl) return;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      const W = Math.min(img.naturalWidth, 800);
      const H = (img.naturalHeight / img.naturalWidth) * W;
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.filter = filterString();
      ctx.drawImage(img, 0, 0, W, H);
    };
    img.src = imageUrl;
  }, [imageUrl, filters]);

  const redraw = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.filter = filterString();
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };

  useEffect(() => { redraw(); }, [filters]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { alert("Image files only"); return; }
    setFile(f);
    setImageUrl(URL.createObjectURL(f));
    setFilters({ ...DEFAULT_FILTERS });
    setSaved(null);
  };

  const applyPreset = (preset: typeof PRESETS[0]) => setFilters({ ...preset.filters });
  const reset = () => setFilters({ ...DEFAULT_FILTERS });

  const canvasToBlob = (): Promise<Blob> => new Promise((resolve, reject) => {
    canvasRef.current?.toBlob(blob => blob ? resolve(blob) : reject(new Error("Canvas error")), "image/jpeg", 0.92);
  });

  const uploadEdited = async (mode: "avatar" | "banner" | "post") => {
    if (!file) return;
    setUploading(true);
    try {
      const blob = await canvasToBlob();
      const editedFile = new File([blob], `edited_${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
      const metaRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: editedFile.name, size: editedFile.size, contentType: editedFile.type }),
      });
      const { uploadURL, objectPath } = await metaRes.json();
      await fetch(uploadURL, { method: "PUT", body: editedFile, headers: { "Content-Type": editedFile.type } });
      const serveUrl = `/api/storage/objects${objectPath.replace(/^\/objects/, "")}`;
      if (mode === "avatar") {
        updateProfile.mutate({ data: { avatarUrl: serveUrl } as any }, { onSuccess: () => setSaved("Saved as your profile photo!") });
      } else if (mode === "banner") {
        updateProfile.mutate({ data: { bannerUrl: serveUrl } as any }, { onSuccess: () => setSaved("Saved as your banner!") });
      } else {
        await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content: caption || "Photo post", intentType: "Broadcast", intensityLevel: "Soft", mediaUrl: serveUrl, mediaType: "image" }),
        });
        setSaved("Posted to your feed!");
        onPostCreated?.();
      }
    } finally {
      setUploading(false);
    }
  };

  const download = () => {
    const a = document.createElement("a");
    a.href = canvasRef.current?.toDataURL("image/jpeg", 0.92) || "";
    a.download = `claw_edit_${Date.now()}.jpg`;
    a.click();
  };

  const SLIDERS = [
    { key: "brightness", label: "Brightness", min: 0, max: 200, step: 1 },
    { key: "contrast", label: "Contrast", min: 0, max: 300, step: 1 },
    { key: "saturation", label: "Saturation", min: 0, max: 300, step: 1 },
    { key: "hue", label: "Hue Shift", min: 0, max: 360, step: 1, unit: "°" },
    { key: "blur", label: "Blur", min: 0, max: 10, step: 0.1 },
    { key: "sepia", label: "Sepia", min: 0, max: 100, step: 1, unit: "%" },
  ] as const;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <Image className="w-5 h-5 text-accent" />
        <h3 className="font-serif font-semibold text-foreground">Photo Studio</h3>
        <span className="text-xs text-muted-foreground">Edit and post photos with real-time effects</span>
      </div>

      {!imageUrl ? (
        <label className="block cursor-pointer">
          <div className="border-2 border-dashed border-accent/30 rounded-xl p-12 text-center hover:border-accent/60 hover:bg-accent/5 transition-all">
            <Image className="w-12 h-12 text-accent/40 mx-auto mb-3" />
            <p className="text-foreground font-medium mb-1">Upload a photo to edit</p>
            <p className="text-xs text-muted-foreground">JPG, PNG, WebP, GIF supported</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </label>
      ) : (
        <div className="space-y-4">
          <canvas ref={canvasRef} className="w-full rounded-xl border border-border object-contain max-h-72" />

          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Quick Presets</div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button key={p.name} onClick={() => applyPreset(p)}
                  className="px-3 py-1.5 rounded-full border border-border text-xs text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors">
                  {p.name}
                </button>
              ))}
              <button onClick={reset} className="px-3 py-1.5 rounded-full border border-border text-xs text-muted-foreground hover:border-destructive/40 hover:text-destructive transition-colors flex items-center gap-1">
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            {SLIDERS.map(s => (
              <div key={s.key}>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{s.label}</span>
                  <span>{filters[s.key]}{(s as any).unit || (s.key === "brightness" || s.key === "contrast" || s.key === "saturation" ? "%" : "")}</span>
                </div>
                <input type="range" min={s.min} max={s.max} step={s.step}
                  value={filters[s.key]}
                  onChange={e => setFilters(f => ({ ...f, [s.key]: Number(e.target.value) }))}
                  className="w-full accent-primary" />
              </div>
            ))}
          </div>

          <textarea value={caption} onChange={e => setCaption(e.target.value)}
            placeholder="Add a caption for your post..."
            rows={2}
            className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 resize-none" />

          {saved && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm text-center">{saved}</div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => uploadEdited("avatar")} disabled={uploading}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary/20 text-primary border border-primary/30 text-sm font-medium hover:bg-primary/30 transition-colors disabled:opacity-50">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Set Avatar
            </button>
            <button onClick={() => uploadEdited("banner")} disabled={uploading}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary/20 text-primary border border-primary/30 text-sm font-medium hover:bg-primary/30 transition-colors disabled:opacity-50">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Set Banner
            </button>
            <button onClick={() => uploadEdited("post")} disabled={uploading}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-accent/20 text-accent border border-accent/30 text-sm font-medium hover:bg-accent/30 transition-colors disabled:opacity-50">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Post to Feed
            </button>
            <button onClick={download}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-muted text-muted-foreground border border-border text-sm font-medium hover:text-foreground transition-colors">
              <Download className="w-4 h-4" /> Download
            </button>
          </div>

          <button onClick={() => { setFile(null); setImageUrl(null); setSaved(null); }}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
            Upload different photo
          </button>
        </div>
      )}
    </div>
  );
}
