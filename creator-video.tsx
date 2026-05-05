import { useState, useRef } from "react";
import { Play, Pause, Upload, Send, Loader2, Film, RotateCcw, Type, Sticker, Wand2 } from "lucide-react";

interface VideoStudioProps {
  onPostCreated?: () => void;
}

const SPEED_OPTIONS = [
  { label: "0.25x", value: 0.25, tag: "Ultra Slow" },
  { label: "0.5x",  value: 0.5,  tag: "Slow Mo" },
  { label: "1x",    value: 1,    tag: "Normal" },
  { label: "1.5x",  value: 1.5,  tag: "Fast" },
  { label: "2x",    value: 2,    tag: "Hyper" },
  { label: "4x",    value: 4,    tag: "Chaos" },
];

const VIDEO_FILTERS = [
  { name: "Original",  style: {} },
  { name: "Neon",      style: { filter: "saturate(300%) hue-rotate(270deg) brightness(120%)" } },
  { name: "Void",      style: { filter: "grayscale(100%) contrast(160%) brightness(55%)" } },
  { name: "Vintage",   style: { filter: "sepia(70%) contrast(90%) brightness(88%)" } },
  { name: "Ghost",     style: { filter: "brightness(160%) contrast(75%) saturate(15%)" } },
  { name: "Heat",      style: { filter: "saturate(220%) hue-rotate(25deg) contrast(135%)" } },
  { name: "Ice",       style: { filter: "saturate(50%) hue-rotate(200deg) brightness(125%)" } },
  { name: "VHS",       style: { filter: "contrast(125%) saturate(140%) brightness(88%)", imageRendering: "pixelated" as const } },
  { name: "Deep Fry",  style: { filter: "saturate(500%) contrast(300%) brightness(140%)" } },
  { name: "Infrared",  style: { filter: "hue-rotate(120deg) saturate(300%) invert(25%)" } },
  { name: "Dreamy",    style: { filter: "blur(1.5px) brightness(125%) saturate(130%)" } },
  { name: "CRT",       style: { filter: "contrast(135%) brightness(88%) saturate(115%)", borderRadius: "4px" } },
  { name: "Glitch",    style: { filter: "contrast(200%) saturate(160%) hue-rotate(175deg)", transform: "skewX(-0.3deg)" } },
  { name: "Mirror",    style: { transform: "scaleX(-1)" } },
  { name: "Noir",      style: { filter: "grayscale(100%) contrast(120%) brightness(75%) sepia(20%)" } },
  { name: "Acid",      style: { filter: "hue-rotate(90deg) saturate(400%) contrast(180%) brightness(90%)" } },
];

const VIDEO_FONTS = [
  { name: "Gothic",     style: { fontFamily: "Georgia, serif", fontWeight: "bold" as const, letterSpacing: "0.02em" } },
  { name: "Terminal",   style: { fontFamily: "'Courier New', monospace", fontWeight: "bold" as const } },
  { name: "Impact",     style: { fontFamily: "Impact, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" as const } },
  { name: "Mystic",     style: { fontFamily: "'Times New Roman', serif", fontStyle: "italic" as const, letterSpacing: "0.05em" } },
  { name: "Neon",       style: { fontFamily: "'Arial Black', sans-serif", letterSpacing: "-0.01em" } },
  { name: "Cursive",    style: { fontFamily: "cursive", fontWeight: "normal" as const } },
];

const TEXT_COLORS = [
  { name: "White",   hex: "#ffffff" },
  { name: "Purple",  hex: "#9b59b6" },
  { name: "Pink",    hex: "#e879a0" },
  { name: "Neon",    hex: "#39ff14" },
  { name: "Gold",    hex: "#f59e0b" },
  { name: "Blood",   hex: "#dc2626" },
  { name: "Ghost",   hex: "#94a3b8" },
];

const TEXT_POSITIONS = [
  { name: "Top",    style: { top: "8%",  left: "50%", transform: "translateX(-50%)" } },
  { name: "Center", style: { top: "50%", left: "50%", transform: "translate(-50%,-50%)" } },
  { name: "Bottom", style: { bottom: "8%", left: "50%", transform: "translateX(-50%)" } },
];

