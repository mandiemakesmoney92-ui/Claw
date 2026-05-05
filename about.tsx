import { Link } from "wouter";
import { useSEO } from "@/hooks/useSEO";
import { ArrowLeft, Heart, Shield, Zap, Globe, Moon, Flame, Star } from "lucide-react";

const VALUES = [
  {
    icon: Shield,
    title: "Consent is not optional",
    body: "Every interaction on CLAW is filtered through a consent layer. You choose your Interaction Level. You decide who can reach you, and how intensely. No one gets to bypass that.",
    color: "text-blue-400",
  },
  {
    icon: Heart,
    title: "Honesty over performance",
    body: "The features are designed to pull real thoughts out of people. Not their best angle. Not their highlight reel. What's actually going on.",
    color: "text-pink-400",
  },
  {
    icon: Moon,
    title: "Things disappear here",
    body: "Purge windows. Ghost letters. Auto-deleting confessions. Not everything you say needs to follow you. Some truths just need to exist and then be gone.",
    color: "text-indigo-400",
  },
  {
    icon: Zap,
    title: "No algorithm. Ever.",
    body: "Your feed is your circles and the people you chose to follow. Nothing is boosted. Nothing is buried. CLAW doesn't decide what you should see.",
    color: "text-yellow-400",
  },
  {
    icon: Flame,
    title: "Accountability is real",
    body: "Purgatory exists. The community has real tools to hold people accountable. It's not a report button. It's a consequence system. That matters.",
    color: "text-orange-400",
  },
  {
    icon: Globe,
    title: "Built for depth",
    body: "Shadow Work. Mirror Moments. Witness Wall. Frequency Match. Every feature is designed for people who want more than surface-level connection.",
    color: "text-teal-400",
  },
];

const ROADMAP = [
  { phase: "Live Now", label: "Core platform", body: "Feed, posts, social circles, confessions, purge arena, tarot, shadow work, GEMZ & SOULZ, app store, Ringy, real-time calls.", status: "live" },
  { phase: "Live Now", label: "Mystic layer", body: "Ghost Letters, Witness Wall, Mirror Moment, Echo & Seen reactions, Ringy with TTS voice and page awareness.", status: "live" },
  { phase: "Coming Soon", label: "Voice Shrine", body: "Leave voice messages on profiles. Ringy curates the most resonant ones into a weekly digest.", status: "upcoming" },
  { phase: "Coming Soon", label: "Soulmate Match v2", body: "Full Frequency Match engine using multi-dimensional resonance scoring across your platform behavior.", status: "upcoming" },
  { phase: "Coming Soon", label: "Broadcast 2.0", body: "Real-time broadcast rooms with audience reactions, Ringy commentary, and auto-archiving.", status: "upcoming" },
  { phase: "Future", label: "Native mobile", body: "iOS and Android apps. Same consent architecture. Ringy in your pocket.", status: "future" },
];

