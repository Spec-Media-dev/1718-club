# 1718 CLUB

Premium digital loyalty and membership platform for 1718 Café.

## Product vision

1718 CLUB is designed as a premium membership experience rather than a discount card. The platform supports customer membership, loyalty, rewards, referrals, campaigns, staff operations, administration, analytics, and future POS/ordering integrations.

## Architecture

- Next.js + TypeScript, mobile-first PWA
- Supabase Auth + PostgreSQL
- Immutable points ledger with idempotency
- Server-side reward redemption and points earning functions
- Row Level Security for customer-owned data
- Passwordless email onboarding at `/join`
- Arabic/English and RTL ready
- Multi-location and POS integration ready
- No production secrets committed to source control

## Current product surfaces

- Customer CLUB experience at `/`
- Passwordless CLUB onboarding at `/join`
- Supabase-backed loyalty schema and reward catalog
- Health endpoint at `/api/health`
- Foundation for staff/admin console and POS integration

## Loyalty configuration

Starting business rule: **1 EGP spent = 1 CLUB point**, implemented as a configurable server-side loyalty engine. Current membership ladder:

- Member: 0–1,999 points
- Gold: 2,000–4,999 points
- Black: 5,000+ points, invitation only

Current rewards:

- Free Drink on Us — 1,500 points
- Secret Menu Access — 2,000 points
- EGP 250 Club Credit — 3,500 points

## Environment

Copy `.env.example` to `.env.local` and provide the Supabase project URL and publishable key. Never commit a service-role key or other production secret.

## Development

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run build
```

## Database

The Supabase project already has the initial Club schema and follow-up loyalty/catalog migration applied. Keep repository migrations in `supabase/migrations` synchronized with production schema changes.

## Brand direction

Quiet luxury with the 1718 identity: deep teal/charcoal, warm cream, restrained brass/gold, elegant typography, generous whitespace, and the supplied 1718 parrot mascot. The experience should feel like a private members club, not a coupon app.

## Development status

Phase 1 — premium customer experience + Supabase foundation + passwordless onboarding. Next engineering layer: replace remaining demo values on `/` with authenticated live Club data, then connect POS/order events to the idempotent points engine.
