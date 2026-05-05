import { Router } from "express";
import { db } from "@workspace/db";
import { clawProfilesTable } from "@workspace/db/schema";
import { eq, sql, gt } from "drizzle-orm";

const router = Router();

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

// In-memory zone activity tracking (lightweight, resets on server restart)
// zone → Map<userId, lastSeen timestamp>
const zoneActivity = new Map<string, Map<string, number>>();

const VALID_ZONES = ["feed","trending","confess","live","reels","circles","broadcasts","messages","tarot","purgatory","shop","world"];

function cleanZone(zone: string) {
  const now = Date.now();
  const zmap = zoneActivity.get(zone);
  if (!zmap) return;
  for (const [uid, ts] of zmap) {
    if (now - ts > ONLINE_THRESHOLD_MS) zmap.delete(uid);
  }
}

function getZoneCounts(): Record<string, number> {
  const result: Record<string, number> = {};
  for (const zone of VALID_ZONES) {
    cleanZone(zone);
    result[zone] = zoneActivity.get(zone)?.size || 0;
  }
  return result;
}

// POST /api/presence/heartbeat — update lastSeen + zone
router.post("/presence/heartbeat", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { zone } = req.body;

  await db.update(clawProfilesTable)
    .set({ lastSeenAt: new Date() })
    .where(eq(clawProfilesTable.userId, req.user.id));

  // Track zone activity
  if (zone && VALID_ZONES.includes(zone)) {
    if (!zoneActivity.has(zone)) zoneActivity.set(zone, new Map());
    zoneActivity.get(zone)!.set(req.user.id, Date.now());
    // Remove user from other zones (they can only be in one zone)
    for (const [z, zmap] of zoneActivity) {
      if (z !== zone) zmap.delete(req.user.id);
    }
  }

  res.json({ ok: true });
});

// GET /api/presence/world — active users per zone
router.get("/presence/world", (req, res) => {
  const counts = getZoneCounts();
  // Total online = sum of all zones + any with no zone tracked
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  res.json({ zones: counts, total });
});

// GET /api/presence/:userId — individual user online status
router.get("/presence/:userId", async (req, res) => {
  const [p] = await db.select({ lastSeenAt: clawProfilesTable.lastSeenAt })
    .from(clawProfilesTable)
    .where(eq(clawProfilesTable.userId, req.params.userId))
    .limit(1);

  if (!p) return res.status(404).json({ error: "User not found" });

  const lastSeen = p.lastSeenAt;
  const isOnline = lastSeen && (Date.now() - new Date(lastSeen).getTime() < ONLINE_THRESHOLD_MS);

  res.json({ isOnline: !!isOnline, lastSeenAt: lastSeen?.toISOString() || null });
});

export default router;
