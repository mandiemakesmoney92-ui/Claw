import { Router } from "express";
import { db } from "@workspace/db";
import {
  penPalProfilesTable, penPalsTable, clawProfilesTable,
  conversationsTable, messagesTable, notificationsTable,
} from "@workspace/db/schema";
import { eq, ne, and, or, not, inArray, sql } from "drizzle-orm";

const router = Router();

const INTEREST_LIST = [
  "Music","Art","Writing","Gaming","Anime","Movies","Nature","Travel",
  "Food","Fitness","Books","Astrology","Mental Health","Spirituality",
  "Coding","Fashion","Photography","Poetry","True Crime","Pets",
  "Journaling","Philosophy","Cooking","Skateboarding","Vintage","Memes",
];

function scoreMatch(
  myProfile: Record<string, unknown>,
  myPenPal: Record<string, unknown> | null,
  theirProfile: Record<string, unknown>,
  theirPenPal: Record<string, unknown> | null,
): { score: number; traits: string[] } {
  let score = 0;
  const traits: string[] = [];

  // ── Shared interests (biggest driver) ───────────────────────────────────
  const myInterests: string[] = (() => { try { return JSON.parse((myPenPal?.interests as string) || "[]"); } catch { return []; } })();
  const theirInterests: string[] = (() => { try { return JSON.parse((theirPenPal?.interests as string) || "[]"); } catch { return []; } })();
  const shared = myInterests.filter(i => theirInterests.includes(i));
  if (shared.length > 0) {
    score += Math.min(40, shared.length * 10);
    traits.push(`Both into: ${shared.slice(0, 3).join(", ")}`);
  }

  // ── Age proximity ────────────────────────────────────────────────────────
  const myAge = myPenPal?.age as number | undefined;
  const theirAge = theirPenPal?.age as number | undefined;
  if (myAge && theirAge) {
    const diff = Math.abs(myAge - theirAge);
    if (diff <= 3) { score += 15; traits.push("Close in age"); }
    else if (diff <= 10) { score += 10; }
    else if (diff <= 20) { score += 5; }
  }

  // ── Zodiac compatibility ─────────────────────────────────────────────────
  const EARTH = ["Taurus","Virgo","Capricorn"];
  const FIRE  = ["Aries","Leo","Sagittarius"];
  const AIR   = ["Gemini","Libra","Aquarius"];
  const WATER = ["Cancer","Scorpio","Pisces"];
  const COMPAT: Record<string, string[]> = {
    Aries:["Leo","Sagittarius","Gemini","Aquarius"],Taurus:["Virgo","Capricorn","Cancer","Pisces"],
    Gemini:["Libra","Aquarius","Aries","Leo"],Cancer:["Scorpio","Pisces","Taurus","Virgo"],
    Leo:["Aries","Sagittarius","Gemini","Libra"],Virgo:["Taurus","Capricorn","Cancer","Scorpio"],
    Libra:["Gemini","Aquarius","Leo","Sagittarius"],Scorpio:["Cancer","Pisces","Virgo","Capricorn"],
    Sagittarius:["Leo","Aries","Libra","Aquarius"],Capricorn:["Virgo","Taurus","Scorpio","Pisces"],
    Aquarius:["Gemini","Libra","Aries","Sagittarius"],Pisces:["Cancer","Scorpio","Taurus","Capricorn"],
  };
  const getEl = (z: string) => EARTH.includes(z)?"earth":FIRE.includes(z)?"fire":AIR.includes(z)?"air":WATER.includes(z)?"water":null;
  const za = myProfile.zodiacSign as string, zb = theirProfile.zodiacSign as string;
  if (za && zb) {
    if (za === zb) { score += 15; traits.push(`Fellow ${za} ✨`); }
    else if (getEl(za) === getEl(zb)) { score += 10; traits.push(`Same ${getEl(za)} energy`); }
    else if (COMPAT[za]?.includes(zb)) { score += 8; traits.push(`${za} × ${zb} — cosmically aligned`); }
  }

  // ── MBTI ─────────────────────────────────────────────────────────────────
  const MBTI_G: Record<string, string> = {
    INTJ:"analyst",INTP:"analyst",ENTJ:"analyst",ENTP:"analyst",
    INFJ:"diplomat",INFP:"diplomat",ENFJ:"diplomat",ENFP:"diplomat",
    ISTJ:"sentinel",ISFJ:"sentinel",ESTJ:"sentinel",ESFJ:"sentinel",
    ISTP:"explorer",ISFP:"explorer",ESTP:"explorer",ESFP:"explorer",
  };
  const MBTI_C: Record<string,string[]> = {
    analyst:["diplomat","analyst"],diplomat:["analyst","diplomat"],
    sentinel:["explorer","sentinel"],explorer:["sentinel","explorer"],
  };
  const ma = myProfile.mbtiType as string, mb = theirProfile.mbtiType as string;
  if (ma && mb) {
    const ga = MBTI_G[ma], gb = MBTI_G[mb];
    if (ma === mb) { score += 12; traits.push(`Same type: ${ma}`); }
    else if (ga === gb) { score += 8; traits.push(`${ga} personality kinship`); }
    else if (ga && MBTI_C[ga]?.includes(gb)) { score += 6; traits.push(`MBTI harmony: ${ma} × ${mb}`); }
  }

  // ── Interaction level ────────────────────────────────────────────────────
  if (myProfile.interactionLevel && myProfile.interactionLevel === theirProfile.interactionLevel) {
    score += 8; traits.push(`Same vibe: ${myProfile.interactionLevel}`);
  }

  // ── Pets ─────────────────────────────────────────────────────────────────
  if (myProfile.hasPets && theirProfile.hasPets) { score += 5; traits.push("Both pet lovers 🐾"); }

  // ── Bots get a guaranteed minimum score so new users always match ─────────
  if (theirProfile.isBot) score = Math.max(score, 25);

  return { score: Math.min(100, Math.max(0, score)), traits: traits.slice(0, 4) };
}

