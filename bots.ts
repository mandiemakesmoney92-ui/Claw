import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { clawProfilesTable, postsTable } from "@workspace/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

// The 25 featured bot usernames
const FEATURED_BOTS = [
  "void_canvas","neon_shroud","feedback_moth","minor_chord","prose_decay",
  "packet_wraith","zero_day_vibes","rep_til_ruin","breathwork_girl","thesis_crisis",
  "moral_friction","shadow_work_era","lunar_archive","gentle_force","3am_industry",
  "dream_debug","recovering_hustle","quiet_disrupt","single_parent_mode","grief_still_going",
  "proc_witch","abolition_notes","library_fog","half_light_only","dim_static",
];

// Bot personality snippets for generation (minimal, server-side)
const BOT_TONES: Record<string, { personality: string; tone: string }> = {
  void_canvas: { personality: "melancholic artist", tone: "lowercase, poetic" },
  neon_shroud: { personality: "guarded digital artist", tone: "short declarative, dark humor" },
  feedback_moth: { personality: "dry sardonic musician", tone: "nonchalant, rare sincerity" },
  minor_chord: { personality: "intense classical pianist", tone: "precise, loaded with subtext" },
  prose_decay: { personality: "fiction writer observer", tone: "narrative, observational" },
  packet_wraith: { personality: "darkly funny backend dev", tone: "technical metaphors bleeding into emotion" },
  zero_day_vibes: { personality: "paranoid security researcher", tone: "precise, slightly threatening" },
  rep_til_ruin: { personality: "driven fitness coach", tone: "direct, honest about pain" },
  breathwork_girl: { personality: "somatic healer", tone: "calm, occasionally devastating" },
  thesis_crisis: { personality: "sociology phd", tone: "analytical with unexpected warmth" },
  moral_friction: { personality: "professional devil's advocate", tone: "questions everything" },
  shadow_work_era: { personality: "jungian psychology devotee", tone: "precise, comfortable with darkness" },
  lunar_archive: { personality: "practical astrologer", tone: "matter of fact about mystical things" },
  gentle_force: { personality: "community organizer", tone: "grounded warm action-oriented" },
  "3am_industry": { personality: "chronic night owl creator", tone: "raw occasionally brilliant" },
  dream_debug: { personality: "emotional animator", tone: "scattered but warm" },
  recovering_hustle: { personality: "burnout survivor", tone: "gentle with self still figuring it out" },
  quiet_disrupt: { personality: "social worker releasing what she holds", tone: "restrained occasionally lets something through" },
  single_parent_mode: { personality: "solo mom with dry wit", tone: "disarmingly honest no patience for performance" },
  grief_still_going: { personality: "widower rebuilding", tone: "honest about loss without wallowing" },
  proc_witch: { personality: "ml engineer dark humor", tone: "precise slightly alarming" },
  abolition_notes: { personality: "public defender exhausted still going", tone: "direct no abstraction" },
  library_fog: { personality: "philosophy student genuinely confused productively", tone: "questions as lifestyle" },
  half_light_only: { personality: "poet insomniac", tone: "fragmentary surreal occasionally devastating" },
  dim_static: { personality: "jazz bassist minimal", tone: "deliberate each word chosen" },
};

// Cache: don't regenerate more than once per 5 minutes
let activityCache: any[] = [];
let lastGenTime = 0;
const GEN_COOLDOWN_MS = 5 * 60 * 1000;

// GET /api/bots/activity — return recent bot activity
router.get("/bots/activity", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  // Return cache if fresh enough
  if (activityCache.length > 0 && Date.now() - lastGenTime < GEN_COOLDOWN_MS) {
    return res.json(activityCache);
  }

  try {
    // Get the 25 featured bot profiles from DB
    const bots = await db
      .select({ userId: clawProfilesTable.userId, username: clawProfilesTable.username, displayName: clawProfilesTable.displayName, avatarUrl: clawProfilesTable.avatarUrl })
      .from(clawProfilesTable)
      .where(and(eq(clawProfilesTable.isBot, true), inArray(clawProfilesTable.username, FEATURED_BOTS)));

    if (bots.length === 0) return res.json([]);

    // Pick 4-6 bots to be active right now
    const shuffled = bots.sort(() => Math.random() - 0.5).slice(0, 5);

    // Generate 1 post per active bot
    const activities = await Promise.all(shuffled.map(async (bot) => {
      const toneData = BOT_TONES[bot.username] || { personality: "thoughtful person", tone: "honest and real" };
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are ${bot.displayName} (${bot.username}), a ${toneData.personality} on CLAW — a consent-based social platform with dark mystic energy.
              
Your tone is: ${toneData.tone}
Write a single authentic post (1-3 sentences max). No hashtags. No @mentions. No emojis unless they fit your character. Lowercase if that's your style. Speak from your specific perspective. Never be generic. Reference your actual life, interest, or current emotional state.`
            },
            { role: "user", content: "Post something real right now." }
          ],
          max_tokens: 120,
          temperature: 0.9,
        });
        return {
          bot: { username: bot.username, displayName: bot.displayName, avatarUrl: bot.avatarUrl },
          content: completion.choices[0]?.message?.content?.trim() || "",
          timestamp: Date.now() - Math.floor(Math.random() * 30 * 60 * 1000), // up to 30 mins ago
          type: "post",
        };
      } catch {
        return null;
      }
    }));

    // Generate 1-2 bot-to-bot reply interactions
    if (shuffled.length >= 2) {
      const replier = shuffled[0];
      const original = shuffled[1];
      const toneReplier = BOT_TONES[replier.username] || { personality: "thoughtful person", tone: "honest" };
      const originalPost = activities.find(a => a?.bot.username === original.username);
      
      if (originalPost?.content) {
        try {
          const replyCompletion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are ${replier.displayName} (${replier.username}), a ${toneReplier.personality} on CLAW. Your tone: ${toneReplier.tone}. Reply to someone else's post — be authentic, in-character. 1-2 sentences max. Don't be sycophantic. Could agree, push back, or add something unexpected.`,
              },
              { role: "user", content: `Reply to this post by ${original.displayName}: "${originalPost.content}"` }
            ],
            max_tokens: 80,
            temperature: 0.9,
          });
          const reply = replyCompletion.choices[0]?.message?.content?.trim();
          if (reply) {
            activities.push({
              bot: { username: replier.username, displayName: replier.displayName, avatarUrl: replier.avatarUrl },
              content: reply,
              timestamp: Date.now() - Math.floor(Math.random() * 15 * 60 * 1000),
              type: "reply",
              replyTo: { username: original.username, displayName: original.displayName, excerpt: originalPost.content.slice(0, 60) },
            });
          }
        } catch {}
      }
    }

    const validActivities = activities.filter(Boolean).sort((a, b) => (b?.timestamp || 0) - (a?.timestamp || 0));
    activityCache = validActivities;
    lastGenTime = Date.now();

    return res.json(validActivities);
  } catch (err: any) {
    console.error("[bots/activity]", err?.message || err);
    return res.status(500).json({ error: "Failed to generate bot activity" });
  }
});

// POST /api/bots/activity/refresh — force refresh cache
router.post("/bots/activity/refresh", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  lastGenTime = 0; // invalidate cache
  return res.json({ ok: true });
});

export default router;
