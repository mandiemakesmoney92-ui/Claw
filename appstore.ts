import { Router } from "express";
import { db } from "@workspace/db";
import { appPurchasesTable, clawCoinsTable, graffitiWallTable, clawProfilesTable, wallPostsTable, shoutoutsTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";

const router = Router();

function parseArr(val: any): string[] {
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val || "[]"); } catch { return []; }
}

const FONT_PACK_TO_ID: Record<string, string> = {
  font_pack_mystic:    "cinzel",
  font_pack_techno:    "orbitron",
  font_pack_dreamy:    "pacifico",
  font_pack_gothic:    "im-fell",
  font_pack_pixel:     "press-start",
  font_pack_obsessed:  "righteous",
  font_pack_bitten:    "creepster",
  font_pack_haunted:   "nosifer",
  font_pack_punk:      "rock-salt",
  font_pack_preppy:    "playfair",
  font_pack_rocker:    "metal-mania",
  font_pack_cursive:   "great-vibes",
  font_pack_graffiti:  "perm-marker",
  font_pack_blackletter:"unfraktur",
};

const COLOR_PACK_TO_ID: Record<string, string> = {
  color_pack_gold:         "color_gold",
  color_pack_violet:       "color_violet",
  color_pack_crimson:      "color_crimson",
  color_pack_cyber:        "color_cyan",
  color_pack_rose:         "color_rose",
  color_pack_emerald:      "color_emerald",
  color_pack_rainbow:      "color_rainbow",
  color_pack_dark_magenta: "color_dark-magenta",
  color_pack_purple:       "color_purple",
  color_pack_magenta:      "color_magenta",
  color_pack_deep_pink:    "color_deep-pink",
  color_pack_dark_violet:  "color_dark-violet",
  color_pack_sky_blue:     "color_sky-blue",
  color_pack_blue:         "color_blue",
  color_pack_aqua:         "color_aqua",
  color_pack_aquamarine:   "color_aquamarine",
  color_pack_lime:         "color_lime",
  color_pack_yellow:       "color_yellow",
  color_pack_red:          "color_red",
  color_pack_snow:         "color_snow",
};

