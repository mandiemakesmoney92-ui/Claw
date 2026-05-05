import { Router } from "express";
import { db } from "@workspace/db";
import { profileVisitorsTable } from "@workspace/db/schema";
import { eq, desc, sql, and, gt } from "drizzle-orm";

const router = Router();

// Record a profile visit
router.post("/visitors/:profileUserId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { profileUserId } = req.params;
  if (profileUserId === req.user.id) return res.json({ recorded: false });
  try {
    await db.insert(profileVisitorsTable).values({
      profileUserId,
      visitorId: req.user.id,
    });
    res.json({ recorded: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get recent visitors for a profile (only owner can see full list)
router.get("/visitors/:profileUserId", async (req, res) => {
  const { profileUserId } = req.params;
  try {
    // Live visitors = visited in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const liveCount = await db
      .select({ count: sql<number>`count(distinct ${profileVisitorsTable.visitorId})` })
      .from(profileVisitorsTable)
      .where(and(
        eq(profileVisitorsTable.profileUserId, profileUserId),
        gt(profileVisitorsTable.visitedAt, fiveMinutesAgo)
      ));
    const live = Number(liveCount[0]?.count || 0);

    // Recent visitors in last 24h (only shown to owner)
    const isOwner = req.isAuthenticated() && req.user.id === profileUserId;
    let recentVisitors: any[] = [];
    if (isOwner) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      recentVisitors = await db
        .select()
        .from(profileVisitorsTable)
        .where(and(
          eq(profileVisitorsTable.profileUserId, profileUserId),
          gt(profileVisitorsTable.visitedAt, oneDayAgo)
        ))
        .orderBy(desc(profileVisitorsTable.visitedAt))
        .limit(20);
    }

    res.json({ liveViewers: live, recentVisitors });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
