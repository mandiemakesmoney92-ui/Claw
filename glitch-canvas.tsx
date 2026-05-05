import { useRef, useState, useEffect, useCallback } from "react";
import Layout from "@/components/Layout";
import { useSEO } from "@/hooks/useSEO";
import { useAuth } from "@workspace/replit-auth-web";
import { Download, Send, RotateCcw, Palette } from "lucide-react";
import { toast } from "sonner";

const COLORS = ["#ff00ff", "#00ffff", "#a855f7", "#ff0066", "#00ff88", "#ff6600", "#ffffff"];
const MOODS = ["😤", "💔", "😭", "😠", "😩", "🌪️"];

function applyGlitchBrush(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  brushSize: number
) {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  const jitter = brushSize * 1.5;
  const offsets = [
    { dx: -Math.random() * jitter, dy: 0, ch: `rgba(${r},0,0,0.85)` },
    { dx: Math.random() * jitter, dy: 0, ch: `rgba(0,${g},0,0.85)` },
    { dx: 0, dy: -Math.random() * jitter * 0.5, ch: `rgba(0,0,${b},0.85)` },
    { dx: 0, dy: 0, ch: color },
  ];

  offsets.forEach(({ dx, dy, ch }) => {
    ctx.fillStyle = ch;
    const w = brushSize + Math.random() * brushSize * 1.5;
    const h = brushSize * (0.3 + Math.random() * 0.7);
    ctx.fillRect(x + dx - w / 2, y + dy - h / 2, w, h);
  });

  // Occasional pixel-stretch horizontal artifact
  if (Math.random() < 0.35) {
    const stretchW = brushSize * (3 + Math.random() * 10);
    const alpha = 0.2 + Math.random() * 0.3;
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.fillRect(x - stretchW / 2, y + (Math.random() - 0.5) * brushSize * 2, stretchW, 1 + Math.random() * 2);
  }

  // Scanline flicker
  if (Math.random() < 0.2) {
    ctx.fillStyle = `rgba(255,255,255,0.04)`;
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(0, y + i * 4 + Math.random() * 6, ctx.canvas.width, 1);
    }
  }
}

