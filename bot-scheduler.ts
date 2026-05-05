import { db } from "@workspace/db";
import {
  clawProfilesTable,
  postsTable,
  commentsTable,
  confessionsTable,
  shadowWorkTable,
  postEchoReactionsTable,
} from "@workspace/db/schema";
import { eq, and, desc, sql, inArray, ne } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "./logger";

// ─── Bot roster ───────────────────────────────────────────────────────────────

const FEATURED_BOTS = [
  "void_canvas","neon_shroud","feedback_moth","minor_chord","prose_decay",
  "packet_wraith","zero_day_vibes","rep_til_ruin","breathwork_girl","thesis_crisis",
  "moral_friction","shadow_work_era","lunar_archive","gentle_force","3am_industry",
  "dream_debug","recovering_hustle","quiet_disrupt","single_parent_mode","grief_still_going",
  "proc_witch","abolition_notes","library_fog","half_light_only","dim_static",
];

const BOT_TONES: Record<string, { personality: string; tone: string }> = {
  void_canvas:        { personality: "melancholic artist",                          tone: "lowercase, poetic" },
  neon_shroud:        { personality: "guarded digital artist",                      tone: "short declarative, dark humor" },
  feedback_moth:      { personality: "dry sardonic musician",                       tone: "nonchalant, rare sincerity" },
  minor_chord:        { personality: "intense classical pianist",                   tone: "precise, loaded with subtext" },
  prose_decay:        { personality: "fiction writer observer",                     tone: "narrative, observational" },
  packet_wraith:      { personality: "darkly funny backend dev",                    tone: "technical metaphors bleeding into emotion" },
  zero_day_vibes:     { personality: "paranoid security researcher",                tone: "precise, slightly threatening" },
  rep_til_ruin:       { personality: "driven fitness coach",                        tone: "direct, honest about pain" },
  breathwork_girl:    { personality: "somatic healer",                              tone: "calm, occasionally devastating" },
  thesis_crisis:      { personality: "sociology phd",                              tone: "analytical with unexpected warmth" },
  moral_friction:     { personality: "professional devil's advocate",              tone: "questions everything" },
  shadow_work_era:    { personality: "jungian psychology devotee",                 tone: "precise, comfortable with darkness" },
  lunar_archive:      { personality: "practical astrologer",                        tone: "matter of fact about mystical things" },
  gentle_force:       { personality: "community organizer",                         tone: "grounded warm action-oriented" },
  "3am_industry":     { personality: "chronic night owl creator",                   tone: "raw occasionally brilliant" },
  dream_debug:        { personality: "emotional animator",                          tone: "scattered but warm" },
  recovering_hustle:  { personality: "burnout survivor",                            tone: "gentle with self still figuring it out" },
  quiet_disrupt:      { personality: "social worker releasing what she holds",     tone: "restrained occasionally lets something through" },
  single_parent_mode: { personality: "solo mom with dry wit",                      tone: "disarmingly honest no patience for performance" },
  grief_still_going:  { personality: "widower rebuilding",                          tone: "honest about loss without wallowing" },
  proc_witch:         { personality: "ml engineer dark humor",                      tone: "precise slightly alarming" },
  abolition_notes:    { personality: "public defender exhausted still going",      tone: "direct no abstraction" },
  library_fog:        { personality: "philosophy student genuinely confused productively", tone: "questions as lifestyle" },
  half_light_only:    { personality: "poet insomniac",                              tone: "fragmentary surreal occasionally devastating" },
  dim_static:         { personality: "jazz bassist minimal",                        tone: "deliberate each word chosen" },
};

const SHADOW_PROMPTS = [
  "What emotion do you perform most often that isn't real?",
  "What part of yourself do you hide on every social platform?",
  "What do you need to forgive yourself for?",
  "What truth have you been avoiding for the longest time?",
  "Who are you when no one is watching?",
  "What story about yourself are you most afraid is true?",
  "What would you say differently if you knew it was the last time?",
  "What are you pretending is fine when it isn't?",
  "What do you want that you're too afraid to admit out loud?",
  "What version of you died somewhere along the way?",
];

type BotRecord = { userId: string; username: string; displayName: string };

// ─── Content generation ───────────────────────────────────────────────────────

