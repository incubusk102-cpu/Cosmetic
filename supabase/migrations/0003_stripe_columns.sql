-- Stripe Customer Portal + Checkout integration.
--
-- `stripe_customer_id` is the Stripe Customer (`cus_…`). One per user; written
-- by the webhook on the first `checkout.session.completed` and reused for the
-- portal link.
--
-- `stripe_subscription_id` is the Stripe Subscription (`sub_…`) for the
-- currently active Plus plan. Cleared when the sub is canceled.
--
-- `plan_renews_at` is the period end timestamp from Stripe; surfaced in the
-- Account page so users know when the next charge happens.
alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists plan_renews_at timestamptz;

create unique index if not exists profiles_stripe_customer_id_key
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;
