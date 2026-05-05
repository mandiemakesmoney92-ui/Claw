import { Router } from "express";
import { db } from "@workspace/db";
import { clawProfilesTable, usersTable } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

const router = Router();

const votesTable = pgTable("claw_member_votes", {
  id: serial("id").primaryKey(),
  voterId: text("voter_id").notNull().references(() => usersTable.id),
  votedForId: text("voted_for_id").notNull().references(() => usersTable.id),
  month: text("month").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

router.get("/vote/current", async (req, res) => {
  const month = currentMonth();

  const tally = await db.select({
    userId: votesTable.votedForId,
    count: sql<number>`count(*)`,
  })
    .from(votesTable)
    .where(eq(votesTable.month, month))
    .groupBy(votesTable.votedForId)
    .orderBy(desc(sql`count(*)`))
    .limit(10);

  const leaders = await Promise.all(tally.map(async (row) => {
    const [p] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, row.userId)).limit(1);
    return { userId: row.userId, votes: Number(row.count), username: p?.username, displayName: p?.displayName, avatarUrl: p?.avatarUrl, isMember: p?.isMember };
  }));

  let myVote: string | null = null;
  if (req.isAuthenticated()) {
    const [mv] = await db.select().from(votesTable)
      .where(sql`${votesTable.voterId} = ${req.user.id} AND ${votesTable.month} = ${month}`)
      .limit(1);
    myVote = mv?.votedForId || null;
  }

  res.json({ month, leaders, myVote });
});

router.post("/vote/:userId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const month = currentMonth();
  const votedForId = req.params.userId;

  if (votedForId === req.user.id) return res.status(400).json({ error: "Can't vote for yourself" });

  const [target] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, votedForId)).limit(1);
  if (!target) return res.status(404).json({ error: "User not found" });

  try {
    await db.insert(votesTable).values({ voterId: req.user.id, votedForId, month });
    res.json({ ok: true, message: `Voted for ${target.displayName} as Influential Kat of the month!` });
  } catch (err: any) {
    if (err.code === "23505") return res.status(400).json({ error: "You've already voted this month" });
    throw err;
  }
});

export default router;
