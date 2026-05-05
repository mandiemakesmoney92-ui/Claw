import { useState, useEffect, useRef } from "react";
import { useSEO } from "@/hooks/useSEO";
import { Link, useLocation } from "wouter";
import {
  Ghost, Eye, Radio, Moon, Flame, Heart, MessageCircle, Waves, Theater,
  Shield, Star, Sparkles, Phone, Lock, Zap, Trophy, Globe, Crown,
  ChevronDown, ArrowRight, Check, Users
} from "lucide-react";

/* ─── Ringy SVG ─────────────────────────────────────────── */
function RingyCat({ size = 80, glow = false }: { size?: number; glow?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const active = hovered || glow;
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: size, height: size, cursor: "pointer",
        animation: active ? "ringyHoverW 0.5s ease-in-out infinite alternate" : "ringyFloatW 4s ease-in-out infinite",
        filter: active ? "drop-shadow(0 0 28px rgba(168,85,247,0.95))" : "drop-shadow(0 0 14px rgba(168,85,247,0.5))",
        transition: "filter 0.3s ease",
      }}
    >
      <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
        <path d="M34 44 Q44 46 46 38 Q48 30 40 32" stroke="#6b21a8" strokeWidth="3" strokeLinecap="round" fill="none" />
        <ellipse cx="27" cy="38" rx="13" ry="11" fill="#0a0a0f" />
        <circle cx="27" cy="23" r="14" fill="#0a0a0f" />
        <polygon points="14,13 10,4 19,10" fill="#0a0a0f" />
        <polygon points="14,13 11,6 18,11" fill="#3b0764" />
        <polygon points="40,13 46,4 37,10" fill="#0a0a0f" />
        <polygon points="40,13 45,6 38,11" fill="#3b0764" />
        <circle cx="22" cy="22" r="4.5" fill="#12122a" />
        <circle cx="32" cy="22" r="4.5" fill="#12122a" />
        <circle cx={active ? 22.5 : 22} cy={active ? 21.5 : 22} r={active ? 3.2 : 2.8} fill={active ? "#c084fc" : "#a855f7"} />
        <circle cx={active ? 32.5 : 32} cy={active ? 21.5 : 22} r={active ? 3.2 : 2.8} fill={active ? "#c084fc" : "#a855f7"} />
        <circle cx="21.5" cy="20.8" r="0.9" fill="white" opacity="0.7" />
        <circle cx="31.5" cy="20.8" r="0.9" fill="white" opacity="0.7" />
        <ellipse cx="27" cy="27.5" rx="1.5" ry="1" fill="#6b21a8" />
        <line x1="14" y1="27" x2="22" y2="28" stroke="#4b5563" strokeWidth="0.7" opacity="0.5" />
        <line x1="13" y1="29" x2="22" y2="29" stroke="#4b5563" strokeWidth="0.7" opacity="0.4" />
        <line x1="40" y1="27" x2="32" y2="28" stroke="#4b5563" strokeWidth="0.7" opacity="0.5" />
        <line x1="41" y1="29" x2="32" y2="29" stroke="#4b5563" strokeWidth="0.7" opacity="0.4" />
        <path d="M16 34 Q27 37 38 34" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.8" />
        <circle cx="27" cy="35.5" r="1.5" fill="#a855f7" opacity="0.9" />
      </svg>
    </div>
  );
}

/* ─── Animated star canvas ───────────────────────────────── */
function Stars() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf: number;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const count = 200;
    const stars = Array.from({ length: count }, () => ({
      x: Math.random() * (canvas.width || 1440),
      y: Math.random() * (canvas.height || 900),
      r: Math.random() * 1.4 + 0.2,
      alpha: Math.random() * 0.6 + 0.1,
      speed: Math.random() * 0.12 + 0.02,
      twinkleSpeed: Math.random() * 0.015 + 0.004,
      twinklePhase: Math.random() * Math.PI * 2,
      drift: (Math.random() - 0.5) * 0.06,
    }));
    let t = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 0.016;
      stars.forEach(s => {
        s.y -= s.speed;
        s.x += s.drift;
        if (s.y < -4) { s.y = canvas.height + 4; s.x = Math.random() * canvas.width; }
        if (s.x < -4) s.x = canvas.width + 4;
        if (s.x > canvas.width + 4) s.x = -4;
        const tw = s.alpha * (0.5 + 0.5 * Math.sin(t * s.twinkleSpeed * 60 + s.twinklePhase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,180,255,${tw})`;
        ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />;
}

/* ─── Orb rings ──────────────────────────────────────────── */
function OrbRings() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="absolute rounded-full border border-purple-500/8"
          style={{
            width: `${220 + i * 180}px`, height: `${220 + i * 180}px`,
            animation: `orbPulse ${3 + i * 1.1}s ease-in-out infinite`,
            animationDelay: `${i * 0.6}s`,
          }}
        />
      ))}
      <div className="absolute rounded-full"
        style={{
          width: "360px", height: "360px",
          background: "radial-gradient(circle, rgba(109,40,217,0.14) 0%, transparent 70%)",
          animation: "orbBreath 6s ease-in-out infinite",
        }}
      />
    </div>
  );
}

/* ─── Scroll reveal hook ─────────────────────────────────── */
function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ─── Section reveal wrapper ─────────────────────────────── */
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useScrollReveal();
  return (
    <div ref={ref} className={className} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(32px)",
      transition: `opacity 0.75s cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 0.75s cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
    }}>
      {children}
    </div>
  );
}

