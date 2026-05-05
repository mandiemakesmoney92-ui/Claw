import { Router } from "express";
import Stripe from "stripe";
import { db } from "@workspace/db";
import { clawProfilesTable, notificationsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();
const stripe = new Stripe(process.env["STRIPE_SECRET_KEY"] || "", { apiVersion: "2025-08-27.basil" as any });

const PRICE_ID_MONTHLY = process.env["STRIPE_MEMBERSHIP_PRICE_ID"] || "price_membership_5usd_monthly";
const MEMBER_RARE_THEMES = ["velvet_midnight", "golden_blood", "abyssal_jade"];
const MEMBER_CURSORS = ["paw_gold", "crystal_claw"];

router.get("/membership/me", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const [p] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, req.user.id)).limit(1);
  if (!p) return res.status(404).json({ error: "Profile not found" });

  const now = new Date();
  const active = p.isMember && p.membershipExpiresAt && p.membershipExpiresAt > now;

  res.json({
    isMember: !!active,
    membershipExpiresAt: p.membershipExpiresAt?.toISOString() || null,
    purgatoryFreeCard: p.purgatoryFreeCard || false,
    memberRareThemes: MEMBER_RARE_THEMES,
    memberCursors: MEMBER_CURSORS,
  });
});

router.post("/membership/subscribe", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const [p] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, req.user.id)).limit(1);
  if (!p) return res.status(404).json({ error: "Profile not found" });

  const baseUrl = req.headers.origin || `https://${req.headers.host}`;

  try {
    let customerId = p.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email || undefined,
        metadata: { userId: req.user.id, username: p.username },
      });
      customerId = customer.id;
      await db.update(clawProfilesTable).set({ stripeCustomerId: customerId }).where(eq(clawProfilesTable.userId, req.user.id));
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          unit_amount: 500,
          recurring: { interval: "month" },
          product_data: {
            name: "CLAW Membership",
            description: "🐾 Monthly membership — paw badge, 3 rare themes, 2 unique cursors, Purgatory free card",
          },
        },
        quantity: 1,
      }],
      mode: "subscription",
      success_url: `${baseUrl}/membership?success=1`,
      cancel_url: `${baseUrl}/membership`,
      metadata: { userId: req.user.id },
    });

    res.json({ url: session.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/membership/cancel", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const [p] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, req.user.id)).limit(1);
  if (!p) return res.status(404).json({ error: "Profile not found" });

  try {
    if (p.memberStripeSubId) {
      await stripe.subscriptions.cancel(p.memberStripeSubId);
    }
    await db.update(clawProfilesTable)
      .set({ isMember: false, memberStripeSubId: null })
      .where(eq(clawProfilesTable.userId, req.user.id));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/membership/use-free-card", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const [p] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, req.user.id)).limit(1);
  if (!p?.purgatoryFreeCard) return res.status(400).json({ error: "No free card available" });
  if (!p.isInPurgatory) return res.status(400).json({ error: "You're not in purgatory" });

  await db.update(clawProfilesTable)
    .set({ purgatoryFreeCard: false, isInPurgatory: false, purgatorySince: null, purgatoryReason: null, penanceCompleted: 0, penanceRequired: 0 })
    .where(eq(clawProfilesTable.userId, req.user.id));

  res.json({ ok: true, message: "Free card used — you're out of purgatory" });
});

router.post("/membership/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env["STRIPE_MEMBERSHIP_WEBHOOK_SECRET"];

  let event: Stripe.Event;
  try {
    event = webhookSecret
      ? stripe.webhooks.constructEvent(req.body, sig, webhookSecret)
      : JSON.parse(req.body.toString());
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    if (!userId || session.mode !== "subscription") return res.json({ ok: true });

    const subId = session.subscription as string;
    const expiresAt = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);

    await db.update(clawProfilesTable)
      .set({
        isMember: true,
        membershipExpiresAt: expiresAt,
        memberStripeSubId: subId,
        purgatoryFreeCard: true,
        purchasedThemes: db.select({ pt: clawProfilesTable.purchasedThemes }).from(clawProfilesTable).where(eq(clawProfilesTable.userId, userId)).then,
      } as any)
      .where(eq(clawProfilesTable.userId, userId));

    const [p] = await db.select().from(clawProfilesTable).where(eq(clawProfilesTable.userId, userId)).limit(1);
    if (p) {
      const existingThemes: string[] = JSON.parse(p.purchasedThemes || "[]");
      const newThemes = [...new Set([...existingThemes, ...MEMBER_RARE_THEMES])];
      const existingCursors: string[] = JSON.parse(p.purchasedCursors || "[]");
      const newCursors = [...new Set([...existingCursors, ...MEMBER_CURSORS])];
      await db.update(clawProfilesTable)
        .set({
          isMember: true,
          membershipExpiresAt: expiresAt,
          memberStripeSubId: subId,
          purgatoryFreeCard: true,
          purchasedThemes: JSON.stringify(newThemes),
          purchasedCursors: JSON.stringify(newCursors),
        })
        .where(eq(clawProfilesTable.userId, userId));

      await db.insert(notificationsTable).values({
        userId,
        type: "follow",
        message: "🐾 Welcome to CLAW Membership! Your paw badge, rare themes, and free card are now active.",
        isRead: false,
      });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    await db.update(clawProfilesTable)
      .set({ isMember: false, memberStripeSubId: null })
      .where(eq(clawProfilesTable.memberStripeSubId, sub.id));
  }

  res.json({ ok: true });
});

export default router;