export const APP_CATALOG: Record<string, { name: string; description: string; icon: string; coinCost: number; category: string }> = {
  // ── Social widgets ──────────────────────────────────────────────────────────
  graffiti_wall:   { name: "Graffiti Wall",         description: "Let visitors spray their thoughts on your profile wall.",                         icon: "🎨", coinCost: 200, category: "social" },
  confession_box:  { name: "Confession Box",        description: "An embeddable anonymous confession box right on your profile.",                    icon: "📦", coinCost: 100, category: "social" },
  soulmate_finder: { name: "Soulmate Finder",       description: "A mystical compatibility checker that surfaces your top Soulmate candidates.",     icon: "💞", coinCost: 250, category: "social" },
  ringy_cam:       { name: "Ringy Cam",             description: "Ringy watches your profile page and whispers cryptic things about your visitors.", icon: "🐱", coinCost: 300, category: "social" },
  voice_shrine:    { name: "Voice Shrine",          description: "Let visitors leave 30-second voice notes on your profile.",                        icon: "🎙️", coinCost: 200, category: "social" },
  // ── Mini games ──────────────────────────────────────────────────────────────
  scratch_card:    { name: "Scratch Card Game",     description: "Daily scratch card mini-game. Win GEMZ if you're lucky.",                         icon: "🃏", coinCost: 150, category: "game" },
  claw_trivia:     { name: "CLAW Trivia",           description: "Challenge visitors with a trivia game on your profile page.",                      icon: "🧠", coinCost: 100, category: "game" },
  paw_bingo:       { name: "Paw Print Bingo",       description: "Play bingo with your followers. First to fill the card wins.",                     icon: "🐾", coinCost: 150, category: "game" },
  gemz_machine:    { name: "GEMZ Machine",          description: "A slot machine mini-game on your profile. Spin for GEMZ.",                         icon: "🎰", coinCost: 225, category: "game" },
  tarot_app:       { name: "Daily Tarot Reading",   description: "Pull your daily tarot card. Full deck of 78 cards with rich, personal readings.",  icon: "🔮", coinCost: 150, category: "game" },
  magic8_app:      { name: "Magic 8 Ball",          description: "Ask the universe a question. The 8 ball always knows.",                            icon: "🎱", coinCost: 75,  category: "game" },
  gigapet_app:     { name: "Giga Pet",              description: "A digital pet that lives on your profile. Feed it or it'll judge you.",            icon: "🐣", coinCost: 200, category: "game" },
  // ── Interactive Apps ────────────────────────────────────────────────────────
  mood_matcher:    { name: "Mood Matcher",          description: "Match your mood with other users feeling the same energy right now.",               icon: "🎭", coinCost: 100, category: "interactive" },
  truth_dare:      { name: "Truth or Dare",         description: "Send anonymous truth or dare challenges to your connections.",                       icon: "🎯", coinCost: 125, category: "interactive" },
  vibe_check:      { name: "Vibe Check",            description: "Rate each other's vibe. Get rated back. Discover your energy.",                     icon: "✨", coinCost: 100, category: "interactive" },
  compliment_bomb: { name: "Compliment Bomb",       description: "Flood someone's notifications with 10 genuine compliments at once.",                icon: "💌", coinCost: 50,  category: "interactive" },
  confess_battle:  { name: "Confession Battle",     description: "Two anonymous confessions go head-to-head. Community votes on the rawest one.",     icon: "⚔️", coinCost: 150, category: "interactive" },
  // ── Profile widgets ─────────────────────────────────────────────────────────
  dream_catcher:   { name: "Dream Catcher",         description: "Display a mystical dream journal widget on your profile.",                         icon: "🌙", coinCost: 100, category: "profile" },
  aura_reader:     { name: "Aura Reader",           description: "Show your daily aura color on your profile. Ringy picks it.",                      icon: "✨", coinCost: 75,  category: "profile" },
  mood_garden:     { name: "Mood Garden",           description: "A growing pixel garden on your profile that reflects your mood history.",           icon: "🌱", coinCost: 125, category: "profile" },
  vitals_widget:   { name: "Life Vitals Widget",    description: "Show off your Hunger, Health & Energy bars on your profile like an RPG hero.",     icon: "💗", coinCost: 175, category: "profile" },
  shadow_lamp:     { name: "Shadow Lamp",           description: "Display your latest Shadow Work entry on your profile — anonymized & glowing.",    icon: "🕯️", coinCost: 150, category: "profile" },
  truth_ticker:    { name: "Truth Ticker",          description: "A live ticker showing your Credibility Score and Truth Debt on your profile.",     icon: "📊", coinCost: 125, category: "profile" },
  crystal_ball:    { name: "Crystal Ball",          description: "Ringy gives visitors a cryptic fortune every time they visit your profile.",        icon: "🔮", coinCost: 100, category: "profile" },
  purgatory_meter: { name: "Purgatory Meter",       description: "Show your penance progress and humanity status. Own your arc.",                    icon: "🔥", coinCost: 150, category: "profile" },
  soulz_counter:   { name: "SOULZ Counter",         description: "A live display of your SOULZ spiritual capital on your profile card.",             icon: "✦",  coinCost: 75,  category: "profile" },
  // ── Glitch Effects ──────────────────────────────────────────────────────────
  glitch_crt:      { name: "CRT Glitch Effect",     description: "Your profile crackles with old TV scanlines and static interference.",              icon: "📺", coinCost: 150, category: "effects" },
  glitch_decay:    { name: "Digital Decay Effect",  description: "Your profile dissolves and reforms in digital fragments. Reality glitches.",        icon: "💀", coinCost: 200, category: "effects" },
  glitch_neon:     { name: "Neon Fracture Effect",  description: "Neon RGB color splits tear through your profile. Cyberpunk energy.",                icon: "🌈", coinCost: 250, category: "effects" },
  glitch_vhs:      { name: "VHS Rewind Effect",     description: "Your profile plays like a rewound VHS tape — tracking lines, ghost images.",       icon: "📼", coinCost: 175, category: "effects" },
  // ── Ringy Outfits ────────────────────────────────────────────────────────────
  ringy_wizard:    { name: "Ringy the Wizard",      description: "Ringy dons a starry sorcerer's hat and mystic robes.",                              icon: "🧙", coinCost: 200, category: "ringy" },
  ringy_goth:      { name: "Goth Ringy",            description: "Black lace, bat wings, crimson eyes. Ringy has entered her villain era.",           icon: "🦇", coinCost: 175, category: "ringy" },
  ringy_space:     { name: "Space Ringy",           description: "A miniature astronaut helmet and suit. Ringy watches from the void.",               icon: "🚀", coinCost: 225, category: "ringy" },
  ringy_vampire:   { name: "Vampire Ringy",         description: "Tiny cape, delicate fangs, moonlit menace. The most dramatic Ringy yet.",          icon: "🧛", coinCost: 250, category: "ringy" },
  ringy_witch:     { name: "Witch Ringy",           description: "Pointed hat, broomstick, and an attitude. Ringy knows what you did.",              icon: "🧙‍♀️", coinCost: 200, category: "ringy" },
  // ── Cursor Packs ────────────────────────────────────────────────────────────
  cursor_mystic_pack:  { name: "Mystic Cursor Pack",  description: "Unlocks 5 cursors: Moon, Shooting Star, Crystal Ball, Magic Wand, Rose.",         icon: "🌙", coinCost: 100, category: "cursors" },
  cursor_dark_pack:    { name: "Dark Cursor Pack",    description: "Unlocks 5 dark cursors: Dagger, Eye of Ra, Raven, Flame, and Void.",              icon: "🌑", coinCost: 100, category: "cursors" },
  cursor_critter_pack: { name: "Critter Cursor Pack", description: "Unlocks 4 cursors: Rodent Mouse, Snake, Chicken Nugget, and Fries.",              icon: "🐭", coinCost: 100, category: "cursors" },
  cursor_love_pack:    { name: "Love Cursor Pack",    description: "Unlocks 4 cursors: Heart, Lips, Heartbreak, and Galaxy.",                         icon: "❤️", coinCost: 100, category: "cursors" },
  cursor_vibes_pack:   { name: "Vibes Cursor Pack",   description: "Unlocks 4 cursors: Leafless Tree, Music Note, Sports Ball, Tarot Card.",          icon: "🎵", coinCost: 100, category: "cursors" },
  // ── Font Packs ──────────────────────────────────────────────────────────────
  font_pack_mystic:     { name: "Mystical Font",      description: "Cinzel Decorative — ancient runes meet modern drama.",                             icon: "✒️", coinCost: 75,  category: "fonts" },
  font_pack_techno:     { name: "Techno Font",        description: "Orbitron — cyberpunk cold precision.",                                             icon: "⚡", coinCost: 75,  category: "fonts" },
  font_pack_dreamy:     { name: "Dreamy Font",        description: "Pacifico — soft, dreamy, effortlessly cool.",                                      icon: "☁️", coinCost: 75,  category: "fonts" },
  font_pack_gothic:     { name: "Gothic Font",        description: "IM Fell English — old-world darkness, poetic and unsettling.",                     icon: "🖤", coinCost: 75,  category: "fonts" },
  font_pack_pixel:      { name: "Pixel Font",         description: "Press Start 2P — retro game energy.",                                              icon: "👾", coinCost: 100, category: "fonts" },
  font_pack_obsessed:   { name: "Over Obsessed Font", description: "Righteous — bold geometric main character energy.",                                icon: "💪", coinCost: 75,  category: "fonts" },
  font_pack_bitten:     { name: "Bitten Font",        description: "Creepster — horror cartoon. Something bit it.",                                    icon: "🦷", coinCost: 75,  category: "fonts" },
  font_pack_haunted:    { name: "Haunted Font",       description: "Nosifer — dripping horror. Something is deeply wrong here.",                       icon: "👻", coinCost: 100, category: "fonts" },
  font_pack_punk:       { name: "Punk Scribble Font", description: "Rock Salt — scratched into the wall by someone furious.",                          icon: "🤘", coinCost: 75,  category: "fonts" },
  font_pack_preppy:     { name: "Preppy Font",        description: "Playfair Display — elegant serif. Private school dropout.",                        icon: "🎀", coinCost: 75,  category: "fonts" },
  font_pack_rocker:     { name: "Rocker Font",        description: "Metal Mania — heavy metal lettering. Horns up.",                                   icon: "🎸", coinCost: 100, category: "fonts" },
  font_pack_cursive:    { name: "Cursive Font",       description: "Great Vibes — flowing script. Beautifully chaotic.",                               icon: "💫", coinCost: 75,  category: "fonts" },
  font_pack_graffiti:   { name: "Graffiti Font",      description: "Permanent Marker — bold and permanent. Just like your choices.",                   icon: "🖊️", coinCost: 75,  category: "fonts" },
  font_pack_blackletter:{ name: "Blackletter Font",   description: "UnifrakturMaguntia — medieval German. Ancient and brooding.",                      icon: "🏰", coinCost: 100, category: "fonts" },
  // ── Font Color Packs ────────────────────────────────────────────────────────
  color_pack_gold:         { name: "Gold Name Color",         description: "Your display name glows in deep gold.",                    icon: "🥇", coinCost: 50,  category: "colors" },
  color_pack_violet:       { name: "Violet Name Color",       description: "Deep mystic violet for your profile name.",                icon: "💜", coinCost: 50,  category: "colors" },
  color_pack_crimson:      { name: "Crimson Name Color",      description: "Dangerous, passionate crimson.",                           icon: "❤️", coinCost: 50,  category: "colors" },
  color_pack_cyber:        { name: "Cyber Name Color",        description: "Electric cyan — the color of the grid.",                   icon: "💙", coinCost: 50,  category: "colors" },
  color_pack_rose:         { name: "Rose Name Color",         description: "Soft but deadly. Pink as poison.",                        icon: "🌹", coinCost: 50,  category: "colors" },
  color_pack_emerald:      { name: "Emerald Name Color",      description: "Forest witch green. Mystic and calm.",                    icon: "💚", coinCost: 50,  category: "colors" },
  color_pack_rainbow:      { name: "Rainbow Name",            description: "Your name cycles through all colors. Legendary.",         icon: "🌈", coinCost: 125, category: "colors" },
  color_pack_dark_magenta: { name: "Dark Magenta Color",      description: "Deep magenta power. Dark and commanding.",                icon: "🔮", coinCost: 50,  category: "colors" },
  color_pack_purple:       { name: "Purple Color",            description: "Classic purple energy. Regal and bold.",                   icon: "🟣", coinCost: 50,  category: "colors" },
  color_pack_magenta:      { name: "Magenta Color",           description: "Neon fuchsia. Loud and electric.",                        icon: "⚡", coinCost: 50,  category: "colors" },
  color_pack_deep_pink:    { name: "Deep Pink Color",         description: "Hot pink intensity. Uncompromising.",                     icon: "🌸", coinCost: 50,  category: "colors" },
  color_pack_dark_violet:  { name: "Dark Violet Color",       description: "Deep violet shadow. Mysterious and heavy.",               icon: "🌌", coinCost: 50,  category: "colors" },
  color_pack_sky_blue:     { name: "Sky Blue Color",          description: "Light sky energy. Open and clear.",                       icon: "🌤️", coinCost: 50,  category: "colors" },
  color_pack_blue:         { name: "Electric Blue Color",     description: "Pure blue. Direct and striking.",                         icon: "💎", coinCost: 50,  category: "colors" },
  color_pack_aqua:         { name: "Aqua Color",              description: "Tropical neon. Cool and refreshing.",                     icon: "🌊", coinCost: 50,  category: "colors" },
  color_pack_aquamarine:   { name: "Aquamarine Color",        description: "Mermaid blue-green. Ethereal.",                           icon: "🧜", coinCost: 50,  category: "colors" },
  color_pack_lime:         { name: "Lime Color",              description: "Radioactive lime. Warning label energy.",                  icon: "🟢", coinCost: 50,  category: "colors" },
  color_pack_yellow:       { name: "Yellow Color",            description: "Sunshine neon. Impossible to ignore.",                    icon: "⭐", coinCost: 50,  category: "colors" },
  color_pack_red:          { name: "Danger Red Color",        description: "Pure red. Urgent and unmissable.",                        icon: "🔴", coinCost: 50,  category: "colors" },
  color_pack_snow:         { name: "Snow Color",              description: "Soft white with a chill. Haunting quiet.",                icon: "❄️", coinCost: 50,  category: "colors" },
};