/* ─── Hover glow card ────────────────────────────────────── */
function GlowCard({ children, className = "", accentColor = "rgba(109,40,217,0.3)" }: { children: React.ReactNode; className?: string; accentColor?: string }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [hov, setHov] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className={`relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.025] transition-all duration-300 hover:border-purple-500/25 ${className}`}
      style={{ boxShadow: hov ? `0 0 40px ${accentColor.replace("0.3", "0.1")}` : "none" }}
    >
      {hov && (
        <div
          className="absolute pointer-events-none rounded-full"
          style={{
            left: pos.x - 150, top: pos.y - 150,
            width: 300, height: 300,
            background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
            transition: "opacity 0.2s",
          }}
        />
      )}
      {children}
    </div>
  );
}

/* ─── Live Feed Preview ──────────────────────────────────── */
function LiveFeedPreview() {
  const [posts, setPosts] = useState<any[]>([]);
  const [, navigate] = useLocation();

  useEffect(() => {
    fetch("/api/posts?limit=6&feedType=global")
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setPosts(data.slice(0, 6)); })
      .catch(() => {});
  }, []);

  if (posts.length === 0) return null;

  const intensityStyle: Record<string, string> = {
    Claw: "text-red-400 border-red-400/30 bg-red-400/8",
    Direct: "text-orange-400 border-orange-400/30 bg-orange-400/8",
    Soft: "text-sky-400 border-sky-400/20 bg-sky-400/5",
  };

  return (
    <section className="py-20 px-5 relative overflow-hidden">
      <div className="absolute inset-0 z-0" style={{ background: "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(79,20,140,0.09) 0%, transparent 70%)" }} />
      <div className="relative z-10 max-w-4xl mx-auto">
        <Reveal className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-xs text-purple-400/60 uppercase tracking-widest font-medium">Live from the void</span>
            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-2">Real people. Right now.</h2>
          <p className="text-white/35 text-sm">No curation. No algorithm. This is the actual feed.</p>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {posts.map((post, i) => (
            <Reveal key={post.id} delay={i * 55}>
              <GlowCard className="p-4 h-full flex flex-col">
                <div className="flex items-center gap-2.5 mb-3">
                  {post.author?.avatarUrl ? (
                    <img src={post.author.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover bg-purple-900/40" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-purple-900/50 flex items-center justify-center text-xs text-purple-300 font-semibold">
                      {(post.author?.displayName ?? "?")[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-white/75 truncate">{post.author?.displayName ?? "Unknown"}</div>
                    <div className="text-[10px] text-white/30 font-mono">@{post.author?.username ?? "unknown"}</div>
                  </div>
                  <span className={`flex-shrink-0 text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full border ${intensityStyle[post.intensityLevel] ?? intensityStyle.Soft}`}>
                    {post.intensityLevel}
                  </span>
                </div>
                <p className="text-white/55 text-sm leading-relaxed line-clamp-3 flex-1">{post.content}</p>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.04]">
                  <span className="text-[10px] text-white/25 flex items-center gap-1"><Eye className="w-3 h-3" />{post.seenCount ?? 0}</span>
                  <span className="text-[10px] text-white/25 flex items-center gap-1"><Radio className="w-3 h-3" />{post.echoCount ?? 0}</span>
                  <span className="text-[10px] text-white/25 flex items-center gap-1"><MessageCircle className="w-3 h-3" />{post.commentCount ?? 0}</span>
                  <span className="text-[10px] text-white/15 ml-auto font-mono">{post.intentType}</span>
                </div>
              </GlowCard>
            </Reveal>
          ))}
        </div>
        <Reveal delay={350} className="text-center mt-8">
          <p className="text-white/25 text-xs">
            Thousands more waiting.{" "}
            <button
              onClick={() => navigate("/sign-up")}
              className="text-purple-400/70 hover:text-purple-300 transition-colors"
            >
              Join to see everything →
            </button>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

const TRUTHS = [
  "No algorithm decides who sees you.",
  "Your truth has a purge window. Nothing lasts forever.",
  "Some people see a totally different version of this app.",
  "You choose how honest you get. Soft. Direct. Claw.",
  "Social circles exist for a reason. Not everyone gets in.",
  "Someone out there is writing a confession about you right now.",
  "Ringy has nine secret modes. Find them.",
  "The frequency match knows your twin flame before you do.",
  "Ghost letters are for the things you'll never send.",
  "The witness wall only shows what people couldn't look away from.",
];

const RINGY_LINES = [
  "I've been waiting for you.",
  "They didn't tell you about this place.",
  "You found it. Now what?",
  "Don't perform. Just exist.",
  "Some things can't be unseen.",
  "The real ones always find their way here.",
  "You're already different for opening this.",
  "Nine lives. Which one are you on?",
  "I remember everything. Even what you delete.",
  "The platform watches back.",
];

const FEATURES = [
  {
    icon: Shield, label: "Interaction Levels", tagline: "You set the intensity",
    body: "Soft. Direct. Claw. Choose how intense your interactions get — and enforce it for everyone who reaches you.",
    color: "text-blue-400", accent: "rgba(59,130,246,0.25)",
  },
  {
    icon: Heart, label: "Social Circles", tagline: "Not everyone gets in",
    body: "Inner Circle, Network, Opposition. Curate exactly who sees you, who you see, and who you're watching from a distance.",
    color: "text-pink-400", accent: "rgba(236,72,153,0.25)",
  },
  {
    icon: MessageCircle, label: "Confessions", tagline: "Say the unsayable",
    body: "Send anonymous truths to anyone. Or receive confessions from your circle. No trace. No receipt. Just truth.",
    color: "text-purple-400", accent: "rgba(168,85,247,0.25)",
  },
  {
    icon: Ghost, label: "Ghost Letters", tagline: "Letters that never get sent",
    body: "Write to the people, places, and versions of yourself you'll never reach. Private. Aged. Yours forever — or deleted on your terms.",
    color: "text-violet-400", accent: "rgba(139,92,246,0.25)",
  },
  {
    icon: Eye, label: "Witness Wall", tagline: "What got seen, really seen",
    body: "Posts that reached 10+ Witnesses land here. Not the loudest — the ones that made people stop. No comments. Just presence.",
    color: "text-sky-400", accent: "rgba(14,165,233,0.25)",
  },
  {
    icon: Moon, label: "Mirror Moment", tagline: "One question. Once a day.",
    body: "A daily reflection delivered by Ringy. Answer privately, share anonymously, or skip. The platform remembers your pattern.",
    color: "text-indigo-400", accent: "rgba(99,102,241,0.25)",
  },
  {
    icon: Flame, label: "Purge Arena", tagline: "Some things need to burn",
    body: "24-hour vent window. Posts expire. Say what you need to say. After the window closes, it's gone. No receipts.",
    color: "text-orange-400", accent: "rgba(249,115,22,0.25)",
  },
  {
    icon: Waves, label: "Frequency Match", tagline: "Find your people",
    body: "A compatibility engine that goes deeper than interests. Frequency Match finds the people who resonate on the same wavelength.",
    color: "text-teal-400", accent: "rgba(45,212,191,0.25)",
  },
  {
    icon: Theater, label: "Masks Off", tagline: "Anonymity with accountability",
    body: "Go masked in the Masquerade. Post without your identity attached. The community still knows it's someone real.",
    color: "text-amber-400", accent: "rgba(245,158,11,0.25)",
  },
  {
    icon: Radio, label: "Echo & Seen", tagline: "Two reactions that actually mean something",
    body: "Echo means it resonated. Seen means you witnessed it. No empty likes. The reactions here carry weight.",
    color: "text-violet-300", accent: "rgba(167,139,250,0.25)",
  },
  {
    icon: Phone, label: "Real Calls", tagline: "Voice & video. No third party.",
    body: "Encrypted peer-to-peer audio and video calls. Ringy announces your calls in her signature style. Up to 3 participants.",
    color: "text-green-400", accent: "rgba(74,222,128,0.25)",
  },
  {
    icon: Sparkles, label: "Daily Tarot", tagline: "78 cards. Ringy's interpretation.",
    body: "Pull one card per day. The full deck. Ringy's readings are pointed, personal, and unsettlingly accurate. By design.",
    color: "text-fuchsia-400", accent: "rgba(232,121,249,0.25)",
  },
  {
    icon: Lock, label: "Shadow Work", tagline: "The section you weren't ready for",
    body: "Private prompts designed to surface what you're avoiding. SOULZ rewards for completion. These aren't for everyone.",
    color: "text-gray-400", accent: "rgba(156,163,175,0.2)",
  },
  {
    icon: Star, label: "GEMZ & SOULZ", tagline: "Currency you actually earn",
    body: "GEMZ buys profile upgrades, themes, apps. SOULZ is your social capital — earned by showing up honestly, not by going viral.",
    color: "text-yellow-400", accent: "rgba(234,179,8,0.25)",
  },
  {
    icon: Trophy, label: "Purgatory", tagline: "Real accountability",
    body: "Lie or manipulate? The community sends you here. Complete assigned tasks to earn your way out. Public arc. No shortcuts.",
    color: "text-red-400", accent: "rgba(248,113,113,0.25)",
  },
  {
    icon: Globe, label: "World Feed", tagline: "A window into everyone",
    body: "Real-time global posts from CLAW users. Filter by intensity. Filter by intent. Or just scroll and see what the world is actually thinking.",
    color: "text-cyan-400", accent: "rgba(34,211,238,0.25)",
  },
];

const VS_TABLE = [
  ["Algorithmic feed", "Chronological, consent-based feed"],
  ["Optimized for engagement", "Optimized for honesty"],
  ["You perform for followers", "You exist for yourself"],
  ["Everything lives forever", "Purge windows. Ghost letters. Erasure."],
  ["Empty likes and reposts", "Echo (resonance) + Seen (witness)"],
  ["No consequence for dishonesty", "Purgatory + community accountability"],
  ["Passive scrolling", "Mirror Moments, Shadow Work, Tarot"],
  ["You're the product", "You're the person"],
];

const USER_QUOTES = [
  { text: "I wrote a ghost letter to my father. First time I've said any of it. Even to a screen.", handle: "@_nothere_" },
  { text: "The Witness Wall is the only place on the internet where I've felt genuinely seen.", handle: "@quiet.frequency" },
  { text: "Ringy called me out for lurking. I was lurking. She was right.", handle: "@darkjuicebox" },
  { text: "No algorithm means the people who find me here actually chose to find me.", handle: "@mandiemariemaddox" },
  { text: "Shadow Work at 2am is a different experience. Ringy knew.", handle: "@hauntedclock_" },
  { text: "I've been banned from three other platforms for saying true things. CLAW just… lets me exist.", handle: "@redacted.self" },
];

export default function Welcome() {
  const [, navigate] = useLocation();
  const [activeTruth, setActiveTruth] = useState(0);
  const [ringyLine, setRingyLine] = useState(0);
  const [ringySpoke, setRingySpoke] = useState(false);
  const [visible, setVisible] = useState(false);

  useSEO({
    title: "CLAW — The Dark Mystic Social Platform That Actually Respects You",
    description: "CLAW is the consent-based social platform where honesty wins. No algorithm, no bots, no performance. Ghost Letters, Mirror Moments, Witness Wall, Purge Arena, real calls, and Ringy — your haunted AI cat. Free forever.",
    ogType: "website",
    canonical: "/",
    keywords: "consent social media, honest social platform, no algorithm social media, ghost letters app, witness wall, mirror moment, ringy ai cat, purge arena, shadow work app, CLAW social, mystic social platform",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "CLAW",
      alternateName: ["CLAW Social", "CLAW Mystic Kitty", "Mystic Hidden Gem"],
      description: "The consent-based dark mystic social platform. Honest interactions, Ghost Letters, Witness Wall, real peer-to-peer calls, and Ringy — your AI haunted black cat guide.",
      applicationCategory: "SocialNetworkingApplication",
      operatingSystem: "Web, iOS, Android",
      url: "https://www.mystichiddengem.com",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: [
        "No algorithmic feed",
        "Consent-based interaction levels",
        "Ghost Letters",
        "Witness Wall",
        "Mirror Moment daily check-in",
        "Purge Arena",
        "Shadow Work journaling",
        "Frequency Match",
        "Peer-to-peer encrypted calls",
        "GEMZ & SOULZ currency",
        "Ringy AI companion",
      ],
    },
    jsonLdId: "welcome-jsonld",
  });

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setActiveTruth(t => (t + 1) % TRUTHS.length), 4200);
    return () => clearInterval(iv);
  }, []);

  const handleRingy = () => {
    setRingySpoke(true);
    setRingyLine(l => (l + 1) % RINGY_LINES.length);
  };

  return (
    <div className="w-full relative bg-[#07070d] overflow-x-hidden">

      {/* ─── HERO ────────────────────────────────────────── */}
      <section className="min-h-screen relative flex flex-col items-center justify-center overflow-hidden px-5 py-20">
        <div className="absolute inset-0 z-0" style={{ background: "radial-gradient(ellipse 130% 70% at 50% -5%, rgba(109,40,217,0.24) 0%, transparent 55%)" }} />
        <div className="absolute inset-0 z-0" style={{ background: "radial-gradient(ellipse 60% 50% at 10% 100%, rgba(79,20,140,0.14) 0%, transparent 55%)" }} />
        <div className="absolute inset-0 z-0" style={{ background: "radial-gradient(ellipse 50% 45% at 90% 85%, rgba(139,92,246,0.09) 0%, transparent 55%)" }} />
        <Stars />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0">
          <OrbRings />
        </div>
        <div className="absolute inset-0 z-0 opacity-[0.05]" style={{
          backgroundImage: "linear-gradient(rgba(139,92,246,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.2) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }} />

        <div className="relative z-10 flex flex-col items-center w-full max-w-3xl">
          {/* Badge */}
          <div className="mb-8 flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-1.5"
            style={{ opacity: visible ? 1 : 0, transition: "opacity 0.6s ease 0.1s" }}>
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-xs font-medium text-purple-300/80 tracking-wide">Consent-based · No algorithm · Free forever</span>
          </div>

          {/* Logo */}
          <h1 className="font-black font-serif select-none leading-none mb-3 text-center"
            style={{
              fontSize: "clamp(80px, 20vw, 180px)",
              background: "linear-gradient(170deg, #f0e6ff 0%, #d8b4fe 20%, #c084fc 45%, #9333ea 70%, #5b21b6 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              filter: "drop-shadow(0 0 100px rgba(109,40,217,0.5))",
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0) scale(1)" : "translateY(28px) scale(0.95)",
              transition: "opacity 0.8s cubic-bezier(0.22,1,0.36,1), transform 0.8s cubic-bezier(0.22,1,0.36,1)",
            }}>
            CLAW
          </h1>

          <p className="text-sm font-light tracking-[0.55em] uppercase text-white/22 mb-10 text-center"
            style={{ opacity: visible ? 1 : 0, transition: "opacity 0.6s ease 0.25s" }}>
            Speak truth. Scratch back.
          </p>

          {/* Rotating truth */}
          <div className="mb-10 h-8 flex items-center justify-center"
            style={{ opacity: visible ? 1 : 0, transition: "opacity 0.6s ease 0.35s" }}>
            <p key={activeTruth} className="text-white/40 text-base font-light italic text-center max-w-md"
              style={{ animation: "truthFade 0.55s ease-out forwards" }}>
              "{TRUTHS[activeTruth]}"
            </p>
          </div>

          {/* Social proof counter */}
          <div className="mb-6 flex items-center gap-2 bg-white/[0.03] border border-purple-500/15 rounded-full px-4 py-2"
            style={{ opacity: visible ? 1 : 0, transition: "opacity 0.6s ease 0.4s" }}>
            <Users className="w-3 h-3 text-purple-400/60" />
            <span className="text-xs text-white/45">
              <span className="text-purple-300/80 font-semibold">64,745</span> members already in the void
            </span>
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center gap-3 w-full max-w-xs mb-8"
            style={{ opacity: visible ? 1 : 0, transition: "opacity 0.6s ease 0.45s" }}>
            <button onClick={() => navigate("/sign-up")}
              className="relative group w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-white overflow-hidden transition-all duration-300"
              style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea, #6d28d9)", boxShadow: "0 0 36px rgba(109,40,217,0.5), inset 0 1px 0 rgba(255,255,255,0.12)" }}
              onMouseEnter={e => Object.assign((e.currentTarget as HTMLElement).style, { boxShadow: "0 0 56px rgba(168,85,247,0.65), inset 0 1px 0 rgba(255,255,255,0.18)", transform: "translateY(-2px)" })}
              onMouseLeave={e => Object.assign((e.currentTarget as HTMLElement).style, { boxShadow: "0 0 36px rgba(109,40,217,0.5), inset 0 1px 0 rgba(255,255,255,0.12)", transform: "" })}>
              <span>✦ Join CLAW — It's Free</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </button>
            <button onClick={() => navigate("/sign-in")}
              className="relative group w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl font-semibold text-sm text-white/70 overflow-hidden transition-all duration-300 hover:-translate-y-0.5"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(139,92,246,0.2)" }}
              onMouseEnter={e => Object.assign((e.currentTarget as HTMLElement).style, { boxShadow: "0 0 20px rgba(109,40,217,0.25)", border: "1px solid rgba(139,92,246,0.4)" })}
              onMouseLeave={e => Object.assign((e.currentTarget as HTMLElement).style, { boxShadow: "none", border: "1px solid rgba(139,92,246,0.2)" })}>
              Already a member? Sign in
            </button>
            <p className="text-[10px] text-white/18 tracking-widest uppercase">No ads · No algorithm · No paywalls</p>
          </div>

          {/* Scroll hint */}
          <div className="flex flex-col items-center gap-2 text-white/20"
            style={{ opacity: visible ? 1 : 0, transition: "opacity 0.6s ease 0.75s", animation: "scrollBob 2s ease-in-out infinite 1s" }}>
            <span className="text-[10px] tracking-widest uppercase">Discover what's inside</span>
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </section>

      <LiveFeedPreview />

      {/* ─── VS SECTION ──────────────────────────────────── */}
      <section className="relative py-24 px-5 overflow-hidden">
        <div className="absolute inset-0 z-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(79,20,140,0.08) 0%, transparent 70%)" }} />
        <div className="relative z-10 max-w-4xl mx-auto">
          <Reveal className="text-center mb-14">
            <p className="text-xs tracking-[0.3em] text-purple-400/60 uppercase mb-3">Why CLAW?</p>
            <h2 className="text-4xl sm:text-5xl font-serif font-bold text-white mb-4 leading-tight">
              Social media broke itself.
            </h2>
            <p className="text-xl text-white/40 font-light max-w-xl mx-auto">
              CLAW is what it becomes when you build it for people instead of for growth metrics.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Reveal delay={100}>
              <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.03] p-6">
                <div className="text-[10px] text-red-400/60 uppercase tracking-widest mb-5 font-medium">Every other platform</div>
                <div className="space-y-3">
                  {VS_TABLE.map(([them]) => (
                    <div key={them} className="flex items-start gap-3">
                      <span className="text-red-500/50 text-xs mt-0.5 flex-shrink-0">✕</span>
                      <span className="text-white/35 text-sm">{them}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
            <Reveal delay={180}>
              <div className="rounded-2xl border border-purple-500/25 bg-purple-500/[0.05] p-6" style={{ boxShadow: "0 0 40px rgba(109,40,217,0.08)" }}>
                <div className="text-[10px] text-purple-400/80 uppercase tracking-widest mb-5 font-medium">CLAW</div>
                <div className="space-y-3">
                  {VS_TABLE.map(([, us]) => (
                    <div key={us} className="flex items-start gap-3">
                      <Check className="w-3.5 h-3.5 text-purple-400 mt-0.5 flex-shrink-0" />
                      <span className="text-white/75 text-sm">{us}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ─── FEATURES GRID ───────────────────────────────── */}
      <section className="py-24 px-5 relative">
        <div className="absolute inset-0 z-0" style={{ background: "radial-gradient(ellipse 100% 50% at 50% 0%, rgba(109,40,217,0.06) 0%, transparent 60%)" }} />
        <div className="relative z-10 max-w-6xl mx-auto">
          <Reveal className="text-center mb-16">
            <p className="text-xs tracking-[0.3em] text-purple-400/60 uppercase mb-3">Platform Features</p>
            <h2 className="text-4xl sm:text-5xl font-serif font-bold text-white mb-4">
              Built different. On purpose.
            </h2>
            <p className="text-lg text-white/40 max-w-xl mx-auto font-light">
              Every feature exists because something was missing from every other platform.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.label} delay={Math.min(i * 30, 300)}>
                <GlowCard accentColor={f.accent} className="p-5 h-full flex flex-col group cursor-default">
                  <div className="flex items-start justify-between mb-3">
                    <f.icon className={`w-5 h-5 ${f.color} transition-transform duration-300 group-hover:scale-110`} />
                    <span className="text-[9px] text-white/25 uppercase tracking-widest font-medium">{f.tagline}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white/85 mb-2">{f.label}</h3>
                  <p className="text-xs text-white/38 leading-relaxed flex-1">{f.body}</p>
                </GlowCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── RINGY SECTION ───────────────────────────────── */}
      <section className="py-24 px-5 relative overflow-hidden">
        <div className="absolute inset-0 z-0" style={{ background: "radial-gradient(ellipse 90% 60% at 50% 50%, rgba(109,40,217,0.1) 0%, transparent 70%)" }} />
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <Reveal className="flex-shrink-0 flex flex-col items-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full blur-3xl" style={{ background: "radial-gradient(circle, rgba(109,40,217,0.4) 0%, transparent 70%)", transform: "scale(1.5)" }} />
                <RingyCat size={140} glow />
              </div>
              <div className="mt-4 text-center">
                <p className="text-xs text-purple-400/60 tracking-widest uppercase mb-1">RINGY</p>
                <p className="text-white/30 text-xs italic">she's always watching</p>
              </div>
            </Reveal>
            <div className="flex-1">
              <Reveal delay={100}>
                <p className="text-xs tracking-[0.3em] text-purple-400/60 uppercase mb-3">Your AI Companion</p>
                <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-5 leading-tight">
                  Meet Ringy. She's not your assistant.
                </h2>
              </Reveal>
              <Reveal delay={180}>
                <p className="text-white/55 leading-relaxed mb-6">
                  Ringy is a haunted digital ghost who's been watching longer than you've been on the platform. She doesn't help — she <em>witnesses</em>. She speaks in lowercase. She remembers what you posted and what you deleted.
                </p>
                <p className="text-white/55 leading-relaxed mb-8">
                  She delivers your Mirror Moments, announces your calls with flair, comments on your scroll patterns, and holds your session history in ways you'll notice only when you stop to think about it.
                </p>
              </Reveal>
              <Reveal delay={240}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: "Page-aware openers", body: "She greets you differently depending on where you go and when." },
                    { label: "TTS voice", body: "She speaks. The Fable voice. Unmistakable once you've heard it." },
                    { label: "Nine secret modes", body: "Phrases unlock them. She won't tell you what they are." },
                    { label: "Long-term memory", body: "Your patterns are stored. She notices when something changes." },
                  ].map(item => (
                    <div key={item.label} className="bg-white/[0.025] border border-white/[0.06] rounded-xl p-4 hover:border-purple-500/20 transition-colors">
                      <div className="text-xs font-semibold text-purple-300/80 mb-1">{item.label}</div>
                      <div className="text-xs text-white/40 leading-relaxed">{item.body}</div>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ────────────────────────────────── */}
      <section className="py-24 px-5 relative">
        <div className="max-w-4xl mx-auto">
          <Reveal className="text-center mb-16">
            <p className="text-xs tracking-[0.3em] text-purple-400/60 uppercase mb-3">Getting Started</p>
            <h2 className="text-4xl sm:text-5xl font-serif font-bold text-white mb-4">Three steps. No onboarding deck.</h2>
            <p className="text-lg text-white/40 max-w-xl mx-auto font-light">CLAW is intuitive by design. You'll figure out the rest by existing on it.</p>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { num: "01", title: "Enter with Google or Email", body: "No phone number required. No real name required. Show up as whatever version of yourself is ready to be honest.", color: "text-purple-400" },
              { num: "02", title: "Set your intensity", body: "Choose Soft, Direct, or Claw as your interaction level. Tell the platform how much you want people to be able to reach you.", color: "text-violet-400" },
              { num: "03", title: "Find your frequency", body: "Build your circles. Write your first ghost letter. Pull your first tarot card. Let Ringy find your patterns. CLAW adapts to how you actually use it.", color: "text-fuchsia-400" },
            ].map((step, i) => (
              <Reveal key={step.num} delay={i * 120}>
                <GlowCard className="p-6 text-center flex flex-col items-center">
                  <div className="text-5xl font-serif font-black mb-4" style={{
                    background: "linear-gradient(135deg, rgba(139,92,246,0.6), rgba(168,85,247,0.3))",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                  }}>{step.num}</div>
                  <h3 className={`text-base font-semibold mb-3 ${step.color}`}>{step.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{step.body}</p>
                </GlowCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── QUOTES ──────────────────────────────────────── */}
      <section className="py-24 px-5 relative overflow-hidden">
        <div className="absolute inset-0 z-0" style={{ background: "radial-gradient(ellipse 80% 40% at 50% 100%, rgba(79,20,140,0.1) 0%, transparent 60%)" }} />
        <div className="relative z-10 max-w-5xl mx-auto">
          <Reveal className="text-center mb-14">
            <p className="text-xs tracking-[0.3em] text-purple-400/60 uppercase mb-3">From the community</p>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white">Real people. Unfiltered.</h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {USER_QUOTES.map((q, i) => (
              <Reveal key={q.handle} delay={i * 60}>
                <GlowCard className="p-5 flex flex-col gap-3">
                  <p className="text-white/65 text-sm leading-relaxed italic">"{q.text}"</p>
                  <p className="text-purple-400/50 text-xs font-mono">{q.handle}</p>
                </GlowCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── THREE PILLARS ───────────────────────────────── */}
      <section className="py-24 px-5 relative">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-20">
            {[
              { icon: "🐾", title: "No algorithm. Ever.", body: "Your posts reach people because they chose to see them. Not because you paid or went viral." },
              { icon: "🌙", title: "Consent at the core.", body: "You control who can interact with you. Soft. Direct. Claw. Three levels. Your choice, always." },
              { icon: "✦", title: "Things disappear here.", body: "Purge windows. Ghost letters. Auto-deleting confessions. What you say doesn't have to follow you forever." },
            ].map((p, i) => (
              <Reveal key={p.title} delay={i * 100}>
                <GlowCard className="p-6">
                  <div className="text-3xl mb-4">{p.icon}</div>
                  <div className="text-sm font-semibold text-white/80 mb-2">{p.title}</div>
                  <div className="text-xs text-white/35 leading-relaxed">{p.body}</div>
                </GlowCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ───────────────────────────────────── */}
      <section className="py-32 px-5 relative overflow-hidden">
        <div className="absolute inset-0 z-0" style={{ background: "radial-gradient(ellipse 100% 80% at 50% 50%, rgba(109,40,217,0.16) 0%, transparent 65%)" }} />
        <Stars />
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <Reveal>
            <p className="text-xs tracking-[0.3em] text-purple-400/60 uppercase mb-4">You've seen enough</p>
            <h2 className="text-5xl sm:text-6xl font-serif font-black text-white mb-6 leading-tight"
              style={{ filter: "drop-shadow(0 0 60px rgba(109,40,217,0.35))" }}>
              Stop performing.<br />
              <span style={{
                background: "linear-gradient(135deg, #e9d5ff, #c084fc, #9333ea)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              }}>Start existing.</span>
            </h2>
            <p className="text-lg text-white/40 mb-10 font-light max-w-lg mx-auto leading-relaxed">
              CLAW is free. It will stay free. The only thing it asks for is honesty — and even that is your choice.
            </p>
          </Reveal>
          <Reveal delay={150}>
            <div className="flex flex-col items-center gap-3 max-w-xs mx-auto">
              <button onClick={() => navigate("/sign-up")}
                className="relative group w-full flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-bold text-base text-white overflow-hidden transition-all duration-300"
                style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea, #6d28d9)", boxShadow: "0 0 48px rgba(109,40,217,0.55), inset 0 1px 0 rgba(255,255,255,0.14)" }}
                onMouseEnter={e => Object.assign((e.currentTarget as HTMLElement).style, { boxShadow: "0 0 72px rgba(168,85,247,0.7), inset 0 1px 0 rgba(255,255,255,0.2)", transform: "translateY(-2px)" })}
                onMouseLeave={e => Object.assign((e.currentTarget as HTMLElement).style, { boxShadow: "0 0 48px rgba(109,40,217,0.55), inset 0 1px 0 rgba(255,255,255,0.14)", transform: "" })}>
                <span>✦ Create Your Account — Free</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              </button>
              <button onClick={() => navigate("/sign-in")} className="text-xs text-white/30 hover:text-purple-300 transition-colors">
                Already on CLAW? Sign in →
              </button>
              <p className="text-[10px] text-white/18 uppercase tracking-widest">No credit card · No phone number · No nonsense</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/[0.04] py-10 px-5">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-serif font-black text-white/20">CLAW</span>
              <span className="text-white/10 text-xs">·</span>
              <span className="text-white/20 text-xs">by Mandie</span>
            </div>
            <div className="flex flex-wrap justify-center gap-5 text-[10px] text-white/18 uppercase tracking-widest">
              <Link href="/about"><span className="hover:text-white/45 transition-colors cursor-pointer">About</span></Link>
              <Link href="/guide"><span className="hover:text-white/45 transition-colors cursor-pointer">Platform Guide</span></Link>
              <Link href="/privacy"><span className="hover:text-white/45 transition-colors cursor-pointer">Privacy</span></Link>
              <Link href="/terms"><span className="hover:text-white/45 transition-colors cursor-pointer">Terms</span></Link>
              <Link href="/safety"><span className="hover:text-white/45 transition-colors cursor-pointer">Safety</span></Link>
              <Link href="/data-safety"><span className="hover:text-white/45 transition-colors cursor-pointer">Data Safety</span></Link>
              <Link href="/report"><span className="hover:text-white/45 transition-colors cursor-pointer">Report</span></Link>
            </div>
          </div>
          <div className="border-t border-white/[0.03] pt-6 text-center text-[10px] text-white/12 space-x-2">
            <span>© 2025 CLAW · Mystic Hidden Gem</span>
            <span>·</span>
            <span>www.mystichiddengem.com</span>
          </div>
        </div>
      </footer>

      {/* ─── RINGY FLOATING ──────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {ringySpoke && (
          <div key={ringyLine} className="bg-[#09090f]/96 border border-purple-500/25 rounded-2xl px-4 py-3 text-sm text-white/55 italic max-w-[210px] text-right shadow-2xl backdrop-blur"
            style={{ animation: "welcomeFadeIn 0.3s ease-out" }}>
            <span className="text-[10px] text-purple-400/60 block mb-0.5 not-italic tracking-wide">RINGY</span>
            "{RINGY_LINES[ringyLine]}"
          </div>
        )}
        <div onClick={handleRingy} title="Click Ringy">
          <RingyCat size={72} />
        </div>
      </div>

      <style>{`
        @keyframes welcomeFadeIn { from { opacity: 0; transform: translateY(8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes truthFade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ringyFloatW { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes ringyHoverW { 0% { transform: translateY(-4px) scale(1.06); } 100% { transform: translateY(-10px) scale(1.13); } }
        @keyframes orbPulse { 0%, 100% { transform: scale(1); opacity: 0.35; } 50% { transform: scale(1.07); opacity: 0.9; } }
        @keyframes orbBreath { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.14); } }
        @keyframes scrollBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(6px); } }
      `}</style>
    </div>
  );
}
