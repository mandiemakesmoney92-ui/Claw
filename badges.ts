import { Router } from "express";
import { db } from "@workspace/db";
import { userBadgesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

export const BADGE_CATALOG: Record<string, { emoji: string; name: string; description: string; rarity: "common" | "rare" | "legendary" }> = {
  // ── Exploration ────────────────────────────────────────────────────────────
  lurker_cat:           { emoji: "🐱", name: "Lurker Cat",           description: "Viewed 50+ profiles without making a sound", rarity: "common" },
  social_butterfly:     { emoji: "🦋", name: "Social Butterfly",     description: "Connected with 10+ new people on CLAW", rarity: "common" },
  first_hello:          { emoji: "👋", name: "First Hello",          description: "Sent your first message to someone new", rarity: "common" },
  circle_hopper:        { emoji: "🌀", name: "Circle Hopper",        description: "Joined 5+ different social circles", rarity: "common" },

  // ── Creation & Expression ──────────────────────────────────────────────────
  chaos_kitten:         { emoji: "😼", name: "Chaos Kitten",         description: "Posted 10+ Claw-level truths. No filter.", rarity: "common" },
  truth_teller:         { emoji: "🗣️", name: "Truth Teller",         description: "Posted 25+ times. Consistency is rare.", rarity: "common" },
  midnight_poster:      { emoji: "🌙", name: "Midnight Poster",      description: "Posted after 1am 5+ times. Night energy.", rarity: "common" },
  going_viral:          { emoji: "🚀", name: "Going Viral",          description: "A post of yours hit 100+ views", rarity: "rare" },
  viral_fur_ball:       { emoji: "🌟", name: "Viral Fur Ball",       description: "Got 50+ likes on a single post. Famous cat.", rarity: "legendary" },
  album_curator:        { emoji: "📸", name: "Album Curator",        description: "Created 5+ photo albums. Life is art.", rarity: "common" },

  // ── Community ──────────────────────────────────────────────────────────────
  confession_royalty:   { emoji: "💌", name: "Confession Royalty",   description: "Sent 20+ confessions. You're brave (or chaotic).", rarity: "rare" },
  compliment_dealer:    { emoji: "✨", name: "Compliment Dealer",     description: "Spun the compliment wheel 30+ times. Kind chaos.", rarity: "common" },
  top_tipper:           { emoji: "💰", name: "Top Tipper",           description: "Tipped 10+ different people. Big energy.", rarity: "rare" },
  graffiti_artist:      { emoji: "🎨", name: "Graffiti Artist",      description: "Left your mark on 10+ profile walls.", rarity: "common" },
  hater_magnet:         { emoji: "😈", name: "Hater Magnet",         description: "On 5+ people's Top Haters list. Respected.", rarity: "legendary" },

  // ── New Connections (the more people you meet, the more badges you unlock) ──
  newcomer:             { emoji: "🤝", name: "Newcomer",             description: "Interacted with 3 people you'd never met before", rarity: "common" },
  bridge_builder:       { emoji: "🌉", name: "Bridge Builder",       description: "Connected with 25+ unique users across CLAW", rarity: "rare" },
  community_anchor:     { emoji: "⚓", name: "Community Anchor",     description: "Connected with 100+ unique users. You're home.", rarity: "legendary" },
  conversation_starter: { emoji: "💬", name: "Conversation Starter", description: "Started 10+ conversations with new people", rarity: "common" },
  open_heart:           { emoji: "💜", name: "Open Heart",           description: "Responded to 20+ messages from strangers", rarity: "rare" },

  // ── Engagement Streaks ────────────────────────────────────────────────────
  daily_ritual:         { emoji: "🗓️", name: "Daily Ritual",        description: "Logged in 7 days in a row. The habit sticks.", rarity: "common" },
  devoted_one:          { emoji: "🔥", name: "Devoted One",          description: "Active 30+ days in a row. Rare dedication.", rarity: "rare" },
  night_owl:            { emoji: "🦉", name: "Night Owl",            description: "Active after midnight 10+ times. Never sleeps.", rarity: "common" },

  // ── Shadow Work & Growth ──────────────────────────────────────────────────
  dream_weaver:         { emoji: "🌙", name: "Dream Weaver",         description: "Logged 15+ dreams. The subconscious has spoken.", rarity: "rare" },
  shadow_walker:        { emoji: "🌑", name: "Shadow Walker",        description: "Completed 10+ shadow work prompts", rarity: "rare" },
  inner_work:           { emoji: "🧿", name: "Inner Work",           description: "Completed your first shadow work prompt", rarity: "common" },

  // ── Arena & Competition ───────────────────────────────────────────────────
  purge_warrior:        { emoji: "🔥", name: "Purge Warrior",        description: "Released 25+ purge posts. Therapist? Nope.", rarity: "common" },
  arena_champion:       { emoji: "🏆", name: "Arena Champion",       description: "Won a Purge Arena challenge. Undeniable.", rarity: "legendary" },

  // ── Mystic & Secret ───────────────────────────────────────────────────────
  mystic_paw:           { emoji: "🔮", name: "Mystic Paw",           description: "Activated Ringy's mystic mode 3+ times. You see things.", rarity: "rare" },
  echo_finder:          { emoji: "👁️", name: "Echo Finder",          description: "Discovered the hidden lore of CLAW. Very few know.", rarity: "legendary" },

  // ── Live & Broadcasting ───────────────────────────────────────────────────
  first_live:           { emoji: "📡", name: "First Live",           description: "Went live for the first time on CLAW", rarity: "common" },
  live_legend:          { emoji: "🎙️", name: "Live Legend",          description: "Hosted 10+ live sessions. You're a regular.", rarity: "rare" },
  crowd_puller:         { emoji: "👥", name: "Crowd Puller",         description: "Had 10+ viewers in a single live session", rarity: "rare" },

  // ── Status & Legacy ───────────────────────────────────────────────────────
  og_claw:              { emoji: "🐾", name: "OG Claw",              description: "One of the first 100 members. Ancient history.", rarity: "legendary" },
  verified_human:       { emoji: "✅", name: "Verified Human",       description: "Completed humanity verification. Real one.", rarity: "rare" },
  credible:             { emoji: "⚡", name: "Credible",              description: "Maintained a credibility score above 80", rarity: "rare" },
};

router.get("/badges/catalog", (_req, res) => {
  res.json(BADGE_CATALOG);
});

router.get("/badges/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const badges = await db.select().from(userBadgesTable)
      .where(eq(userBadgesTable.userId, userId));
    const enriched = badges.map(b => ({
      ...b,
      ...BADGE_CATALOG[b.badgeId],
    }));
    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/badges/award", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { badgeId } = req.body;
  if (!BADGE_CATALOG[badgeId]) return res.status(400).json({ error: "Unknown badge" });
  try {
    const existing = await db.select().from(userBadgesTable)
      .where(eq(userBadgesTable.userId, req.user.id));
    if (existing.some(b => b.badgeId === badgeId)) {
      return res.json({ alreadyHas: true });
    }
    await db.insert(userBadgesTable).values({ userId: req.user.id, badgeId });
    res.json({ awarded: true, badge: BADGE_CATALOG[badgeId] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { router as badgesRouter };
export default router;
