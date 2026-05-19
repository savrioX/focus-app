import Stripe from 'stripe';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SK  = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Update a profile row (upsert by id)
async function setProById(userId, isPro, customerId) {
  const body = { id: userId, is_pro: isPro };
  if (customerId) body.stripe_customer_id = customerId;
  await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SK,
      Authorization: `Bearer ${SUPABASE_SK}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(body),
  });
}

// Revoke pro by Stripe customer ID
async function revokeProByCustomer(customerId) {
  await fetch(`${SUPABASE_URL}/rest/v1/profiles?stripe_customer_id=eq.${customerId}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_SK,
      Authorization: `Bearer ${SUPABASE_SK}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ is_pro: false }),
  });
}

// Read raw body for Stripe signature verification
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end',  () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  // Verify Stripe signature
  let event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(
      rawBody,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      // First successful payment — grant pro
      case 'checkout.session.completed': {
        const s = event.data.object;
        if (s.mode === 'subscription' && s.payment_status === 'paid') {
          await setProById(s.client_reference_id, true, s.customer);
        }
        break;
      }
      // Recurring renewal — keep pro active
      case 'invoice.paid': {
        const inv = event.data.object;
        if (inv.subscription) {
          // find user by customer ID — already in DB from checkout
          await fetch(`${SUPABASE_URL}/rest/v1/profiles?stripe_customer_id=eq.${inv.customer}`, {
            method: 'PATCH',
            headers: {
              apikey: SUPABASE_SK,
              Authorization: `Bearer ${SUPABASE_SK}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ is_pro: true }),
          });
        }
        break;
      }
      // Payment failed or subscription cancelled — revoke pro
      case 'invoice.payment_failed':
      case 'customer.subscription.deleted': {
        await revokeProByCustomer(event.data.object.customer);
        break;
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
  }

  res.json({ received: true });
}
