# zeitplaner-bk

Daily and monthly activity planner with Google Calendar sync. Google handles scheduling; this app handles sub-items, links, images, and priorities.

## Stack

- **Next.js** (App Router)
- **Supabase** (Auth, Postgres, Storage)
- **Google Calendar API**
- **Vercel** (deployment)

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run migrations in `supabase/migrations/` via SQL Editor (in order)
3. Create a **private** Storage bucket named `item-images`
4. Enable Google provider in **Authentication → Providers**
5. Copy URL + anon key + service role key into `.env.local`

### 2. Google Cloud

1. Create OAuth 2.0 credentials (Web application)
2. Authorized redirect URIs:
   - `https://<your-project>.supabase.co/auth/v1/callback`
   - `http://localhost:3000/auth/callback`
3. Enable **Google Calendar API**
4. Add Calendar scope in Supabase Google provider settings
5. Copy Client ID + Secret into `.env.local` and Supabase Google provider

### 3. Environment

Copy `.env.example` → `.env.local` and fill in values.

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server only) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` locally |
| `GOOGLE_CALENDAR_ID` | `primary` = user's main calendar |

### 4. Run locally

```bash
npm install
npm run dev
```

### 5. Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add all env vars from `.env.local`
4. Set `NEXT_PUBLIC_APP_URL` to your Vercel domain
5. Add Vercel URL to Supabase redirect allow list

## Product rules

- **Google owns recurrence** — RRULE lives on Calendar; app mirrors it
- **Sub-items are app-only** — never synced to Google Calendar
- **Priority**: Important or Optional only
- **Recurring edits**: This event vs All events
- **Recurring sub-items**: checkoff applies to that day only (instance materialization)
- **Images**: max 5MB, compressed client-side before upload
- **Calendar sync**: pull on open/refresh via Sync button
