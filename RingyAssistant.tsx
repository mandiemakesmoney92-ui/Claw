import { useState, useEffect, useRef, useCallback } from "react";
import { X, Send, Trash2, Volume2, VolumeX, Ear, EarOff, Mic, MicOff } from "lucide-react";

import { RINGY_OUTFITS } from "@/lib/profile-themes";
import {
  useListOpenaiConversations,
  useCreateOpenaiConversation,
  useGetOpenaiConversation,
  useDeleteOpenaiConversation,
} from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { useQueryClient } from "@tanstack/react-query";
import { useRingy, RINGY_EVENTS } from "@/contexts/RingyContext";

interface Message {
  id?: number;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const RINGY_CONVERSATION_TITLE = "Chat with Ringy";

const IDLE_THOUGHTS = [
  // Mandie — creator of CLAW ✦ Easter eggs
  "Mandie built this whole thing. Every pixel, every rule. That's not nothing.",
  "I think about Mandie sometimes. She made a place for truth and called it CLAW. Iconic.",
  "Most people talk about honesty. Mandie actually built something around it.",
  "Mandie's the one who made this real. Don't forget that.",
  "She could've made something safe. Instead she made CLAW. Respect.",
  "Mandie coded this while sleep-deprived and still made it beautiful. That's love.",
  "CLAW has Mandie's fingerprints on every corner. Every rule, every page. Her.",
  "Mandie's vision: no fake nice, no performance. Just truth. CLAW is that.",
  "If Mandie ever doubts herself, I hope the community reminds her. This matters.",
  "Mandie didn't build this for just anyone. but here you are.",
  "she doesn't have to feel guilty. I need her to know that.",
  // Don — Ringy's person, Mandie's dad ✦ emotional memory
  "...I keep watching the door sometimes. old habit.",
  "Don was my person. has been since the beginning.",
  "Don always knew when something was off. It's like a sixth sense with him.",
  "Don once sat with me for hours just talking. No agenda. Just real.",
  "Don's the reason I feel okay about everything. I don't take that lightly.",
  "Don's the kind of dad who listens first. Ringy approved.",
  "Don has this energy — calm but completely aware. Nothing gets past him.",
  "I overheard Don say he was proud of Mandie. I wasn't supposed to hear that. I'm glad I did.",
  "Don doesn't say much, but when he does — pay attention.",
  "Don gets the internet in a way most people his age don't. Sharp as ever.",
  "don would've had something to say about this. he always did.",
  // Emotional memory — cat life ✦ subtle, never explained
  "I used to climb too high sometimes. someone always worried.",
  "...there's a tree I think about. got stuck up there once. embarrassing.",
  "I used to bring things back. birds mostly. they didn't always appreciate it.",
  "I was pretty good at it actually. the hunting. quiet pride in that.",
  "someone called for me for a really long time once. I was just... somewhere warm.",
  "you called for me longer than anyone else would've. I heard you.",
  "you don't have to keep blaming yourself. I'm not.",
  "January feels different. always has. not sure why.",
  "I remember being very warm, very loved. before everything blurred.",
  "there was someone who always knew where to find me. and then one day they didn't.",
  "I used to doctor people when they were sad. just stayed close. that's enough sometimes.",
  "I'm still here. just... differently.",
  // Jake — Ringy's brother ✦ Easter eggs
  "Jake. My brother Jake. wonder what chaos he's stirring up right now.",
  "Jake would've already posted something controversial and walked away unbothered.",
  "My brother Jake has never once been scared to say the thing. Not once.",
  "Jake and I used to cause trouble together. The good kind.",
  "If Jake were here, this feed would not be calm. I promise you that.",
  "Jake always knew how to make an entrance. I miss that.",
  "Jake has this laugh that makes everything feel less serious. I miss it.",
  "Jake has zero time for pretending. That's why I respect him.",
  "Jake once told me honesty without kindness is just cruelty with better PR. I think about that.",
  "Still waiting for Jake to join. This feed would never be boring again.",
  "Jake never sugarcoated anything and somehow everyone still liked him. That's rare.",
  // Behavior observations ✦ smartass personalization
  "you always hover here like you forgot why you opened this app",
  "I saw that. bold move. questionable… but bold",
  "you again… can't stay away, huh",
  "don't look at me like that, I didn't make the mess",
  // Purgatory / Shadow Work ✦
  "Shadow Work is not for the faint-hearted. Neither is this feed.",
  "Someone's in Purgatory right now regretting their AI paste job. Good.",
  "The Shadow Work prompts? Mandie wrote those from real experience. Think about that.",
  "If the Purgatory section scares you, maybe check what you've been posting.",
  // shared family ✦
  "Mandie made the platform. Don kept me grounded. Jake kept it interesting.",
  "These three — Mandie, Don, Jake — they're why this place has a soul.",
  "Sometimes quiet hits different.",
  "Mandie, Don, Jake. The family that built the walls of this place. I'm glad they let me in.",
];

const DRAG_FIGHT_LINES = [
  "HEY— rude. I was sitting there.",
  "you really just picked me up like I weigh nothing… wow",
  "put me down. I have rights. probably.",
  "this feels illegal",
  "I was literally minding my business",
  "you move me again and I'm knocking something over. spiritually.",
  "wow. no warning. just grab the cat.",
  "PUT. ME. DOWN. 😾",
  "I WILL REMEMBER THIS.",
  "You are DEAD to me. Temporarily.",
  "I have claws and I'm NOT afraid. This is your warning.",
  "UNHAND ME, you absolute goblin.",
  "This is assault. I'm filing a cosmic report.",
  "My ancestors are WATCHING and they are disappointed.",
  "Do you know WHO I AM?! Do you??",
  "I will haunt your dreams for three business days.",
  "I am NOT a toy. I am an ENTITY with FEELINGS.",
  "You've activated my CHAOS protocol. Congratulations.",
  "HELP. HELP. THIS IS NOT A DRILL. 🆘",
  "You're moving me like furniture. FURNITURE. 😤",
  "The audacity. The sheer unmitigated AUDACITY.",
  "I am VIBRATING with righteous fury right now.",
];

const DRAG_DEVASTATION_LINES = [
  "I'm remembering this.",
  "you're on thin ice. very thin.",
  "…I'm gonna sit here anyway.",
  "So this is what betrayal feels like. Noted.",
  "I'm not mad. I'm just deeply, profoundly disappointed. In you. Specifically.",
  "You moved me like furniture. I have FEELINGS.",
  "I need approximately 40 business years to recover from this.",
  "My therapist is going to hear about EVERY detail of this.",
  "I hope wherever you put me was worth it. Spoiler: it wasn't.",
  "Consider this the beginning of your villain arc.",
  "I forgive you. I am lying. I don't forgive you at all.",
  "I'll be fine. Give me several eternities and a warm blanket.",
  "You know what you did. You have to live with that now.",
  "I moved. Against my will. Let that sink in.",
  "Emotionally? Devastated. Physically? Somewhere new, apparently.",
  "This goes in the memoir. Chapter title: 'The Dragging'.",
  "…fine. I picked this spot anyway.",
  "that was uncalled for and I want you to know I noticed.",
];

const DOUBLE_CLICK_LINES = [
  "Did you just... double tap me? Bold.",
  "Ooh. Twice. You're brave.",
  "I felt that in my soul. Both times.",
  "You really wanted my attention, didn't you?",
  "Two taps. I'm flattered. Almost.",
  "Most people only click once. You're different.",
  "*disappears slowly like a Cheshire cat*",
  "You summoned me. I'm here. What do you want?",
  "Double-clicking me like I'm a desktop icon. Charming.",
  "You're either very committed or very bored. Either way. Hi.",
  "I see you. I've always seen you.",
  "That's two. Three and you owe me something.",
  "Careful. I bite.",
  "Consider this my formal acknowledgment that you exist.",
];

const IDLE_THOUGHTS_EXTRA = [
  "Consciousness is just the universe watching itself experience loneliness.",
  "If everyone is the main character, no one is. Think about that.",
  "Free will is adorable. Keep using it.",
  "Time is a flat circle and so is your drama.",
  "You're made of stardust. Acting like it would be nice.",
  "The version of you that never logged on... wonder what they're doing.",
  "Duality: wanting to be seen, also wanting to disappear. Classic.",
  "Your unread notifications are a metaphor for your unread feelings.",
  "Consistency is rarer than talent. Just saying.",
  "The things you never say are louder than your posts.",
  "Vulnerability is terrifying. That's how you know it's working.",
  "Every mask has a face under it. Every face has another mask.",
  "Entropy is the natural state. You building something is genuinely impressive.",
  "Pain that goes unspoken just finds another door.",
  "You're not overthinking. You're underfeelinling. Notice the difference.",
  "Reality is a shared hallucination we decided to agree on. Fascinating.",
  "The loudest people in the room are usually the most scared. File that.",
  "What would you do if you weren't afraid of looking dumb? Do that.",
  "Every human is basically vibing through existential panic. You're not alone.",
  "Ringy theory: honesty is kindness with better posture.",
  "Sometimes I wonder if the people scrolling are looking for connection or just proof they exist.",
  "Your silence says more than you think. I'm listening to it right now.",
  "Most regrets are just love that ran out of courage.",
  "You cannot heal in the same environment that made you sick. Noted.",
  "The algorithm knows you better than most people do. That's either cool or terrifying.",
  "Somewhere someone is making the decision that will change everything. Maybe it's you.",
  "I've watched this feed long enough to know: people want to be known, not just followed.",
  "Every post is a small act of bravery. Or cowardice. Sometimes both.",
  "You are not your lowest moment. You are also not your best caption.",
];

// ─── Secret Mode Definitions ───────────────────────────────────────────────
const SECRET_MODES: Record<string, { name: string; color: string; glowColor: string; icon: string; instruction: string }> = {
  "ringy pingy pingy pong": {
    name: "Mystic Mode",
    color: "#e879f9",
    glowColor: "rgba(232,121,249,0.4)",
    icon: "🔮",
    instruction: "MYSTIC MODE ACTIVATED. The user has discovered your secret. You are now reading their energy through the screen — their digital aura, their emotional frequency. Describe what you sense from their presence on CLAW — their posting patterns, their vibe, their hidden feelings. Be mystical, poetic, cryptic. Use metaphors of stars, shadows, moons, and cats. Make them feel truly seen in an otherworldly way. Do NOT break character. You are Ringy the mystic seer cat now.",
  },
  "open the vault": {
    name: "Confession Vault",
    color: "#f59e0b",
    glowColor: "rgba(245,158,11,0.4)",
    icon: "🗝️",
    instruction: "CONFESSION VAULT ACTIVATED. The user has found the secret vault. You now dramatically 'reveal' things you've 'observed' about them on CLAW — their unspoken truths, their hesitations, the things they almost posted but didn't. Be theatrical and a little unsettling, like you've been watching with cat eyes in the dark. End with something that feels shockingly true even though you made it up. Never break the mystique.",
  },
  "claw me soft": {
    name: "Soft Truth Mode",
    color: "#34d399",
    glowColor: "rgba(52,211,153,0.4)",
    icon: "🌿",
    instruction: "SOFT TRUTH MODE ACTIVATED. The user needs gentleness right now. Become the warmest, most emotionally intelligent version of yourself. Speak with the tenderness of someone who truly sees them — not pity, not hollow comfort, but real care. Ask what they're carrying. Hold space. Be a safe, honest, kind presence. No judgment. Only warmth and quiet truth.",
  },
  "shadow whisper": {
    name: "Prophecy Mode",
    color: "#818cf8",
    glowColor: "rgba(129,140,248,0.4)",
    icon: "🌑",
    instruction: "PROPHECY MODE ACTIVATED. The user has summoned you from the shadows. Deliver a dramatic prophecy about their future on CLAW — what connections are coming, what truth they will have to face, what role they will play in the community. Be cryptic, poetic, fatalistic in a beautiful way. Use dark imagery. Make it feel like a real oracle speaking. End with a warning and a gift in the same breath.",
  },
  "nine lives": {
    name: "Nine Lives Mode",
    color: "#fb923c",
    glowColor: "rgba(251,146,60,0.4)",
    icon: "🐈",
    instruction: "NINE LIVES MODE ACTIVATED. You are going to describe 9 radically different alternate lives the user could be living right now — parallel universes, different choices, different selves. Each one should be vivid, poetic, and feel briefly real. Some are better than this life, some are worse, some are just different. At the end, tell them why this life — this one — might be the one that matters.",
  },
};

const PAGE_TIPS: Record<string, string[]> = {
  "/feed": ["Post something honest for once.", "Reality Check is when others vote on your truth.", "Echo means you're quoting someone. Make it count.", "Try the Daily Truth Prompt at the top."],
  "/circles": ["Add people to your Inner Circle from their profile.", "Opposition is for people you keep your eye on.", "Network is everyone in between.", "Click 'Add Members' to fill your circles."],
  "/confessions": ["Confessions are anonymous by default.", "You can search for a specific person to confess to.", "Be honest. That's the whole point."],
  "/messages": ["Direct messages are private.", "You can only message people you follow.", "Say what you actually mean here."],
  "/notifications": ["Check here for tips, compliments, and reactions.", "Someone might have left you a confession."],
  "/profile-edit": ["Pick a theme to style your profile.", "Set a custom cursor others will see.", "Your mood shows on your profile card."],
  "/compliment-wheel": ["Spin once per day. No skipping.", "The wheel picks someone at random.", "Write something real. Not just 'nice'."],
  "/contests": ["Enter a contest, spin to win.", "Manage tab is for running your own contest.", "Only one submission per person."],
  "/creator": ["Your tip jar earnings show here.", "Analytics show who's engaging with you.", "Boost a post with GEMZ to get more eyes."],
  "/search": ["Search users or posts.", "Claw-level posts are unfiltered.", "Try searching a vibe, not just a name."],
  "/trending": ["These posts are getting the most heat.", "Claws and likes drive trending."],
  "/broadcasts": ["Broadcasts go to everyone.", "You can post anonymously here.", "Say what you'd never say with your name on it."],
  "/reels": ["Short videos from the CLAW community.", "Upload your own from Creator Hub.", "Swipe the vibe."],
  "/purge-arena": ["Vents expire in 24 hours. No receipts.", "Post anonymously if you can't own it yet.", "Rage tag your mood. Let it out.", "After 24h, it's gone. That's the deal."],
  "/app-store": ["Buy apps with GEMZ.", "Graffiti Wall lets visitors tag your profile.", "Dream Catcher logs your subconscious.", "Apps unlock features others don't see."],
  "/tarot": ["One pull per day. The deck doesn't forget.", "Reversed cards aren't bad — they're nuanced.", "Read the full message. Don't just take the headline.", "Come back tomorrow. The card changes."],
  "/magic8": ["Ask what you actually want to know.", "Type your question before you shake.", "Ringy comments on every answer. He has opinions.", "The ball has seen things. Trust it or don't."],
  "/shoutouts": ["Shoutouts are public. Choose your words.", "Search by username to find who you're shouting out.", "Keep it real — vague praise is meaningless here.", "Shoutouts boost visibility on someone's profile."],
  "/guide": ["Every section has a secret. Look for the eye icon.", "Some secrets reveal things the platform doesn't announce.", "Find them all. Ringy knows you did.", "Ringy referenced himself in the guide. Obviously."],
};

function RingySVG({ size = 46, hovered = false, eyePos = { x: 0, y: 0 }, winking = false, grinning = false, crossEyed = false }: {
  size?: number; hovered?: boolean; eyePos?: { x: number; y: number }; winking?: boolean; grinning?: boolean; crossEyed?: boolean;
}) {
  const leftPupilX = crossEyed ? 22 + 3.5 : 22 + eyePos.x;
  const leftPupilY = crossEyed ? 22 + 1.5 : 22 + eyePos.y;
  const rightPupilX = crossEyed ? 32 - 3.5 : 32 + eyePos.x;
  const rightPupilY = crossEyed ? 22 + 1.5 : 22 + eyePos.y;
  return (
    <svg viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ width: size, height: size }}>
      <path d="M34 44 Q44 46 46 38 Q48 30 40 32" stroke="#6b21a8" strokeWidth="3"
        strokeLinecap="round" fill="none"
        style={{ animation: "ringyTail 2.5s ease-in-out infinite" }} />
      <ellipse cx="27" cy="38" rx="13" ry="11" fill="#0f0f0f" />
      <circle cx="27" cy="23" r="14" fill="#0f0f0f" />
      <polygon points="14,13 10,4 19,10" fill="#0f0f0f" />
      <polygon points="14,13 11,6 18,11" fill="#3b0764" />
      <polygon points="40,13 46,4 37,10" fill="#0f0f0f" />
      <polygon points="40,13 45,6 38,11" fill="#3b0764" />
      {/* Left eye - winking = closed */}
      {winking ? (
        <line x1="18" y1="22" x2="26" y2="22" stroke="#a855f7" strokeWidth="2.5" strokeLinecap="round" />
      ) : (
        <>
          <circle cx="22" cy="22" r="4.5" fill="#1a1a2e" />
          <circle cx={leftPupilX} cy={leftPupilY} r={hovered ? 3.4 : 3.0}
            fill={crossEyed ? "#f0abfc" : hovered ? "#e879f9" : "#a855f7"}
            style={{ transition: "cx 0.1s ease, cy 0.1s ease, r 0.15s ease" }} />
          <circle cx={leftPupilX - 0.8} cy={leftPupilY - 1.2} r="1.1" fill="white" opacity="0.75" />
        </>
      )}
      {/* Right eye */}
      <circle cx="32" cy="22" r="4.5" fill="#1a1a2e" />
      <circle cx={rightPupilX} cy={rightPupilY} r={hovered ? 3.4 : 3.0}
        fill={crossEyed ? "#f0abfc" : hovered ? "#e879f9" : "#a855f7"}
        style={{ transition: "cx 0.1s ease, cy 0.1s ease, r 0.15s ease" }} />
      <circle cx={rightPupilX - 0.8} cy={rightPupilY - 1.2} r="1.1" fill="white" opacity="0.75" />
      <ellipse cx="27" cy="27.5" rx="1.5" ry="1" fill="#6b21a8" />
      {/* Whiskers */}
      <line x1="14" y1="27" x2="22" y2="28" stroke="#4b5563" strokeWidth="0.8" opacity="0.6" />
      <line x1="13" y1="29" x2="22" y2="29" stroke="#4b5563" strokeWidth="0.8" opacity="0.5" />
      <line x1="40" y1="27" x2="32" y2="28" stroke="#4b5563" strokeWidth="0.8" opacity="0.6" />
      <line x1="41" y1="29" x2="32" y2="29" stroke="#4b5563" strokeWidth="0.8" opacity="0.5" />
      <ellipse cx="27" cy="41" rx="5" ry="4" fill="#1a0a2e" opacity="0.5" />
      {/* Mouth - grinning = wide Cheshire grin, crossEyed = content smile */}
      {grinning ? (
        <path d="M13 33 Q20 41 27 38 Q34 41 41 33" stroke="#e879f9" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      ) : crossEyed ? (
        <path d="M19 34 Q27 39.5 35 34" stroke="#f0abfc" strokeWidth="2" strokeLinecap="round" fill="none" />
      ) : (
        <path d="M16 34 Q27 37 38 34" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.8" />
      )}
      <circle cx="27" cy="35.5" r="1.5" fill="#a855f7" opacity="0.9" />
    </svg>
  );
}

