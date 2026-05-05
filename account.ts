import { Router } from "express";
import { db } from "@workspace/db";
import {
  clawProfilesTable, postsTable, commentsTable, followsTable,
  confessionsTable, notificationsTable, clawCoinsTable,
} from "@workspace/db/schema";
import { eq, or } from "drizzle-orm";

const router = Router();

// DELETE /api/account/me — hard delete account and all associated data
router.delete("/account/me", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const userId = req.user.id;

  try {
    // Delete in dependency order to avoid FK violations
    await db.delete(notificationsTable).where(eq(notificationsTable.userId, userId));
    await db.delete(commentsTable).where(eq(commentsTable.authorId, userId));
    await db.delete(followsTable).where(or(eq(followsTable.followerId, userId), eq(followsTable.followingId, userId)));
    await db.delete(confessionsTable).where(eq(confessionsTable.authorId, userId));
    await db.delete(clawCoinsTable).where(eq(clawCoinsTable.userId, userId));
    await db.delete(postsTable).where(eq(postsTable.authorId, userId));
    await db.delete(clawProfilesTable).where(eq(clawProfilesTable.userId, userId));

    // Destroy session + logout
    req.logout(() => {
      req.session?.destroy(() => {});
    });

    res.json({ ok: true, message: "Account deleted. We'll miss you." });
  } catch (err: any) {
    console.error("[Account] Delete error:", err.message);
    res.status(500).json({ error: "Failed to delete account. Please contact support." });
  }
});

export default router;