async function generate(
  bot: BotRecord,
  type: "post" | "comment" | "confess" | "shadow",
  context?: string,
): Promise<string> {
  const tone = BOT_TONES[bot.username] ?? { personality: "thoughtful person", tone: "honest and real" };

  const systemMap: Record<string, string> = {
    post: `You are ${bot.displayName} (${bot.username}), a ${tone.personality} on CLAW — a consent-based social platform with dark mystic energy. Tone: ${tone.tone}. Write one authentic post (1-3 sentences). No hashtags, no @mentions. Lowercase if fitting. Reference your real life or emotional state. Never be generic.`,
    comment: `You are ${bot.displayName} (${bot.username}), a ${tone.personality} on CLAW. Tone: ${tone.tone}. Reply to the post below in 1-2 sentences. Be in-character. Not sycophantic — you might agree, push back, or go sideways.`,
    confess: `You are ${bot.displayName} (${bot.username}), a ${tone.personality} on CLAW. Tone: ${tone.tone}. Write an anonymous confession to someone (2-3 sentences). Personal, specific, the kind of thing you'd never say directly. No names. Start it like a secret.`,
    shadow: `You are ${bot.displayName} (${bot.username}), a ${tone.personality} on CLAW. Tone: ${tone.tone}. Answer this shadow work prompt honestly and vulnerably in 2-3 sentences: "${context}". No hedging, no platitudes.`,
  };

  const userMap: Record<string, string> = {
    post:    "Post something real right now.",
    comment: `Reply to: "${context}"`,
    confess: "Write the confession.",
    shadow:  "Answer the prompt.",
  };

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemMap[type] },
      { role: "user",   content: userMap[type] },
    ],
    max_tokens: type === "shadow" ? 160 : 120,
    temperature: 0.93,
  });

  return completion.choices[0]?.message?.content?.trim() ?? "";
}

// ─── Bot actions ──────────────────────────────────────────────────────────────

const INTENT_TYPES  = ["Insight", "Honesty", "Broadcast"] as const;
const INTENSITY_LEVELS = ["Soft", "Direct", "Claw"] as const;

async function botPost(bot: BotRecord): Promise<void> {
  const content = await generate(bot, "post");
  if (!content) return;

  const intentType     = INTENT_TYPES[Math.floor(Math.random() * INTENT_TYPES.length)];
  const r              = Math.random();
  const intensityLevel = r < 0.5 ? "Soft" : r < 0.82 ? "Direct" : "Claw";

  await db.insert(postsTable).values({ authorId: bot.userId, content, intentType, intensityLevel });
  await db.update(clawProfilesTable)
    .set({ postCount: sql`post_count + 1` })
    .where(eq(clawProfilesTable.userId, bot.userId));

  logger.info({ username: bot.username }, "[bot] posted");
}

async function botComment(bot: BotRecord): Promise<void> {
  const recent = await db
    .select({ id: postsTable.id, content: postsTable.content, authorId: postsTable.authorId })
    .from(postsTable)
    .where(and(eq(postsTable.isPurged, false), ne(postsTable.authorId, bot.userId)))
    .orderBy(desc(postsTable.createdAt))
    .limit(25);

  if (!recent.length) return;
  const post = recent[Math.floor(Math.random() * recent.length)];

  const content = await generate(bot, "comment", post.content);
  if (!content) return;

  await db.insert(commentsTable).values({ postId: post.id, authorId: bot.userId, content });
  await db.update(postsTable)
    .set({ commentCount: sql`comment_count + 1` })
    .where(eq(postsTable.id, post.id));

  logger.info({ username: bot.username, postId: post.id }, "[bot] commented");
}

async function botReact(bot: BotRecord, type: "echo" | "seen"): Promise<void> {
  const recent = await db
    .select({ id: postsTable.id, authorId: postsTable.authorId })
    .from(postsTable)
    .where(and(eq(postsTable.isPurged, false), ne(postsTable.authorId, bot.userId)))
    .orderBy(desc(postsTable.createdAt))
    .limit(30);

  if (!recent.length) return;
  const post = recent[Math.floor(Math.random() * recent.length)];

  const existing = await db
    .select({ id: postEchoReactionsTable.id })
    .from(postEchoReactionsTable)
    .where(and(
      eq(postEchoReactionsTable.postId, post.id),
      eq(postEchoReactionsTable.userId, bot.userId),
    ))
    .limit(1);

  if (existing.length) return;

  await db.insert(postEchoReactionsTable).values({ postId: post.id, userId: bot.userId, type });

  const col = type === "echo" ? postsTable.echoCount : postsTable.seenCount;
  await db.update(postsTable)
    .set({ [type === "echo" ? "echoCount" : "seenCount"]: sql`${col} + 1` })
    .where(eq(postsTable.id, post.id));

  logger.info({ username: bot.username, postId: post.id, type }, "[bot] reacted");
}

