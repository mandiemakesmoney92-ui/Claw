import { Router } from "express";
import { db } from "@workspace/db";
import { clawProfilesTable, clawCoinsTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { getUncachableStripeClient, getStripePublishableKey } from "../stripeClient";

const router = Router();

// GEMZ coin packs (coins credited to balance on successful payment)
export const GEMZ_COIN_PACKS: Record<string, { name: string; amount: number; coins: number; description: string }> = {
  coins_starter: { name: "Starter Pack", amount: 99, coins: 50, description: "50 GEMZ — dive in and start exploring" },
  coins_claw: { name: "Claw Pack", amount: 199, coins: 160, description: "160 GEMZ (150 + 10 bonus) — enough to make your mark" },
  coins_chaos: { name: "Chaos Pack", amount: 499, coins: 550, description: "550 GEMZ (500 + 50 bonus) — real power user energy" },
  coins_legend: { name: "Legend Pack", amount: 999, coins: 1700, description: "1700 GEMZ (1500 + 200 bonus) — full CLAW legend status" },
};

// Items available for purchase via Stripe
// Each item has a price in cents and a type
const PURCHASABLE_ITEMS: Record<string, { name: string; amount: number; description: string }> = {
  theme_eclipse: { name: "Eclipse Theme", amount: 199, description: "Dark crimson & shadow CLAW profile theme" },
  theme_moonrise: { name: "Moonrise Theme", amount: 199, description: "Soft lavender & lunar CLAW profile theme" },
  theme_abyss: { name: "Abyss Theme", amount: 199, description: "Deep teal & void CLAW profile theme" },
  theme_inferno: { name: "Inferno Theme", amount: 199, description: "Burning amber & ember CLAW profile theme" },
  theme_sakura: { name: "Sakura Theme", amount: 199, description: "Cherry blossom pink CLAW profile theme" },
  theme_galaxy: { name: "Galaxy Theme", amount: 299, description: "Cosmic swirl premium CLAW profile theme" },
  theme_obsidian: { name: "Obsidian Theme", amount: 299, description: "Premium ultra-dark obsidian CLAW theme" },
  cursor_paw: { name: "Paw Cursor", amount: 99, description: "Ringy paw cursor for your CLAW profile" },
  cursor_crystal: { name: "Crystal Cursor", amount: 99, description: "Crystal shard cursor for your CLAW profile" },
  cursor_flame: { name: "Flame Cursor", amount: 99, description: "Flickering flame cursor for your CLAW profile" },
  support_small: { name: "Support CLAW ($1)", amount: 100, description: "Support the CLAW creator — thank you!" },
  support_medium: { name: "Support CLAW ($5)", amount: 500, description: "Support the CLAW creator — you're amazing!" },
  support_large: { name: "Support CLAW ($10)", amount: 1000, description: "Support the CLAW creator — you're a legend!" },
  // Include coin packs in Stripe items map too
  ...Object.fromEntries(Object.entries(GEMZ_COIN_PACKS).map(([k, v]) => [k, { name: v.name, amount: v.amount, description: v.description }])),
};

// Get publishable key (needed by frontend to confirm payments)
router.get("/stripe/config", async (_req, res) => {
  try {
    const publishableKey = await getStripePublishableKey();
    res.json({ publishableKey });
  } catch {
    res.status(503).json({ error: "Stripe not configured" });
  }
});

// List purchasable items
router.get("/stripe/items", (_req, res) => {
  const items = Object.entries(PURCHASABLE_ITEMS).map(([id, item]) => ({
    id,
    ...item,
    priceDisplay: `$${(item.amount / 100).toFixed(2)}`,
  }));
  res.json({ items });
});

// Create a Stripe Checkout session for a purchasable item
router.post("/stripe/checkout", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const { itemId } = req.body as { itemId: string };
  const item = PURCHASABLE_ITEMS[itemId];
  if (!item) return res.status(400).json({ error: "Invalid item" });

  try {
    const stripe = await getUncachableStripeClient();

    // Get or create Stripe customer linked to this user
    const [profile] = await db
      .select()
      .from(clawProfilesTable)
      .where(eq(clawProfilesTable.userId, req.user.id))
      .limit(1);

    let customerId = profile?.stripeCustomerId ?? undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { clawUserId: req.user.id, clawUsername: profile?.username ?? "" },
      });
      customerId = customer.id;
      await db
        .update(clawProfilesTable)
        .set({ stripeCustomerId: customerId })
        .where(eq(clawProfilesTable.userId, req.user.id));
    }

    const domain = process.env.REPLIT_DOMAINS?.split(",")[0];
    const baseUrl = `https://${domain}`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: item.amount,
            product_data: {
              name: item.name,
              description: item.description,
              metadata: { clawItemId: itemId },
            },
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/checkout/success?item=${itemId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/profile/edit`,
      metadata: {
        clawUserId: req.user.id,
        clawItemId: itemId,
      },
    });

    res.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe checkout error:", err.message);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// Verify a completed checkout session and unlock the item for the user
router.post("/stripe/verify", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

  const { sessionId } = req.body as { sessionId: string };
  if (!sessionId) return res.status(400).json({ error: "Missing sessionId" });

  try {
    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return res.status(402).json({ error: "Payment not completed" });
    }

    const clawUserId = session.metadata?.clawUserId;
    const clawItemId = session.metadata?.clawItemId;

    if (!clawUserId || !clawItemId) {
      return res.status(400).json({ error: "Missing metadata" });
    }

    // Only unlock for the authenticated user
    if (clawUserId !== req.user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Coin pack purchase — credit GEMZ to balance
    if (clawItemId.startsWith("coins_") && GEMZ_COIN_PACKS[clawItemId]) {
      const pack = GEMZ_COIN_PACKS[clawItemId];
      const existing = await db.select().from(clawCoinsTable).where(eq(clawCoinsTable.userId, req.user.id)).limit(1);
      if (existing.length === 0) {
        await db.insert(clawCoinsTable).values({ userId: req.user.id, balance: pack.coins });
      } else {
        await db.update(clawCoinsTable)
          .set({ balance: sql`${clawCoinsTable.balance} + ${pack.coins}`, updatedAt: new Date() })
          .where(eq(clawCoinsTable.userId, req.user.id));
      }
      return res.json({ success: true, unlockedItem: clawItemId, coinsAdded: pack.coins });
    }

    // Standard item — add to user's purchased list
    const [profile] = await db
      .select()
      .from(clawProfilesTable)
      .where(eq(clawProfilesTable.userId, req.user.id))
      .limit(1);

    const existing: string[] = (() => {
      try { return JSON.parse(profile?.purchasedThemes || "[]"); } catch { return []; }
    })();

    if (!existing.includes(clawItemId)) {
      existing.push(clawItemId);
      await db
        .update(clawProfilesTable)
        .set({ purchasedThemes: JSON.stringify(existing) })
        .where(eq(clawProfilesTable.userId, req.user.id));
    }

    res.json({ success: true, unlockedItem: clawItemId });
  } catch (err: any) {
    console.error("Stripe verify error:", err.message);
    res.status(500).json({ error: "Verification failed" });
  }
});

export default router;
