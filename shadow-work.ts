import { Router } from "express";
import { db } from "@workspace/db";
import { shadowWorkTable, clawProfilesTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

const SHADOW_PROMPTS = [
  "What is a secret you're keeping from yourself?",
  "Who in your life do you secretly envy, and why?",
  "What emotion do you perform most often that isn't real?",
  "What would you say to someone if there were zero consequences?",
  "What part of yourself do you hide on every social platform?",
  "What do you need to forgive yourself for?",
  "What truth have you been avoiding for the longest time?",
  "Who are you when no one is watching?",
  "What feeling do you dismiss in yourself that you'd never dismiss in a friend?",
  "What would you say differently if you knew it was the last time?",
  "What relationship in your life is built on performance rather than truth?",
  "What are you pretending is fine when it isn't?",
  "If you could unmask one person in your life, who would it be and why?",
  "What story about yourself are you most afraid is true?",
  "What do you want that you're too afraid to admit out loud?",
  "Who have you outgrown but haven't let go of yet?",
  "What version of you died somewhere along the way?",
  "What do you wish someone would just say to you directly?",
  "What are you waiting for that you could start today?",
  "What would you post if no one knew it was you?",
];

// GET /api/shadow-work/prompt — get today's prompt
router.get("/shadow-work/prompt", async (req, res) => {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const prompt = SHADOW_PROMPTS[dayOfYear % SHADOW_PROMPTS.length];
  res.json({ prompt, promptIndex: dayOfYear % SHADOW_PROMPTS.length });
});

// POST /api/shadow-work — submit a shadow work response
router.post("/shadow-work", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { prompt, response, isPublic } = req.body;
  if (!prompt || !response) return res.status(400).json({ error: "Prompt and response required" });
  try {
    const [entry] = await db.insert(shadowWorkTable).values({
      userId: req.user.id,
      prompt,
      response,
      isPublic: !!isPublic,
    }).returning();

    // Earn SOULZ for doing shadow work
    await db.update(clawProfilesTable)
      .set({ soulzBalance: sql`soulz_balance + 10` })
      .where(eq(clawProfilesTable.userId, req.user.id));

    res.json({ ...entry, soulzEarned: 10 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/shadow-work/me — my shadow work entries
router.get("/shadow-work/me", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const entries = await db.select().from(shadowWorkTable)
      .where(eq(shadowWorkTable.userId, req.user.id))
      .orderBy(desc(shadowWorkTable.createdAt)).limit(30);
    res.json(entries);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/shadow-work/public — public shadow work entries
router.get("/shadow-work/public", async (req, res) => {
  try {
    const entries = await db.select().from(shadowWorkTable)
      .where(eq(shadowWorkTable.isPublic, true))
      .orderBy(desc(shadowWorkTable.createdAt)).limit(20);
    res.json(entries);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