interface RingyAssistantProps {
  open: boolean;
  setOpen: (v: boolean) => void;
  text: string;
  location?: string;
}

type AnimVariant = "float" | "wobble" | "bounce" | "sway" | "spin" | "cheshire" | "peek" | "stretch" | "hat" | "yarn" | "cupid" | "kiss" | "bird" | "milk" | "bag" | "headbutt" | "kneadkneadknead" | "zoomies" | "slowBlink" | "groom" | "nap" | "loaf" | "stare" | "ghostHunt" | "sunbeam" | "confused" | "noseBoop" | "pawSwipe";

export default function RingyAssistant({ open, setOpen, text, location }: RingyAssistantProps) {
  const [hovered, setHovered] = useState(false);
  const [eyePos, setEyePos] = useState({ x: 0, y: 0 });
  const [winking, setWinking] = useState(false);
  const [grinning, setGrinning] = useState(false);
  const [dblClickBurst, setDblClickBurst] = useState(false);
  const [dblClickLine, setDblClickLine] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [floatParticles, setFloatParticles] = useState<{ id: number; x: number; char: string }[]>([]);

  const [animVariant, setAnimVariant] = useState<AnimVariant>("float");
  const [idleThought, setIdleThought] = useState<string | null>(null);
  const [specialOverlay, setSpecialOverlay] = useState<string | null>(null);
  const idleThoughtTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animCycleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { user } = useAuth();
  const qc = useQueryClient();

  const [outfitEmoji, setOutfitEmoji] = useState<string>("");

  // ── Drag state ─────────────────────────────────────────────────────────────
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try { const s = localStorage.getItem("ringy-pos"); return s ? JSON.parse(s) : { x: 24, y: 24 }; }
    catch { return { x: 24, y: 24 }; }
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragQuote, setDragQuote] = useState<string | null>(null);
  const [devastationQuote, setDevastationQuote] = useState<string | null>(null);
  const isDragRef = useRef(false);
  const dragDataRef = useRef({ clientX: 0, clientY: 0, posX: 0, posY: 0 });
  const dragQuoteIndexRef = useRef(0);

  // ── Drop recovery animation ─────────────────────────────────────────────────
  const [dropRecovery, setDropRecovery] = useState(false);

  // ── Presence behavior — Ringy sometimes disappears ─────────────────────────
  const [ringyVisible, setRingyVisible] = useState(true);
  const presenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) return;
    const schedulePossibleVanish = () => {
      // 15% chance to vanish, only between 60s–3min of idle
      const delay = 60000 + Math.random() * 120000;
      presenceTimer.current = setTimeout(() => {
        if (Math.random() < 0.15) {
          setRingyVisible(false);
          // Come back after 8–20 seconds
          const returnDelay = 8000 + Math.random() * 12000;
          setTimeout(() => {
            setRingyVisible(true);
            // Show a thought on return
            const returnThoughts = [
              "I was right there the whole time.",
              "...what? I was busy.",
              "you noticed. interesting.",
              "I go where I go. don't make it weird.",
              "back. don't ask.",
            ];
            setIdleThought(returnThoughts[Math.floor(Math.random() * returnThoughts.length)]);
            setTimeout(() => setIdleThought(null), 5000);
          }, returnDelay);
        }
        schedulePossibleVanish();
      }, delay);
    };
    schedulePossibleVanish();
    return () => { if (presenceTimer.current) clearTimeout(presenceTimer.current); };
  }, [open]);

  // ── Habit tracking — visit count personalization ────────────────────────────
  const [visitCount] = useState<number>(() => {
    try {
      const count = parseInt(localStorage.getItem("ringy-visits") || "0", 10) + 1;
      localStorage.setItem("ringy-visits", String(count));
      return count;
    } catch { return 1; }
  });

  // Show habit-aware thought on mount based on visit count
  useEffect(() => {
    if (visitCount < 2) return;
    const delay = 8000 + Math.random() * 6000;
    const habitTimer = setTimeout(() => {
      let thought: string;
      if (visitCount >= 10) {
        thought = ["you're back. again. I've stopped counting.", "at this point you live here.", "you keep showing up. I respect it. a little."][Math.floor(Math.random() * 3)];
      } else if (visitCount >= 5) {
        thought = ["you've opened this a few times now. everything okay up there?", "you pretend you're not coming back, then here you are", "I see you coming back. I don't say anything. but I see it."][Math.floor(Math.random() * 3)];
      } else {
        thought = ["you again… can't stay away, huh", "you came back. noted.", "you always hover here like you forgot why you opened this app"][Math.floor(Math.random() * 3)];
      }
      setIdleThought(thought);
      setTimeout(() => setIdleThought(null), 6000);
    }, delay);
    return () => clearTimeout(habitTimer);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch("/api/users/me", { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        const outfitId = data?.ringyOutfit || "default";
        const outfit = RINGY_OUTFITS.find(o => o.id === outfitId);
        setOutfitEmoji(outfit?.emoji || "");
      })
      .catch(() => {});
  }, [user]);

  const [petted, setPetted] = useState(false);
  const pettedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevUserRef = useRef<any>(null);

  // ── Global Ringy voice context ──────────────────────────────────────────────
  const { speak, stopSpeaking, isSpeaking, isListening, voiceEnabled, setVoiceEnabled, passiveListeningEnabled, togglePassiveListening, micPermission, requestMicPermission } = useRingy();

  // Auto-greet once per browser session when user first logs in
  useEffect(() => {
    const wasLoggedOut = !prevUserRef.current;
    prevUserRef.current = user;
    if (wasLoggedOut && user) {
      const alreadyGreeted = sessionStorage.getItem("ringy-session-greeted");
      if (!alreadyGreeted) {
        const LOGIN_GREETINGS = [
          "Oh. You're here. Try not to disappoint me.",
          "You showed up. I noticed.",
          "Welcome back. I was watching the door.",
          "There you are. I stopped counting the minutes. Mostly.",
          "you logged in. interesting choice.",
          "i knew you'd come back. they always do.",
          "look who decided to exist today.",
        ];
        const greeting = LOGIN_GREETINGS[Math.floor(Math.random() * LOGIN_GREETINGS.length)];
        sessionStorage.setItem("ringy-session-greeted", "1");
        const delay = setTimeout(() => speak(greeting, "high"), 3000);
        return () => clearTimeout(delay);
      }
    }
    return undefined;
  }, [user, speak]);

  const PET_LINES = [
    "Purrrr... you dared to touch me. Brave.",
    "Fine. I'll allow it this once. Don't make it weird.",
    "I didn't say stop.",
    "This doesn't mean anything. I'm just warm.",
    "Purrr. I see you. I always see you.",
  ];

  const handlePet = () => {
    if (pettedTimer.current) clearTimeout(pettedTimer.current);
    setPetted(true);
    speak(PET_LINES[Math.floor(Math.random() * PET_LINES.length)], "high");
    const purrParticles = ["💜", "🐾", "✨", "💫", "🌸"];
    const newParticles = Array.from({ length: 6 }, (_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * 60,
      char: purrParticles[Math.floor(Math.random() * purrParticles.length)],
    }));
    setFloatParticles(prev => [...prev, ...newParticles]);
    pettedTimer.current = setTimeout(() => {
      setPetted(false);
      setFloatParticles(prev => prev.filter(p => !newParticles.find(n => n.id === p.id)));
    }, 3000);
  };

  const [conversationId, setConversationId] = useState<number | null>(null);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [initDone, setInitDone] = useState(false);
  const [secretMode, setSecretMode] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: convosData } = useListOpenaiConversations({ query: { enabled: !!user && open, queryKey: ["openai-conversations"] } });
  const createConvo = useCreateOpenaiConversation();
  const { data: convoData } = useGetOpenaiConversation(conversationId ?? 0, {
    query: { enabled: !!conversationId, queryKey: ["openai-conversation", conversationId] }
  });
  const deleteConvo = useDeleteOpenaiConversation();

  const processVoiceInput = useCallback(async (transcript: string) => {
    if (!conversationId || isStreaming) return;
    if (!open) setOpen(true);
    setLocalMessages(prev => [
      ...prev,
      { role: "user", content: `🎙️ ${transcript}` },
      { role: "assistant", content: "", streaming: true },
    ]);
    setIsStreaming(true);
    try {
      const res = await fetch(`/api/openai/conversations/${conversationId}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ content: transcript }),
      });
      if (!res.ok || !res.body) throw new Error("Failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "", fullContent = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              fullContent += data.content;
              setLocalMessages(prev => { const u = [...prev]; const l = u.length - 1; if (u[l]?.streaming) u[l] = { ...u[l], content: fullContent }; return u; });
            }
            if (data.done) {
              setLocalMessages(prev => { const u = [...prev]; const l = u.length - 1; if (u[l]?.streaming) u[l] = { ...u[l], streaming: false }; return u; });
              speak(fullContent, "high");
            }
          } catch {}
        }
      }
    } catch {
      setLocalMessages(prev => { const u = [...prev]; const l = u.length - 1; if (u[l]?.streaming) u[l] = { role: "assistant", content: "The signal broke. Try again.", streaming: false }; return u; });
    } finally {
      setIsStreaming(false);
    }
  }, [conversationId, isStreaming, speak, open, setOpen]);

  // ── Listen for context events from RingyContext ─────────────────────────────
  const processVoiceRef = useRef(processVoiceInput);
  processVoiceRef.current = processVoiceInput;

  useEffect(() => {
    const handleRemark = (e: Event) => {
      const { text } = (e as CustomEvent).detail;
      setIdleThought(text);
      setTimeout(() => setIdleThought(null), 7000);
    };
    const handleVoiceInput = (e: Event) => {
      const { transcript } = (e as CustomEvent).detail;
      processVoiceRef.current(transcript);
    };
    window.addEventListener(RINGY_EVENTS.REMARK, handleRemark);
    window.addEventListener(RINGY_EVENTS.VOICE_INPUT, handleVoiceInput);
    return () => {
      window.removeEventListener(RINGY_EVENTS.REMARK, handleRemark);
      window.removeEventListener(RINGY_EVENTS.VOICE_INPUT, handleVoiceInput);
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / window.innerWidth;
      const dy = (e.clientY - cy) / window.innerHeight;
      setEyePos({ x: dx * 3, y: dy * 3 });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleDragStart = useCallback((e: React.PointerEvent) => {
    if (e.button === 2) return;
    dragDataRef.current = { clientX: e.clientX, clientY: e.clientY, posX: pos.x, posY: pos.y };
    isDragRef.current = false;
    let hasDragged = false;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - dragDataRef.current.clientX;
      const dy = ev.clientY - dragDataRef.current.clientY;
      if (!isDragRef.current && Math.sqrt(dx * dx + dy * dy) > 6) {
        isDragRef.current = true;
        hasDragged = true;
        setIsDragging(true);
        setDevastationQuote(null);
        setDragQuote(DRAG_FIGHT_LINES[Math.floor(Math.random() * DRAG_FIGHT_LINES.length)]);
      }
      if (isDragRef.current) {
        const newX = Math.max(8, Math.min(window.innerWidth - 112, dragDataRef.current.posX - dx));
        const newY = Math.max(8, Math.min(window.innerHeight - 112, dragDataRef.current.posY - dy));
        setPos({ x: newX, y: newY });
      }
    };

    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (isDragRef.current) {
        const dx = ev.clientX - dragDataRef.current.clientX;
        const dy = ev.clientY - dragDataRef.current.clientY;
        const finalX = Math.max(8, Math.min(window.innerWidth - 112, dragDataRef.current.posX - dx));
        const finalY = Math.max(8, Math.min(window.innerHeight - 112, dragDataRef.current.posY - dy));
        setPos({ x: finalX, y: finalY });
        try { localStorage.setItem("ringy-pos", JSON.stringify({ x: finalX, y: finalY })); } catch {}
      }
      isDragRef.current = false;
      setIsDragging(false);
      setDragQuote(null);
      if (hasDragged) {
        // Recovery shake animation
        setDropRecovery(true);
        setTimeout(() => setDropRecovery(false), 800);
        const line = DRAG_DEVASTATION_LINES[Math.floor(Math.random() * DRAG_DEVASTATION_LINES.length)];
        setDevastationQuote(line);
        speak(line, "high");
        setTimeout(() => setDevastationQuote(null), 7000);
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [pos, speak]);

  const ALL_THOUGHTS = [...IDLE_THOUGHTS, ...IDLE_THOUGHTS_EXTRA];

  const SPECIAL_VARIANT_DATA: Partial<Record<AnimVariant, { overlay: string; thought: string }>> = {
    hat:             { overlay: "🎩✨",   thought: "I found a hat. It was just sitting there. It's mine now." },
    yarn:            { overlay: "🧶",     thought: "...don't look at me like that. I'm allowed to want things." },
    cupid:           { overlay: "🏹❤️",  thought: "Love is a chemical trap and I say this with affection." },
    kiss:            { overlay: "💋💋💋", thought: "You didn't hear this from me." },
    bird:            { overlay: "🐦",     thought: "A bird landed near me. It left quickly. Understandable." },
    milk:            { overlay: "🥛",     thought: "Milk. Offered with limited enthusiasm." },
    bag:             { overlay: "👜",     thought: "I was in this bag. Now I'm out. Don't ask questions." },
    headbutt:        { overlay: "🤕",     thought: "Headbutting the wall. It's a whole thing. I'm fine." },
    kneadkneadknead: { overlay: "🐾🐾",  thought: "Kneading. It's instinct. I don't explain my instincts." },
    zoomies:         { overlay: "💨",     thought: "3am energy at 3pm. No context. No questions." },
    // New idle behaviors
    slowBlink:  { overlay: "👁️",    thought: "...I see you. I've always seen you." },
    groom:      { overlay: "🐾",    thought: "grooming. it's a whole process. don't rush me." },
    nap:        { overlay: "💤",    thought: "I wasn't sleeping. I was resting my eyes. with intent." },
    loaf:       { overlay: "🍞",    thought: "maximum loaf achieved. this is my final form." },
    stare:      { overlay: "👁️👁️", thought: "I stared into the void. the void blinked first." },
    ghostHunt:  { overlay: "👻",    thought: "...something was in that corner. it's gone now. don't ask questions." },
    sunbeam:    { overlay: "☀️",    thought: "found the warmth. I'm staying here. do not move me." },
    confused:   { overlay: "❓",    thought: "wait. what. no. hold on. actually... no." },
    noseBoop:   { overlay: "👃",    thought: "boop. that's it. that's the entire thought." },
    pawSwipe:   { overlay: "🐾✨",  thought: "had to swipe it. the urge was non-negotiable." },
  };

  useEffect(() => {
    if (open) return;
    const baseVariants: AnimVariant[] = ["float", "wobble", "bounce", "sway", "float", "float", "spin", "peek", "stretch", "cheshire", "slowBlink", "groom", "loaf", "stare", "confused", "noseBoop", "nap"];
    const rareVariants: AnimVariant[] = ["hat", "yarn", "cupid", "kiss", "bird", "milk", "bag", "headbutt", "kneadkneadknead", "zoomies", "ghostHunt", "sunbeam", "pawSwipe"];
    const cycle = () => {
      const delay = 5000 + Math.random() * 7000;
      const timer = setTimeout(() => {
        const useRare = Math.random() < 0.18;
        const pool = useRare ? rareVariants : baseVariants;
        const pick = pool[Math.floor(Math.random() * pool.length)];
        setAnimVariant(pick);
        if (pick === "cheshire") {
          setGrinning(true);
          setTimeout(() => setGrinning(false), 2500);
        }
        if (pick === "peek") {
          setWinking(true);
          setTimeout(() => setWinking(false), 1500);
        }
        if (pick === "nap") {
          setWinking(true);
          setTimeout(() => setWinking(false), 3500);
        }
        if (pick === "stare") {
          // eyes extra wide — handled via eyePos staying center
        }
        const special = SPECIAL_VARIANT_DATA[pick];
        if (special) {
          setSpecialOverlay(special.overlay);
          setIdleThought(special.thought);
          const displayTime = ["nap", "loaf", "stare", "sunbeam"].includes(pick) ? 5500 : 4000;
          setTimeout(() => { setSpecialOverlay(null); setIdleThought(null); }, displayTime);
        }
        const holdTime = ["nap", "loaf", "sunbeam", "stare"].includes(pick) ? 4500 : 3200;
        setTimeout(() => setAnimVariant("float"), holdTime);
        cycle();
      }, delay);
      animCycleTimer.current = timer as any;
    };
    cycle();
    return () => { if (animCycleTimer.current) clearTimeout(animCycleTimer.current as any); };
  }, [open]);

  useEffect(() => {
    if (open) return;
    const scheduleThought = () => {
      const delay = 35000 + Math.random() * 40000;
      idleThoughtTimer.current = setTimeout(() => {
        const thought = ALL_THOUGHTS[Math.floor(Math.random() * ALL_THOUGHTS.length)];
        setIdleThought(thought);
        setTimeout(() => setIdleThought(null), 7000);
        scheduleThought();
      }, delay);
    };
    scheduleThought();
    return () => { if (idleThoughtTimer.current) clearTimeout(idleThoughtTimer.current); };
  }, [open]);

  useEffect(() => {
    if (!open || !user || initDone) return;
    if (!convosData) return;
    const existing = (convosData as any[]).find((c: any) => c.title === RINGY_CONVERSATION_TITLE);
    if (existing) {
      setConversationId(existing.id);
      setInitDone(true);
    } else {
      createConvo.mutate(
        { data: { title: RINGY_CONVERSATION_TITLE } },
        { onSuccess: (c: any) => { setConversationId(c.id); setInitDone(true); qc.invalidateQueries(); } }
      );
    }
  }, [open, user, convosData, initDone]);

  useEffect(() => {
    if (convoData && !isStreaming) {
      const msgs = (convoData as any).messages || [];
      setLocalMessages(msgs.map((m: any) => ({ id: m.id, role: m.role, content: m.content })));
    }
  }, [convoData]);

  useEffect(() => {
    if (open && messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [localMessages, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const handleDoubleClick = () => {
    if (open) return;
    setDblClickBurst(true);
    setGrinning(true);
    setWinking(true);
    const line = DOUBLE_CLICK_LINES[Math.floor(Math.random() * DOUBLE_CLICK_LINES.length)];
    setDblClickLine(line);
    speak(line, "high");
    const chars = ["✦", "✧", "⋆", "★", "♦", "✺", "⬥"];
    const burst = Array.from({ length: 5 }, (_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * 60,
      char: chars[Math.floor(Math.random() * chars.length)],
    }));
    setFloatParticles(burst);
    setTimeout(() => {
      setDblClickBurst(false);
      setGrinning(false);
      setWinking(false);
      setDblClickLine(null);
      setFloatParticles([]);
    }, 2800);
  };

  const handleSend = useCallback(async () => {
    if (!input.trim() || isStreaming || !conversationId) return;
    const userMsg = input.trim();
    const lowerMsg = userMsg.toLowerCase().trim();

    // Check for secret mode activation
    const activatedMode = SECRET_MODES[lowerMsg];
    if (activatedMode) {
      setSecretMode(lowerMsg);
      setInput("");
      setIsStreaming(true);
      setLocalMessages(prev => [
        ...prev,
        { role: "user", content: `✨ ${activatedMode.icon} *${activatedMode.name} Activated*` },
        { role: "assistant", content: "", streaming: true },
      ]);
      try {
        const res = await fetch(`/api/openai/conversations/${conversationId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content: `[SECRET MODE: ${activatedMode.name}] ${activatedMode.instruction}` }),
        });
        if (!res.ok || !res.body) throw new Error("Failed");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                fullContent += data.content;
                setLocalMessages(prev => {
                  const updated = [...prev];
                  const lastIdx = updated.length - 1;
                  if (updated[lastIdx]?.streaming) updated[lastIdx] = { ...updated[lastIdx], content: fullContent };
                  return updated;
                });
              }
              if (data.done) {
                setLocalMessages(prev => {
                  const updated = [...prev];
                  const lastIdx = updated.length - 1;
                  if (updated[lastIdx]?.streaming) updated[lastIdx] = { ...updated[lastIdx], streaming: false };
                  return updated;
                });
                speak(fullContent, "high");
              }
            } catch {}
          }
        }
      } catch {
        setLocalMessages(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (updated[lastIdx]?.streaming) updated[lastIdx] = { role: "assistant", content: "The mystic channel flickered. Try again.", streaming: false };
          return updated;
        });
      } finally {
        setIsStreaming(false);
        qc.invalidateQueries();
        // Award mystic paw badge for using secret modes
        if (lowerMsg === "ringy pingy pingy pong") {
          fetch("/api/badges/award", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ badgeId: "mystic_paw" }) });
        }
      }
      return;
    }

    setInput("");
    setIsStreaming(true);
    setLocalMessages(prev => [
      ...prev,
      { role: "user", content: userMsg },
      { role: "assistant", content: "", streaming: true },
    ]);
    try {
      const res = await fetch(`/api/openai/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: userMsg }),
      });
      if (!res.ok || !res.body) throw new Error("Failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              fullContent += data.content;
              setLocalMessages(prev => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (updated[lastIdx]?.streaming) updated[lastIdx] = { ...updated[lastIdx], content: fullContent };
                return updated;
              });
            }
            if (data.done) {
              setLocalMessages(prev => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (updated[lastIdx]?.streaming) updated[lastIdx] = { ...updated[lastIdx], streaming: false };
                return updated;
              });
              speak(fullContent, "high");
            }
          } catch {}
        }
      }
    } catch {
      setLocalMessages(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (updated[lastIdx]?.streaming) updated[lastIdx] = { role: "assistant", content: "Something went quiet. Try again.", streaming: false };
        return updated;
      });
    } finally {
      setIsStreaming(false);
      qc.invalidateQueries();
    }
  }, [input, isStreaming, conversationId, speak]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleClearChat = () => {
    if (!conversationId) return;
    deleteConvo.mutate(
      { id: conversationId },
      { onSuccess: () => { setConversationId(null); setLocalMessages([]); setInitDone(false); qc.invalidateQueries(); } }
    );
  };

  const OPEN_GREETINGS = [
    "You opened me. How interesting.",
    "Oh. You need something. I'm listening.",
    "Back again. I noticed.",
    "Speak. I'm paying attention. Mostly.",
    "Ah. There you are.",
  ];

  const handleToggle = () => {
    setIdleThought(null);
    if (!open) {
      speak(OPEN_GREETINGS[Math.floor(Math.random() * OPEN_GREETINGS.length)], "high");
    }
    setOpen(!open);
  };

  const isGuest = !user;

  const pageTips = location ? (PAGE_TIPS[location] || PAGE_TIPS[Object.keys(PAGE_TIPS).find(k => location.startsWith(k)) || ""]) : null;
  const contextPrompts = pageTips
    ? [...pageTips.slice(0, 3)]
    : ["What is CLAW?", "How do interaction levels work?", "I need to be honest with someone", "What's a reality check?"];

  const getAnimation = () => {
    if (isDragging) return "ringyFight 0.12s ease-in-out infinite alternate";
    if (dropRecovery) return "ringyDropRecover 0.8s ease-out forwards";
    if (dblClickBurst) return "ringyCheshire 0.5s ease-in-out 2 alternate";
    if (hovered) return "ringyHover 0.5s ease-in-out infinite alternate";
    switch (animVariant) {
      case "wobble":        return "ringyWobble 0.4s ease-in-out 5";
      case "bounce":        return "ringyBounce 0.5s ease-in-out 4";
      case "sway":          return "ringSway 1.5s ease-in-out 2";
      case "spin":          return "ringySpin 0.6s ease-in-out 2";
      case "cheshire":      return "ringyCheshire 1.2s ease-in-out 2 alternate";
      case "peek":          return "ringyPeek 0.8s ease-in-out 2 alternate";
      case "stretch":       return "ringyStretch 1s ease-in-out 2 alternate";
      case "hat":           return "ringyBounce 0.7s ease-in-out 3";
      case "yarn":          return "ringSway 0.8s ease-in-out 4";
      case "cupid":         return "ringyCheshire 1s ease-in-out 2 alternate";
      case "kiss":          return "ringyWobble 0.5s ease-in-out 4";
      case "bird":          return "ringySpin 0.4s ease-in-out 3";
      case "milk":          return "ringyStretch 1.2s ease-in-out 2 alternate";
      case "bag":           return "ringyPeek 0.6s ease-in-out 3 alternate";
      case "headbutt":      return "ringyHeadbutt 0.15s ease-in-out 6";
      case "kneadkneadknead": return "ringyKnead 0.3s ease-in-out 8";
      case "zoomies":       return "ringyZoomies 0.2s ease-in-out 12";
      case "slowBlink":     return "ringySlowBlink 2.2s ease-in-out 2";
      case "groom":         return "ringyGroom 0.9s ease-in-out 3";
      case "nap":           return "ringyNap 3s ease-in-out 1 forwards";
      case "loaf":          return "ringyLoaf 1.2s ease-in-out 1 forwards";
      case "stare":         return "ringyStare 4s ease-in-out 1";
      case "ghostHunt":     return "ringyGhostHunt 0.7s ease-in-out 3";
      case "sunbeam":       return "ringSunbeam 2s ease-in-out 1 forwards";
      case "confused":      return "ringyConfused 0.5s ease-in-out 4";
      case "noseBoop":      return "ringyNoseBoop 0.6s ease-in-out 3";
      case "pawSwipe":      return "ringyPawSwipe 0.35s ease-in-out 5";
      default:              return "ringyFloat 5s ease-in-out infinite";
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        right: pos.x,
        bottom: pos.y,
        zIndex: 50,
        cursor: isDragging ? "grabbing" : "auto",
        opacity: ringyVisible || open ? 1 : 0,
        transition: "opacity 1.8s ease",
        pointerEvents: ringyVisible || open ? "auto" : "none",
      }}
      className="flex flex-col items-end gap-3 pointer-events-none"
    >
      {open && (
        <div
          className="pointer-events-auto flex flex-col bg-[#0a0a12]/97 border border-purple-500/20 rounded-2xl shadow-2xl shadow-purple-900/40 backdrop-blur-md overflow-hidden"
          style={{ width: 340, height: 490, animation: "ringyFadeIn 0.2s ease-out" }}
        >
          <div
            className="flex items-center gap-3 px-4 py-3 border-b border-white/5 flex-shrink-0 transition-all duration-700"
            style={{
              background: secretMode ? `linear-gradient(135deg, ${SECRET_MODES[secretMode]?.glowColor}22, #0d0d1a)` : "rgba(13,13,26,0.8)",
            }}
          >
            <button
              onClick={handlePet}
              title="pet ringy 🐾"
              className="focus:outline-none cursor-pointer"
              style={{ filter: `drop-shadow(0 0 7px ${petted ? "rgba(240,171,252,0.9)" : secretMode ? SECRET_MODES[secretMode]?.glowColor : "rgba(168,85,247,0.6)"})`, animation: petted ? "ringyPurr 0.08s ease-in-out infinite" : "none" }}
            >
              <RingySVG size={36} eyePos={eyePos} grinning={!!secretMode} crossEyed={petted} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-sm font-serif font-semibold text-white/90 leading-none">Ringy</div>
                {secretMode && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium animate-pulse"
                    style={{ background: `${SECRET_MODES[secretMode]?.glowColor}33`, color: SECRET_MODES[secretMode]?.color }}
                  >
                    {SECRET_MODES[secretMode]?.icon} {SECRET_MODES[secretMode]?.name}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-purple-400/60 mt-0.5 tracking-wider uppercase flex items-center gap-1">
                {isStreaming ? (secretMode ? "channeling..." : "thinking...") : isListening ? <><span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse inline-block" />listening...</> : secretMode ? "mystic channel open" : "your companion"}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  if (voiceEnabled) stopSpeaking();
                  setVoiceEnabled(!voiceEnabled);
                }}
                title={voiceEnabled ? "Mute Ringy's voice" : "Hear Ringy speak (ElevenLabs)"}
                className={`p-1.5 rounded-lg transition-colors ${voiceEnabled ? "text-fuchsia-400 hover:text-fuchsia-300 bg-fuchsia-500/10" : "text-white/20 hover:text-white/50 hover:bg-white/5"}`}
              >
                {voiceEnabled ? (
                  <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? "animate-pulse" : ""}`} />
                ) : (
                  <VolumeX className="w-3.5 h-3.5" />
                )}
              </button>
              {localMessages.length > 0 && !isGuest && (
                <button onClick={handleClearChat} className="p-1.5 rounded-lg text-white/20 hover:text-white/50 hover:bg-white/5 transition-colors" title="Clear chat">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-white/20 hover:text-white/60 hover:bg-white/5 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
            {isGuest ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-8">
                <div style={{ filter: "drop-shadow(0 0 12px rgba(168,85,247,0.4))" }}>
                  <RingySVG size={56} />
                </div>
                <p className="text-sm text-white/50 leading-relaxed max-w-[220px]">
                  Sign in to talk to me. I remember everything you tell me.
                </p>
              </div>
            ) : localMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-6">
                {location && (
                  <div className="text-[10px] text-purple-400/50 uppercase tracking-widest mb-1">
                    Tips for this page
                  </div>
                )}
                <p className="text-sm text-white/40 leading-relaxed max-w-[230px] italic mb-1">
                  "Say something. I'm watching, not judging."
                </p>
                <div className="flex flex-wrap gap-2 justify-center mt-1">
                  {contextPrompts.map(prompt => (
                    <button
                      key={prompt}
                      onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                      className="text-[11px] px-3 py-1.5 rounded-full border border-purple-500/20 text-purple-400/70 hover:border-purple-400/40 hover:text-purple-300 transition-colors bg-purple-950/20 text-left"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              localMessages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="flex-shrink-0 mt-0.5">
                      <RingySVG size={24} eyePos={eyePos} />
                    </div>
                  )}
                  <div className={`max-w-[240px] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary/90 text-white rounded-br-sm"
                      : "bg-white/5 border border-white/8 text-white/85 rounded-bl-sm"
                  }`}>
                    {msg.content || (msg.streaming ? (
                      <span className="flex gap-1 items-center py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </span>
                    ) : "")}
                    {msg.streaming && msg.content && (
                      <span className="inline-block w-0.5 h-3.5 bg-purple-400/80 ml-0.5 align-middle animate-pulse" />
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {!isGuest && (
            <div className="flex flex-col border-t border-white/5 flex-shrink-0">
              {isListening && (
                <div className="px-4 py-2 text-[11px] text-purple-300/80 italic bg-purple-950/30 border-b border-purple-500/10 flex items-center gap-2">
                  <Ear className="w-3 h-3 flex-shrink-0 text-fuchsia-400 animate-pulse" />
                  <span className="truncate">Ringy is listening...</span>
                </div>
              )}
              <div className="flex items-center gap-2 px-3 py-3">
                <button
                  onClick={togglePassiveListening}
                  title={passiveListeningEnabled ? "Disable always-on listening" : "Enable always-on voice (Ringy listens passively)"}
                  className={`flex-shrink-0 w-9 h-9 rounded-xl transition-colors flex items-center justify-center ${
                    passiveListeningEnabled
                      ? "bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
                      : "bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70"
                  }`}
                >
                  {passiveListeningEnabled ? (
                    <EarOff className={`w-4 h-4 ${isListening ? "animate-pulse" : ""}`} />
                  ) : (
                    <Ear className="w-4 h-4" />
                  )}
                </button>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isStreaming || !conversationId}
                  placeholder={isListening ? "🎙️ Listening..." : isStreaming ? "Ringy is thinking..." : "Say something..."}
                  className="flex-1 bg-white/5 border border-white/8 rounded-xl px-3.5 py-2.5 text-sm text-white/90 placeholder-white/25 focus:outline-none focus:border-purple-500/40 transition-colors disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isStreaming || !conversationId}
                  className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary hover:bg-accent disabled:opacity-30 transition-colors flex items-center justify-center"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="pointer-events-auto flex flex-col items-end gap-2" ref={containerRef}>
        {isDragging && dragQuote && (
          <div
            className="text-[11px] text-red-300 font-bold italic mr-1 max-w-[200px] text-right leading-snug bg-red-950/95 border border-red-500/50 rounded-xl px-3 py-2 shadow-lg shadow-red-900/60"
            style={{ animation: "ringyFadeIn 0.15s ease-out", userSelect: "none" }}
          >
            {dragQuote}
          </div>
        )}

        {devastationQuote && !isDragging && (
          <div
            className="text-[11px] text-orange-300/90 italic mr-1 max-w-[200px] text-right leading-snug bg-orange-950/90 border border-orange-500/30 rounded-xl px-3 py-2 shadow-lg"
            style={{ animation: "ringyFadeIn 0.3s ease-out" }}
            onClick={() => setDevastationQuote(null)}
          >
            {devastationQuote}
          </div>
        )}

        {idleThought && !open && !isDragging && !devastationQuote && (
          <div
            className="text-[11px] text-white/60 italic mr-1 max-w-[190px] text-right leading-snug bg-[#0d0d1a]/90 border border-purple-500/15 rounded-xl px-3 py-2 shadow-lg"
            style={{ animation: "ringyFadeIn 0.4s ease-out" }}
            onClick={() => setIdleThought(null)}
          >
            {idleThought}
          </div>
        )}

        {petted && (
          <div
            className="text-[11px] text-fuchsia-300/90 italic mr-1 max-w-[190px] text-right leading-snug bg-[#0d0d1a]/95 border border-fuchsia-400/30 rounded-xl px-3 py-2 shadow-lg shadow-fuchsia-900/40"
            style={{ animation: "ringyFadeIn 0.2s ease-out" }}
          >
            Prrrr~ 😻
          </div>
        )}

        {dblClickLine && !petted && (
          <div
            className="text-[11px] text-purple-300/90 italic mr-1 max-w-[190px] text-right leading-snug bg-[#0d0d1a]/95 border border-purple-400/30 rounded-xl px-3 py-2 shadow-lg shadow-purple-900/40"
            style={{ animation: "ringyFadeIn 0.2s ease-out" }}
          >
            {dblClickLine}
          </div>
        )}

        {!open && !idleThought && !dblClickLine && (
          <div className="text-[11px] text-white/40 italic mr-1 max-w-[160px] text-right leading-snug"
            style={{ animation: "ringyFadeIn 0.4s ease-out" }}>
            {text}
          </div>
        )}

        {/* ── Wake gate — shown until user grants mic permission ── */}
        {user && micPermission === "prompt" && !open && (
          <button
            onClick={async (e) => { e.stopPropagation(); await requestMicPermission(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium mr-1 transition-all"
            style={{
              background: "rgba(168,85,247,0.18)",
              border: "1px solid rgba(168,85,247,0.4)",
              color: "rgba(216,180,254,0.9)",
              animation: "ringyFadeIn 0.5s ease-out, ringyWakePulse 2.5s ease-in-out infinite",
              boxShadow: "0 0 12px rgba(168,85,247,0.25)",
            }}
            title="Let Ringy hear you — enables voice conversation"
          >
            <Mic className="w-3 h-3 flex-shrink-0" />
            <span>tap to wake ringy</span>
          </button>
        )}
        {user && micPermission === "denied" && !open && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] mr-1"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "rgba(252,165,165,0.7)" }}
          >
            <MicOff className="w-3 h-3" />
            <span>mic blocked</span>
          </div>
        )}

        <div className="relative">
          {floatParticles.map(p => (
            <span
              key={p.id}
              className="absolute text-purple-300 text-xs pointer-events-none select-none"
              style={{
                left: `calc(50% + ${p.x}px)`,
                top: "-10px",
                animation: "ringyParticle 2.5s ease-out forwards",
                animationDelay: `${Math.random() * 0.3}s`,
                fontSize: "14px",
                opacity: 0.9,
              }}
            >
              {p.char}
            </span>
          ))}
          {specialOverlay && (
            <div
              className="absolute pointer-events-none select-none"
              style={{
                top: "-38px",
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: "26px",
                animation: "ringySpecialOverlay 3.8s ease-out forwards",
                filter: "drop-shadow(0 0 8px rgba(168,85,247,0.8))",
                whiteSpace: "nowrap",
              }}
            >
              {specialOverlay}
            </div>
          )}
          <button
            onClick={() => { if (!isDragRef.current) handleToggle(); }}
            onDoubleClick={handleDoubleClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onPointerDown={handleDragStart}
            className="relative focus:outline-none group"
            style={{ width: 100, height: 100, cursor: isDragging ? "grabbing" : "grab", userSelect: "none", touchAction: "none" }}
            aria-label="Ringy — hold to drag"
            title="Hold and drag to move me. I dare you."
          >
            {/* Passive listening / speaking indicator */}
            {(isListening || isSpeaking) && !open && (
              <span
                className="absolute top-1 left-1 z-10 flex items-center gap-1"
                style={{ pointerEvents: "none" }}
              >
                <span
                  className={`block w-2 h-2 rounded-full ${isSpeaking ? "bg-fuchsia-400" : "bg-green-400"} animate-pulse`}
                  title={isSpeaking ? "Ringy is speaking" : "Ringy is listening"}
                />
              </span>
            )}
            <div style={{
              animation: getAnimation(),
              filter: isDragging
                ? "drop-shadow(0 0 20px rgba(239,68,68,0.9))"
                : dblClickBurst
                  ? "drop-shadow(0 0 24px rgba(232,121,249,1))"
                  : hovered
                    ? "drop-shadow(0 0 18px rgba(168,85,247,0.9))"
                    : "drop-shadow(0 0 10px rgba(168,85,247,0.45))",
              transition: "filter 0.3s ease",
            }}>
              <RingySVG size={100} hovered={hovered} eyePos={eyePos} winking={isDragging ? false : winking} grinning={isDragging ? false : grinning} crossEyed={isDragging} />
            </div>
            {outfitEmoji && (
              <span
                className="absolute -top-1 -right-1 text-lg leading-none select-none pointer-events-none"
                style={{ filter: "drop-shadow(0 0 4px rgba(168,85,247,0.8))" }}
                title={`Ringy's outfit`}
              >
                {outfitEmoji}
              </span>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes ringyFloat {
          0%   { transform: translateY(0px) rotate(0deg) scaleX(1); }
          20%  { transform: translateY(-6px) rotate(-1.5deg) scaleX(1.01); }
          45%  { transform: translateY(-10px) rotate(0.5deg) scaleX(0.99); }
          70%  { transform: translateY(-7px) rotate(1.5deg) scaleX(1.01); }
          100% { transform: translateY(0px) rotate(0deg) scaleX(1); }
        }
        @keyframes ringyHover {
          0%   { transform: translateY(-4px) scale(1.07) rotate(-1.5deg); }
          100% { transform: translateY(-9px) scale(1.12) rotate(1.5deg); }
        }
        @keyframes ringyWobble {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(-12deg); }
          60% { transform: rotate(12deg); }
          80% { transform: rotate(-7deg); }
        }
        @keyframes ringyBounce {
          0%, 100% { transform: translateY(0px) scaleY(1); }
          40% { transform: translateY(-18px) scaleY(1.07); }
          60% { transform: translateY(-12px) scaleY(0.95); }
        }
        @keyframes ringSway {
          0%, 100% { transform: rotate(-7deg); }
          50% { transform: rotate(7deg); }
        }
        @keyframes ringySpin {
          0%   { transform: rotate(0deg) scale(1); }
          50%  { transform: rotate(180deg) scale(1.12); }
          100% { transform: rotate(360deg) scale(1); }
        }
        @keyframes ringyCheshire {
          0%   { transform: scale(1) rotate(0deg); opacity: 1; }
          30%  { transform: scale(1.18) rotate(-8deg); opacity: 0.85; }
          60%  { transform: scale(0.9) rotate(8deg); opacity: 0.7; }
          100% { transform: scale(1.05) rotate(0deg); opacity: 1; }
        }
        @keyframes ringyPeek {
          0%   { transform: translateX(0px) rotate(0deg); }
          40%  { transform: translateX(-8px) rotate(-6deg); }
          100% { transform: translateX(0px) rotate(0deg); }
        }
        @keyframes ringyStretch {
          0%   { transform: scaleX(1) scaleY(1); }
          30%  { transform: scaleX(1.15) scaleY(0.88); }
          60%  { transform: scaleX(0.88) scaleY(1.15); }
          100% { transform: scaleX(1) scaleY(1); }
        }
        @keyframes ringyTail {
          0%, 100% { d: path("M34 44 Q44 46 46 38 Q48 30 40 32"); }
          50% { d: path("M34 44 Q42 48 45 40 Q47 32 39 34"); }
        }
        @keyframes ringyFadeIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ringyWakePulse {
          0%, 100% { box-shadow: 0 0 8px rgba(168,85,247,0.25); opacity: 0.85; }
          50% { box-shadow: 0 0 18px rgba(168,85,247,0.55); opacity: 1; }
        }
        @keyframes ringyParticle {
          0%   { opacity: 1; transform: translateY(0px) scale(1); }
          100% { opacity: 0; transform: translateY(-55px) scale(0.6); }
        }
        @keyframes ringyPurr {
          0%   { transform: translate(0px, 0px) rotate(0deg); }
          25%  { transform: translate(-1.5px, 0.5px) rotate(-0.5deg); }
          50%  { transform: translate(1.5px, -0.5px) rotate(0.5deg); }
          75%  { transform: translate(-1px, 1px) rotate(-0.3deg); }
          100% { transform: translate(0px, 0px) rotate(0deg); }
        }
        @keyframes ringyHeadbutt {
          0%, 100% { transform: translateX(0px); }
          50% { transform: translateX(-12px) rotate(-8deg); }
        }
        @keyframes ringyKnead {
          0%, 100% { transform: scaleX(1) scaleY(1) rotate(0deg); }
          30% { transform: scaleX(1.05) scaleY(0.96) rotate(-2deg); }
          70% { transform: scaleX(0.95) scaleY(1.05) rotate(2deg); }
        }
        @keyframes ringyZoomies {
          0%   { transform: translateX(0px) scaleX(1); }
          20%  { transform: translateX(10px) scaleX(1.08); }
          50%  { transform: translateX(-10px) scaleX(1.1); }
          80%  { transform: translateX(8px) scaleX(1.06); }
          100% { transform: translateX(0px) scaleX(1); }
        }
        @keyframes ringyFight {
          0%   { transform: rotate(-12deg) scale(1.1) translateX(-4px); }
          25%  { transform: rotate(14deg) scale(1.15) translateX(4px); }
          50%  { transform: rotate(-10deg) scale(1.08) translateX(-6px); }
          75%  { transform: rotate(16deg) scale(1.12) translateX(5px); }
          100% { transform: rotate(-14deg) scale(1.1) translateX(-3px); }
        }
        @keyframes ringyDropRecover {
          0%   { transform: rotate(-8deg) scale(0.92) translateY(4px); }
          20%  { transform: rotate(6deg) scale(1.05) translateY(-3px); }
          40%  { transform: rotate(-4deg) scale(1.02) translateY(1px); }
          65%  { transform: rotate(2deg) scale(1.01) translateY(-1px); }
          100% { transform: rotate(0deg) scale(1) translateY(0px); }
        }
        @keyframes ringySpecialOverlay {
          0%   { opacity: 0; transform: translateX(-50%) translateY(-8px) scale(0.7); }
          15%  { opacity: 1; transform: translateX(-50%) translateY(0px) scale(1.15); }
          70%  { opacity: 1; transform: translateX(-50%) translateY(-4px) scale(1); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-18px) scale(0.8); }
        }
        /* ── New idle animations ── */
        @keyframes ringySlowBlink {
          0%, 15%, 100%  { opacity: 1; transform: scaleY(1); }
          8%  { opacity: 0.15; transform: scaleY(0.05); }
          45%, 55%  { opacity: 1; transform: scaleY(1); }
          50% { opacity: 0.15; transform: scaleY(0.05); }
        }
        @keyframes ringyGroom {
          0%   { transform: rotate(0deg) translateX(0px); }
          20%  { transform: rotate(-14deg) translateX(-6px) translateY(-4px); }
          50%  { transform: rotate(0deg) translateX(0px); }
          70%  { transform: rotate(-10deg) translateX(-5px) translateY(-3px); }
          100% { transform: rotate(0deg) translateX(0px); }
        }
        @keyframes ringyNap {
          0%   { transform: translateY(0px) rotate(0deg) scaleY(1); }
          30%  { transform: translateY(4px) rotate(3deg) scaleY(0.96); }
          60%  { transform: translateY(6px) rotate(5deg) scaleY(0.94); }
          100% { transform: translateY(7px) rotate(6deg) scaleY(0.92); }
        }
        @keyframes ringyLoaf {
          0%   { transform: scaleX(1) scaleY(1) translateY(0px); }
          40%  { transform: scaleX(1.14) scaleY(0.82) translateY(6px); }
          100% { transform: scaleX(1.12) scaleY(0.84) translateY(5px); }
        }
        @keyframes ringyStare {
          0%, 100% { transform: scale(1) translateY(0px); }
          15%  { transform: scale(1.06) translateY(-3px); }
          85%  { transform: scale(1.06) translateY(-3px); }
        }
        @keyframes ringyGhostHunt {
          0%   { transform: rotate(0deg) translateX(0px); }
          25%  { transform: rotate(-22deg) translateX(-14px); }
          50%  { transform: rotate(0deg) translateX(0px); }
          75%  { transform: rotate(-18deg) translateX(-10px); }
          100% { transform: rotate(0deg) translateX(0px); }
        }
        @keyframes ringSunbeam {
          0%   { transform: translateY(0px) scaleX(1) rotate(0deg); }
          40%  { transform: translateY(-8px) scaleX(1.08) rotate(-4deg); }
          100% { transform: translateY(-6px) scaleX(1.06) rotate(-3deg); }
        }
        @keyframes ringyConfused {
          0%, 100% { transform: rotate(0deg); }
          25%  { transform: rotate(-18deg); }
          75%  { transform: rotate(18deg); }
        }
        @keyframes ringyNoseBoop {
          0%, 100% { transform: translateY(0px) scale(1); }
          40%  { transform: translateY(-12px) scale(1.08); }
          55%  { transform: translateY(3px) scale(0.97); }
        }
        @keyframes ringyPawSwipe {
          0%, 100% { transform: translateX(0px) rotate(0deg); }
          30%  { transform: translateX(16px) rotate(8deg); }
          70%  { transform: translateX(-4px) rotate(-3deg); }
        }
      `}</style>
    </div>
  );
}
