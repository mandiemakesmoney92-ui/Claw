import { Router } from "express";
import { db } from "@workspace/db";
import { mirrorMomentsTable, postsTable, clawProfilesTable } from "@workspace/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";

const router = Router();

const MIRROR_QUESTIONS = [
  "What are you actually feeling right now?",
  "What did you almost say today — and didn't?",
  "What have you been pretending is fine?",
  "What would you do if no one was watching?",
  "What truth have you been carrying alone?",
  "What are you afraid to want?",
  "Who are you when no one needs anything from you?",
  "What feeling have you been pushing down this week?",
  "What do you wish someone would ask you?",
  "What part of yourself have you been ignoring?",
  "When did you last feel fully seen?",
  "What story are you telling yourself that might not be true?",
  "What would you tell yourself from a year ago?",
  "What do you keep returning to, even when you try not to?",
  "What are you grieving that you haven't named yet?",
  "What feels too small to say out loud — but isn't?",
  "When did you last choose yourself?",
  "What does your body know that your mind keeps dismissing?",
  "What would feel like relief right now?",
  "What are you most afraid of being honest about — with yourself?",
];

function getTodayQuestion(userId: string): string {
  const dayOfYear = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const hash = userId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return MIRROR_QUESTIONS[(dayOfYear + hash) % MIRROR_QUESTIONS.length];
}

router.get("/mirror-moment/today", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [existing] = await db.select().from(mirrorMomentsTable)
    .where(and(
      eq(mirrorMomentsTable.userId, req.user.id),
      gte(mirrorMomentsTable.createdAt, todayStart)
    )).limit(1);

  if (existing) {
    return res.json({ completed: true, question: existing.question, response: existing.response, visibility: existing.visibility });
  }

  const question = getTodayQuestion(req.user.id);
  res.json({ completed: false, question });
});

router.post("/mirror-moment/respond", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const { question, response, visibility } = req.body;
  if (!question) return res.status(400).json({ error: "Question required" });
  if (!["private", "anonymous", "skipped"].includes(visibility)) {
    return res.status(400).json({ error: "Invalid visibility" });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Prevent duplicate today
  const [existing] = await db.select().from(mirrorMomentsTable)
    .where(and(eq(mirrorMomentsTable.userId, req.user.id), gte(mirrorMomentsTable.createdAt, todayStart))).limit(1);
  if (existing) return res.json({ ok: true, alreadyDone: true });

  const [moment] = await db.insert(mirrorMomentsTable).values({
    userId: req.user.id,
    question,
    response: response?.trim() || null,
    visibility,
  }).returning();

  res.status(201).json({ ok: true, id: String(moment.id) });
});

// Anonymous public mirror moments (for the feed)
router.get("/mirror-moment/shared", async (req, res) => {
  const moments = await db.select({
    id: mirrorMomentsTable.id,
    question: mirrorMomentsTable.question,
    response: mirrorMomentsTable.response,
    createdAt: mirrorMomentsTable.createdAt,
  }).from(mirrorMomentsTable)
    .where(eq(mirrorMomentsTable.visibility, "anonymous"))
    .orderBy(desc(mirrorMomentsTable.createdAt))
    .limit(20);

  res.json(moments.map(m => ({
    id: String(m.id),
    question: m.question,
    response: m.response,
    createdAt: m.createdAt?.toISOString(),
  })));
});

export default router;
