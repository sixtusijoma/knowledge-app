# Knowledge

A phone-first, read-only library of saved X bookmarks and Grok chats. The entries live in Supabase (`public.items`); this app only reads them.

- **Feed**: newest first, 20 at a time with infinite scroll and pull to refresh.
- **Search**: full-text over titles, summaries and authors (the `fts` column), using web search syntax such as `cursor -agents` or `"exact phrase"`.
- **Filters**: source, importance, topics (match any), a month, or a date range with either end open. Filters and search combine.
- **Entry**: every field, plus a button that opens the original post on X or the chat in Grok. On a phone, X links open in the X app when it is installed.
- **Stats**: entries per month by source, source split, importance split, and topic counts, read live from the table. Tap a month, source, importance slice, or topic to cross-filter the totals and the other charts; tap it again to clear it. Last 7, 30, and 90 days, this year, all time, or a custom range narrow every chart. Chips remove a selection. See entries opens the feed with those filters.
- Dark by default; the sun/moon button switches to light and is remembered.

## Run

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go (iOS or Android). For a browser preview, press `w`, or run `npx expo start --web`.

## Environment

The app reads `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Set them in the shell, or copy `.env.example` to `.env` (ignored by git).

When they are not set, the app uses the public Knowledge project from `app.config.ts`. That anon key is meant for clients: row level security allows select only, and writes are revoked.

## Publish

The app is published with EAS Update to `@setwise-sixtus/knowledge`, channel `production`, so it opens in Expo Go without a dev server. The runtime version follows the SDK (`exposdk:58.0.0`), which is what Expo Go reports.

```bash
npx eas-cli update --channel production --platform all --message "What changed"
```

Open it in Expo Go from `exp://u.expo.dev/58df4489-fd92-4ae6-8644-2b9f3daa4c05?runtime-version=exposdk%3A58.0.0&channel-name=production`. After an Expo SDK upgrade, publish again and update the `runtime-version` in that URL.

## Checks

```bash
npm run typecheck
npm run lint
```

`e2e/stats.mjs` drives Stats in a phone-sized browser with touch (`hasTouch` and `isMobile`): taps, a long-press, and the filtered counts checked against Supabase. Start the app with `npx expo start --web`, then run `node e2e/stats.mjs` (needs `playwright-core` and Chrome). Pull to refresh is wired for the phone app; the web preview does not fire it.