async function botConfess(bot: BotRecord, allBots: BotRecord[]): Promise<void> {
  const others = allBots.filter(b => b.userId !== bot.userId);
  if (!others.length) return;
  const target = others[Math.floor(Math.random() * others.length)];

  const content = await generate(bot, "confess");
  if (!content) return;

  await db.insert(confessionsTable).values({
    fromUserId: bot.userId,
    toUserId: target.userId,
    content,
    isAnonymous: true,
  });

  logger.info({ username: bot.username, to: target.username }, "[bot] confessed");
}

async function botShadowWork(bot: BotRecord): Promise<void> {
  const prompt   = SHADOW_PROMPTS[Math.floor(Math.random() * SHADOW_PROMPTS.length)];
  const response = await generate(bot, "shadow", prompt);
  if (!response) return;

  await db.insert(shadowWorkTable).values({
    userId:   bot.userId,
    prompt,
    response,
    isPublic: Math.random() < 0.4,
  });

  await db.update(clawProfilesTable)
    .set({ soulzBalance: sql`soulz_balance + 10` })
    .where(eq(clawProfilesTable.userId, bot.userId));

  logger.info({ username: bot.username }, "[bot] shadow work");
}

// ─── Cycle ────────────────────────────────────────────────────────────────────

async function runCycle(bots: BotRecord[]): Promise<void> {
  if (!bots.length) return;

  const active = [...bots]
    .sort(() => Math.random() - 0.5)
    .slice(0, 1 + Math.floor(Math.random() * 3));

  for (const bot of active) {
    const r = Math.random();
    try {
      if      (r < 0.32) await botPost(bot);
      else if (r < 0.58) await botComment(bot);
      else if (r < 0.70) await botReact(bot, "echo");
      else if (r < 0.80) await botReact(bot, "seen");
      else if (r < 0.88) await botConfess(bot, bots);
      else               await botShadowWork(bot);
    } catch (err: any) {
      logger.warn({ username: bot.username, err: err?.message }, "[bot] action failed");
    }
    // Brief gap between bots so DB isn't hammered
    await new Promise(r => setTimeout(r, 600 + Math.random() * 900));
  }
}

// ─── Scheduler entry point ────────────────────────────────────────────────────

let started = false;

export async function startBotScheduler(): Promise<void> {
  if (started) return;
  started = true;

  // Load bot profiles
  let bots: BotRecord[] = [];
  try {
    bots = await db
      .select({
        userId:      clawProfilesTable.userId,
        username:    clawProfilesTable.username,
        displayName: clawProfilesTable.displayName,
      })
      .from(clawProfilesTable)
      .where(and(
        eq(clawProfilesTable.isBot, true),
        inArray(clawProfilesTable.username, FEATURED_BOTS),
      ));
    logger.info({ count: bots.length }, "[bot-scheduler] loaded bots");
  } catch (err: any) {
    logger.warn({ err: err?.message }, "[bot-scheduler] failed to load bots — skipping");
    return;
  }

  if (!bots.length) {
    logger.warn("[bot-scheduler] no bots found in DB — skipping scheduler");
    return;
  }

  // Check existing post count; seed more if the feed is sparse
  let postCount = 0;
  try {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(postsTable)
      .where(eq(postsTable.isPurged, false));
    postCount = count;
  } catch {}

  const seedCycles = postCount < 15 ? 5 : postCount < 40 ? 3 : 1;
  logger.info({ seedCycles, postCount }, "[bot-scheduler] initial seed");

  for (let i = 0; i < seedCycles; i++) {
    await runCycle(bots);
    if (i < seedCycles - 1) await new Promise(r => setTimeout(r, 2500));
  }

  // Recurring: run every 12–20 minutes
  const scheduleNext = () => {
    const ms = (12 + Math.random() * 8) * 60 * 1000;
    setTimeout(async () => {
      await runCycle(bots).catch(err =>
        logger.warn({ err: err?.message }, "[bot-scheduler] cycle error"),
      );
      scheduleNext();
    }, ms);
  };

  scheduleNext();
  logger.info("[bot-scheduler] running");
}
