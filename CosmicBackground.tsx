import { useEffect, useRef, useCallback } from "react";
import { useRingy } from "@/contexts/RingyContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Star {
  x: number; y: number;
  r: number;
  alpha: number;
  twinkleSpeed: number;
  twinkleOffset: number;
  hue: number;
}

interface Constellation {
  name: string;
  rgb: [number, number, number];
  nodes: { x: number; y: number }[];
  edges: [number, number][];
}

interface ShootingStar {
  x: number; y: number;
  dx: number; dy: number;
  len: number;
  alpha: number;
  life: number;
  maxLife: number;
}

// ─── Constellation map (normalized 0-1 coords) ───────────────────────────────

const CONSTELLATIONS: Constellation[] = [
  {
    name: "Cassiopeia",
    rgb: [180, 140, 255],
    nodes: [
      { x: 0.07, y: 0.07 }, { x: 0.11, y: 0.13 }, { x: 0.15, y: 0.07 },
      { x: 0.19, y: 0.13 }, { x: 0.23, y: 0.07 },
    ],
    edges: [[0,1],[1,2],[2,3],[3,4]],
  },
  {
    name: "Orion",
    rgb: [120, 200, 255],
    nodes: [
      { x: 0.73, y: 0.09 }, { x: 0.80, y: 0.07 },
      { x: 0.70, y: 0.17 }, { x: 0.77, y: 0.16 }, { x: 0.84, y: 0.15 },
      { x: 0.71, y: 0.25 }, { x: 0.83, y: 0.24 },
    ],
    edges: [[0,2],[1,4],[2,3],[3,4],[2,5],[4,6],[0,1]],
  },
  {
    name: "Leo",
    rgb: [255, 210, 100],
    nodes: [
      { x: 0.87, y: 0.41 }, { x: 0.82, y: 0.35 }, { x: 0.79, y: 0.28 },
      { x: 0.86, y: 0.26 }, { x: 0.91, y: 0.30 }, { x: 0.92, y: 0.38 },
      { x: 0.75, y: 0.45 },
    ],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[0,6]],
  },
  {
    name: "Scorpio",
    rgb: [255, 90, 115],
    nodes: [
      { x: 0.85, y: 0.68 }, { x: 0.82, y: 0.73 }, { x: 0.80, y: 0.79 },
      { x: 0.83, y: 0.84 }, { x: 0.87, y: 0.88 }, { x: 0.83, y: 0.92 },
      { x: 0.79, y: 0.90 },
    ],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6]],
  },
  {
    name: "Gemini",
    rgb: [100, 240, 200],
    nodes: [
      { x: 0.13, y: 0.72 }, { x: 0.17, y: 0.67 }, { x: 0.21, y: 0.73 },
      { x: 0.18, y: 0.80 }, { x: 0.13, y: 0.84 },
      { x: 0.26, y: 0.65 }, { x: 0.29, y: 0.74 },
    ],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,0],[1,5],[5,6],[6,2]],
  },
  {
    name: "Aries",
    rgb: [255, 165, 70],
    nodes: [
      { x: 0.04, y: 0.44 }, { x: 0.09, y: 0.41 }, { x: 0.14, y: 0.45 }, { x: 0.18, y: 0.43 },
    ],
    edges: [[0,1],[1,2],[2,3]],
  },
  {
    name: "Pisces",
    rgb: [100, 175, 255],
    nodes: [
      { x: 0.44, y: 0.91 }, { x: 0.49, y: 0.87 }, { x: 0.54, y: 0.91 },
      { x: 0.52, y: 0.95 }, { x: 0.47, y: 0.95 }, { x: 0.49, y: 0.82 },
    ],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,0],[1,5]],
  },
  {
    name: "Virgo",
    rgb: [200, 140, 255],
    nodes: [
      { x: 0.06, y: 0.54 }, { x: 0.11, y: 0.58 }, { x: 0.08, y: 0.63 },
      { x: 0.14, y: 0.61 }, { x: 0.18, y: 0.57 }, { x: 0.15, y: 0.51 },
    ],
    edges: [[0,1],[1,2],[1,3],[3,4],[4,5],[5,0]],
  },
  {
    name: "Aquarius",
    rgb: [80, 195, 255],
    nodes: [
      { x: 0.47, y: 0.22 }, { x: 0.52, y: 0.18 }, { x: 0.57, y: 0.22 },
      { x: 0.55, y: 0.27 }, { x: 0.50, y: 0.28 }, { x: 0.45, y: 0.27 },
    ],
    edges: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[1,4]],
  },
  {
    name: "Draco",
    rgb: [255, 120, 185],
    nodes: [
      { x: 0.93, y: 0.52 }, { x: 0.89, y: 0.57 }, { x: 0.91, y: 0.63 }, { x: 0.85, y: 0.59 },
    ],
    edges: [[0,1],[1,2],[1,3]],
  },
];

