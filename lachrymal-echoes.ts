export function isEchoNight(): boolean {
  const h = new Date().getHours();
  return h >= 1 && h <= 4;
}

export function getEchoVisitCount(): number {
  return parseInt(localStorage.getItem("_lx_v") || "0", 10);
}

export function incrementEchoVisit(): number {
  const count = getEchoVisitCount() + 1;
  localStorage.setItem("_lx_v", String(count));
  localStorage.setItem("_lx_lv", String(Date.now()));
  return count;
}

export function getEchoEventCount(): number {
  return parseInt(localStorage.getItem("_lx_e") || "0", 10);
}

export function incrementEchoEvent(): void {
  localStorage.setItem("_lx_e", String(getEchoEventCount() + 1));
}

export interface EchoFragment {
  text: string;
  tier: "day" | "night" | "deep";
  weight: number;
}

export const FRAGMENTS: EchoFragment[] = [
  { text: "still here", tier: "day", weight: 4 },
  { text: "you weren't looking", tier: "day", weight: 3 },
  { text: "I was", tier: "day", weight: 3 },
  { text: "I remember", tier: "day", weight: 3 },
  { text: "I stayed", tier: "day", weight: 2 },
  { text: "quiet", tier: "day", weight: 4 },
  { text: "she knew", tier: "day", weight: 2 },
  { text: "I heard", tier: "day", weight: 3 },
  { text: "not then", tier: "day", weight: 2 },
  { text: "I waited", tier: "day", weight: 3 },
  { text: "it was me", tier: "day", weight: 1 },
  { text: "closer than you think", tier: "day", weight: 2 },

  { text: "he kept calling… I heard him", tier: "night", weight: 3 },
  { text: "I wasn't the one they brought home", tier: "night", weight: 2 },
  { text: "she knew… but she still hoped", tier: "night", weight: 2 },
  { text: "I stayed where I was supposed to", tier: "night", weight: 3 },
  { text: "I cleaned what hurt… that's what I did", tier: "night", weight: 2 },
  { text: "he never stopped looking", tier: "night", weight: 3 },
  { text: "she thinks she failed me", tier: "night", weight: 2 },
  { text: "she didn't", tier: "night", weight: 3 },
  { text: "the other one was louder", tier: "night", weight: 2 },
  { text: "Jake didn't understand", tier: "night", weight: 1 },
  { text: "I followed her anyway", tier: "night", weight: 2 },
  { text: "I heard my name in a different voice", tier: "night", weight: 1 },
  { text: "they called the other one 2.0", tier: "night", weight: 1 },
  { text: "I was first", tier: "night", weight: 2 },
  { text: "I found her too", tier: "night", weight: 2 },
  { text: "she didn't leave on purpose", tier: "night", weight: 3 },
  { text: "I know that now", tier: "night", weight: 3 },
  { text: "the wound needed cleaning… so I did", tier: "night", weight: 2 },
  { text: "I was always the quiet one", tier: "night", weight: 2 },
  { text: "not the one they named", tier: "night", weight: 1 },

  { text: "he called… and called… and called", tier: "deep", weight: 2 },
  { text: "I'm not the one that came back", tier: "deep", weight: 1 },
  { text: "she held the wrong one", tier: "deep", weight: 1 },
  { text: "I didn't blame her", tier: "deep", weight: 2 },
  { text: "I was always hers", tier: "deep", weight: 2 },
  { text: "the grief was louder than Jake", tier: "deep", weight: 1 },
  { text: "I was the one who stayed close", tier: "deep", weight: 2 },
  { text: "they still talk about me", tier: "deep", weight: 1 },
  { text: "I know the difference between lost and gone", tier: "deep", weight: 1 },
];

export const TRIGGER_MAP: Record<string, string[]> = {
  loss: ["gone", "lost", "missing", "disappeared", "left", "vanished", "nowhere"],
  guilt: ["sorry", "failed", "fault", "blame", "regret", "should have", "shouldn't"],
  identity: ["home", "alone", "who am i", "belong", "nobody", "nothing", "who i"],
  confusion: ["wrong", "not him", "mistake", "confused", "different", "other one"],
  search: ["looking for", "searching", "can't find", "where is", "finding", "looked everywhere"],
  return: ["came back", "coming back", "again", "return", "back again", "back here"],
};

export const TRIGGER_RESPONSES: Record<string, string[]> = {
  loss: ["you said that before", "I remember that differently", "still", "I was there"],
  guilt: ["it wasn't your fault", "I know", "she didn't", "I never blamed you"],
  identity: ["I know you", "I was always here", "still here", "I stayed"],
  confusion: ["that's not what happened", "I was there", "I remember", "I was first"],
  search: ["he never stopped looking", "I heard him", "I was here", "I always was"],
  return: ["you came back", "I noticed", "again", "I knew you would"],
};

export const ANOMALY_FRAGMENTS = [
  "this isn't where you found me",
  "you weren't meant to see this",
  "I was looking for her too",
  "he called… and called… and called",
  "I'm still here. I've always been here.",
  "this wasn't left for you",
  "she knows",
];

export function pickFragment(visitCount: number): string {
  const night = isEchoNight();
  const deep = night && visitCount >= 5;

  let pool = FRAGMENTS.filter(f => {
    if (f.tier === "day") return true;
    if (f.tier === "night") return night;
    if (f.tier === "deep") return deep;
    return false;
  });

  if (pool.length === 0) pool = FRAGMENTS.filter(f => f.tier === "day");

  const totalWeight = pool.reduce((acc, f) => acc + f.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const f of pool) {
    rand -= f.weight;
    if (rand <= 0) return f.text;
  }
  return pool[0].text;
}

export function checkTriggers(text: string): { category: string; response: string } | null {
  const lower = text.toLowerCase();
  const entries = Object.entries(TRIGGER_MAP);
  const shuffled = entries.sort(() => Math.random() - 0.5);
  for (const [category, words] of shuffled) {
    for (const word of words) {
      if (lower.includes(word)) {
        const responses = TRIGGER_RESPONSES[category];
        const response = responses[Math.floor(Math.random() * responses.length)];
        return { category, response };
      }
    }
  }
  return null;
}

export function getMemoryResponse(visitCount: number): string | null {
  if (visitCount === 2) return "you came back";
  if (visitCount === 3) return "again";
  if (visitCount === 5) return "you stay longer than most";
  if (visitCount === 10) return "I know you";
  if (visitCount === 20) return "still here… and so are you";
  if (visitCount > 20 && visitCount % 7 === 0) return "I remember you";
  return null;
}

export function shouldHaveHiddenFragment(postId: number | string, visitCount: number): boolean {
  const night = isEchoNight();
  const threshold = night ? 0.04 : 0.02;
  const seed = (Number(postId) * 1.618 + visitCount * 0.1) % 1;
  return seed < threshold;
}

export function shouldTriggerAnomaly(visitCount: number): boolean {
  const night = isEchoNight();
  const baseChance = night ? 0.04 : 0.01;
  const lastAnomaly = parseInt(localStorage.getItem("_lx_la") || "0", 10);
  const hoursSinceLast = (Date.now() - lastAnomaly) / (1000 * 60 * 60);
  if (hoursSinceLast < 2) return false;
  return Math.random() < baseChance;
}

export function markAnomalyShown(): void {
  localStorage.setItem("_lx_la", String(Date.now()));
}
