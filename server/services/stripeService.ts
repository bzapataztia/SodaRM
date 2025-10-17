import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-09-30.clover',
    })
  : null;

const PLAN_PRICES = {
  starter: { priceId: process.env.STRIPE_PRICE_STARTER, maxProperties: 10 },
  growth: { priceId: process.env.STRIPE_PRICE_GROWTH, maxProperties: 50 },
  pro: { priceId: process.env.STRIPE_PRICE_PRO, maxProperties: 999 },
};

export async function createCheckoutSession(
  tenantId: string,
  plan: 'starter' | 'growth' | 'pro',
  customerEmail: string
) {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
  }

  const planConfig = PLAN_PRICES[plan];
  
  if (!planConfig.priceId) {
    throw new Error(`Price ID not configured for plan: ${plan}`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: customerEmail,
    line_items: [
      {
        price: planConfig.priceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.APP_URL || 'http://localhost:5000'}/settings?success=true`,
    cancel_url: `${process.env.APP_URL || 'http://localhost:5000'}/settings?canceled=true`,
    metadata: {
      tenantId,
      plan,
    },
  });

  return session;
}

export async function handleWebhook(event: Stripe.Event, db: any) {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const tenantId = subscription.metadata.tenantId;
      const plan = subscription.metadata.plan as 'starter' | 'growth' | 'pro';
      
      if (tenantId && plan) {
        const planConfig = PLAN_PRICES[plan];
        await db.update('tenants')
          .set({
            plan,
            maxProperties: planConfig.maxProperties,
            status: subscription.status === 'active' ? 'active' : 'paused',
            stripeCustomerId: subscription.customer as string,
            stripeSubscriptionId: subscription.id,
          })
          .where({ id: tenantId });
      }
      break;
    }
    
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const tenantId = subscription.metadata.tenantId;
      
      if (tenantId) {
        await db.update('tenants')
          .set({
            status: 'cancelled',
            stripeSubscriptionId: null,
          })
          .where({ id: tenantId });
      }
      break;
    }
    
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      // Handle payment failure - send notification, pause account, etc.
      console.log('Payment failed for invoice:', invoice.id);
      break;
    }
  }
}

export async function createCustomerPortalSession(customerId: string) {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please set STRIPE_SECRET_KEY environment variable.');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.APP_URL || 'http://localhost:5000'}/settings`,
  });

  return session;
}