// ─── Nebula definitions ───────────────────────────────────────────────────────

const NEBULAE = [
  { x: 0.12, y: 0.22, rx: 0.28, ry: 0.20, r: 100, g: 50,  b: 200 },
  { x: 0.78, y: 0.58, rx: 0.22, ry: 0.18, r: 60,  g: 90,  b: 200 },
  { x: 0.38, y: 0.70, rx: 0.24, ry: 0.22, r: 90,  g: 30,  b: 160 },
  { x: 0.60, y: 0.10, rx: 0.18, ry: 0.14, r: 140, g: 60,  b: 255 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createStars(w: number, h: number): Star[] {
  const hues = [200, 220, 240, 260, 270, 280, 300];
  const stars: Star[] = [];
  for (let i = 0; i < 220; i++) {
    const bright = i < 25;
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: bright ? 1.4 + Math.random() * 1.8 : 0.35 + Math.random() * 1.1,
      alpha: bright ? 0.6 + Math.random() * 0.4 : 0.12 + Math.random() * 0.45,
      twinkleSpeed: 0.25 + Math.random() * 2.8,
      twinkleOffset: Math.random() * Math.PI * 2,
      hue: hues[Math.floor(Math.random() * hues.length)],
    });
  }
  return stars;
}

function spawnShootingStar(w: number, h: number): ShootingStar {
  const x = Math.random() * w * 0.8;
  const y = Math.random() * h * 0.4;
  const angle = (Math.PI / 6) + Math.random() * (Math.PI / 6);
  const speed = 8 + Math.random() * 8;
  return {
    x, y,
    dx: Math.cos(angle) * speed,
    dy: Math.sin(angle) * speed,
    len: 60 + Math.random() * 100,
    alpha: 0.9,
    life: 0,
    maxLife: 60 + Math.random() * 30,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CosmicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isSpeaking, lastSpontaneousRemark } = useRingy();

  const starsRef = useRef<Star[]>([]);
  const rafRef = useRef<number>(0);
  const tRef = useRef(0);
  const ringyActiveRef = useRef(0);
  const shootingRef = useRef<ShootingStar | null>(null);
  const nextShootRef = useRef(Date.now() + 20000 + Math.random() * 40000);
  const sizeRef = useRef({ w: 0, h: 0 });

  useEffect(() => {
    if (isSpeaking || lastSpontaneousRemark > Date.now() - 500) {
      ringyActiveRef.current = Date.now();
      // Trigger shooting star immediately on Ringy speak
      const { w, h } = sizeRef.current;
      if (w > 0) shootingRef.current = spawnShootingStar(w, h);
    }
  }, [isSpeaking, lastSpontaneousRemark]);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    sizeRef.current = { w: canvas.width, h: canvas.height };
    starsRef.current = createStars(canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    initCanvas();
    window.addEventListener("resize", initCanvas);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const { w, h } = sizeRef.current;
      const t = tRef.current;
      const ringyAge = Date.now() - ringyActiveRef.current;
      const ri = Math.max(0, 1 - ringyAge / 5000); // ringy intensity 0→1

      ctx.clearRect(0, 0, w, h);

      // ── Background gradient ──────────────────────────────────────────
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0,   "hsl(265,55%,4%)");
      bg.addColorStop(0.4, "hsl(258,50%,5%)");
      bg.addColorStop(1,   "hsl(252,48%,4%)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // ── Nebulae ──────────────────────────────────────────────────────
      for (const n of NEBULAE) {
        const nx = n.x * w;
        const ny = n.y * h;
        const rw = n.rx * w;
        const rh = n.ry * h;
        const breathe = 1 + 0.04 * Math.sin(t * 0.25 + nx * 0.01);
        ctx.save();
        ctx.scale(1, rh / rw);
        const grd = ctx.createRadialGradient(nx, ny * (rw / rh), 0, nx, ny * (rw / rh), rw * breathe);
        grd.addColorStop(0,   `rgba(${n.r},${n.g},${n.b},0.045)`);
        grd.addColorStop(0.5, `rgba(${n.r},${n.g},${n.b},0.022)`);
        grd.addColorStop(1,   `rgba(${n.r},${n.g},${n.b},0)`);
        ctx.beginPath();
        ctx.arc(nx, ny * (rw / rh), rw * breathe, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
        ctx.restore();
      }

      // ── Stars ────────────────────────────────────────────────────────
      for (const s of starsRef.current) {
        const tw = 0.5 + 0.5 * Math.sin(t * s.twinkleSpeed + s.twinkleOffset);
        const alpha = (s.alpha * (0.55 + 0.45 * tw)) + ri * 0.25 * tw;
        const r = s.r * (1 + ri * 0.4 * tw);

        if (s.r > 1.2) {
          const grd = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r * 5);
          grd.addColorStop(0, `hsla(${s.hue},70%,95%,${alpha * 0.4})`);
          grd.addColorStop(1, `hsla(${s.hue},70%,95%,0)`);
          ctx.beginPath();
          ctx.arc(s.x, s.y, r * 5, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.hue},55%,96%,${alpha})`;
        ctx.fill();
      }

      // ── Constellations ───────────────────────────────────────────────
      for (const c of CONSTELLATIONS) {
        const [r, g, b] = c.rgb;
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.6);
        const lineAlpha = 0.32 + 0.10 * pulse + ri * 0.40;
        const nodePulse = 1 + 0.22 * Math.sin(t * 1.1) + ri * 0.60;

        const px = c.nodes.map(n => n.x * w);
        const py = c.nodes.map(n => n.y * h);

        // Lines
        ctx.save();
        ctx.strokeStyle = `rgba(${r},${g},${b},${lineAlpha})`;
        ctx.lineWidth = 0.65 + ri * 0.6;
        ctx.shadowColor = `rgba(${r},${g},${b},${lineAlpha * 1.5})`;
        ctx.shadowBlur = 5 + ri * 8;
        for (const [i, j] of c.edges) {
          ctx.beginPath();
          ctx.moveTo(px[i], py[i]);
          ctx.lineTo(px[j], py[j]);
          ctx.stroke();
        }
        ctx.restore();

        // Nodes
        for (let i = 0; i < c.nodes.length; i++) {
          const nr = (1.6 + 0.4 * Math.sin(t * 0.9 + i * 1.3)) * nodePulse;

          // Glow
          const grd = ctx.createRadialGradient(px[i], py[i], 0, px[i], py[i], nr * 6);
          grd.addColorStop(0, `rgba(${r},${g},${b},${0.55 + ri * 0.45})`);
          grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
          ctx.beginPath();
          ctx.arc(px[i], py[i], nr * 6, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();

          // Core
          ctx.beginPath();
          ctx.arc(px[i], py[i], nr, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${Math.min(255, r + 60)},${Math.min(255, g + 60)},${Math.min(255, b + 80)},${0.85 + ri * 0.15})`;
          ctx.fill();
        }
      }

      // ── Moon ─────────────────────────────────────────────────────────
      {
        const mx = w * 0.88;
        const my = h * 0.10;
        const mr = Math.max(32, Math.min(w, h) * 0.055);
        const glowPulse = 0.5 + 0.5 * Math.sin(t * 0.4);

        // Outer atmosphere halos
        for (const [gr, ga] of [
          [mr * 6,   0.06 + ri * 0.06],
          [mr * 3.5, 0.12 + ri * 0.10],
          [mr * 2.0, 0.20 + ri * 0.14],
        ] as [number, number][]) {
          const halo = ctx.createRadialGradient(mx, my, 0, mx, my, gr);
          halo.addColorStop(0, `rgba(210,170,255,${ga * (0.7 + 0.3 * glowPulse) + ri * 0.08})`);
          halo.addColorStop(1, "rgba(210,170,255,0)");
          ctx.beginPath();
          ctx.arc(mx, my, gr, 0, Math.PI * 2);
          ctx.fillStyle = halo;
          ctx.fill();
        }

        // Moon disc
        ctx.save();
        ctx.beginPath();
        ctx.arc(mx, my, mr, 0, Math.PI * 2);
        ctx.clip();

        const moonFill = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, 0, mx, my, mr);
        moonFill.addColorStop(0,   "rgba(245,230,255,0.96)");
        moonFill.addColorStop(0.6, "rgba(210,180,250,0.88)");
        moonFill.addColorStop(1,   "rgba(165,125,230,0.75)");
        ctx.beginPath();
        ctx.arc(mx, my, mr, 0, Math.PI * 2);
        ctx.fillStyle = moonFill;
        ctx.fill();

        // Crescent shadow
        ctx.beginPath();
        ctx.arc(mx + mr * 0.58, my - mr * 0.1, mr * 0.88, 0, Math.PI * 2);
        ctx.fillStyle = "hsl(265,55%,4%)";
        ctx.fill();
        ctx.restore();

        // Ringy pulse rings
        if (ri > 0) {
          for (let ring = 0; ring < 2; ring++) {
            const rr = mr + 10 + ring * 18 + ri * 22;
            const ra = ri * (0.45 - ring * 0.15);
            ctx.beginPath();
            ctx.arc(mx, my, rr, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(210,160,255,${ra})`;
            ctx.lineWidth = 1.2 - ring * 0.3;
            ctx.stroke();
          }
        }

        // Cat-eye glint on moon (Ringy signature)
        if (ri > 0.3) {
          const eyeAlpha = (ri - 0.3) / 0.7;
          ctx.save();
          ctx.globalAlpha = eyeAlpha * 0.7;
          // Vertical slit pupil
          ctx.beginPath();
          ctx.ellipse(mx - mr * 0.2, my + mr * 0.05, mr * 0.06, mr * 0.22, -0.1, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(30,0,60,0.9)";
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(mx + mr * 0.15, my + mr * 0.08, mr * 0.055, mr * 0.20, 0.1, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(30,0,60,0.9)";
          ctx.fill();
          ctx.restore();
        }
      }

      // ── Shooting star ────────────────────────────────────────────────
      const now = Date.now();
      if (!shootingRef.current && now > nextShootRef.current) {
        const { w: sw, h: sh } = sizeRef.current;
        shootingRef.current = spawnShootingStar(sw, sh);
        nextShootRef.current = now + 30000 + Math.random() * 60000;
      }
      if (shootingRef.current) {
        const ss = shootingRef.current;
        ss.x += ss.dx;
        ss.y += ss.dy;
        ss.life++;
        ss.alpha = Math.max(0, 1 - ss.life / ss.maxLife);

        if (ss.alpha > 0) {
          const tailX = ss.x - ss.dx * (ss.len / Math.sqrt(ss.dx * ss.dx + ss.dy * ss.dy));
          const tailY = ss.y - ss.dy * (ss.len / Math.sqrt(ss.dx * ss.dx + ss.dy * ss.dy));
          const grad = ctx.createLinearGradient(tailX, tailY, ss.x, ss.y);
          grad.addColorStop(0, `rgba(255,255,255,0)`);
          grad.addColorStop(1, `rgba(220,200,255,${ss.alpha})`);
          ctx.beginPath();
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(ss.x, ss.y);
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Head glow
          const hgrd = ctx.createRadialGradient(ss.x, ss.y, 0, ss.x, ss.y, 6);
          hgrd.addColorStop(0, `rgba(255,240,255,${ss.alpha})`);
          hgrd.addColorStop(1, "rgba(255,240,255,0)");
          ctx.beginPath();
          ctx.arc(ss.x, ss.y, 6, 0, Math.PI * 2);
          ctx.fillStyle = hgrd;
          ctx.fill();
        } else {
          shootingRef.current = null;
        }
      }

      // ── Ringy idle paw-print sparks ──────────────────────────────────
      if (ri > 0.6) {
        const sparkCount = 3;
        const moonX = w * 0.88;
        const moonY = h * 0.09;
        const spread = 80 + ri * 60;
        for (let k = 0; k < sparkCount; k++) {
          const angle = (t * 2 + k * ((Math.PI * 2) / sparkCount)) % (Math.PI * 2);
          const sx = moonX + Math.cos(angle) * spread;
          const sy = moonY + Math.sin(angle) * spread;
          const sa = (ri - 0.6) * 2.5 * (0.5 + 0.5 * Math.sin(t * 4 + k * 2));
          const sgrd = ctx.createRadialGradient(sx, sy, 0, sx, sy, 5);
          sgrd.addColorStop(0, `rgba(200,150,255,${sa})`);
          sgrd.addColorStop(1, "rgba(200,150,255,0)");
          ctx.beginPath();
          ctx.arc(sx, sy, 5, 0, Math.PI * 2);
          ctx.fillStyle = sgrd;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,230,255,${sa * 0.9})`;
          ctx.fill();
        }
      }

      tRef.current += 0.008;
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", initCanvas);
    };
  }, [initCanvas]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
        display: "block",
      }}
    />
  );
}
