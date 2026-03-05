import Stripe from 'stripe';
import { getUncachableStripeClient } from './stripeClient';
import { db } from './db';
import { subscriptions } from '@shared/schema';
import { eq } from 'drizzle-orm';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const stripe = await getUncachableStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;

    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } else {
      // If no webhook secret, parse the event directly (less secure, for development)
      console.warn('STRIPE_WEBHOOK_SECRET not set — skipping signature verification');
      event = JSON.parse(payload.toString()) as Stripe.Event;
    }

    console.log(`Processing Stripe event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.subscription && session.customer) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          const userId = session.metadata?.userId || sub.metadata?.userId;
          if (userId) {
            await db.insert(subscriptions).values({
              userId,
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: sub.id,
              status: sub.status,
              priceId: sub.items.data[0]?.price?.id || null,
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
              cancelAtPeriodEnd: sub.cancel_at_period_end,
            }).onConflictDoUpdate({
              target: subscriptions.stripeSubscriptionId,
              set: {
                status: sub.status,
                priceId: sub.items.data[0]?.price?.id || null,
                currentPeriodEnd: new Date(sub.current_period_end * 1000),
                cancelAtPeriodEnd: sub.cancel_at_period_end,
                updatedAt: new Date(),
              },
            });
            console.log(`Subscription created for user ${userId}: ${sub.id} (${sub.status})`);
          } else {
            console.warn('checkout.session.completed: no userId in metadata');
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await db.update(subscriptions)
          .set({
            status: sub.status,
            priceId: sub.items.data[0]?.price?.id || null,
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.stripeSubscriptionId, sub.id));
        console.log(`Subscription updated: ${sub.id} → ${sub.status}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await db.update(subscriptions)
          .set({
            status: 'canceled',
            cancelAtPeriodEnd: false,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.stripeSubscriptionId, sub.id));
        console.log(`Subscription canceled: ${sub.id}`);
        break;
      }

      default:
        // Unhandled event type — silently ignore
        break;
    }
  }
}
