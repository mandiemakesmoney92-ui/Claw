import { useState, useEffect, useRef } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useLocation } from "wouter";
import { Sparkles, ChevronLeft, RefreshCw, Share2, Check } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

function ShareButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ text }); return; } catch {}
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={share}
      className="flex items-center gap-2 text-purple-400/70 hover:text-purple-300 border border-purple-700/30 hover:border-purple-500/50 rounded-xl px-4 py-2 text-sm transition-all"
    >
      {copied ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
      {copied ? "Copied!" : "Share My Reading"}
    </button>
  );
}

const TAROT_DECK = [
  { id: "fool",           name: "The Fool",          number: "0",   emoji: "🤡", upright: "New beginnings. Leaping before you look. Either brave or stupid — sometimes both.", reversed: "Naivety that's bleeding you dry. Recklessness wearing a disguise." },
  { id: "magician",       name: "The Magician",       number: "I",   emoji: "🪄", upright: "You have everything you need. Stop pretending otherwise.", reversed: "Manipulation. Using talent for the wrong reasons. Check your motives." },
  { id: "high-priestess", name: "The High Priestess", number: "II",  emoji: "🌙", upright: "Trust your gut. The thing you keep second-guessing? That's the answer.", reversed: "You're ignoring what you know. Silence where there should be clarity." },
  { id: "empress",        name: "The Empress",        number: "III", emoji: "🌸", upright: "Abundance. Creative power. Something is growing whether you're watching or not.", reversed: "Stagnation dressed as rest. Overgiving until you're hollow." },
  { id: "emperor",        name: "The Emperor",        number: "IV",  emoji: "👑", upright: "Structure. Discipline. Building something that lasts.", reversed: "Control without purpose. Authority without wisdom." },
  { id: "hierophant",     name: "The Hierophant",     number: "V",   emoji: "🏛️", upright: "Tradition has something to teach. Listen before you dismantle it.", reversed: "The rules don't fit you. Stop forcing them to." },
  { id: "lovers",         name: "The Lovers",         number: "VI",  emoji: "💞", upright: "A choice that will define you. Not just about love — about values.", reversed: "Misalignment. You're compromising something that shouldn't be compromised." },
  { id: "chariot",        name: "The Chariot",        number: "VII", emoji: "🏎️", upright: "Forward motion. Will over obstacles. You're winning something right now.", reversed: "Scattered energy. Winning the wrong race." },
  { id: "strength",       name: "Strength",           number: "VIII",emoji: "🦁", upright: "Quiet power. The kind that doesn't need to announce itself.", reversed: "Force where patience was needed. Exhaustion from fighting yourself." },
  { id: "hermit",         name: "The Hermit",         number: "IX",  emoji: "🕯️", upright: "Solitude as a teacher. The answers are inside. Go look.", reversed: "Isolation as avoidance. The cave has become a cage." },
  { id: "wheel",          name: "Wheel of Fortune",   number: "X",   emoji: "☸️", upright: "Cycles turning. Luck arriving. Something is shifting beneath your feet.", reversed: "The wheel is stuck. You're resisting the change that's coming anyway." },
  { id: "justice",        name: "Justice",            number: "XI",  emoji: "⚖️", upright: "Truth finds its level. Consequences arriving right on time.", reversed: "Fairness blocked. Either by you or the system. Someone is lying." },
  { id: "hanged-man",     name: "The Hanged Man",     number: "XII", emoji: "🙃", upright: "Surrender to the pause. This is not failure — it's perspective.", reversed: "Martyrdom. Suffering unnecessarily. Let go already." },
  { id: "death",          name: "Death",              number: "XIII",emoji: "💀", upright: "An ending that is also a beginning. Don't mourn what has to go.", reversed: "Refusing to release what's already gone. Decay dressed as loyalty." },
  { id: "temperance",     name: "Temperance",         number: "XIV", emoji: "🕊️", upright: "Balance. Not perfection — balance. There's a difference.", reversed: "Excess. Imbalance. You know which thing you're overdoing." },
  { id: "devil",          name: "The Devil",          number: "XV",  emoji: "😈", upright: "Facing the addiction, obsession, or pattern keeping you trapped.", reversed: "The chains are already loose. You just haven't noticed yet." },
  { id: "tower",          name: "The Tower",          number: "XVI", emoji: "🗼", upright: "Sudden collapse of what was never stable. It was always going to fall.", reversed: "Avoiding the necessary destruction. Clinging to rubble." },
  { id: "star",           name: "The Star",           number: "XVII",emoji: "⭐", upright: "Hope that isn't naive — it's earned. Rest. Heal. You're allowed.", reversed: "Despair disguised as realism. You've stopped believing too soon." },
  { id: "moon",           name: "The Moon",           number: "XVIII",emoji: "🌑", upright: "Illusion, fear, and what hides in the dark. Look at it.", reversed: "Confusion lifting. The fog is clearing whether you're ready or not." },
  { id: "sun",            name: "The Sun",            number: "XIX", emoji: "☀️", upright: "Joy. Clarity. The good thing you've been waiting for? Here it is.", reversed: "Dimmed by doubt. You're standing in your own light." },
  { id: "judgement",      name: "Judgement",          number: "XX",  emoji: "📯", upright: "A reckoning. The call to rise. You know what this is asking.", reversed: "Avoiding the call. The self-assessment you keep postponing." },
  { id: "world",          name: "The World",          number: "XXI", emoji: "🌍", upright: "Completion. Everything aligning. You've arrived at something real.", reversed: "Almost there but holding yourself back at the finish line." },
  { id: "ace-wands",      name: "Ace of Wands",       number: "Ace", emoji: "🔥", upright: "A spark. Raw inspiration. Do something with this energy before it dies.", reversed: "Potential wasted. The idea is sitting there rotting." },
  { id: "ace-cups",       name: "Ace of Cups",        number: "Ace", emoji: "🏆", upright: "Emotional abundance. New love or deepened feeling. Something opening.", reversed: "Emotional repression. The cup exists but won't be filled." },
  { id: "ace-swords",     name: "Ace of Swords",      number: "Ace", emoji: "⚔️", upright: "Clarity like a blade. The truth arriving sharp and clean.", reversed: "Mental fog. Confusion weaponized. The truth is getting tangled." },
  { id: "ace-pentacles",  name: "Ace of Pentacles",   number: "Ace", emoji: "🪙", upright: "A new material beginning. Money, stability, something concrete forming.", reversed: "Missed opportunity. The foundation wasn't laid properly." },
  { id: "five-cups",      name: "Five of Cups",       number: "5",   emoji: "😢", upright: "Grief for what was lost. But two cups remain standing behind you.", reversed: "Finally releasing the grief. Moving toward what remains." },
  { id: "three-swords",   name: "Three of Swords",    number: "3",   emoji: "💔", upright: "Heartbreak. Truth that cuts. The pain is real, and so is the release.", reversed: "Holding onto old pain past its expiration date." },
  { id: "ten-pentacles",  name: "Ten of Pentacles",   number: "10",  emoji: "🏠", upright: "Legacy. Long-term security. Building something worth inheriting.", reversed: "Empty achievement. Rich in things, poor in meaning." },
  { id: "page-wands",     name: "Page of Wands",      number: "Page",emoji: "✨", upright: "Curiosity and enthusiasm with nowhere to settle yet. That's okay.", reversed: "All energy, no direction. Inspiration without follow-through." },
  { id: "queen-cups",     name: "Queen of Cups",      number: "Q",   emoji: "💧", upright: "Deep emotional intelligence. You feel everything — use it wisely.", reversed: "Drowning in feeling. Taking on others' emotions until yours disappear." },
  { id: "king-swords",    name: "King of Swords",     number: "K",   emoji: "🧊", upright: "Razor-sharp logic. Authority through truth. Cold, but fair.", reversed: "Intellectual cruelty. Using intelligence as a weapon." },
  { id: "seven-cups",     name: "Seven of Cups",      number: "7",   emoji: "💭", upright: "Too many choices, too many fantasies. Pick one and commit.", reversed: "Wishful thinking dissolving. Reality returning — ready or not." },
  { id: "eight-wands",    name: "Eight of Wands",     number: "8",   emoji: "🚀", upright: "Swift movement. Things accelerating. Events happening faster than expected.", reversed: "Delays. Miscommunication. Everything in the air but nothing landing." },
];

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function TarotPage() {
  useSEO({
    title: "Daily Tarot — One Card a Day, Ringy's Interpretation | CLAW",
    description: "Pull one tarot card per day on CLAW. The full 78-card deck with Ringy's unfiltered, pointed interpretations. Some readings are unsettlingly accurate. That's by design.",
    canonical: "/tarot",
    keywords: "daily tarot, tarot card reading, CLAW tarot, Ringy tarot, one card tarot, free daily tarot",
  });
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [card, setCard] = useState<typeof TAROT_DECK[0] | null>(null);
  const [position, setPosition] = useState<"upright" | "reversed">("upright");
  const [isRevealing, setIsRevealing] = useState(false);
  const [alreadyPulled, setAlreadyPulled] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const key = `tarot_${user?.id || "guest"}_${getTodayKey()}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      const parsed = JSON.parse(saved);
      const found = TAROT_DECK.find(c => c.id === parsed.cardId);
      if (found) { setCard(found); setPosition(parsed.position); setAlreadyPulled(true); }
    }
  }, [user]);

  const pullCard = () => {
    if (isRevealing) return;
    setIsRevealing(true);
    const random = TAROT_DECK[Math.floor(Math.random() * TAROT_DECK.length)];
    const pos: "upright" | "reversed" = Math.random() < 0.35 ? "reversed" : "upright";
    setTimeout(() => {
      setCard(random);
      setPosition(pos);
      setIsRevealing(false);
      setAlreadyPulled(true);
      const key = `tarot_${user?.id || "guest"}_${getTodayKey()}`;
      localStorage.setItem(key, JSON.stringify({ cardId: random.id, position: pos }));
    }, 1200);
  };

  const reading = card ? (position === "upright" ? card.upright : card.reversed) : null;

  return (
    <div className="min-h-screen bg-[#060410] flex flex-col" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(60,0,120,0.4) 0%, #060410 60%)" }}>
      <div className="sticky top-0 z-10 bg-[#060410]/95 border-b border-purple-900/30 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/feed")} className="text-purple-400 hover:text-purple-300 transition-colors">
            <ChevronLeft size={22} />
          </button>
          <Sparkles size={16} className="text-purple-400" />
          <h1 className="text-white font-serif text-lg font-semibold">Daily Tarot</h1>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start py-12 px-4 max-w-2xl mx-auto w-full gap-8">
        <div className="text-center">
          <p className="text-purple-300/70 text-sm tracking-widest uppercase mb-2">Your reading for today</p>
          <p className="text-white/40 text-xs">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
        </div>

        {!card && !isRevealing && (
          <div className="flex flex-col items-center gap-6">
            <div
              onClick={pullCard}
              className="w-44 h-72 rounded-2xl border-2 border-purple-600/40 bg-gradient-to-b from-purple-950/60 to-violet-900/20 flex flex-col items-center justify-center cursor-pointer transition-all hover:border-purple-500/70 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-900/40 select-none"
              style={{ backdropFilter: "blur(8px)" }}
            >
              <div className="text-5xl mb-4" style={{ filter: "blur(0px)", animation: "none" }}>🂠</div>
              <p className="text-purple-400/60 text-xs text-center px-4 tracking-wider uppercase">Tap to pull your card</p>
            </div>
            <p className="text-white/30 text-xs text-center max-w-xs">
              One pull per day. The cards don't negotiate.
            </p>
          </div>
        )}

        {isRevealing && (
          <div className="flex flex-col items-center gap-6">
            <div
              className="w-44 h-72 rounded-2xl border-2 border-purple-500/60 bg-gradient-to-b from-purple-900/60 to-violet-800/30 flex items-center justify-center"
              style={{ animation: "tarotReveal 1.2s ease-in-out forwards" }}
            >
              <div className="text-6xl" style={{ animation: "tarotSpin 1.2s ease-in-out" }}>✨</div>
            </div>
            <p className="text-purple-300/60 text-sm tracking-wider animate-pulse">The cards are speaking…</p>
          </div>
        )}

        {card && !isRevealing && (
          <div className="flex flex-col items-center gap-6 w-full">
            <div
              ref={cardRef}
              className="w-44 h-72 rounded-2xl border-2 border-purple-500/70 flex flex-col items-center justify-center gap-4 shadow-2xl shadow-purple-900/50 select-none"
              style={{
                background: "linear-gradient(145deg, #1a0a2e 0%, #0a0a1a 60%, #200832 100%)",
                animation: "tarotAppear 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
                transform: position === "reversed" ? "rotate(180deg)" : "none",
              }}
            >
              <span className="text-purple-400/50 text-xs tracking-widest uppercase font-mono" style={{ transform: position === "reversed" ? "rotate(180deg)" : "none" }}>{card.number}</span>
              <div className="text-6xl">{card.emoji}</div>
              <p className="text-white font-serif text-sm text-center px-3" style={{ transform: position === "reversed" ? "rotate(180deg)" : "none" }}>{card.name}</p>
              {position === "reversed" && (
                <span className="text-red-400/70 text-[10px] tracking-widest uppercase" style={{ transform: "rotate(180deg)" }}>Reversed</span>
              )}
            </div>

            <div className="text-center">
              <h2 className="text-2xl font-serif text-white mb-1">{card.name}</h2>
              <span className={`text-xs tracking-wider uppercase ${position === "reversed" ? "text-red-400/70" : "text-emerald-400/70"}`}>
                {position === "reversed" ? "Reversed" : "Upright"}
              </span>
            </div>

            <div className="w-full max-w-md bg-white/5 border border-purple-900/30 rounded-2xl p-6">
              <p className="text-white/90 text-base leading-relaxed font-serif text-center italic">"{reading}"</p>
            </div>

            <ShareButton text={`🃏 My CLAW Daily Tarot: ${card.name} ${position === "reversed" ? "(Reversed)" : ""}\n"${reading}"\n\nmystic.claw.app`} />

            {alreadyPulled && (
              <div className="flex items-center gap-2 text-purple-400/40 text-xs">
                <RefreshCw size={12} />
                <span>You've already pulled today. Come back tomorrow.</span>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes tarotReveal {
          0% { opacity: 1; transform: scaleY(1); }
          50% { opacity: 0.5; transform: scaleY(0); }
          100% { opacity: 1; transform: scaleY(1); }
        }
        @keyframes tarotSpin {
          0% { transform: rotate(0deg) scale(0.5); opacity: 0; }
          50% { transform: rotate(180deg) scale(1.2); opacity: 1; }
          100% { transform: rotate(360deg) scale(1); opacity: 1; }
        }
        @keyframes tarotAppear {
          0%   { opacity: 0; transform: translateY(20px) scale(0.9) rotate(${position === "reversed" ? "185deg" : "5deg"}); }
          100% { opacity: 1; transform: translateY(0) scale(1) rotate(${position === "reversed" ? "180deg" : "0deg"}); }
        }
      `}</style>
    </div>
  );
}