export default function GlitchCanvas() {
  useSEO({
    title: "Glitch Art Canvas — Vent Through Art | CLAW",
    description: "Channel your feelings into glitch art. Chromatic aberration brushes, pixel-stretching, and raw canvas expression. Export as a Gem to Purge Arena.",
    canonical: "/glitch-canvas",
    noIndex: false,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#ff00ff");
  const [brushSize, setBrushSize] = useState(12);
  const [showExport, setShowExport] = useState(false);
  const [caption, setCaption] = useState("");
  const [mood, setMood] = useState("🌪️");
  const [posting, setPosting] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#07070d";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // subtle scanlines on blank canvas
    ctx.fillStyle = "rgba(255,255,255,0.02)";
    for (let y = 0; y < canvas.height; y += 4) {
      ctx.fillRect(0, y, canvas.width, 1);
    }
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const draw = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (lastPos.current) {
      const steps = Math.max(1, Math.ceil(Math.hypot(x - lastPos.current.x, y - lastPos.current.y) / (brushSize * 0.5)));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const ix = lastPos.current.x + (x - lastPos.current.x) * t;
        const iy = lastPos.current.y + (y - lastPos.current.y) * t;
        applyGlitchBrush(ctx, ix, iy, color, brushSize);
      }
    } else {
      applyGlitchBrush(ctx, x, y, color, brushSize);
    }
    lastPos.current = { x, y };
  }, [color, brushSize]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setDrawing(true);
    const pos = getPos(e, e.currentTarget);
    draw(pos.x, pos.y);
  };
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const pos = getPos(e, e.currentTarget);
    draw(pos.x, pos.y);
  };
  const handleMouseUp = () => { setDrawing(false); lastPos.current = null; };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setDrawing(true);
    const pos = getPos(e, e.currentTarget);
    draw(pos.x, pos.y);
  };
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!drawing) return;
    const pos = getPos(e, e.currentTarget);
    draw(pos.x, pos.y);
  };
  const handleTouchEnd = () => { setDrawing(false); lastPos.current = null; };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#07070d";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255,255,255,0.02)";
    for (let y = 0; y < canvas.height; y += 4) ctx.fillRect(0, y, canvas.width, 1);
    setShowExport(false);
  };

  const downloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `claw-glitch-gem-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const postToPurge = async () => {
    if (!user) { toast.error("Sign in to post your gem."); return; }
    setPosting(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dataUrl = canvas.toDataURL("image/png");
      const res = await fetch("/api/purge", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `${caption || "✦ glitch art"}\n\n[Glitch Gem — created in CLAW's Glitch Canvas]`,
          isAnonymous: false,
          mood,
          glitchImageDataUrl: dataUrl,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("✦ Gem posted to Purge Arena.");
      setShowExport(false);
      setCaption("");
    } catch {
      toast.error("Couldn't post your gem. Download it instead.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-5 px-4 py-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/40 mb-4">
            <span className="text-4xl">🎨</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">Glitch Canvas</h1>
          <p className="text-zinc-400 text-sm">Vent through art. Chromatic aberration brush. Pixel-stretch. Purge it.</p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 bg-zinc-900/80 border border-zinc-700 rounded-2xl p-3">
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? "border-white scale-125" : "border-transparent"}`}
                style={{ backgroundColor: c, boxShadow: color === c ? `0 0 8px ${c}` : "none" }}
              />
            ))}
            <label className="relative w-7 h-7 rounded-full overflow-hidden border-2 border-zinc-600 cursor-pointer hover:border-white transition-colors" title="Custom color">
              <Palette className="w-4 h-4 text-zinc-400 absolute inset-0 m-auto" />
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </label>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-zinc-500">size</span>
            <input
              type="range"
              min={4}
              max={40}
              value={brushSize}
              onChange={e => setBrushSize(Number(e.target.value))}
              className="w-20 accent-fuchsia-500"
            />
            <span className="text-xs text-zinc-400 w-5">{brushSize}</span>
          </div>
        </div>

        {/* Canvas */}
        <div
          className="relative rounded-2xl overflow-hidden border border-zinc-700 shadow-2xl shadow-fuchsia-900/20"
          style={{ cursor: drawing ? "crosshair" : "crosshair" }}
        >
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="w-full block"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ touchAction: "none", background: "#07070d" }}
          />
          <div className="absolute bottom-3 right-3 text-[10px] text-zinc-700 pointer-events-none select-none">
            CLAW GLITCH CANVAS
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={clearCanvas}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 text-sm transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Clear
          </button>
          <button
            onClick={downloadPng}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-600 text-zinc-200 hover:bg-zinc-700 text-sm transition-colors"
          >
            <Download className="w-4 h-4" /> Download PNG
          </button>
          <button
            onClick={() => setShowExport(v => !v)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-fuchsia-900/40 ml-auto"
          >
            <Send className="w-4 h-4" /> Export as Gem
          </button>
        </div>

        {/* Export panel */}
        {showExport && (
          <div className="bg-zinc-900/80 border border-fuchsia-500/30 rounded-2xl p-5 space-y-4">
            <p className="text-sm font-semibold text-fuchsia-300">Post your Gem to Purge Arena</p>
            <div className="flex flex-wrap gap-2">
              {MOODS.map(m => (
                <button
                  key={m}
                  onClick={() => setMood(m)}
                  className={`text-xl px-2 py-1 rounded-lg border transition-colors ${mood === m ? "border-fuchsia-500 bg-fuchsia-500/20" : "border-zinc-700 bg-zinc-800 hover:border-fuchsia-500/50"}`}
                >
                  {m}
                </button>
              ))}
            </div>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Add a caption (optional)..."
              rows={2}
              maxLength={280}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-fuchsia-500 resize-none"
            />
            <button
              onClick={postToPurge}
              disabled={posting || !user}
              className="w-full py-3 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
            >
              {posting ? "Posting..." : !user ? "Sign in to post" : `${mood} Post Gem to Purge Arena`}
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