const TRANSITIONS = [
  { name: "None" },
  { name: "Cat Scratch", animation: "claw-scratch" },
  { name: "Ghost Wipe",  animation: "claw-ghost-wipe" },
  { name: "Glitch Cut",  animation: "claw-glitch" },
  { name: "Neon Bleed",  animation: "claw-neon-bleed" },
  { name: "Static",      animation: "claw-static" },
];

const CLAW_STICKERS = [
  {
    id: "pawprint",
    label: "Paw Print",
    svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><ellipse cx="30" cy="40" rx="14" ry="12" fill="#e879a0" opacity="0.9"/><ellipse cx="16" cy="26" rx="7" ry="6" fill="#e879a0" opacity="0.9"/><ellipse cx="26" cy="20" rx="6" ry="5" fill="#e879a0" opacity="0.9"/><ellipse cx="36" cy="20" rx="6" ry="5" fill="#e879a0" opacity="0.9"/><ellipse cx="46" cy="26" rx="7" ry="6" fill="#e879a0" opacity="0.9"/></svg>`,
  },
  {
    id: "clawmarks",
    label: "Claw Marks",
    svg: `<svg viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg"><path d="M10 5 C8 25 6 50 10 75" stroke="#9b59b6" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M28 0 C26 22 24 50 28 80" stroke="#9b59b6" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M46 5 C48 25 50 50 46 75" stroke="#9b59b6" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`,
  },
  {
    id: "ghostkitty",
    label: "Ghost Kitty",
    svg: `<svg viewBox="0 0 60 70" xmlns="http://www.w3.org/2000/svg"><path d="M30 5 C16 5 6 16 6 30 L6 62 L13 56 L20 62 L30 56 L40 62 L47 56 L54 62 L54 30 C54 16 44 5 30 5Z" fill="white" opacity="0.88" stroke="#9b59b6" stroke-width="1.5"/><circle cx="22" cy="28" r="4" fill="#1a1a2e"/><circle cx="38" cy="28" r="4" fill="#1a1a2e"/><path d="M6 10 L14 22" stroke="#9b59b6" stroke-width="2" stroke-linecap="round"/><path d="M54 10 L46 22" stroke="#9b59b6" stroke-width="2" stroke-linecap="round"/><path d="M24 38 Q30 44 36 38" stroke="#9b59b6" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>`,
  },
  {
    id: "mysticeye",
    label: "Mystic Eye",
    svg: `<svg viewBox="0 0 80 44" xmlns="http://www.w3.org/2000/svg"><path d="M4 22 Q40 2 76 22 Q40 42 4 22Z" fill="#1a1a2e" stroke="#7c3aed" stroke-width="2"/><circle cx="40" cy="22" r="12" fill="#7c3aed"/><circle cx="40" cy="22" r="6" fill="#0a0a1a"/><circle cx="44" cy="18" r="3" fill="white" opacity="0.7"/><ellipse cx="40" cy="22" rx="12" ry="12" fill="none" stroke="#e879a0" stroke-width="1" opacity="0.4"/></svg>`,
  },
  {
    id: "speaktruth",
    label: "Speak Truth",
    svg: `<svg viewBox="0 0 100 36" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="100" height="36" rx="6" fill="#1a1a2e" stroke="#9b59b6" stroke-width="1.5"/><text x="50" y="24" text-anchor="middle" font-family="Georgia, serif" font-size="14" font-weight="bold" fill="#e879a0" letter-spacing="2">SPEAK TRUTH</text></svg>`,
  },
  {
    id: "scratched",
    label: "CLAW'd",
    svg: `<svg viewBox="0 0 90 40" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="90" height="40" rx="4" fill="#9b59b6" opacity="0.9"/><text x="45" y="27" text-anchor="middle" font-family="Impact, sans-serif" font-size="18" fill="white" letter-spacing="3">CLAW'D</text><path d="M5 5 L20 35" stroke="white" stroke-width="1.5" opacity="0.3"/><path d="M12 5 L27 35" stroke="white" stroke-width="1.5" opacity="0.3"/></svg>`,
  },
  {
    id: "mooncat",
    label: "Moon Cat",
    svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><circle cx="30" cy="30" r="28" fill="#1a1a2e" stroke="#7c3aed" stroke-width="1.5"/><path d="M38 18 C30 18 24 24 24 32 C24 40 30 46 38 46 C32 44 28 38 28 32 C28 26 32 20 38 18Z" fill="#a78bfa" opacity="0.9"/><path d="M22 16 L18 10 L14 16" stroke="#a78bfa" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M40 16 L44 10 L48 16" stroke="#a78bfa" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>`,
  },
  {
    id: "chaos",
    label: "Chaos Star",
    svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><path d="M30 4 L33 25 L54 18 L37 30 L54 42 L33 35 L30 56 L27 35 L6 42 L23 30 L6 18 L27 25 Z" fill="#ec4899" opacity="0.9"/><circle cx="30" cy="30" r="8" fill="#1a1a2e"/><circle cx="30" cy="30" r="3" fill="#ec4899" opacity="0.8"/></svg>`,
  },
];

const STICKER_STYLE_ID = "claw-video-transitions";
const TRANSITION_STYLES = `
@keyframes clawScratch {
  0%   { clip-path: polygon(0 0, 0 0, 0 100%, 0 100%); opacity:1; }
  30%  { clip-path: polygon(0 0, 15% 0, 10% 100%, 0 100%); }
  60%  { clip-path: polygon(0 0, 60% 0, 50% 100%, 0 100%); }
  100% { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); opacity:0; }
}
@keyframes clawGhostWipe {
  0%   { opacity: 0; filter: blur(8px); }
  100% { opacity: 1; filter: blur(0); }
}
@keyframes clawGlitch {
  0%,100% { transform: translate(0); filter: none; }
  20% { transform: translate(-3px, 1px); filter: hue-rotate(90deg); }
  40% { transform: translate(3px,-1px); filter: invert(30%); }
  60% { transform: translate(-1px, 2px); filter: hue-rotate(180deg); }
  80% { transform: translate(2px,-2px); filter: saturate(400%); }
}
@keyframes clawNeonBleed {
  0%   { box-shadow: 0 0 0 0 #9b59b6; opacity:0; }
  50%  { box-shadow: 0 0 60px 20px #9b59b6; opacity:1; }
  100% { box-shadow: 0 0 0 0 #9b59b6; opacity:0; }
}
@keyframes clawStatic {
  0%,100% { filter: none; }
  10% { filter: contrast(300%) saturate(0%) brightness(200%); }
  20% { filter: none; }
  35% { filter: contrast(400%) hue-rotate(90deg); }
  50% { filter: none; }
  65% { filter: saturate(0%) brightness(30%); }
  80% { filter: none; }
}
.anim-claw-scratch  { animation: clawScratch 0.6s ease-in-out; }
.anim-claw-ghost-wipe { animation: clawGhostWipe 0.8s ease; }
.anim-claw-glitch   { animation: clawGlitch 0.5s steps(1) infinite; }
.anim-claw-neon-bleed { animation: clawNeonBleed 1s ease; }
.anim-claw-static   { animation: clawStatic 0.8s steps(2) infinite; }
`;

function injectTransitionStyles() {
  if (!document.getElementById(STICKER_STYLE_ID)) {
    const s = document.createElement("style");
    s.id = STICKER_STYLE_ID;
    s.textContent = TRANSITION_STYLES;
    document.head.appendChild(s);
  }
}

export default function VideoStudio({ onPostCreated }: VideoStudioProps) {
  injectTransitionStyles();

  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selectedFilter, setSelectedFilter] = useState(VIDEO_FILTERS[0]);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saved, setSaved] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"filter" | "text" | "stickers" | "transitions">("filter");
  const [overlayText, setOverlayText] = useState("");
  const [overlayFont, setOverlayFont] = useState(VIDEO_FONTS[0]);
  const [overlayColor, setOverlayColor] = useState(TEXT_COLORS[0]);
  const [overlayPos, setOverlayPos] = useState(TEXT_POSITIONS[2]);
  const [selectedStickers, setSelectedStickers] = useState<string[]>([]);
  const [selectedTransition, setSelectedTransition] = useState(TRANSITIONS[0]);
  const [transitionPreview, setTransitionPreview] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("video/")) { alert("Video files only"); return; }
    setFile(f);
    setVideoUrl(URL.createObjectURL(f));
    setSaved(null);
    setOverlayText("");
    setSelectedStickers([]);
  };

  const setPlaybackSpeed = (s: number) => {
    setSpeed(s);
    if (videoRef.current) videoRef.current.playbackRate = s;
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) { v.pause(); setPlaying(false); }
    else { v.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  const toggleSticker = (id: string) => {
    setSelectedStickers(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const previewTransition = () => {
    setTransitionPreview(true);
    setTimeout(() => setTransitionPreview(false), 1200);
  };

  const uploadPost = async () => {
    if (!file) return;
    setUploading(true); setProgress(5);
    try {
      const metaRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      const { uploadURL, objectPath } = await metaRes.json();
      setProgress(30);
      await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      setProgress(70);
      const serveUrl = `/api/storage/objects${objectPath.replace(/^\/objects/, "")}`;
      const metadata = JSON.stringify({ speed, filter: selectedFilter.name, transition: selectedTransition.name, overlayText, stickers: selectedStickers });
      await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          content: caption || `[${selectedFilter.name} · ${SPEED_OPTIONS.find(s => s.value === speed)?.tag || "Normal"}] ${overlayText || ""}`,
          intentType: "Broadcast",
          intensityLevel: "Soft",
          mediaUrl: serveUrl,
          mediaType: "reel",
          metadata,
        }),
      });
      setProgress(100);
      setSaved("Posted to Reels!");
      onPostCreated?.();
    } finally {
      setUploading(false);
    }
  };

  const toolTabs = [
    { key: "filter",      label: "Filters",      icon: "🎨" },
    { key: "text",        label: "Text",          icon: "T" },
    { key: "stickers",    label: "Stickers",      icon: "🐾" },
    { key: "transitions", label: "Transitions",   icon: "✂️" },
  ] as const;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <Film className="w-5 h-5 text-secondary" />
        <h3 className="font-serif font-semibold text-foreground">Video Studio</h3>
        <span className="text-xs text-muted-foreground">Filters · Text · Stickers · Transitions</span>
      </div>

      {!videoUrl ? (
        <label className="block cursor-pointer">
          <div className="border-2 border-dashed border-secondary/30 rounded-xl p-12 text-center hover:border-secondary/60 hover:bg-secondary/5 transition-all">
            <Film className="w-12 h-12 text-secondary/40 mx-auto mb-3" />
            <p className="text-foreground font-medium mb-1">Upload a video to edit</p>
            <p className="text-xs text-muted-foreground">MP4, MOV, WebM — up to 200MB</p>
          </div>
          <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={handleFile} />
        </label>
      ) : (
        <div className="space-y-4">
          <div className="relative rounded-xl overflow-hidden bg-black border border-border">
            <video
              ref={videoRef}
              src={videoUrl}
              loop
              playsInline
              className={`w-full max-h-64 object-contain transition-all ${
                transitionPreview && selectedTransition.animation
                  ? `anim-${selectedTransition.animation}`
                  : ""
              }`}
              style={selectedFilter.style}
              onEnded={() => setPlaying(false)}
            />

            {overlayText && (
              <div
                className="absolute pointer-events-none px-3 py-1 rounded max-w-[90%] text-center"
                style={{
                  ...overlayPos.style,
                  ...overlayFont.style,
                  color: overlayColor.hex,
                  textShadow: "0 2px 8px rgba(0,0,0,0.8), 0 0 20px currentColor",
                  fontSize: "18px",
                  position: "absolute",
                  whiteSpace: "pre-wrap",
                } as React.CSSProperties}
              >
                {overlayText}
              </div>
            )}

            {selectedStickers.map((sid, i) => {
              const sticker = CLAW_STICKERS.find(s => s.id === sid);
              if (!sticker) return null;
              const positions = [
                { top: "8%", right: "8%" },
                { bottom: "20%", right: "8%" },
                { top: "8%", left: "8%" },
                { bottom: "20%", left: "8%" },
                { top: "50%", right: "5%", transform: "translateY(-50%)" },
              ];
              const pos = positions[i % positions.length];
              return (
                <div
                  key={sid}
                  className="absolute pointer-events-none"
                  style={{ width: 52, height: 52, ...pos } as React.CSSProperties}
                  dangerouslySetInnerHTML={{ __html: sticker.svg }}
                />
              );
            })}

            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/30 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-black/60 border border-white/30 flex items-center justify-center backdrop-blur">
                {playing ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white ml-0.5" />}
              </div>
            </button>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Speed</div>
            <div className="flex flex-wrap gap-2">
              {SPEED_OPTIONS.map(s => (
                <button
                  key={s.value}
                  onClick={() => setPlaybackSpeed(s.value)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    speed === s.value
                      ? "border-primary/60 bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  {s.tag}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-1 p-1 bg-muted/50 border border-border rounded-xl">
            {toolTabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === t.key
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{t.icon}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>

          {activeTab === "filter" && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Visual Filter</div>
              <div className="grid grid-cols-4 gap-2">
                {VIDEO_FILTERS.map(f => (
                  <button
                    key={f.name}
                    onClick={() => setSelectedFilter(f)}
                    className={`py-2 rounded-lg border text-xs font-medium transition-all ${
                      selectedFilter.name === f.name
                        ? "border-primary/60 bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === "text" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-1.5">Text Overlay</label>
                <input
                  value={overlayText}
                  onChange={e => setOverlayText(e.target.value)}
                  placeholder="Type something true..."
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60"
                  maxLength={80}
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Font</div>
                <div className="grid grid-cols-3 gap-2">
                  {VIDEO_FONTS.map(f => (
                    <button
                      key={f.name}
                      onClick={() => setOverlayFont(f)}
                      className={`py-2 px-3 rounded-lg border text-xs transition-all text-left ${
                        overlayFont.name === f.name
                          ? "border-primary/60 bg-primary/15 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/30"
                      }`}
                      style={f.style}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Color</div>
                <div className="flex gap-2">
                  {TEXT_COLORS.map(c => (
                    <button
                      key={c.hex}
                      title={c.name}
                      onClick={() => setOverlayColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${overlayColor.hex === c.hex ? "border-white scale-110" : "border-transparent"}`}
                      style={{ background: c.hex }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Position</div>
                <div className="flex gap-2">
                  {TEXT_POSITIONS.map(p => (
                    <button
                      key={p.name}
                      onClick={() => setOverlayPos(p)}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        overlayPos.name === p.name
                          ? "border-primary/60 bg-primary/15 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "stickers" && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">CLAW Stickers</div>
              <p className="text-xs text-muted-foreground mb-3">Select up to 5 stickers to overlay on your video preview.</p>
              <div className="grid grid-cols-4 gap-2">
                {CLAW_STICKERS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => toggleSticker(s.id)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${
                      selectedStickers.includes(s.id)
                        ? "border-primary/60 bg-primary/15"
                        : "border-border hover:border-primary/30 hover:bg-muted"
                    }`}
                  >
                    <div className="w-10 h-10" dangerouslySetInnerHTML={{ __html: s.svg }} />
                    <span className="text-[9px] text-muted-foreground text-center leading-tight">{s.label}</span>
                  </button>
                ))}
              </div>
              {selectedStickers.length > 0 && (
                <button
                  onClick={() => setSelectedStickers([])}
                  className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  Clear stickers
                </button>
              )}
            </div>
          )}

          {activeTab === "transitions" && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Scene Transitions</div>
              <p className="text-xs text-muted-foreground mb-3">Choose how scenes cut. Hit Preview to see it live.</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {TRANSITIONS.map(t => (
                  <button
                    key={t.name}
                    onClick={() => setSelectedTransition(t)}
                    className={`py-2.5 px-3 rounded-lg border text-xs font-medium transition-all text-left ${
                      selectedTransition.name === t.name
                        ? "border-primary/60 bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {t.name === "None" ? "— None" : t.name}
                  </button>
                ))}
              </div>
              {selectedTransition.name !== "None" && (
                <button
                  onClick={previewTransition}
                  className="w-full py-2 rounded-xl bg-primary/15 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/25 transition-colors"
                >
                  Preview: {selectedTransition.name}
                </button>
              )}
            </div>
          )}

          <textarea value={caption} onChange={e => setCaption(e.target.value)}
            placeholder="Caption for your reel..."
            rows={2}
            className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 resize-none" />

          {uploading && (
            <div>
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Uploading...</span><span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {saved && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm text-center">{saved}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button onClick={uploadPost} disabled={uploading}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-accent transition-colors disabled:opacity-50">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Post as Reel
            </button>
            <button onClick={() => { setFile(null); setVideoUrl(null); setSaved(null); setPlaying(false); setSelectedStickers([]); setOverlayText(""); }}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-muted text-muted-foreground border border-border text-sm hover:text-foreground transition-colors">
              <RotateCcw className="w-4 h-4" /> New Video
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
