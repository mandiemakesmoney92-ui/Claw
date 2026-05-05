import { Router } from "express";
import { db } from "@workspace/db";
import { clawProfilesTable, frequencyMatchesTable, notificationsTable } from "@workspace/db/schema";
import { eq, ne, and, sql, not } from "drizzle-orm";

const router = Router();

function scoreMatch(a: Record<string, unknown>, b: Record<string, unknown>): { score: number; traits: string[] } {
  const traits: string[] = [];
  let score = 0;

  // Zodiac compatibility (same element = very high, compatible = high)
  const EARTH = ["Taurus", "Virgo", "Capricorn"];
  const FIRE = ["Aries", "Leo", "Sagittarius"];
  const AIR = ["Gemini", "Libra", "Aquarius"];
  const WATER = ["Cancer", "Scorpio", "Pisces"];
  const COMPATIBLE: Record<string, string[]> = {
    Aries: ["Leo","Sagittarius","Gemini","Aquarius"],
    Taurus: ["Virgo","Capricorn","Cancer","Pisces"],
    Gemini: ["Libra","Aquarius","Aries","Leo"],
    Cancer: ["Scorpio","Pisces","Taurus","Virgo"],
    Leo: ["Aries","Sagittarius","Gemini","Libra"],
    Virgo: ["Taurus","Capricorn","Cancer","Scorpio"],
    Libra: ["Gemini","Aquarius","Leo","Sagittarius"],
    Scorpio: ["Cancer","Pisces","Virgo","Capricorn"],
    Sagittarius: ["Leo","Aries","Libra","Aquarius"],
    Capricorn: ["Virgo","Taurus","Scorpio","Pisces"],
    Aquarius: ["Gemini","Libra","Aries","Sagittarius"],
    Pisces: ["Cancer","Scorpio","Taurus","Capricorn"],
  };
  const getElement = (z: string) => EARTH.includes(z) ? "earth" : FIRE.includes(z) ? "fire" : AIR.includes(z) ? "air" : WATER.includes(z) ? "water" : null;
  if (a.zodiacSign && b.zodiacSign) {
    const za = a.zodiacSign as string, zb = b.zodiacSign as string;
    if (za === zb) { score += 20; traits.push("Same zodiac sign ✨"); }
    else if (getElement(za) === getElement(zb)) { score += 15; traits.push("Same element " + getElement(za) + " energy"); }
    else if (COMPATIBLE[za]?.includes(zb)) { score += 12; traits.push("Cosmically compatible " + za + " × " + zb); }
  }

  // MBTI compatibility
  const MBTI_GROUPS: Record<string, string> = {
    INTJ:"analyst",INTP:"analyst",ENTJ:"analyst",ENTP:"analyst",
    INFJ:"diplomat",INFP:"diplomat",ENFJ:"diplomat",ENFP:"diplomat",
    ISTJ:"sentinel",ISFJ:"sentinel",ESTJ:"sentinel",ESFJ:"sentinel",
    ISTP:"explorer",ISFP:"explorer",ESTP:"explorer",ESFP:"explorer",
  };
  const MBTI_COMPAT: Record<string, string[]> = {
    analyst: ["diplomat","analyst"],
    diplomat: ["analyst","diplomat"],
    sentinel: ["explorer","sentinel"],
    explorer: ["sentinel","explorer"],
  };
  if (a.mbtiType && b.mbtiType) {
    const ga = MBTI_GROUPS[a.mbtiType as string], gb = MBTI_GROUPS[b.mbtiType as string];
    if (a.mbtiType === b.mbtiType) { score += 18; traits.push("Same mind type: " + a.mbtiType); }
    else if (ga === gb) { score += 12; traits.push(ga + " personality kinship"); }
    else if (ga && MBTI_COMPAT[ga]?.includes(gb)) { score += 8; traits.push("MBTI harmony: " + a.mbtiType + " × " + b.mbtiType); }
  }

  // Interaction level match
  if (a.interactionLevel && b.interactionLevel) {
    if (a.interactionLevel === b.interactionLevel) { score += 10; traits.push("Same vibe intensity: " + a.interactionLevel); }
  }

  // Shared pet love
  if (a.hasPets && b.hasPets) { score += 5; traits.push("Both pet lovers 🐾"); }

  // Deep question resonance — same comfort food, fav animal, scent
  if (a.comfortFood && b.comfortFood && (a.comfortFood as string).toLowerCase().split(" ").some(w => (b.comfortFood as string).toLowerCase().includes(w) && w.length > 3)) {
    score += 8; traits.push("Same comfort food language 🍜");
  }
  if (a.favAnimal && b.favAnimal && (a.favAnimal as string).toLowerCase() === (b.favAnimal as string).toLowerCase()) {
    score += 6; traits.push("Same spirit animal: " + a.favAnimal);
  }
  if (a.favScent && b.favScent && (a.favScent as string).toLowerCase().split(" ").some(w => (b.favScent as string).toLowerCase().includes(w) && w.length > 3)) {
    score += 5; traits.push("Same sensory world 🌿");
  }
  if (a.deepnessLevel && b.deepnessLevel) {
    score += 6; traits.push("Same emotional depth");
  }

  // Clamp 0-100
  score = Math.min(100, Math.max(0, score));
  return { score, traits: traits.slice(0, 5) };
}

// GET /api/frequency-match — find your twin souls
router.get("/frequency-match", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const [me] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, req.user.id)).limit(1);
  if (!me) return res.json([]);

  // Get all other users (limit 200 for performance)
  const others = await db.select().from(clawProfilesTable)
    .where(ne(clawProfilesTable.userId, req.user.id))
    .limit(200);

  const scored = others.map(other => {
    const { score, traits } = scoreMatch(me as Record<string, unknown>, other as Record<string, unknown>);
    return {
      userId: other.userId,
      username: other.username,
      displayName: other.displayName,
      avatarUrl: other.avatarUrl,
      interactionLevel: other.interactionLevel,
      isVerified: other.isVerified,
      zodiacSign: other.zodiacSign,
      mbtiType: other.mbtiType,
      score,
      traits,
    };
  })
  .filter(m => m.score >= 20)
  .sort((a, b) => b.score - a.score)
  .slice(0, 12);

  res.json(scored);
});

// POST /api/frequency-match/:userId/connect — notify a match
router.post("/frequency-match/:userId/connect", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const targetId = req.params.userId;
  const [me] = await db.select({ displayName: clawProfilesTable.displayName }).from(clawProfilesTable).where(eq(clawProfilesTable.userId, req.user.id)).limit(1);
  await db.insert(notificationsTable).values({
    userId: targetId,
    type: "frequency_match",
    message: `${me?.displayName || "Someone"} thinks you're on the same wavelength 🔮 You might be twin souls.`,
    fromUserId: req.user.id,
  }).catch(() => {});
  res.json({ success: true });
});

export default router;
