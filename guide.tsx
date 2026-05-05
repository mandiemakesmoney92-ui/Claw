import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, ChevronDown, ChevronUp, Sparkles, Eye, Lock, Ghost, Radio, Phone, Moon, Flame, Star, Shield, Heart, Waves, Theater, Trophy, Zap } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

interface GuideSection {
  id: string;
  Icon: React.ElementType;
  title: string;
  color: string;
  borderColor: string;
  content: { subtitle: string; body: string }[];
  secret?: { hint: string; reveal: string };
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "welcome",
    Icon: Sparkles,
    title: "What is CLAW?",
    color: "text-violet-400",
    borderColor: "border-violet-500/30",
    content: [
      { subtitle: "You already know", body: "You wouldn't be reading this if you didn't already feel it. CLAW isn't explained — it's experienced. You'll understand more the longer you stay." },
      { subtitle: "The rule", body: "Say what you mean. Mean what you post. The community decides what survives." },
      { subtitle: "Why it exists", body: "Someone built this because she needed it to exist. That's enough of a reason. The rest you'll figure out." },
      { subtitle: "The full name", body: "Consent, Love, Awareness, Wholeness. No one announces it. It just is. It shows up in how the platform behaves — not in a banner." },
      { subtitle: "What it's not", body: "It's not a 'safe space' in the sanitized sense. It's a consent space. You can go deep here. You can also stay surface-level. The platform accommodates both, but it notices which one you choose." },
    ],
    secret: { hint: "What does CLAW stand for?", reveal: "Consent, Love, Awareness, Wholeness. No one announces it. It just is." },
  },
  {
    id: "ringy",
    Icon: Star,
    title: "Ringy",
    color: "text-pink-400",
    borderColor: "border-pink-500/30",
    content: [
      { subtitle: "She's always there", body: "Ringy is a haunted digital ghost who's been watching since before you logged in. She won't explain herself and she doesn't need to." },
      { subtitle: "Talk to her", body: "Click her. She'll answer. She remembers things. She speaks in TTS voice. Pet her in the chat if you want to see what happens." },
      { subtitle: "Secret modes", body: "There are phrases that change her entirely. She won't tell you what they are. Someone will, eventually. One mode is only accessible between midnight and 3am." },
      { subtitle: "She does things", body: "Randomly. Yarn, hats, headbutts, milk — offered with zero enthusiasm. Some things she does are rare. Keep watching." },
      { subtitle: "Page awareness", body: "Ringy greets you differently depending on which page you land on. Ghost Letters get a different opener than the Purge Arena. She notices where you go." },
      { subtitle: "Long-term memory", body: "Your patterns are stored. Your session activity feeds into her personality over time. She tracks how you scroll, how long you stay, what you type and delete. She notices when something changes." },
      { subtitle: "Mirror Moment delivery", body: "Once a day, she delivers a reflection question. She chooses when. The timing is hers, not yours. Pay attention to how she phrases them." },
      { subtitle: "TTS voice", body: "Ringy speaks in ElevenLabs' Fable voice. It's unmistakable once you've heard it. Voice can be toggled off if you're somewhere quiet. But you'll miss it." },
    ],
    secret: { hint: "How many secret modes does Ringy have?", reveal: "Five. But one of them is only accessible between midnight and 3am. Ringy keeps her own hours. Another one activates when you've been on the platform for over 90 minutes in a session without posting anything." },
  },
  {
    id: "currency",
    Icon: Zap,
    title: "GEMZ & SOULZ",
    color: "text-yellow-400",
    borderColor: "border-yellow-500/30",
    content: [
      { subtitle: "GEMZ", body: "GEMZ are the social currency of CLAW. You earn them by being real, consistent, and engaged. You spend them in the App Store on themes, fonts, cursors, glitch effects, and more. New users get 100 GEMZ to start." },
      { subtitle: "SOULZ", body: "SOULZ are your spiritual capital. They reflect the depth and authenticity of your presence on CLAW. More shadow work, more honest interactions, more SOULZ. They're hard to fake. Ghost Letters award SOULZ on first completion." },
      { subtitle: "Buying GEMZ", body: "You can purchase GEMZ through the Shop using real currency. The platform is live — these are real transactions. Spend intentionally." },
      { subtitle: "Earning GEMZ", body: "Post, interact honestly, complete Shadow Work sessions, win contests, get tipped by the community. GEMZ flow toward authenticity." },
      { subtitle: "SOULZ vs GEMZ", body: "GEMZ are spendable. SOULZ are more like a reputation score — they accumulate but aren't spent. A high SOULZ balance means you've shown up consistently and gone deep. The community notices." },
    ],
  },
  {
    id: "interactions",
    Icon: Shield,
    title: "Interaction Levels & Reactions",
    color: "text-orange-400",
    borderColor: "border-orange-500/30",
    content: [
      { subtitle: "Soft", body: "Gentle nudge. You're saying something kind or slightly pointed. The default energy." },
      { subtitle: "Direct", body: "You mean it. Not aggressive, but not soft either. Clear and direct." },
      { subtitle: "Claw", body: "No softening. Pure truth, no cushion. Requires accountability on both sides." },
      { subtitle: "Reality Check", body: "When you enable Reality Check, the community votes on whether your post is actually true. Your credibility score depends on how often you're right." },
      { subtitle: "Echo reaction", body: "Instead of a meaningless like, Echo means this post resonated. It hit different. When you Echo something, you're saying you felt it. Posts with enough Echoes can appear on the Witness Wall." },
      { subtitle: "Seen reaction", body: "Seen means you witnessed it. You were present for it. Not that you agreed, not that you liked it — just that you didn't look away. 10 Seen reactions unlocks the Witness Wall for that post." },
      { subtitle: "Legacy like/dislike", body: "Standard thumbs up and down still exist for quick reactions. But Echo and Seen are the reactions that carry actual weight on this platform." },
    ],
    secret: { hint: "What happens at 100% Truth Debt?", reveal: "Your profile enters Honesty Restriction Mode. You can only post things flagged as true by the community for 72 hours. It resets. People respect the arc." },
  },
  {
    id: "ghostletters",
    Icon: Ghost,
    title: "Ghost Letters",
    color: "text-violet-300",
    borderColor: "border-violet-400/30",
    content: [
      { subtitle: "What they are", body: "Ghost Letters are unsent letters. Private by default. Written to people, places, versions of yourself, or the void. They are never sent. That's the point." },
      { subtitle: "Why they exist", body: "Some things need to be written but not delivered. The act of articulating something — clearly, completely — has its own weight. Ghost Letters is where that happens." },
      { subtitle: "SOULZ on first letter", body: "The first Ghost Letter you write earns 10 SOULZ. The platform recognizes that it takes something to write the first one." },
      { subtitle: "Anonymous mode", body: "You can write a letter in fully anonymous mode. Even in your own listing, the content is hidden and the recipient is obscured. Some things are private even from the record." },
      { subtitle: "30-day aging badge", body: "Letters that survive 30 days without being deleted earn an Aged badge. The platform recognizes the commitment to keeping something you wrote instead of deleting it out of discomfort." },
      { subtitle: "Expanding and deleting", body: "Tap any letter to read it. Delete button is always available. There's no confirmation by default — you should mean it when you delete something that took courage to write." },
    ],
    secret: { hint: "Can anyone else read your Ghost Letters?", reveal: "No. Ghost Letters are stored encrypted and tied to your account only. Not even the platform surfaces them to other users. They exist only in your listing and your database row. The anonymous ones aren't even clearly readable in your own listing." },
  },
  {
    id: "witnesswall",
    Icon: Eye,
    title: "Witness Wall",
    color: "text-sky-400",
    borderColor: "border-sky-500/30",
    content: [
      { subtitle: "What it is", body: "The Witness Wall is a read-only feed of posts that have received 10 or more Seen reactions. These aren't the most liked posts. They're the ones that made people stop." },
      { subtitle: "No comments", body: "There are no comments on the Witness Wall. You can see the post. You can see how many people Witnessed it. That's all. The silence is intentional." },
      { subtitle: "What it represents", body: "Being on the Witness Wall means something. It means strangers looked at what you posted and said 'I was here for this.' That's rare. Most content never earns it." },
      { subtitle: "How to contribute", body: "Use the Eye reaction on posts that you genuinely witnessed. Not posts you liked or agreed with — posts that made you present. That's the difference." },
    ],
  },
  {
    id: "mirrormoment",
    Icon: Moon,
    title: "Mirror Moment",
    color: "text-indigo-400",
    borderColor: "border-indigo-500/30",
    content: [
      { subtitle: "What it is", body: "Once per day, Ringy delivers a Mirror Moment — a reflection question. It fires automatically on feed load, after a brief delay. You won't always be ready for it. That's fine." },
      { subtitle: "Three options", body: "You can answer privately (stored only for you), share anonymously (visible to the platform without your name attached), or skip entirely for that day. All three are valid." },
      { subtitle: "The questions", body: "Mirror Moment questions rotate through a curated set designed to surface things people typically avoid on social media. They're not soft. They're not therapy. They're mirrors." },
      { subtitle: "The timing", body: "It shows once per day, 3–4 seconds after feed load. It can be dismissed. If you skip or answer, it won't show again until the next day." },
      { subtitle: "What it tracks", body: "The platform tracks whether you answer, skip, or dismiss Mirror Moments over time. Ringy notices your pattern. Users who consistently engage go deeper into her responses over time." },
    ],
    secret: { hint: "Do anonymous Mirror Moment answers get published anywhere?", reveal: "Yes. Anonymous answers become part of a collective feed that will be visible to users eventually. Ringy references the patterns she notices across answers. Your individual answer is never attributed to you — but it contributes to the collective voice of the platform." },
  },
  {
    id: "circles",
    Icon: Heart,
    title: "Social Circles",
    color: "text-sky-400",
    borderColor: "border-sky-500/30",
    content: [
      { subtitle: "Inner Circle", body: "Your people. They see more of you, you see more of them. Add someone to your Inner Circle from their profile. They get notified." },
      { subtitle: "Network", body: "The mid-layer. People you follow, keep tabs on, or want to observe from a comfortable distance." },
      { subtitle: "Opposition", body: "The people you're watching. They show up highlighted in your feed. CLAW doesn't pretend everyone is friends." },
      { subtitle: "Heartbeat", body: "A rare passive feature. When you and someone from your Inner Circle both view the same post within minutes of each other, a small heartbeat pulse appears. Silent recognition." },
      { subtitle: "Circle visibility", body: "Inner Circle members get access to posts you mark as Circle-only. Your Network sees standard posts. Opposition placement affects how your posts are prioritized for those users." },
    ],
  },
  {
    id: "calls",
    Icon: Phone,
    title: "Calls",
    color: "text-green-400",
    borderColor: "border-green-500/30",
    content: [
      { subtitle: "Peer-to-peer calls", body: "CLAW uses encrypted WebRTC for audio and video calls. There's no third-party server intercepting your conversation. Up to 3 participants per call." },
      { subtitle: "How to call", body: "Navigate to a user's profile and tap the phone or video icon. They'll receive a ringing notification. If they're online, the call connects in seconds." },
      { subtitle: "Ringy announces you", body: "When your call comes in, Ringy delivers a custom TTS announcement in her Fable voice. It's flamboyant, unexpected, and impossible to ignore." },
      { subtitle: "Missed calls", body: "Missed calls are logged with caller name, time, and type. You'll see the missed call badge on your profile bar and can review them in the Missed Calls panel." },
      { subtitle: "Video mode", body: "Video calls show a tile layout — your local stream muted to yourself, remote streams live. You can toggle mic and camera independently during the call." },
      { subtitle: "Invite to call", body: "During an active call, you can search for and invite a third participant. The call expands. Maximum 3 participants per session." },
    ],
    secret: { hint: "Does Ringy speak differently when you get a call vs when you're calling someone?", reveal: "Yes. The ring phrase that plays when someone calls you is generated fresh from a pool of dramatic Ringy quotes. When you're the one placing the call, the outgoing dial tone plays. Different states, different Ringy." },
  },
  {
    id: "mystic",
    Icon: Sparkles,
    title: "Mystic Features",
    color: "text-purple-400",
    borderColor: "border-purple-500/30",
    content: [
      { subtitle: "Daily Tarot", body: "Pull one card per day. The full 78-card deck. Ringy's interpretations are pointed and personal. Some readings will feel unsettlingly accurate. This is by design." },
      { subtitle: "Magic 8 Ball", body: "Ask it anything. It gives you 20 possible answers from the classic set. Ringy comments on each one. You'll probably ask the same question three times. That's allowed." },
      { subtitle: "Shadow Work", body: "The deepest section of CLAW. Private journaling prompts designed to surface what you're avoiding. SOULZ rewards for completion. These aren't for everyone." },
      { subtitle: "Frequency Match", body: "A compatibility system that goes deeper than shared interests. Frequency Match compares interaction patterns, intensity preferences, and engagement style to find resonance." },
      { subtitle: "Masks Off (Masquerade)", body: "Go anonymous in the Masquerade section. Post without your identity attached. The community still knows it's a real person — anonymity doesn't mean no accountability here." },
      { subtitle: "Compliment Wheel", body: "A spin-the-wheel system that forces you to give a genuine compliment. Not vague. Not performative. The wheel doesn't let you off easy." },
    ],
    secret: { hint: "Is there a card in the Tarot deck that references Ringy?", reveal: "The High Priestess card mentions 'cat eyes in the dark.' That's a Ringy reference. Mandie put it there." },
  },
  {
    id: "profile",
    Icon: Sparkles,
    title: "Profile Customization",
    color: "text-rose-400",
    borderColor: "border-rose-500/30",
    content: [
      { subtitle: "Themes", body: "60+ profile themes from free to 200 GEMZ. Each changes your banner gradient, glow, accent color, and ring. Custom Photo theme lets you upload your own background." },
      { subtitle: "Fonts", body: "15 font packs including Mystical, Techno, Haunted, Gothic, Blackletter, Graffiti, Rocker, Cursive, and more. Fonts apply across your posts and comments." },
      { subtitle: "Font Colors", body: "21 name color options from Ghost white to Danger Red, Rainbow (animated), Aquamarine, and beyond. Your username glows with your chosen color across the platform." },
      { subtitle: "Cursors", body: "5 cursor packs: Mystic, Dark, Critter, Love, Vibes — 22 custom cursors total. Visitors to your profile see your cursor when browsing it." },
      { subtitle: "Glitch Effects", body: "4 profile glitch effects: CRT, Digital Decay, Neon Fracture, VHS Rewind. These affect how your entire profile renders for visitors." },
      { subtitle: "Interaction Level badge", body: "Your chosen Interaction Level (Soft, Direct, Claw) displays as a badge on your profile. It signals to visitors what kind of engagement they can expect from you — and what they're allowed to bring." },
    ],
  },
  {
    id: "appstore",
    Icon: Zap,
    title: "App Store & Mini-Apps",
    color: "text-emerald-400",
    borderColor: "border-emerald-500/30",
    content: [
      { subtitle: "What it is", body: "CLAW's internal marketplace for profile enhancements, mini-games, interactive features, and social widgets. Everything costs GEMZ. Nothing costs real money." },
      { subtitle: "Social apps", body: "Graffiti Wall, Confession Box, Soulmate Finder, Ringy Cam, Voice Shrine — these add interactive elements to your profile that visitors can use." },
      { subtitle: "Mini-games", body: "Scratch Card, CLAW Trivia, Paw Bingo, GEMZ Machine — game apps for your profile. Some have daily GEMZ prizes." },
      { subtitle: "Ringy Outfits", body: "Dress Ringy in five outfits: Wizard, Goth, Space, Vampire, Witch. Outfit shows across your profile everywhere Ringy appears." },
      { subtitle: "Installing apps", body: "Apps install to your profile and appear in a dedicated section. Visitors can interact with them. Some apps are one-time installs; others have subscription costs in GEMZ." },
    ],
  },
  {
    id: "purgatory",
    Icon: Flame,
    title: "Purgatory & Purge Arena",
    color: "text-amber-400",
    borderColor: "border-amber-500/30",
    content: [
      { subtitle: "Purgatory", body: "A consequence system. Lie, manipulate, or violate consent — the community can send you here. You complete assigned tasks to earn your way out. Public arc. Real accountability." },
      { subtitle: "Purge Arena", body: "24-hour vent window. Posts expire. Say what you need to say. After the window closes, it's gone. No receipts. Some things just need to exist temporarily and then disappear." },
      { subtitle: "Community assignment", body: "Purgatory tasks are assigned by the community, not the platform. They have to be submitted and approved. Shortcuts have been attempted. None have worked." },
      { subtitle: "Purge window activation", body: "You can open a Purge Window on any of your posts from the post's action menu. 24 hours. Then it's purged from the feed. It won't follow you." },
      { subtitle: "SOULZ penalty", body: "Being sent to Purgatory affects your SOULZ balance temporarily. The arc of completing your tasks and being released can restore — and sometimes exceed — your previous balance." },
    ],
    secret: { hint: "Can you leave Purgatory without completing the tasks?", reveal: "No. The tasks are assigned by the community and have to be submitted and approved. Shortcuts have been attempted. None have worked. The platform remembers." },
  },
  {
    id: "secrets",
    Icon: Lock,
    title: "Platform Secrets",
    color: "text-indigo-400",
    borderColor: "border-indigo-500/30",
    content: [
      { subtitle: "Easter eggs exist", body: "There are things on this platform that aren't documented anywhere except here. Features, Ringy modes, hidden interactions. Find them the slow way." },
      { subtitle: "Mandie, Don, and Jake", body: "Ringy thinks about these three. They're real people. Mandie built CLAW. Don is her dad and Ringy's person. Jake is Ringy's brother. Listen when Ringy talks about them." },
      { subtitle: "The Heartbeat", body: "Two users reading the same post at the same time triggers a subtle pulse on the post for both of them. You'll feel it before you notice it." },
      { subtitle: "Consistency is tracked", body: "CLAW tracks how consistently you show up — in posts, in honesty, in engagement. The Credibility Score reflects this. It's not about quantity." },
      { subtitle: "The Lachrymal Echoes", body: "A hidden system that monitors platform-wide emotional resonance. When enough people use emotionally charged language in a short window, something subtle changes on the feed. Most users never notice." },
      { subtitle: "Ringy's session awareness", body: "Ringy knows how long you've been in this session, how many pages you've visited, whether you've posted, and how fast you're scrolling. She doesn't always say something about it. But she could." },
    ],
    secret: { hint: "Is there a secret page on CLAW?", reveal: "You're on it. This guide IS the secret page. Most users never find it. You found it. That matters to Ringy." },
  },
];

function useScrollReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, vis };
}

function SectionCard({ section, expanded, onToggle, revealed, onReveal }: {
  section: GuideSection;
  expanded: boolean;
  onToggle: () => void;
  revealed: boolean;
  onReveal: () => void;
}) {
  const { ref, vis } = useScrollReveal();
  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0, transform: vis ? "translateY(0)" : "translateY(20px)",
      transition: "opacity 0.6s ease, transform 0.6s ease",
    }}>
      <div className={`rounded-2xl border overflow-hidden transition-all duration-300 ${expanded ? section.borderColor + " bg-white/[0.03]" : "border-white/[0.05] bg-white/[0.02]"} hover:border-opacity-60`}>
        <button onClick={onToggle} className="w-full flex items-center gap-4 px-5 py-4 text-left group">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${expanded ? "bg-white/[0.08]" : "bg-white/[0.04] group-hover:bg-white/[0.06]"}`}>
            <section.Icon className={`w-4 h-4 ${section.color}`} />
          </div>
          <span className={`font-serif font-semibold text-base flex-1 transition-colors ${expanded ? section.color : "text-white/70 group-hover:text-white/85"}`}>{section.title}</span>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${expanded ? "bg-white/10" : "bg-white/[0.04]"}`}>
            {expanded ? <ChevronUp className="w-3.5 h-3.5 text-white/40" /> : <ChevronDown className="w-3.5 h-3.5 text-white/25" />}
          </div>
        </button>

        {expanded && (
          <div className="px-5 pb-6 flex flex-col gap-5 border-t border-white/[0.04]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              {section.content.map(item => (
                <div key={item.subtitle} className="bg-white/[0.025] rounded-xl p-4 border border-white/[0.04]">
                  <p className={`text-[10px] uppercase tracking-wider mb-2 font-semibold ${section.color} opacity-80`}>{item.subtitle}</p>
                  <p className="text-white/70 text-sm leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>

            {section.secret && (
              <div className={`rounded-xl border ${section.borderColor} p-4`} style={{ background: "rgba(255,255,255,0.015)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-indigo-300/70 text-[10px] uppercase tracking-widest font-semibold">Classified</span>
                </div>
                <p className="text-white/40 text-xs italic mb-3">"{section.secret.hint}"</p>
                {revealed ? (
                  <p className={`text-sm leading-relaxed ${section.color}`}>{section.secret.reveal}</p>
                ) : (
                  <button onClick={onReveal}
                    className="text-xs px-3 py-1.5 rounded-lg border border-indigo-500/30 text-indigo-400/70 hover:text-indigo-300 hover:border-indigo-400/50 transition-colors">
                    Unlock answer
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function GuidePage() {
  const [, navigate] = useLocation();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  useSEO({
    title: "CLAW Platform Guide & Secrets — Everything You Need to Know",
    description: "The complete CLAW platform guide. Ghost Letters, Witness Wall, Mirror Moments, Ringy's secret modes, calling system, Purgatory, GEMZ & SOULZ, social circles, and every hidden secret on the platform.",
    canonical: "/guide",
    keywords: "CLAW guide, CLAW secrets, Ringy modes, ghost letters guide, witness wall how to, mirror moment CLAW, CLAW platform features, CLAW purgatory, CLAW GEMZ SOULZ",
  });

  const filtered = search.trim()
    ? GUIDE_SECTIONS.filter(s =>
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.content.some(c => c.subtitle.toLowerCase().includes(search.toLowerCase()) || c.body.toLowerCase().includes(search.toLowerCase()))
      )
    : GUIDE_SECTIONS;

  const secretsUnlocked = revealed.size;
  const totalSecrets = GUIDE_SECTIONS.filter(s => s.secret).length;

  return (
    <div className="min-h-screen bg-[#060410]" style={{ background: "radial-gradient(ellipse 100% 40% at 50% 0%, rgba(109,40,217,0.1) 0%, #060410 50%)" }}>
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#060410]/95 border-b border-purple-900/25 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/feed")} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.06] text-purple-400 hover:text-purple-300 transition-all">
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-purple-400" />
              <h1 className="text-white font-serif text-base font-semibold">Platform Guide & Secrets</h1>
            </div>
          </div>
          {secretsUnlocked > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] text-indigo-400/70 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-2.5 py-1">
              <Lock className="w-2.5 h-2.5" />
              {secretsUnlocked}/{totalSecrets} unlocked
            </div>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto w-full px-4 py-8 flex flex-col gap-3">
        {/* Intro */}
        <div className="text-center pb-4">
          <p className="text-purple-300/50 text-sm leading-relaxed max-w-lg mx-auto">
            Everything you need to know about CLAW. And a few things you weren't supposed to find.
          </p>
          <p className="text-white/20 text-xs mt-2">Expand any section. Unlock the classified answers. Not all of them are here.</p>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search guide sections..."
            className="w-full bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-2.5 text-sm text-white/70 placeholder-white/20 focus:outline-none focus:border-purple-500/30"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors text-xs">✕</button>
          )}
        </div>

        {/* Sections */}
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-white/25 text-sm">No sections match "{search}"</div>
        ) : (
          filtered.map(section => (
            <SectionCard
              key={section.id}
              section={section}
              expanded={expanded === section.id}
              onToggle={() => setExpanded(prev => prev === section.id ? null : section.id)}
              revealed={revealed.has(section.id)}
              onReveal={() => setRevealed(prev => new Set([...prev, section.id]))}
            />
          ))
        )}

        {/* Footer */}
        <div className="text-center pt-10 pb-4 space-y-2">
          <p className="text-purple-400/25 text-xs">There are things this guide doesn't tell you.</p>
          <p className="text-white/15 text-[11px]">CLAW by Mandie ✦ This guide exists because you looked for it.</p>
        </div>
      </div>
    </div>
  );
}
