# Cards and Pedophiles

Local prototype framework for a browser-based custom trading card game. The current build focuses on clean architecture for cards, packs, decks, card stats, server-authoritative match logic, and future real-time multiplayer.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth and Postgres
- Socket.IO server module for 1v1 match rooms

## Setup

```bash
npm install
copy .env.example .env.local
npm run dev
npm run dev:realtime
```

## Environment

```text
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-sb-publishable-key"
SUPABASE_SECRET_KEY="your-server-only-sb-secret-key"
NEXT_PUBLIC_SUPABASE_AVATAR_BUCKET="profile-pictures"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXT_PUBLIC_REALTIME_URL="http://localhost:3001"
REALTIME_ALLOWED_ORIGIN="http://localhost:3000"
REALTIME_SERVER_ID="local-dev"
SOCKET_PORT="3001"
```

## Supabase

The Supabase setup lives in `supabase/migrations/`. Run the migrations in number order, then run `supabase/seed-cards.sql`.
Migration `0007_repair_online_game_systems.sql` is idempotent and repairs older online projects that are missing pack/deck/currency tables, storage buckets, or the current `aura` column.
Migration `0008_multiplayer_closed_alpha.sql` adds the closed-alpha multiplayer queue, match snapshots, match events, action logs, and idempotent match reward RPC.

Players use username and password in the UI. The app maps usernames to internal Supabase Auth login IDs; passwords are not stored in app tables.

## Project Map

- `supabase/migrations` stores users, profiles, cards, collections, decks, pack openings, and currency.
- `supabase/seed-cards.sql` seeds the card library.
- `lib/game/cards.ts` is the card catalog entry point for the real card list.
- `lib/game/abilities/engine.ts` resolves trigger, activated, passive-shaped, conditional, and targeted ability definitions.
- `lib/game/packs/openPack.ts` implements 5-card gacha packs with weighted rarity rolls and no guaranteed drops.
- `lib/game/decks/validateDeck.ts` enforces minimum deck size, Leader count, copy limits, and Legendary limits.
- `lib/game/match/state.ts` creates and validates match state.
- `lib/game/match/view.ts` filters match state so each player only sees their own hidden information.
- `server/socket/index.ts` runs the authoritative Socket.IO matchmaking and match room server.
- `app/*` contains the first-pass UI screens requested in the prototype brief.

## Closed Alpha Multiplayer

Start the web app and realtime server in separate terminals:

```bash
npm run dev
npm run dev:realtime
```

The main `/battle` route is now the online queue. `/battle/local` keeps the local hot-seat sandbox for quick testing. The realtime server verifies Supabase access tokens, loads each player's active legal deck from Supabase, owns the match state, filters hidden hands/decks per player, logs actions, handles concede/disconnect, and finalizes rewards through `finish_multiplayer_match`.

For production, deploy the Next.js app to Vercel and run the realtime server on an always-on Node host with `npm run start:realtime`. Set the host's `PORT` env normally; the server also exposes `/health` for readiness checks.

Run checks before testing online:

```bash
npm run lint
npm run test:engine
npm run build
```

## Expansion Notes

Add new friend cards by creating a `CardTemplate` with ability JSON. The ability engine is intentionally data-driven so future unique effects can be registered in one place instead of hardcoded in UI components.

The client should keep sending intents only. Currency, pack rewards, deck legality, damage, ability effects, card stat changes, and wins/losses should stay validated on the server.

Open [http://localhost:3000](http://localhost:3000) after `npm run dev`.