export default function About() {
  useSEO({
    title: "About CLAW — The Anti-Algorithm Honest Social Platform Built From Scratch",
    description: "CLAW is built from experience, emotion, and a refusal to accept that performance-driven social media is the best we can do. The consent-based platform that chose honesty over virality. Built by Mandie.",
    canonical: "/about",
    keywords: "CLAW about, consent social media, honest social platform, no algorithm social media, CLAW founder, Mandie CLAW, mystic social platform, anti-algorithm",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      name: "About CLAW",
      description: "CLAW is the consent-based dark mystic social platform built for people who are tired of performing. No algorithm. No bots. Real accountability.",
      url: "https://www.mystichiddengem.com/about",
    },
    jsonLdId: "about-jsonld",
  });

  return (
    <div className="min-h-screen text-foreground" style={{ background: "radial-gradient(ellipse 100% 35% at 50% 0%, rgba(109,40,217,0.09) 0%, #070710 40%)" }}>
      {/* Nav */}
      <div className="sticky top-0 z-10 bg-[#070710]/90 backdrop-blur border-b border-white/[0.04] px-4 py-3 flex items-center gap-3">
        <Link href="/">
          <button className="flex items-center gap-2 text-white/35 hover:text-white/70 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </Link>
        <span className="text-white/20 text-xs">·</span>
        <span className="text-white/30 text-xs font-medium tracking-wide">CLAW · About</span>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-16">

        {/* Hero */}
        <div className="mb-20">
          <div className="mb-4">
            <span className="text-[10px] uppercase tracking-[0.35em] text-purple-400/60 font-semibold">The Platform</span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-serif font-black text-white leading-[1.05] mb-6">
            CLAW isn't here<br />
            to make you look perfect.
          </h1>
          <p className="text-2xl text-white/35 font-light leading-relaxed">
            It's here to make you real.
          </p>
          <div className="mt-8 w-20 h-px bg-gradient-to-r from-purple-500/60 to-transparent" />
        </div>

        {/* Opening */}
        <div className="mb-18 space-y-5">
          <p className="text-white/60 text-lg leading-relaxed">
            Most platforms reward performance. Carefully edited lives. Safe opinions. Filtered personalities. CLAW was built as a direct reaction to that.
          </p>
          <p className="text-white/80 text-xl font-medium leading-relaxed">
            A place where honesty isn't buried under algorithms or watered down to be acceptable.
          </p>
          <div className="bg-white/[0.025] border border-white/[0.06] rounded-2xl p-6 my-8">
            <p className="text-white/30 text-[10px] uppercase tracking-widest mb-4 font-semibold">This is where people</p>
            <div className="space-y-2">
              {[
                "Say what they actually mean.",
                "Not what sounds good.",
                "Not what gets the most likes.",
                "What's real.",
              ].map((line, i) => (
                <p key={i} className={`text-base leading-relaxed ${i === 0 ? "text-white/85 font-medium" : "text-white/45"}`}>{line}</p>
              ))}
            </div>
          </div>
        </div>

        {/* Vision */}
        <section className="mb-18">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-purple-400">✦</span>
            <h2 className="text-2xl font-serif font-bold text-white">The Vision</h2>
          </div>
          <blockquote className="border-l-2 border-purple-500/60 pl-6 py-2 mb-8">
            <p className="text-2xl font-serif text-white font-semibold leading-snug">Truth should be seen.<br /><span className="text-white/50 text-xl font-normal">Not just the polished version.</span></p>
          </blockquote>
          <p className="text-white/55 mb-6 leading-relaxed">
            The uncomfortable version. The chaotic version. The kind people usually keep to themselves because they don't have anywhere that feels safe enough for it.
          </p>
          <p className="text-white/55 mb-10 leading-relaxed">
            Even the features aren't passive. The compliment wheel makes you speak. The feed doesn't let you disappear into scrolling. Mirror Moments force a moment of reflection once a day. You're part of the platform whether you like it or not.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              "Daily truth prompts that force honesty",
              "Interaction levels from soft to raw",
              "Confessions that can be anonymous or named",
              "A system that rewards expression, not perfection",
              "Ghost Letters for what you'll never send",
              "Witness Wall for what truly lands",
              "Mirror Moments for daily reflection",
              "Purgatory for real accountability",
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 bg-white/[0.02] border border-white/[0.04] rounded-xl p-3">
                <span className="text-purple-400 mt-0.5 text-xs flex-shrink-0">▸</span>
                <span className="text-white/55 text-sm leading-relaxed">{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Values */}
        <section className="mb-18">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-violet-400">✦</span>
            <h2 className="text-2xl font-serif font-bold text-white">What CLAW Actually Stands For</h2>
          </div>
          <p className="text-white/45 mb-8 leading-relaxed">
            <strong className="text-white/70">Consent. Love. Awareness. Wholeness.</strong> No one announces it. It just shows up in how the platform behaves.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {VALUES.map(v => (
              <div key={v.title} className="bg-white/[0.025] border border-white/[0.05] rounded-2xl p-5 hover:border-purple-500/15 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <v.icon className={`w-4 h-4 ${v.color}`} />
                  <h3 className="text-sm font-semibold text-white/80">{v.title}</h3>
                </div>
                <p className="text-xs text-white/45 leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why it exists */}
        <section className="mb-18">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-pink-400">✦</span>
            <h2 className="text-2xl font-serif font-bold text-white">Why It Exists</h2>
          </div>
          <p className="text-white/55 mb-5 leading-relaxed">Because social media got hollow.</p>
          <p className="text-white/55 mb-5 leading-relaxed">
            People scroll for hours and leave feeling nothing. Or worse, feeling like they're not enough. Like everyone else has their life together and you're the only one struggling in the in-between.
          </p>
          <p className="text-white/80 mb-6 text-lg leading-relaxed font-medium">CLAW exists for people who are tired of pretending.</p>
          <div className="bg-gradient-to-br from-purple-500/[0.06] to-pink-500/[0.04] border border-purple-500/15 rounded-2xl p-7 mb-8">
            <div className="space-y-2 mb-4">
              {[
                "The ones who think too much.",
                "Feel too deeply.",
                "Notice things others ignore.",
                "The ones who don't want another place to perform.",
              ].map((line, i) => (
                <p key={i} className="text-white/55 text-base">{line}</p>
              ))}
            </div>
            <p className="text-white/80 text-lg font-medium">They want somewhere to be understood.</p>
          </div>
          <p className="text-white/45 leading-relaxed">Not validated. Not congratulated. Just understood. CLAW is that place.</p>
        </section>

        {/* Who I am */}
        <section className="mb-18">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-sky-400">✦</span>
            <h2 className="text-2xl font-serif font-bold text-white">Who Built This</h2>
          </div>
          <div className="space-y-5 text-white/55 leading-relaxed">
            <p>I'm Mandie. I didn't build CLAW because I had a business plan or funding or a roadmap approved by a board.</p>
            <p className="text-white/80 font-medium text-lg">I built it because I needed it.</p>
            <p>
              Because I know what it feels like to have things to say and nowhere real to say them. To feel surrounded but still unheard. To want connection that isn't fake or surface-level or driven by who can generate the most engagement.
            </p>
            <p>CLAW comes from that place.</p>
            <p>
              It's not corporate. It's not manufactured. It doesn't have a PR department or a social strategy. It's built from experience, emotion, and a genuine refusal to accept that this is the best social media can be.
            </p>
            <div className="bg-white/[0.025] border border-white/[0.05] rounded-2xl p-5 my-6">
              <p className="text-white/30 text-[10px] uppercase tracking-widest mb-3">On Ringy</p>
              <p className="text-white/65 leading-relaxed text-sm">
                Ringy is named for my real cat. The black one who sits in corners and watches. The one who's always present but never explains himself. He was the first character who made sense for this platform — someone who witnesses everything and says exactly as much as he wants to. Don is Ringy's person in real life. Jake is his brother. You'll hear Ringy mention them if you listen closely.
              </p>
            </div>
          </div>
        </section>

        {/* Roadmap */}
        <section className="mb-18">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-emerald-400">✦</span>
            <h2 className="text-2xl font-serif font-bold text-white">Where It's Going</h2>
          </div>
          <p className="text-white/50 mb-8 leading-relaxed">
            CLAW isn't trying to compete by copying what already exists. It's building something people didn't realize they were missing.
          </p>
          <div className="space-y-3">
            {ROADMAP.map((item, i) => (
              <div key={i} className={`rounded-xl border p-4 ${
                item.status === "live" ? "border-green-500/20 bg-green-500/[0.03]" :
                item.status === "upcoming" ? "border-purple-500/20 bg-purple-500/[0.03]" :
                "border-white/[0.05] bg-white/[0.015]"
              }`}>
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h3 className="text-sm font-semibold text-white/80">{item.label}</h3>
                  <span className={`text-[9px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                    item.status === "live" ? "text-green-400/80 bg-green-400/10" :
                    item.status === "upcoming" ? "text-purple-400/80 bg-purple-400/10" :
                    "text-white/25 bg-white/[0.04]"
                  }`}>{item.phase}</span>
                </div>
                <p className="text-xs text-white/40 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Promise */}
        <section className="mb-18">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-fuchsia-400">✦</span>
            <h2 className="text-2xl font-serif font-bold text-white">The Promise</h2>
          </div>
          <div className="bg-gradient-to-br from-purple-500/[0.07] to-fuchsia-500/[0.04] border border-purple-500/20 rounded-2xl p-8 space-y-4">
            <p className="text-[10px] uppercase tracking-widest text-purple-400/60 mb-4 font-semibold">CLAW will always be</p>
            {[
              ["Free to use", "No paywalled feed. No follower purchase. The core platform is free."],
              ["Algorithm-free", "No ranking. No boosting. No shadow-banning. Your timeline is yours."],
              ["Consent-first", "You always control how people can reach you. Soft. Direct. Claw. Your choice."],
              ["Honest about what it is", "No fake 'we empower voices globally' mission statement. Just a real platform built by a real person."],
            ].map(([title, body]) => (
              <div key={title} className="flex items-start gap-3">
                <Star className="w-3.5 h-3.5 text-purple-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-white/80">{title}</p>
                  <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-white/[0.04] pt-10 space-y-3">
          <p className="text-white/50 text-sm leading-relaxed">
            This platform will evolve with the people on it. The more real you are, the more it becomes what it was meant to be.
          </p>
          <p className="text-white/25 text-xs italic">
            No fake "we empower voices globally" nonsense. Just straight truth with a little edge.
          </p>
          <div className="flex items-center gap-4 pt-3">
            <Link href="/"><span className="text-purple-400/50 hover:text-purple-400 text-xs transition-colors cursor-pointer">← Back to CLAW</span></Link>
            <span className="text-white/10 text-xs">·</span>
            <a href="mailto:mandiemariemaddox92@gmail.com" className="text-purple-400/40 hover:text-purple-400 transition-colors text-xs">
              mandiemariemaddox92@gmail.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
