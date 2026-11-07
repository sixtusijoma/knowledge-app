# Knowledge

Personal phone-first viewer of saved X bookmarks and Grok chats, for Sixtus’s own use. Mostly AI-generated. Built with **Cursor**.

Entries live in Supabase (`public.items`). The app reads that table. It starts only when `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set.

## Features

- **Feed.** Newest first, 20 at a time, infinite scroll, and pull to refresh.
- **Search.** Full-text over titles, summaries, and authors (the `fts` column), using web search syntax such as `cursor -agents` or `"exact phrase"`.
- **Filters.** Source, topics (match any), a month, or a date range with either end open. Topics with no saved entries are hidden. Filters and search combine.
- **Entry.** Source, date, title, summary, topics, author when one was saved, the X post id or Grok chat id, when it was added, and the record id. A button opens the stored link (“Open on X” or “Open in Grok”).
- **Stats.** Entries per month by source, source split, topic counts, and activity over time. Tap a month, source, or topic to cross-filter the totals and the other charts; tap it again to clear it. Last 7, 30, and 90 days, this year, all time, or a custom range narrow every chart. Chips remove a selection. See entries opens the feed with those filters.
- **Activity.** Bookmarks per day and chats per day, from each entry’s own date (the post date, or the chat date). Switch day, week, or month. Both series can be hidden from the legend. Tap a point to see that bucket’s counts and open the feed on it. Postgres counts the series (`activity_buckets` in `supabase/migrations`). Until that function is on the database, the chart groups the rows Stats already loaded and labels the totals “Counted on this phone.”
- **Theme.** Dark navy by default, with a teal accent. The sun/moon button switches to light and is remembered.

## Stack

| Part | Tech |
| --- | --- |
| App | Expo SDK 58, expo-router, React Native, TypeScript |
| Data | Supabase Postgres, read with `@supabase/supabase-js` |
| Charts | react-native-svg |
| Updates | EAS Update, channel `production`, runtime `exposdk:58.0.0` |

## Screenshots

The pictures in this repo are the app icon and the splash mark. Feed, entry, and Stats screenshots are left out so this README does not show real bookmarks or chat titles. Live device shots were skipped for this export.

<p>
  <img src="assets/images/icon.png" width="180" alt="Knowledge app icon, a teal mark on navy" />
  <img src="assets/images/splash-icon.png" width="180" alt="Splash mark, teal rings on a dark grid" />
</p>

A demo GIF or MP4 is not in this repository.

## Setup

```bash
npm install
cp .env.example .env
npm start
```

Scan the QR code with Expo Go (iOS or Android). For a browser preview, press `w`, or run `npm run web`.

Set these in `.env`. Leave them empty in git; put real values only in the local file.

| Setting | What it's for |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Anon (publishable) key. Row level security should allow select only. |

Only those two belong in the client. The service-role key is never used by the app.

Apply `supabase/migrations/20261025223208_activity_buckets.sql` on the project so activity is aggregated in the database. This repo expects `public.items` (with the `fts` column search uses) to already exist. The migration here only adds `activity_buckets`.

## Publish

The app is published with EAS Update to `@setwise-sixtus/knowledge`, channel `production`, so it opens in Expo Go without a dev server. The runtime version follows the SDK (`exposdk:58.0.0`), which is what Expo Go reports.

```bash
npx eas-cli update --channel production --platform all --message "What changed"
```

Open it in Expo Go from `exp://u.expo.dev/58df4489-fd92-4ae6-8644-2b9f3daa4c05?runtime-version=exposdk%3A58.0.0&channel-name=production`. After an Expo SDK upgrade, publish again and update the `runtime-version` in that URL.

The same URL and anon key have to be present in the environment when you publish. The update bundle does not carry a fallback project.

## Checks

```bash
npm run typecheck
npm run lint
```

`e2e/phone.mjs` drives a phone-sized browser (touch, feed, filters, an entry, and Stats, including the activity chart at day, week, and month) and compares counts with Supabase. It needs `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `playwright-core`, and Chrome. Start the app with `npx expo start --web`, then run `node e2e/phone.mjs`. Pull to refresh is wired for the phone app; the web preview does not fire it.

## Layout

```
app/          Expo Router screens (feed, stats, entry)
components/   Cards, charts, filters, icons
lib/          Supabase client, queries, stats, theme
e2e/          Phone-sized browser script
supabase/     activity_buckets migration
assets/       App icon and splash
```

## Privacy

Private personal project. The library is Sixtus’s own bookmarks and chats. Those exports are not in this repository. Point the app at a Supabase project you control.

## License

[MIT](LICENSE)
