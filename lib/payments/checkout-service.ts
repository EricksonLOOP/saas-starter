import Stripe from 'stripe';
import { stripe } from '@/lib/payments/stripe';
import { setSession } from '@/lib/auth/session';
import { findUserById } from '@/lib/db/repositories/user-repository';
import { findMembershipByUserId } from '@/lib/db/repositories/team-member-repository';
import { updateTeamSubscription } from '@/lib/db/repositories/team-repository';

export async function completeCheckoutSession(sessionId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['customer', 'subscription']
  });

  if (!session.customer || typeof session.customer === 'string') {
    throw new Error('Invalid customer data from Stripe.');
  }

  const customerId = session.customer.id;
  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;

  if (!subscriptionId) {
    throw new Error('No subscription found for this session.');
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price.product']
  });

  const plan = subscription.items.data[0]?.price;
  if (!plan) {
    throw new Error('No plan found for this subscription.');
  }

  const productId = (plan.product as Stripe.Product).id;
  if (!productId) {
    throw new Error('No product ID found for this subscription.');
  }

  const userId = session.client_reference_id;
  if (!userId) {
    throw new Error("No user ID found in session's client_reference_id.");
  }

  const user = await findUserById(Number(userId));
  if (!user) {
    throw new Error('User not found in database.');
  }

  const membership = await findMembershipByUserId(user.id);
  if (!membership) {
    throw new Error('User is not associated with any team.');
  }

  await updateTeamSubscription(membership.teamId, {
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    stripeProductId: productId,
    planName: (plan.product as Stripe.Product).name,
    subscriptionStatus: subscription.status
  });

  await setSession(user);

  return user;
}
