import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable, clawProfilesTable, postEchoReactionsTable } from "@workspace/db/schema";
import { eq, desc, gte, and } from "drizzle-orm";
import { sql } from "drizzle-orm";

const router = Router();

router.get("/witness-wall", async (req, res) => {
  const posts = await db.select({
    id: postsTable.id,
    content: postsTable.content,
    authorId: postsTable.authorId,
    intentType: postsTable.intentType,
    intensityLevel: postsTable.intensityLevel,
    seenCount: postsTable.seenCount,
    echoCount: postsTable.echoCount,
    createdAt: postsTable.createdAt,
  }).from(postsTable)
    .where(and(
      gte(postsTable.seenCount, 10),
      eq(postsTable.isPurged, false)
    ))
    .orderBy(desc(postsTable.seenCount))
    .limit(50);

  const withAuthors = await Promise.all(posts.map(async p => {
    const [author] = await db.select({
      displayName: clawProfilesTable.displayName,
      username: clawProfilesTable.username,
      avatarUrl: clawProfilesTable.avatarUrl,
      interactionLevel: clawProfilesTable.interactionLevel,
      isVerified: clawProfilesTable.isVerified,
    }).from(clawProfilesTable).where(eq(clawProfilesTable.userId, p.authorId)).limit(1);

    return {
      id: String(p.id),
      content: p.content,
      authorId: p.authorId,
      author: author || null,
      intentType: p.intentType,
      intensityLevel: p.intensityLevel,
      seenCount: p.seenCount || 0,
      echoCount: p.echoCount || 0,
      createdAt: p.createdAt?.toISOString(),
    };
  }));

  res.json(withAuthors);
});

export default router;
