import { useRef, useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import Layout from "@/components/Layout";
import { useSEO } from "@/hooks/useSEO";
import { Globe, Zap, Radio, Heart, Flame, Play, MessageCircle, Star, X, ChevronRight } from "lucide-react";

/* ─── Types ─────────────────────────────────────────── */
interface WorldNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseRadius: number;
  pulse: number;
  pulseDir: number;
  glowColor: string;
  coreColor: string;
  zone: Zone;
  label: string;
  sublabel: string;
  href: string;
  intensity: number; // 0–1
  flicker: number;
  flickerTimer: number;
  opacity: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface Zone {
  id: string;
  name: string;
  color: string;
  glowColor: string;
  icon: React.ReactNode;
  href: string;
  description: string;
}

/* ─── Zone definitions ───────────────────────────────── */
const ZONES: Zone[] = [
  { id: "feed",        name: "The Lounge",       color: "#9b59b6", glowColor: "rgba(155,89,182,", icon: <Globe className="w-4 h-4" />,          href: "/feed",        description: "Live community feed — raw truths in real time" },
  { id: "trending",   name: "Pressure Zone",    color: "#e74c3c", glowColor: "rgba(231,76,60,",  icon: <Flame className="w-4 h-4" />,           href: "/trending",    description: "Highest-intensity posts rising right now" },
  { id: "confess",    name: "Whisper Layer",    color: "#2c3e50", glowColor: "rgba(52,73,94,",   icon: <Heart className="w-4 h-4" />,           href: "/confessions", description: "Anonymous confessions moving beneath the surface" },
  { id: "live",       name: "Signal Beacon",    color: "#00bcd4", glowColor: "rgba(0,188,212,",  icon: <Radio className="w-4 h-4" />,           href: "/live",        description: "Live video rooms — enter the broadcast stream" },
  { id: "reels",      name: "Kinetic Current",  color: "#f39c12", glowColor: "rgba(243,156,18,", icon: <Play className="w-4 h-4" />,            href: "/reels",       description: "Fast-moving visual energy — Reels in motion" },
  { id: "circles",    name: "Constellation",    color: "#3498db", glowColor: "rgba(52,152,219,", icon: <Star className="w-4 h-4" />,            href: "/circles",     description: "Your social orbits — Inner Circle, Network, Opposition" },
  { id: "broadcasts", name: "Broadcast Pulse",  color: "#8e44ad", glowColor: "rgba(142,68,173,", icon: <Zap className="w-4 h-4" />,             href: "/broadcasts",  description: "Open broadcasts — time-sensitive truths dropping live" },
  { id: "messages",   name: "Dark Channel",     color: "#1abc9c", glowColor: "rgba(26,188,156,", icon: <MessageCircle className="w-4 h-4" />,   href: "/messages",    description: "Private messages — signals only you can decode" },
];

const WORLD_W = 2400;
const WORLD_H = 1800;

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function buildNodes(stats: Record<string, number>): WorldNode[] {
  const rng = seededRandom(42);
  const nodes: WorldNode[] = [];
  const zonePosMap: Record<string, { cx: number; cy: number }> = {
    feed:        { cx: WORLD_W * 0.35, cy: WORLD_H * 0.38 },
    trending:    { cx: WORLD_W * 0.65, cy: WORLD_H * 0.25 },
    confess:     { cx: WORLD_W * 0.20, cy: WORLD_H * 0.65 },
    live:        { cx: WORLD_W * 0.72, cy: WORLD_H * 0.60 },
    reels:       { cx: WORLD_W * 0.50, cy: WORLD_H * 0.72 },
    circles:     { cx: WORLD_W * 0.15, cy: WORLD_H * 0.28 },
    broadcasts:  { cx: WORLD_W * 0.82, cy: WORLD_H * 0.40 },
    messages:    { cx: WORLD_W * 0.42, cy: WORLD_H * 0.55 },
  };

  ZONES.forEach(zone => {
    const pos = zonePosMap[zone.id];
    const count = Math.max(3, Math.min(12, stats[zone.id] || 4));
    // Hub node
    nodes.push({
      id: `${zone.id}-hub`,
      x: pos.cx, y: pos.cy,
      vx: (rng() - 0.5) * 0.12,
      vy: (rng() - 0.5) * 0.12,
      radius: 22, baseRadius: 22,
      pulse: 0, pulseDir: 1,
      glowColor: zone.glowColor, coreColor: zone.color,
      zone, label: zone.name, sublabel: zone.description,
      href: zone.href,
      intensity: 0.85 + rng() * 0.15,
      flicker: 0, flickerTimer: rng() * 300,
      opacity: 1,
    });
    // Satellite nodes
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + rng() * 0.5;
      const dist = 70 + rng() * 110;
      const intensity = 0.2 + rng() * 0.7;
      nodes.push({
        id: `${zone.id}-${i}`,
        x: pos.cx + Math.cos(angle) * dist,
        y: pos.cy + Math.sin(angle) * dist,
        vx: (rng() - 0.5) * 0.18,
        vy: (rng() - 0.5) * 0.18,
        radius: 5 + intensity * 8,
        baseRadius: 5 + intensity * 8,
        pulse: rng() * Math.PI * 2, pulseDir: rng() > 0.5 ? 1 : -1,
        glowColor: zone.glowColor, coreColor: zone.color,
        zone, label: zone.name, sublabel: "",
        href: zone.href,
        intensity,
        flicker: 0, flickerTimer: rng() * 600,
        opacity: 0.4 + intensity * 0.6,
      });
    }
  });
  return nodes;
}