router.get("/app-store", async (req, res) => {
  const catalog = Object.entries(APP_CATALOG).map(([id, app]) => ({ id, ...app }));
  if (!req.isAuthenticated()) return res.json({ catalog, owned: [] });
  try {
    const owned = await db.select().from(appPurchasesTable)
      .where(eq(appPurchasesTable.userId, req.user.id));
    res.json({ catalog, owned: owned.map(o => o.appId) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/app-store/purchase", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { appId } = req.body;
  const app = APP_CATALOG[appId];
  if (!app) return res.status(400).json({ error: "Unknown app" });

  try {
    const [coins] = await db.select().from(clawCoinsTable)
      .where(eq(clawCoinsTable.userId, req.user.id));
    const balance = coins?.balance ?? 0;
    if (balance < app.coinCost) {
      return res.status(402).json({ error: "Not enough GEMZ", balance, required: app.coinCost });
    }

    const existing = await db.select().from(appPurchasesTable)
      .where(and(eq(appPurchasesTable.userId, req.user.id), eq(appPurchasesTable.appId, appId)));
    if (existing.length > 0) return res.status(409).json({ error: "Already owned" });

    await db.update(clawCoinsTable)
      .set({ balance: sql`${clawCoinsTable.balance} - ${app.coinCost}`, lifetimeSpent: sql`${clawCoinsTable.lifetimeSpent} + ${app.coinCost}` })
      .where(eq(clawCoinsTable.userId, req.user.id));

    const [purchase] = await db.insert(appPurchasesTable).values({
      userId: req.user.id,
      appId,
      coinsCost: app.coinCost,
    }).returning();

    const [profileRow] = await db.select().from(clawProfilesTable)
      .where(eq(clawProfilesTable.userId, req.user.id));

    if (profileRow) {
      if (appId.startsWith("glitch_") || appId.startsWith("ringy_")) {
        const effects = parseArr((profileRow as any).purchasedEffects);
        if (!effects.includes(appId)) {
          await db.update(clawProfilesTable)
            .set({ purchasedEffects: JSON.stringify([...effects, appId]) })
            .where(eq(clawProfilesTable.userId, req.user.id));
        }
      } else if (appId.startsWith("cursor_")) {
        const cursors = parseArr((profileRow as any).purchasedCursors);
        if (!cursors.includes(appId)) {
          await db.update(clawProfilesTable)
            .set({ purchasedCursors: JSON.stringify([...cursors, appId]) })
            .where(eq(clawProfilesTable.userId, req.user.id));
        }
      } else if (appId.startsWith("font_pack_")) {
        const fontId = FONT_PACK_TO_ID[appId];
        if (fontId) {
          const fonts = parseArr((profileRow as any).purchasedFonts);
          if (!fonts.includes(fontId)) {
            await db.update(clawProfilesTable)
              .set({ purchasedFonts: JSON.stringify([...fonts, fontId]) })
              .where(eq(clawProfilesTable.userId, req.user.id));
          }
        }
      } else if (appId.startsWith("color_pack_")) {
        const colorId = COLOR_PACK_TO_ID[appId];
        if (colorId) {
          const fonts = parseArr((profileRow as any).purchasedFonts);
          if (!fonts.includes(colorId)) {
            await db.update(clawProfilesTable)
              .set({ purchasedFonts: JSON.stringify([...fonts, colorId]) })
              .where(eq(clawProfilesTable.userId, req.user.id));
          }
        }
      }
    }

    res.json({ success: true, purchase });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Graffiti wall routes
router.get("/graffiti/:userId", async (req, res) => {
  try {
    const entries = await db.select().from(graffitiWallTable)
      .where(eq(graffitiWallTable.profileUserId, req.params.userId))
      .orderBy(desc(graffitiWallTable.createdAt))
      .limit(30);
    res.json(entries);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/graffiti/:userId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { content, color = "#a855f7" } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: "Content required" });
  try {
    const [entry] = await db.insert(graffitiWallTable).values({
      profileUserId: req.params.userId,
      authorId: req.user.id,
      content: content.trim().slice(0, 150),
      color,
    }).returning();
    res.json(entry);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Wall Posts — posting directly to a user's profile
router.get("/wall/:userId", async (req, res) => {
  try {
    const posts = await db.select().from(wallPostsTable)
      .where(eq(wallPostsTable.profileUserId, req.params.userId))
      .orderBy(desc(wallPostsTable.createdAt))
      .limit(20);
    res.json(posts);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/wall/:userId", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { content, mediaUrl } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: "Content required" });
  try {
    const [entry] = await db.insert(wallPostsTable).values({
      profileUserId: req.params.userId,
      authorId: req.user.id,
      content: content.trim().slice(0, 500),
      mediaUrl: mediaUrl || null,
    }).returning();
    res.json(entry);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Shoutouts
router.get("/shoutouts", async (req, res) => {
  try {
    const rows = await db.select().from(shoutoutsTable)
      .orderBy(desc(shoutoutsTable.createdAt))
      .limit(50);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/shoutouts/:userId", async (req, res) => {
  try {
    const rows = await db.select().from(shoutoutsTable)
      .where(eq(shoutoutsTable.toUserId, req.params.userId))
      .orderBy(desc(shoutoutsTable.createdAt))
      .limit(20);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/shoutouts", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { toUserId, message, isPublic = true } = req.body;
  if (!toUserId || !message?.trim()) return res.status(400).json({ error: "toUserId and message required" });
  if (toUserId === req.user.id) return res.status(400).json({ error: "Cannot shout yourself out" });
  try {
    const [entry] = await db.insert(shoutoutsTable).values({
      fromUserId: req.user.id,
      toUserId,
      message: message.trim().slice(0, 280),
      isPublic,
    }).returning();
    res.json(entry);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
