# SocialPulse — Social Media Analytics Dashboard

A full-stack agency dashboard for tracking clients' public social media analytics across Instagram, TikTok, Facebook, and YouTube.

---

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth v5 (credentials)
- **UI**: shadcn/ui + Tailwind CSS + Recharts
- **Scraping**: Playwright (headless Chromium)
- **Scheduling**: node-cron

---

## Quick Start

### 1. Prerequisites

```bash
node >= 18
npm >= 9
postgresql (local or hosted)
```

### 2. Install

```bash
npm install
npx playwright install chromium
```

### 3. Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/social_analytics"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Database

```bash
npm run db:push      # Push schema to database
npm run db:seed      # Create admin user (admin@socialpulse.app / password123)
```

### 5. Run

```bash
npm run dev          # Start dev server on http://localhost:3000
```

### 6. Start Scheduler (optional)

In a separate terminal:

```bash
npm run scheduler    # Starts node-cron for daily 3 AM scrapes
```

---

## Architecture

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/          # Login page
│   │   └── register/       # Register page
│   ├── (dashboard)/
│   │   ├── layout.tsx      # Sidebar + header wrapper
│   │   ├── dashboard/      # Main overview
│   │   ├── clients/        # Client list, new, detail pages
│   │   ├── analytics/      # Per-account analytics with charts
│   │   ├── reports/        # Monthly report generation + view
│   │   └── settings/       # App settings
│   └── api/
│       ├── auth/           # NextAuth handlers + register
│       ├── clients/        # CRUD + accounts
│       ├── scrape/         # Manual scrape trigger
│       ├── analytics/      # Monthly analytics + dashboard stats
│       └── reports/        # Report generation + retrieval
├── scrapers/
│   ├── base.ts             # Rate limiting, retries, user-agent rotation
│   ├── instagram.ts        # Instagram public profile scraper
│   ├── tiktok.ts           # TikTok public profile scraper
│   ├── facebook.ts         # Facebook page scraper
│   ├── youtube.ts          # YouTube channel scraper
│   └── index.ts            # Orchestrator — scrapeAndSave()
├── scheduler/
│   ├── index.ts            # node-cron daily job
│   └── runner.ts           # Standalone process entry
├── lib/
│   ├── analytics.ts        # Monthly analytics computation
│   ├── auth.ts             # NextAuth config
│   ├── prisma.ts           # Prisma singleton
│   ├── seed.ts             # DB seed script
│   └── utils.ts            # Helpers
└── types/
    └── index.ts            # Shared TypeScript types
```

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `users` | Agency user accounts |
| `clients` | Client records with tags/notes |
| `social_accounts` | Per-platform accounts per client |
| `daily_snapshots` | Daily follower/following/post counts |
| `posts` | Tracked posts/reels/videos |
| `post_metrics_history` | Per-post daily view/like/comment snapshots |
| `reports` | Generated monthly reports (stored as JSON) |

---

## Monthly Views Calculation

The system uses **historical snapshot diffing** to calculate true monthly views:

```
monthly_views_for_post = views_at_month_end - views_at_month_start
total_monthly_views = Σ monthly_views_for_all_posts
```

Example: A reel with 40K views on May 1st and 140K on May 31st contributes **100K monthly views**.

---

## Scraping Strategy

- **Public data only** — no API keys, no login bypassing
- **Rate limiting** — 2–5 second random delays between requests (configurable)
- **Retry logic** — up to 3 retries with exponential backoff
- **User-agent rotation** — randomised across 4 browser signatures
- **Resource blocking** — images/videos blocked to reduce fingerprint
- **Staggered accounts** — 5–10 second gap between consecutive account scrapes

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/clients` | List clients |
| POST | `/api/clients` | Create client |
| GET | `/api/clients/:id` | Get client with accounts |
| PATCH | `/api/clients/:id` | Update client (pause, notes, tags) |
| DELETE | `/api/clients/:id` | Delete client |
| POST | `/api/clients/:id/accounts` | Add social account |
| DELETE | `/api/clients/:id/accounts?accountId=` | Remove account |
| POST | `/api/scrape` | Trigger scrape (accountId or clientId) |
| GET | `/api/analytics?accountId=&month=&year=` | Monthly analytics |
| GET | `/api/analytics?type=dashboard` | Dashboard stats |
| GET | `/api/reports` | List reports |
| POST | `/api/reports` | Generate report |
| GET | `/api/reports/:id` | Get report data |
| DELETE | `/api/reports/:id` | Delete report |

---

## Deployment (Vercel)

1. Push to GitHub
2. Import in Vercel — set environment variables
3. Use a PostgreSQL provider (Supabase, Neon, Railway)
4. For scheduler: use Vercel Cron or a separate worker (Railway, Render)

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | required |
| `NEXTAUTH_SECRET` | Random secret for JWT | required |
| `NEXTAUTH_URL` | App base URL | `http://localhost:3000` |
| `SCRAPE_MIN_DELAY_MS` | Min scrape delay | `2000` |
| `SCRAPE_MAX_DELAY_MS` | Max scrape delay | `5000` |
| `SCRAPE_RETRY_LIMIT` | Max scrape retries | `3` |
| `CRON_DAILY_SCRAPE` | Cron expression | `0 3 * * *` |
