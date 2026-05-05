import { Router } from "express";
import { db } from "@workspace/db";
import { photoAlbumsTable, albumPhotosTable } from "@workspace/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

const router = Router();

router.get("/albums/:userId", async (req, res) => {
  const { userId } = req.params;
  const isOwner = req.isAuthenticated() && req.user.id === userId;
  try {
    const albums = await db
      .select()
      .from(photoAlbumsTable)
      .where(
        isOwner
          ? eq(photoAlbumsTable.userId, userId)
          : and(eq(photoAlbumsTable.userId, userId), eq(photoAlbumsTable.isPublic, true))
      )
      .orderBy(desc(photoAlbumsTable.createdAt));
    res.json(albums);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/albums", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { title, description, isPublic = true } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: "Title required" });
  try {
    const [album] = await db.insert(photoAlbumsTable).values({
      userId: req.user.id,
      title: title.trim(),
      description: description?.trim() || null,
      isPublic: !!isPublic,
    }).returning();
    res.json(album);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/albums/:id", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const id = parseInt(req.params.id);
  try {
    await db.delete(albumPhotosTable).where(eq(albumPhotosTable.albumId, id));
    await db.delete(photoAlbumsTable)
      .where(and(eq(photoAlbumsTable.id, id), eq(photoAlbumsTable.userId, req.user.id)));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/albums/:albumId/photos", async (req, res) => {
  const albumId = parseInt(req.params.albumId);
  try {
    const photos = await db.select().from(albumPhotosTable)
      .where(eq(albumPhotosTable.albumId, albumId))
      .orderBy(desc(albumPhotosTable.createdAt));
    res.json(photos);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/albums/:albumId/photos", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const albumId = parseInt(req.params.albumId);
  const { photoUrl, caption } = req.body;
  if (!photoUrl) return res.status(400).json({ error: "photoUrl required" });
  try {
    const [photo] = await db.insert(albumPhotosTable).values({
      albumId,
      userId: req.user.id,
      photoUrl,
      caption: caption?.trim() || null,
    }).returning();
    await db.update(photoAlbumsTable)
      .set({ photoCount: sql`${photoAlbumsTable.photoCount} + 1` })
      .where(eq(photoAlbumsTable.id, albumId));
    res.json(photo);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/albums/:albumId/photos/:photoId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const albumId = parseInt(req.params.albumId);
  const photoId = parseInt(req.params.photoId);
  try {
    await db.delete(albumPhotosTable)
      .where(and(eq(albumPhotosTable.id, photoId), eq(albumPhotosTable.userId, req.user.id)));
    await db.update(photoAlbumsTable)
      .set({ photoCount: sql`greatest(${photoAlbumsTable.photoCount} - 1, 0)` })
      .where(eq(photoAlbumsTable.id, albumId));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
