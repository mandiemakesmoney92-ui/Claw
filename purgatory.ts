import { Router } from "express";
import { db } from "@workspace/db";
import { purgatoryTable, clawProfilesTable, postsTable } from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";

const router = Router();

// AI pattern detection — simple heuristic
function detectAiPatterns(text: string): boolean {
  const lower = text.toLowerCase();
  const aiPhrases = [
    "as an ai", "i'm an ai", "i am an ai", "as a language model",
    "i cannot provide", "i don't have personal", "i don't have feelings",
    "based on the information provided", "certainly! here",
    "of course! i", "absolutely! here", "sure, here's",
    "here is a comprehensive", "i hope this helps",
    "in conclusion, it's important", "it's worth noting that",
    "as previously mentioned", "to summarize the above",
    "regenerate response", "chatgpt", "claude", "gemini",
  ];
  return aiPhrases.some(p => lower.includes(p));
}

// POST /api/purgatory/flag — flag a post as AI-generated
router.post("/purgatory/flag", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { postId, reason, content } = req.body;
  const isAi = detectAiPatterns(content || "");
  try {
    const [post] = await db.select().from(postsTable).where(eq(postsTable.id, postId));
    if (!post) return res.status(404).json({ error: "Post not found" });

    // Mark post as AI-suspected
    await db.update(postsTable).set({ aiSuspected: true }).where(eq(postsTable.id, postId));

    // Create purgatory case for the author
    const [purCase] = await db.insert(purgatoryTable).values({
      userId: post.authorId,
      reason: reason || (isAi ? "AI-generated content detected" : "Flagged as potentially AI-generated"),
      evidence: content?.slice(0, 500),
      postId,
      isAiGenerated: isAi,
      penanceTasks: JSON.stringify([
        "Write a 3-sentence public apology to the community",
        "Give 5 genuine compliments via the Compliment Wheel",
        "Post one verified original thought (no AI) in your own voice",
      ]),
    }).returning();

    // Put user in purgatory if not already
    const [profile] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, post.authorId));
    if (profile && !profile.isInPurgatory) {
      await db.update(clawProfilesTable).set({
        isInPurgatory: true,
        purgatorySince: new Date(),
        purgatoryReason: "AI-generated content submitted",
        penanceRequired: 3,
        penanceCompleted: 0,
        credibilityScore: Math.max(0, (profile.credibilityScore ?? 50) - 20),
        truthDebt: (profile.truthDebt ?? 0) + 10,
      }).where(eq(clawProfilesTable.userId, post.authorId));
    }

    res.json({ flagged: true, isAi, caseId: purCase.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/purgatory/scan — auto-scan post content on creation
router.post("/purgatory/scan", async (req, res) => {
  const { content } = req.body;
  const isAi = detectAiPatterns(content || "");
  const confidence = isAi ? "high" : "none";
  res.json({ isAi, confidence, flagged: isAi });
});

// GET /api/purgatory/me — get my purgatory status and tasks
router.get("/purgatory/me", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  try {
    const [profile] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, req.user.id));
    if (!profile?.isInPurgatory) return res.json({ isInPurgatory: false });

    const cases = await db.select().from(purgatoryTable)
      .where(and(eq(purgatoryTable.userId, req.user.id), eq(purgatoryTable.isResolved, false)))
      .orderBy(desc(purgatoryTable.createdAt)).limit(1);

    res.json({
      isInPurgatory: true,
      purgatorySince: profile.purgatorySince,
      reason: profile.purgatoryReason,
      penanceCompleted: profile.penanceCompleted,
      penanceRequired: profile.penanceRequired,
      activeCase: cases[0] || null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/purgatory/me/penance — submit penance task
router.post("/purgatory/me/penance", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { apologyText, caseId } = req.body;
  try {
    const [profile] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, req.user.id));
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    const newCompleted = (profile.penanceCompleted ?? 0) + 1;
    const isFreed = newCompleted >= (profile.penanceRequired ?? 3);

    await db.update(clawProfilesTable).set({
      penanceCompleted: newCompleted,
      isInPurgatory: !isFreed,
      purgatorySince: isFreed ? null : profile.purgatorySince,
      purgatoryReason: isFreed ? null : profile.purgatoryReason,
      credibilityScore: Math.min(100, (profile.credibilityScore ?? 50) + 5),
      truthDebt: Math.max(0, (profile.truthDebt ?? 0) - 5),
      health: Math.min(100, (profile.health ?? 100) + 20),
      energy: Math.min(100, (profile.energy ?? 100) + 15),
    }).where(eq(clawProfilesTable.userId, req.user.id));

    if (caseId && apologyText) {
      await db.update(purgatoryTable).set({
        apologyText,
        isResolved: isFreed,
        resolvedAt: isFreed ? new Date() : undefined,
      }).where(eq(purgatoryTable.id, caseId));
    }

    res.json({ success: true, freed: isFreed, penanceCompleted: newCompleted });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/purgatory/public — public purgatory cases for community view
router.get("/purgatory/public", async (req, res) => {
  try {
    const cases = await db.select().from(purgatoryTable)
      .where(eq(purgatoryTable.isResolved, false))
      .orderBy(desc(purgatoryTable.createdAt)).limit(20);
    res.json(cases);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