/* ─── Preview panel ──────────────────────────────────── */
function ZonePreview({ zone, visitorCount, onClose, onEnter }: { zone: Zone; visitorCount: number; onClose: () => void; onEnter: () => void }) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-sm z-30 animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="bg-card/95 backdrop-blur-md border border-border rounded-2xl p-4 shadow-2xl shadow-black/40">
        <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${zone.glowColor}0.15)`, border: `1px solid ${zone.glowColor}0.3)` }}>
            <span style={{ color: zone.color }}>{zone.icon}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-foreground">{zone.name}</span>
              {visitorCount > 0 && (
                <span
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ background: `${zone.glowColor}0.18)`, color: zone.color, border: `1px solid ${zone.glowColor}0.35)` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: zone.color }} />
                  {visitorCount} {visitorCount === 1 ? "here" : "here now"}
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{zone.description}</div>
          </div>
        </div>
        <button
          onClick={onEnter}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 text-white hover:opacity-90 active:scale-[0.98]"
          style={{ background: zone.color, boxShadow: `0 0 20px ${zone.glowColor}0.4)` }}
        >
          Enter Zone <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ─── World Legend ───────────────────────────────────── */
function WorldLegend({ onZoneClick }: { onZoneClick: (zone: Zone) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="absolute top-4 right-4 z-20">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 bg-card/80 backdrop-blur border border-border rounded-xl text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Globe className="w-3.5 h-3.5" />
        Zones
      </button>
      {open && (
        <div className="absolute top-10 right-0 bg-card/95 backdrop-blur border border-border rounded-xl p-3 space-y-1 min-w-[200px] shadow-xl">
          {ZONES.map(z => (
            <button
              key={z.id}
              onClick={() => { onZoneClick(z); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
            >
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: z.color, boxShadow: `0 0 6px ${z.color}` }} />
              <span className="text-xs text-foreground">{z.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main World Component ───────────────────────────── */
export default function World() {
  useSEO({
    title: "World — CLAW",
    description: "The living World layer. See CLAW's activity zones, energy flows, and hidden currents in real time.",
    canonical: "/world",
    noIndex: true,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<WorldNode[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const frameRef = useRef(0);

  const [, navigate] = useLocation();
  const { user } = useAuth();

  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [activityLabel, setActivityLabel] = useState("");
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [stats, setStats] = useState<Record<string, number>>({});
  const statsRef = useRef<Record<string, number>>({});

  const cameraRef = useRef({ x: WORLD_W / 2, y: WORLD_H / 2, zoom: 0.45 });
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, camStartX: 0, camStartY: 0 });
  const pinchRef = useRef({ active: false, dist: 0, zoomStart: 0 });

  /* ─ Fetch live zone stats from presence API ─ */
  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch("/api/presence/world", { credentials: "include" });
        if (r.ok) {
          const data = await r.json();
          setStats(data.zones || {});
        }
      } catch { }
      setStatsLoaded(true);
    };
    load();
    // Refresh every 30 seconds
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  // Keep statsRef in sync so the canvas draw loop always has latest counts
  useEffect(() => { statsRef.current = stats; }, [stats]);

  /* ─ Build nodes when stats ready ─ */
  useEffect(() => {
    if (!statsLoaded) return;
    nodesRef.current = buildNodes(stats);
    const labels = [
      "12 zones active — something's stirring",
      "Ringy noticed movement in the Whisper Layer",
      "A new truth just landed in the Pressure Zone",
      "The Signal Beacon is hot right now",
      "3 confessions are drifting through the World",
      "The Kinetic Current is unstable tonight",
    ];
    setActivityLabel(labels[Math.floor(Date.now() / 8000) % labels.length]);
  }, [statsLoaded, stats]);

  /* ─ Canvas render loop ─ */
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const ctx = canvas.getContext("2d")!;
    const rng = seededRandom(Date.now());

    const spawnParticle = (node: WorldNode) => {
      if (particlesRef.current.length > 200) return;
      const angle = rng() * Math.PI * 2;
      const speed = 0.3 + rng() * 0.5;
      particlesRef.current.push({
        x: node.x, y: node.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0, maxLife: 80 + rng() * 120,
        size: 1 + rng() * 2,
        color: node.coreColor,
      });
    };

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      const cam = cameraRef.current;
      frameRef.current++;
      const t = frameRef.current;

      // Clear
      ctx.clearRect(0, 0, W, H);

      // Background gradient
      const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.8);
      bg.addColorStop(0, "#0a0010");
      bg.addColorStop(0.5, "#06000d");
      bg.addColorStop(1, "#030007");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Camera transform
      ctx.save();
      ctx.translate(W / 2 - cam.x * cam.zoom, H / 2 - cam.y * cam.zoom);
      ctx.scale(cam.zoom, cam.zoom);

      const nodes = nodesRef.current;
      const particles = particlesRef.current;

      // Draw fog/nebula layers
      for (let i = 0; i < 6; i++) {
        const nx = WORLD_W * 0.1 + (i * WORLD_W * 0.18);
        const ny = WORLD_H * 0.2 + Math.sin(t * 0.003 + i) * WORLD_H * 0.1;
        const rad = 200 + Math.sin(t * 0.005 + i * 1.3) * 80;
        const fog = ctx.createRadialGradient(nx, ny, 0, nx, ny, rad);
        fog.addColorStop(0, `rgba(80,0,120,0.04)`);
        fog.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = fog;
        ctx.beginPath();
        ctx.arc(nx, ny, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw zone connection lines
      ZONES.forEach(zone => {
        const hub = nodes.find(n => n.id === `${zone.id}-hub`);
        if (!hub) return;
        const sats = nodes.filter(n => n.zone.id === zone.id && n.id !== `${zone.id}-hub`);
        sats.forEach(sat => {
          const dist = Math.hypot(sat.x - hub.x, sat.y - hub.y);
          const alpha = Math.max(0, 0.12 - dist / 2000) * sat.intensity;
          ctx.beginPath();
          ctx.moveTo(hub.x, hub.y);
          ctx.lineTo(sat.x, sat.y);
          ctx.strokeStyle = `${zone.glowColor}${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        });
      });

      // Draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.99;
        p.vy *= 0.99;
        if (p.life >= p.maxLife) { particles.splice(i, 1); continue; }
        const alpha = (1 - p.life / p.maxLife) * 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, "0");
        ctx.fill();
      }

      // Draw star field
      if (t < 2 || t % 60 === 0) {
        for (let i = 0; i < 3; i++) {
          particlesRef.current.push({
            x: rng() * WORLD_W,
            y: rng() * WORLD_H,
            vx: 0, vy: 0,
            life: 0, maxLife: 400 + rng() * 400,
            size: 0.5 + rng(),
            color: "#ffffff",
          });
        }
      }

      // Update + draw nodes
      nodes.forEach(node => {
        // Update physics
        node.x += node.vx;
        node.y += node.vy;
        const bounds = 150;
        const zonePos = {
          feed: { cx: WORLD_W * 0.35, cy: WORLD_H * 0.38 },
          trending: { cx: WORLD_W * 0.65, cy: WORLD_H * 0.25 },
          confess: { cx: WORLD_W * 0.20, cy: WORLD_H * 0.65 },
          live: { cx: WORLD_W * 0.72, cy: WORLD_H * 0.60 },
          reels: { cx: WORLD_W * 0.50, cy: WORLD_H * 0.72 },
          circles: { cx: WORLD_W * 0.15, cy: WORLD_H * 0.28 },
          broadcasts: { cx: WORLD_W * 0.82, cy: WORLD_H * 0.40 },
          messages: { cx: WORLD_W * 0.42, cy: WORLD_H * 0.55 },
        } as Record<string, {cx:number;cy:number}>;
        const anchor = zonePos[node.zone.id];
        if (anchor) {
          const dx = node.x - anchor.cx;
          const dy = node.y - anchor.cy;
          const d = Math.hypot(dx, dy);
          if (d > bounds) {
            node.vx -= (dx / d) * 0.05;
            node.vy -= (dy / d) * 0.05;
          }
        }
        node.vx *= 0.995;
        node.vy *= 0.995;

        // Pulse
        node.pulse += 0.025 * node.pulseDir;
        if (Math.abs(node.pulse) > Math.PI * 2) node.pulse = 0;
        const pulseAmt = Math.sin(node.pulse + t * 0.02) * 2 * node.intensity;
        node.radius = node.baseRadius + pulseAmt;

        // Flicker
        node.flickerTimer--;
        if (node.flickerTimer <= 0) {
          node.flicker = node.intensity > 0.5 ? 0.1 + Math.random() * 0.15 : 0;
          node.flickerTimer = 200 + Math.random() * 600;
        }
        if (node.flicker > 0) node.flicker *= 0.9;

        const effectiveOpacity = (node.opacity - node.flicker) * (0.85 + Math.sin(t * 0.04 + node.pulse) * 0.1);

        // Spawn particles from hub occasionally
        if (node.id.endsWith("-hub") && t % 45 === 0 && Math.random() < 0.3) {
          spawnParticle(node);
        }

        // Draw glow rings
        const r = node.radius;
        const glowSize = r * (2.5 + node.intensity * 1.5 + Math.sin(t * 0.03) * 0.5);
        const glow = ctx.createRadialGradient(node.x, node.y, r * 0.3, node.x, node.y, glowSize);
        glow.addColorStop(0, `${node.glowColor}${effectiveOpacity * 0.7})`);
        glow.addColorStop(0.5, `${node.glowColor}${effectiveOpacity * 0.15})`);
        glow.addColorStop(1, `${node.glowColor}0)`);
        ctx.beginPath();
        ctx.arc(node.x, node.y, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();

        // Draw core
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = node.coreColor + Math.floor(effectiveOpacity * 255).toString(16).padStart(2, "0");
        ctx.fill();

        // Inner highlight
        if (node.intensity > 0.5) {
          const shine = ctx.createRadialGradient(node.x - r * 0.3, node.y - r * 0.3, 0, node.x, node.y, r);
          shine.addColorStop(0, `rgba(255,255,255,${effectiveOpacity * 0.3})`);
          shine.addColorStop(1, "rgba(255,255,255,0)");
          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
          ctx.fillStyle = shine;
          ctx.fill();
        }

        // Label + active user count badge for hub nodes
        if (node.id.endsWith("-hub") && cam.zoom > 0.35) {
          const zoneId = node.id.replace("-hub", "");
          const activeCount = statsRef.current[zoneId] || 0;
          const fontSize = 12 / cam.zoom;

          // Zone name label
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.fillStyle = `rgba(255,255,255,${effectiveOpacity * 0.85})`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(node.label, node.x, node.y + r + 6);

          // Active user count badge (only if count > 0)
          if (activeCount > 0 && cam.zoom > 0.45) {
            const badgeTxt = `${activeCount} active`;
            const bw = ctx.measureText(badgeTxt).width + 10 / cam.zoom;
            const bh = fontSize + 6 / cam.zoom;
            const bx = node.x - bw / 2;
            const by = node.y + r + 6 + fontSize + 4 / cam.zoom;

            // Pill background
            ctx.fillStyle = `${node.glowColor}0.25)`;
            ctx.beginPath();
            ctx.roundRect(bx, by, bw, bh, bh / 2);
            ctx.fill();
            ctx.strokeStyle = `${node.glowColor}0.5)`;
            ctx.lineWidth = 0.5 / cam.zoom;
            ctx.stroke();

            // Count text
            ctx.font = `${fontSize * 0.85}px sans-serif`;
            ctx.fillStyle = node.coreColor + "cc";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(badgeTxt, node.x, by + bh / 2);
          }
        }
      });

      ctx.restore();
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [statsLoaded]);

  /* ─ Hit test ─ */
  const hitTest = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const cam = cameraRef.current;
    const wx = (clientX - rect.left - canvas.width / 2) / cam.zoom + cam.x;
    const wy = (clientY - rect.top - canvas.height / 2) / cam.zoom + cam.y;
    let best: WorldNode | null = null;
    let bestDist = Infinity;
    for (const node of nodesRef.current) {
      const d = Math.hypot(node.x - wx, node.y - wy);
      const hitR = Math.max(node.radius * 2.5, 30);
      if (d < hitR && d < bestDist) { best = node; bestDist = d; }
    }
    return best;
  }, []);

  /* ─ Mouse/touch handlers ─ */
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    if ("touches" in e && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = { active: true, dist: Math.hypot(dx, dy), zoomStart: cameraRef.current.zoom };
      return;
    }
    dragRef.current = { dragging: true, startX: clientX, startY: clientY, camStartX: cameraRef.current.x, camStartY: cameraRef.current.y };
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if ("touches" in e && e.touches.length === 2 && pinchRef.current.active) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const scale = dist / pinchRef.current.dist;
      cameraRef.current.zoom = Math.max(0.2, Math.min(1.5, pinchRef.current.zoomStart * scale));
      return;
    }
    if (!dragRef.current.dragging) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const cam = cameraRef.current;
    cam.x = dragRef.current.camStartX - (clientX - dragRef.current.startX) / cam.zoom;
    cam.y = dragRef.current.camStartY - (clientY - dragRef.current.startY) / cam.zoom;
  };

  const handlePointerUp = (e: React.MouseEvent | React.TouchEvent) => {
    if (pinchRef.current.active) { pinchRef.current.active = false; return; }
    if (!dragRef.current.dragging) return;
    const clientX = "changedTouches" in e ? e.changedTouches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "changedTouches" in e ? e.changedTouches[0].clientY : (e as React.MouseEvent).clientY;
    const moved = Math.hypot(clientX - dragRef.current.startX, clientY - dragRef.current.startY);
    dragRef.current.dragging = false;
    if (moved < 6) {
      const hit = hitTest(clientX, clientY);
      if (hit) {
        if (selectedZone?.id === hit.zone.id) {
          navigate(hit.href);
        } else {
          setSelectedZone(hit.zone);
        }
      } else {
        setSelectedZone(null);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.93;
    cameraRef.current.zoom = Math.max(0.2, Math.min(1.5, cameraRef.current.zoom * factor));
  };

  const flyTo = (zone: Zone) => {
    const zonePos: Record<string, { cx: number; cy: number }> = {
      feed: { cx: WORLD_W * 0.35, cy: WORLD_H * 0.38 },
      trending: { cx: WORLD_W * 0.65, cy: WORLD_H * 0.25 },
      confess: { cx: WORLD_W * 0.20, cy: WORLD_H * 0.65 },
      live: { cx: WORLD_W * 0.72, cy: WORLD_H * 0.60 },
      reels: { cx: WORLD_W * 0.50, cy: WORLD_H * 0.72 },
      circles: { cx: WORLD_W * 0.15, cy: WORLD_H * 0.28 },
      broadcasts: { cx: WORLD_W * 0.82, cy: WORLD_H * 0.40 },
      messages: { cx: WORLD_W * 0.42, cy: WORLD_H * 0.55 },
    };
    const pos = zonePos[zone.id];
    if (pos) {
      const startX = cameraRef.current.x;
      const startY = cameraRef.current.y;
      const startZ = cameraRef.current.zoom;
      const targetZ = 0.75;
      let frame = 0;
      const total = 40;
      const fly = () => {
        frame++;
        const t = frame / total;
        const ease = 1 - Math.pow(1 - t, 3);
        cameraRef.current.x = startX + (pos.cx - startX) * ease;
        cameraRef.current.y = startY + (pos.cy - startY) * ease;
        cameraRef.current.zoom = startZ + (targetZ - startZ) * ease;
        if (frame < total) requestAnimationFrame(fly);
      };
      fly();
    }
    setSelectedZone(zone);
  };

  return (
    <Layout>
      <div ref={containerRef} className="relative w-full h-full bg-[#030007] overflow-hidden select-none" style={{ touchAction: "none" }}>
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={() => { dragRef.current.dragging = false; }}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          onWheel={handleWheel}
          style={{ cursor: dragRef.current.dragging ? "grabbing" : "grab" }}
        />

        {/* Top bar */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-card/70 backdrop-blur border border-border rounded-xl">
            <Globe className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">World</span>
          </div>
          {(() => {
            const total = Object.values(stats).reduce((a, b) => a + b, 0);
            return total > 0 ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-card/70 backdrop-blur border border-purple-500/25 rounded-xl">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                <span className="text-xs font-medium text-purple-300/80">{total} online</span>
              </div>
            ) : null;
          })()}
          {activityLabel && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-card/50 backdrop-blur border border-border/50 rounded-xl">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-muted-foreground">{activityLabel}</span>
            </div>
          )}
        </div>

        {/* Zone legend */}
        <WorldLegend onZoneClick={flyTo} />

        {/* Zoom controls */}
        <div className="absolute bottom-24 right-4 z-20 flex flex-col gap-1.5">
          <button
            onClick={() => { cameraRef.current.zoom = Math.min(1.5, cameraRef.current.zoom * 1.2); }}
            className="w-9 h-9 bg-card/80 backdrop-blur border border-border rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors text-lg font-bold"
          >+</button>
          <button
            onClick={() => { cameraRef.current.zoom = Math.max(0.2, cameraRef.current.zoom * 0.83); }}
            className="w-9 h-9 bg-card/80 backdrop-blur border border-border rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors text-lg font-bold"
          >−</button>
          <button
            onClick={() => { cameraRef.current = { x: WORLD_W / 2, y: WORLD_H / 2, zoom: 0.45 }; setSelectedZone(null); }}
            className="w-9 h-9 bg-card/80 backdrop-blur border border-border rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors text-xs"
            title="Reset view"
          >⌂</button>
        </div>

        {/* Usage hint */}
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur rounded-full text-[10px] text-white/30 whitespace-nowrap">
            Drag to explore · Pinch to zoom · Tap nodes to enter zones
          </div>
        </div>

        {/* Zone preview panel */}
        {selectedZone && (
          <ZonePreview
            zone={selectedZone}
            visitorCount={stats[selectedZone.id] || 0}
            onClose={() => setSelectedZone(null)}
            onEnter={() => navigate(selectedZone.href)}
          />
        )}

        {!statsLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Scanning the World...</span>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
