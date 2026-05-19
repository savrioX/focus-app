import Stripe from 'stripe';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId, email } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing user ID' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${process.env.APP_URL || 'https://compound-swart.vercel.app'}?pro=success`,
      cancel_url:  `${process.env.APP_URL || 'https://compound-swart.vercel.app'}?pro=cancel`,
      client_reference_id: userId,
      customer_email: email || undefined,
      subscription_data: { metadata: { userId } },
      allow_promotion_codes: true,
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
