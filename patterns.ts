import { Router } from "express";
import { db } from "@workspace/db";
import { userPatternsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/patterns/me", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const [p] = await db.select().from(userPatternsTable).where(eq(userPatternsTable.userId, req.user.id)).limit(1);
  if (!p) return res.json({ userId: req.user.id, pagesVisited: {}, postModes: { soft: 0, direct: 0, claw: 0 }, shadowCompletions: 0, streakCount: 0 });

  res.json({
    userId: p.userId,
    pagesVisited: (() => { try { return JSON.parse(p.pagesVisited || "{}"); } catch { return {}; } })(),
    postModes: (() => { try { return JSON.parse(p.postModes || "{}"); } catch { return { soft: 0, direct: 0, claw: 0 }; } })(),
    wordsUsed: (() => { try { return JSON.parse(p.wordsUsed || "[]"); } catch { return []; } })(),
    shadowCompletions: p.shadowCompletions || 0,
    streakCount: p.streakCount || 0,
    streakLastActive: p.streakLastActive?.toISOString() || null,
    lastMirrorMoment: p.lastMirrorMoment?.toISOString() || null,
    updatedAt: p.updatedAt?.toISOString() || null,
  });
});

router.patch("/patterns/me", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { pageVisit, postMode } = req.body;

  const [existing] = await db.select().from(userPatternsTable).where(eq(userPatternsTable.userId, req.user.id)).limit(1);

  if (!existing) {
    const pagesVisited: Record<string, number> = {};
    if (pageVisit) pagesVisited[pageVisit] = 1;
    const postModes = { soft: 0, direct: 0, claw: 0 };
    if (postMode === "Soft") postModes.soft = 1;
    else if (postMode === "Direct") postModes.direct = 1;
    else if (postMode === "Claw") postModes.claw = 1;
    await db.insert(userPatternsTable).values({
      userId: req.user.id,
      pagesVisited: JSON.stringify(pagesVisited),
      postModes: JSON.stringify(postModes),
    });
    return res.json({ ok: true });
  }

  const updates: Record<string, any> = { updatedAt: new Date() };

  if (pageVisit) {
    const pv: Record<string, number> = (() => { try { return JSON.parse(existing.pagesVisited || "{}"); } catch { return {}; } })();
    pv[pageVisit] = (pv[pageVisit] || 0) + 1;
    updates.pagesVisited = JSON.stringify(pv);
  }

  if (postMode) {
    const pm: Record<string, number> = (() => { try { return JSON.parse(existing.postModes || "{}"); } catch { return { soft: 0, direct: 0, claw: 0 }; } })();
    const key = postMode.toLowerCase();
    if (["soft", "direct", "claw"].includes(key)) {
      pm[key] = (pm[key] || 0) + 1;
      updates.postModes = JSON.stringify(pm);
    }
  }

  await db.update(userPatternsTable).set(updates).where(eq(userPatternsTable.userId, req.user.id));
  res.json({ ok: true });
});

export default router;
