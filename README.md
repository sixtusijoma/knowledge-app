# Knowledge

A phone-first, read-only library of saved X bookmarks and Grok chats. The entries live in Supabase (`public.items`). This app only reads them.

## Run

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go. For a web preview:

```bash
npx expo start --web
```

## Environment

The app reads:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Copy `.env.example` to `.env` to set them. If they are missing, the app falls back to the public Knowledge project. The anon key is meant for clients: row level security allows select, and writes are revoked.

## Checks

```bash
npm run typecheck
npm run lint
```
