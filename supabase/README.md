# Supabase Setup

This folder contains the Supabase schema for player accounts, profile pictures, stats, owned cards, decks, matches, logs, and coin transactions.

## What Not To Store

Do not store plain-text passwords. Supabase Auth owns credentials and stores password hashes in `auth.users.encrypted_password`. The app tables reference `auth.users.id`.

## Create The Project

1. Create a Supabase project.
2. Copy the project URL and publishable key into `.env`.
3. Copy the secret key into `.env` only for server-side code.
4. Open the Supabase SQL editor and run every file in `supabase/migrations/` in number order.
5. Run `supabase/seed-cards.sql` to add the current real cards.

## Account Shape

- `auth.users`: managed by Supabase Auth.
- `public.profiles`: username, avatar path, avatar URL, bio, coins, wins, losses, matches played, packs opened.
- `storage.objects` in the `profile-pictures` bucket: custom profile images stored under `<user-id>/filename`.
- `public.user_card_collection`: owned cards and quantities.
- `public.pack_openings`: pack reward history.
- `public.decks` and `public.deck_cards`: deck builder data.
- `public.matches`, `public.match_players`, `public.match_action_logs`: match history and replay/debug data.
- `public.currency_transactions`: coin ledger.

## Signup Shape

Players only see username and password in the app. The app turns the username into an internal Supabase Auth login ID and creates the profile row with the same username.
