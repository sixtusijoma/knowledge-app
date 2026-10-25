# Knowledge

A phone-first, read-only library of saved X bookmarks and Grok chats. The entries live in Supabase (`public.items`); this app only reads them.

- **Feed**: newest first, 20 at a time with infinite scroll and pull to refresh.
- **Search**: full-text over titles, summaries and authors (the `fts` column), using web search syntax such as `cursor -agents` or `"exact phrase"`.
- **Filters**: source, importance, topics (match any), a month, or a date range with either end open. Filters and search combine.
- **Entry**: every field, plus a button that opens the original post on X or the chat in Grok. On a phone, X links open in the X app when it is installed.
- **Stats**: entries per month by source, source split, importance split, and topic counts, read live from the table.
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

## Checks

```bash
npm run typecheck
npm run lint
```
