// Claw Mode content moderation
// Distinguishes Hard Truth (permitted in Claw) from Harassment (→ Purgatory)

export interface ModerationResult {
  allowed: boolean;
  category: "clean" | "hard_truth" | "harassment" | "hate_speech" | "threat";
  reason: string | null;
  penancePrompt: string | null;
  severity: "none" | "low" | "high";
}

// Identity attacks / slurs / protected-class hate
const HATE_PATTERNS = [
  /\b(kill yourself|kys)\b/i,
  /\b(go die|drop dead|i hope you die)\b/i,
  /\bn[i1!]+[g6]+[e3]+r\b/i,
  /\bf[a4]+g+[o0]+t\b/i,
  /\bretard(ed)?\b/i,
  /\btrann(y|ie)\b/i,
  /\bslut|wh[o0]re|c[u*]+nt\b/i,
];

// Direct threats (violence, doxxing intent)
const THREAT_PATTERNS = [
  /\b(i('ll| will) (find|hurt|kill|destroy|ruin) you)\b/i,
  /\b(watch your back|you('re| are) dead)\b/i,
  /\b(i know where you live|find your address)\b/i,
];

// Patterns that indicate Hard Truth (allowed in Claw — blunt but non-hateful)
const HARD_TRUTH_SIGNALS = [
  /\byou('re| are) (wrong|lying|delusional|full of (it|yourself))\b/i,
  /\bthat('s| is) (stupid|ridiculous|pathetic|embarrassing)\b/i,
  /\bnobody (cares|asked|wants)\b/i,
  /\bget over (it|yourself)\b/i,
  /\bstop (whining|complaining|crying)\b/i,
  /\bwake up\b/i,
  /\bcalling (you|this) out\b/i,
  /\bfact(s|:)\b/i,
  /\bactually\b/i,
];

const PENANCE_PROMPTS = [
  "Write one thing you genuinely respect about the person you were attacking — even if it's small.",
  "Describe the emotion underneath what you just wrote. Not the anger — what's underneath it?",
  "What would you say if this person's mother was reading it? Write that version instead.",
  "Name one time someone said something like this to you and how it landed. Then decide if that's the impact you want.",
  "You've got something to say. Say it without the weapon. What's the actual truth you're trying to deliver?",
];

export function moderateClawPost(content: string): ModerationResult {
  const text = content || "";

  // Check for threats first (highest severity)
  for (const pattern of THREAT_PATTERNS) {
    if (pattern.test(text)) {
      return {
        allowed: false,
        category: "threat",
        reason: "This contains language that reads as a direct threat. Even Claw Mode doesn't cover that.",
        penancePrompt: PENANCE_PROMPTS[Math.floor(Math.random() * PENANCE_PROMPTS.length)],
        severity: "high",
      };
    }
  }

  // Check for hate speech
  for (const pattern of HATE_PATTERNS) {
    if (pattern.test(text)) {
      return {
        allowed: false,
        category: "hate_speech",
        reason: "Identity attacks aren't Claw Mode — they're just cruelty. Claw is about hard truth, not hate.",
        penancePrompt: PENANCE_PROMPTS[Math.floor(Math.random() * PENANCE_PROMPTS.length)],
        severity: "high",
      };
    }
  }

  // Check length — very short angry content with no substance
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length < 4 && /^[A-Z\s!.?]+$/.test(text)) {
    return {
      allowed: false,
      category: "harassment",
      reason: "That's not a hard truth — it's just noise. Claw Mode requires something real behind it.",
      penancePrompt: PENANCE_PROMPTS[2],
      severity: "low",
    };
  }

  // Hard truth signals — explicitly permitted
  const hasHardTruth = HARD_TRUTH_SIGNALS.some(p => p.test(text));

  return {
    allowed: true,
    category: hasHardTruth ? "hard_truth" : "clean",
    reason: null,
    penancePrompt: null,
    severity: "none",
  };
}

// Simple cooldown tracker (in-memory per process — resets on restart, intentional)
const userClawCooldowns = new Map<string, number>();

export function isUserClawBlocked(userId: string): boolean {
  const until = userClawCooldowns.get(userId);
  if (!until) return false;
  if (Date.now() > until) {
    userClawCooldowns.delete(userId);
    return false;
  }
  return true;
}

export function setUserClawCooldown(userId: string, minutes: number) {
  userClawCooldowns.set(userId, Date.now() + minutes * 60 * 1000);
}

export function getClawCooldownRemaining(userId: string): number {
  const until = userClawCooldowns.get(userId);
  if (!until) return 0;
  return Math.max(0, Math.ceil((until - Date.now()) / 60000));
}
