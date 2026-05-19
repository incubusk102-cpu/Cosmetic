-- Track which billing period the `pdf_exports_used_this_month` counter
-- belongs to. On each export the server checks the period and resets the
-- counter when it rolls over to a new month — no cron job needed.
--
-- Format: 'YYYY-MM' (UTC). Computed in app code, not in Postgres, so the
-- reset semantics live next to the PDF export route handler.
alter table public.profiles
  add column if not exists pdf_exports_period text not null
    default to_char(now() at time zone 'utc', 'YYYY-MM');