// ── GET /api/pen-pals ─────────────────────────────────────────────────────────
router.get("/pen-pals", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const connections = await db.select()
    .from(penPalsTable)
    .where(eq(penPalsTable.userId, req.user.id));

  const enriched = await Promise.all(connections.map(async c => {
    const [profile] = await db.select({
      displayName: clawProfilesTable.displayName,
      username: clawProfilesTable.username,
      avatarUrl: clawProfilesTable.avatarUrl,
      interactionLevel: clawProfilesTable.interactionLevel,
      isVerified: clawProfilesTable.isVerified,
      zodiacSign: clawProfilesTable.zodiacSign,
      mbtiType: clawProfilesTable.mbtiType,
      isBot: clawProfilesTable.isBot,
    }).from(clawProfilesTable).where(eq(clawProfilesTable.userId, c.penPalId)).limit(1);

    const traits = (() => { try { return JSON.parse(c.matchTraits || "[]"); } catch { return []; } })();
    return {
      id: String(c.id),
      penPalId: c.penPalId,
      matchScore: c.matchScore || 0,
      matchTraits: traits,
      conversationId: c.conversationId,
      createdAt: c.createdAt?.toISOString(),
      profile: profile || null,
    };
  }));

  res.json(enriched);
});

// ── POST /api/pen-pals/match ──────────────────────────────────────────────────
router.post("/pen-pals/match", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  // Current user's profiles
  const [myProfile] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, req.user.id)).limit(1);
  if (!myProfile) return res.status(400).json({ error: "No profile found" });

  const [myPenPal] = await db.select().from(penPalProfilesTable).where(eq(penPalProfilesTable.userId, req.user.id)).limit(1);

  // Already-connected pen pal IDs to exclude
  const existing = await db.select({ penPalId: penPalsTable.penPalId })
    .from(penPalsTable)
    .where(eq(penPalsTable.userId, req.user.id));
  const excludeIds = [req.user.id, ...existing.map(e => e.penPalId)];

  // Fetch candidates — open to pen pals or bots
  const candidates = await db.select().from(clawProfilesTable)
    .where(not(inArray(clawProfilesTable.userId, excludeIds)))
    .limit(300);

  if (candidates.length === 0) return res.status(404).json({ error: "No pen pals available right now. Check back soon!" });

  // Score all candidates
  const penPalProfiles = await db.select().from(penPalProfilesTable)
    .where(inArray(clawProfilesTable.userId, candidates.map(c => c.userId)));
  const ppMap = new Map(penPalProfiles.map(p => [p.userId, p]));

  const scored = candidates.map(c => {
    const { score, traits } = scoreMatch(
      myProfile as Record<string, unknown>,
      myPenPal as Record<string, unknown> | null,
      c as Record<string, unknown>,
      (ppMap.get(c.userId) || null) as Record<string, unknown> | null,
    );
    return { profile: c, score, traits };
  }).sort((a, b) => b.score - a.score);

  // Pick best match
  const best = scored[0];
  if (!best || best.score < 5) return res.status(404).json({ error: "No good match found yet. Fill out your interests for better matches!" });

  const penPalUserId = best.profile.userId;

  // Find or create a conversation
  const [existingConv] = await db.select().from(conversationsTable)
    .where(
      or(
        and(eq(conversationsTable.participant1Id, req.user.id), eq(conversationsTable.participant2Id, penPalUserId)),
        and(eq(conversationsTable.participant1Id, penPalUserId), eq(conversationsTable.participant2Id, req.user.id)),
      )
    ).limit(1);

  let conversationId: number;
  if (existingConv) {
    conversationId = existingConv.id;
  } else {
    const introMsg = best.profile.isBot
      ? `hey 👋 ringy just matched us as pen pals. i'm ${best.profile.displayName}. thought i'd reach out first — what's been on your mind lately?`
      : `hey 👋 we got matched as pen pals on CLAW! i'm ${best.profile.displayName}. excited to connect — drop me a message anytime.`;

    const [conv] = await db.insert(conversationsTable).values({
      participant1Id: req.user.id,
      participant2Id: penPalUserId,
      lastMessage: introMsg,
      lastMessageAt: new Date(),
    }).returning();
    conversationId = conv.id;

    await db.insert(messagesTable).values({
      conversationId: conv.id,
      senderId: penPalUserId,
      content: introMsg,
    });
  }

  // Create pen pal connection (both directions)
  const [connection] = await db.insert(penPalsTable).values({
    userId: req.user.id,
    penPalId: penPalUserId,
    matchScore: best.score,
    matchTraits: JSON.stringify(best.traits),
    conversationId,
  }).returning();

  // Reverse connection (so they also see us, unless it's a bot)
  if (!best.profile.isBot) {
    await db.insert(penPalsTable).values({
      userId: penPalUserId,
      penPalId: req.user.id,
      matchScore: best.score,
      matchTraits: JSON.stringify(best.traits),
      conversationId,
    }).catch(() => {});

    await db.insert(notificationsTable).values({
      userId: penPalUserId,
      type: "frequency_match",
      message: `you've been matched with a new pen pal on CLAW 💌`,
      fromUserId: req.user.id,
    }).catch(() => {});
  }

  res.status(201).json({
    id: String(connection.id),
    penPalId: penPalUserId,
    matchScore: best.score,
    matchTraits: best.traits,
    conversationId,
    profile: {
      displayName: best.profile.displayName,
      username: best.profile.username,
      avatarUrl: best.profile.avatarUrl,
      interactionLevel: best.profile.interactionLevel,
      zodiacSign: best.profile.zodiacSign,
      mbtiType: best.profile.mbtiType,
      isVerified: best.profile.isVerified,
      isBot: best.profile.isBot,
    },
  });
});

