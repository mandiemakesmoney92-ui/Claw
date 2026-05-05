import { Router } from "express";
import { db } from "@workspace/db";
import { clawProfilesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

// The one profile that gets everything unlocked — showcase/demo profile
// Matched by email so it survives auth provider migrations
const SHOWCASE_EMAIL = "mandiemariemaddox92@gmail.com";

// GET /api/entitlements/me — returns what the authenticated user is entitled to
router.get("/entitlements/me", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const userId = req.user.id;
  const userEmail = req.user.email?.toLowerCase();

  // Showcase profile always gets everything, hardcoded server-side
  if (userEmail === SHOWCASE_EMAIL || userId === "56051899") {
    return res.json({
      isMember: true,
      isVerified: true,
      isHumanVerified: true,
      hasPurgatoryFreeCard: true,
      soulzBalance: 99999,
      allThemesUnlocked: true,
      allFontsUnlocked: true,
      allEffectsUnlocked: true,
      allCursorsUnlocked: true,
      allMasksUnlocked: true,
      isShowcaseProfile: true,
    });
  }

  // All other users: read from DB (what they actually purchased)
  const [profile] = await db.select({
    isMember: clawProfilesTable.isMember,
    isVerified: clawProfilesTable.isVerified,
    humanVerified: clawProfilesTable.humanVerified,
    purgatoryFreeCard: clawProfilesTable.purgatoryFreeCard,
    soulzBalance: clawProfilesTable.soulzBalance,
    membershipExpiresAt: clawProfilesTable.membershipExpiresAt,
    purchasedThemes: clawProfilesTable.purchasedThemes,
    purchasedFonts: clawProfilesTable.purchasedFonts,
    purchasedEffects: clawProfilesTable.purchasedEffects,
    purchasedCursors: clawProfilesTable.purchasedCursors,
    purchasedMasks: clawProfilesTable.purchasedMasks,
  }).from(clawProfilesTable).where(eq(clawProfilesTable.userId, userId)).limit(1);

  if (!profile) return res.json({ isMember: false, isVerified: false });

  // Check if membership is still active
  const memberActive = profile.isMember &&
    (!profile.membershipExpiresAt || new Date(profile.membershipExpiresAt) > new Date());

  const parse = (v: string | null | undefined): string[] => {
    if (!v) return [];
    try { return JSON.parse(v); } catch { return []; }
  };

  return res.json({
    isMember: memberActive,
    isVerified: profile.isVerified || false,
    isHumanVerified: profile.humanVerified || false,
    hasPurgatoryFreeCard: profile.purgatoryFreeCard || false,
    soulzBalance: profile.soulzBalance || 0,
    allThemesUnlocked: false,
    allFontsUnlocked: false,
    allEffectsUnlocked: false,
    allCursorsUnlocked: false,
    allMasksUnlocked: false,
    purchasedThemes: parse(profile.purchasedThemes),
    purchasedFonts: parse(profile.purchasedFonts),
    purchasedEffects: parse(profile.purchasedEffects),
    purchasedCursors: parse(profile.purchasedCursors),
    purchasedMasks: parse(profile.purchasedMasks),
    isShowcaseProfile: false,
  });
});

export default router;
