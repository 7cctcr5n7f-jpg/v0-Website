-- Additive campaign attribution fields for first-touch tracking on free-trial bookings.
-- Applied to TENROUNDS Neon main branch on 2026-11-24.
ALTER TABLE trial_bookings ADD COLUMN IF NOT EXISTS utm_source text NOT NULL DEFAULT '';
ALTER TABLE trial_bookings ADD COLUMN IF NOT EXISTS utm_medium text NOT NULL DEFAULT '';
ALTER TABLE trial_bookings ADD COLUMN IF NOT EXISTS utm_campaign text NOT NULL DEFAULT '';
ALTER TABLE trial_bookings ADD COLUMN IF NOT EXISTS utm_content text NOT NULL DEFAULT '';
ALTER TABLE trial_bookings ADD COLUMN IF NOT EXISTS utm_term text NOT NULL DEFAULT '';
ALTER TABLE trial_bookings ADD COLUMN IF NOT EXISTS landing_page text NOT NULL DEFAULT '';
ALTER TABLE trial_bookings ADD COLUMN IF NOT EXISTS referrer text NOT NULL DEFAULT '';