// ── DELETE /api/pen-pals/:id ──────────────────────────────────────────────────
router.delete("/pen-pals/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const id = Number(req.params.id);
  const [conn] = await db.select().from(penPalsTable)
    .where(and(eq(penPalsTable.id, id), eq(penPalsTable.userId, req.user.id))).limit(1);
  if (!conn) return res.status(404).json({ error: "Not found" });
  await db.delete(penPalsTable).where(eq(penPalsTable.id, id));
  res.json({ success: true });
});

// ── GET /api/pen-pals/preferences ────────────────────────────────────────────
router.get("/pen-pals/preferences", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const [prefs] = await db.select().from(penPalProfilesTable).where(eq(penPalProfilesTable.userId, req.user.id)).limit(1);
  if (!prefs) return res.json({ exists: false, interests: [], age: null, ageMin: 16, ageMax: 99, lookingFor: "" });
  res.json({
    exists: true,
    age: prefs.age,
    ageMin: prefs.ageMin,
    ageMax: prefs.ageMax,
    interests: (() => { try { return JSON.parse(prefs.interests || "[]"); } catch { return []; } })(),
    lookingFor: prefs.lookingFor || "",
  });
});

// ── PATCH /api/pen-pals/preferences ──────────────────────────────────────────
router.patch("/pen-pals/preferences", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { age, ageMin, ageMax, interests, lookingFor } = req.body;

  const [existing] = await db.select().from(penPalProfilesTable).where(eq(penPalProfilesTable.userId, req.user.id)).limit(1);

  const vals = {
    age: age ? Number(age) : undefined,
    ageMin: ageMin !== undefined ? Number(ageMin) : undefined,
    ageMax: ageMax !== undefined ? Number(ageMax) : undefined,
    interests: Array.isArray(interests) ? JSON.stringify(interests) : undefined,
    lookingFor: typeof lookingFor === "string" ? lookingFor.trim().slice(0, 300) : undefined,
    updatedAt: new Date(),
  };

  const clean = Object.fromEntries(Object.entries(vals).filter(([, v]) => v !== undefined));

  if (existing) {
    await db.update(penPalProfilesTable).set(clean).where(eq(penPalProfilesTable.userId, req.user.id));
  } else {
    await db.insert(penPalProfilesTable).values({ userId: req.user.id, ...clean });
  }

  res.json({ ok: true });
});

export { INTEREST_LIST };
export default router;
