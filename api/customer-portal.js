const Stripe = require('stripe');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Validate the caller's session and look up their Stripe customer ID server-side.
  // Never trust a client-supplied customerId — anyone could pass another user's ID.
  const token = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Unauthorised' });

  const userRes = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${token}` },
  }).catch(() => null);
  if (!userRes?.ok) return res.status(401).json({ error: 'Invalid session — please sign in again.' });
  const user = await userRes.json();

  const profileRes = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=stripe_customer_id`,
    { headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` } },
  ).catch(() => null);
  const profiles = profileRes?.ok ? await profileRes.json() : [];
  const customerId = profiles[0]?.stripe_customer_id;
  if (!customerId) return res.status(400).json({ error: 'No billing account found.' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer:   customerId,
      return_url: process.env.APP_URL || 'https://dailycompound.app',
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
