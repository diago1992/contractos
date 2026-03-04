# ContractOS

AI-powered contract management platform for MoneyMe. Upload contracts, auto-extract metadata with Claude AI, track obligations and renewals, query your portfolio in natural language, and sync with NetSuite GL.

**Live:** [contractos-omega.vercel.app](https://contractos-omega.vercel.app)

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Database:** Supabase (PostgreSQL + Auth + Storage + RLS)
- **AI:** Claude Sonnet (extraction), Claude Haiku (classification + query agent), OpenAI (embeddings)
- **UI:** React 19, Tailwind CSS v4, custom shadcn/ui-style components
- **Charts:** Recharts
- **Integrations:** Slack (notifications, file ingestion, interactive buttons), NetSuite (vendor sync, invoice tracking)
- **Hosting:** Vercel (auto-deploy from main)

## Features

- Upload PDF/DOCX contracts via drag-and-drop or Slack
- AI classification (10 document types) and full metadata extraction
- Human-in-the-loop verification workflow
- Dashboard with search, filters, pagination, bulk actions
- Contract detail view with commercial terms, obligations, risk flags, vendor/spend, audit log
- Obligation tracking with inline status management
- Analytics dashboard (6 interactive charts)
- Renewal calendar with month grid view
- Counterparty map grouping contracts by counterparty
- Natural language query agent (RAG with Claude Haiku)
- Semantic search with pgvector embeddings
- NetSuite vendor sync and invoice spend tracking with threshold alerts
- Tiered renewal escalation (30d/14d/7d/overdue) with Slack interactive buttons
- Weekly portfolio digest to Slack
- Role-based access control (viewer, contributor, reviewer, admin)
- Google OAuth sign-in

## Pages

| Route | Description |
|-------|-------------|
| `/login` | Google OAuth sign-in |
| `/dashboard` | Contract list, stats, search, query agent |
| `/contracts/[id]` | Contract detail — summary, terms, obligations, risk flags, vendor & spend, audit log |
| `/analytics` | 6 interactive charts (status, type, expiry, risk, value, obligations) |
| `/calendar` | Renewal calendar (month grid with color-coded chips) |
| `/counterparties` | Contracts grouped by counterparty |
| `/users` | Admin user role management |

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Supabase project
- Anthropic API key

### Setup

```bash
# Clone and install
git clone https://github.com/diago1992/contractos.git
cd contractos
npm install

# Configure environment
cp .env.example .env.local
# Fill in your API keys and Supabase credentials

# Apply database migrations (via Supabase SQL Editor, in order)
# Files are in supabase/migrations/

# Start dev server
npm run dev
```

### Database Migrations

Apply in order via the Supabase SQL Editor:

| File | Purpose |
|------|---------|
| `001_initial_schema.sql` | Core schema: contracts, terms, obligations, risks, tags, links, audit, notifications, RLS |
| `002_storage_bucket.sql` | Private contracts storage bucket |
| `003_v2_vendors_invoices_obligations.sql` | Vendors, invoices, contract-vendor join, obligation enhancements |
| `004_add_document_types_column.sql` | Adds `document_types` array column |
| `005_semantic_search.sql` | pgvector extension, contract chunks, embeddings, escalation tracking, match function |
| `006_security_hardening.sql` | Role escalation prevention trigger, escalation_log DELETE policy |

### Environment Variables

See `.env.example` for all required and optional variables. At minimum you need:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`

Optional integrations (gracefully degrade when not configured):

- **Slack:** `SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID`, `SLACK_SIGNING_SECRET`
- **NetSuite:** `NETSUITE_ACCOUNT_ID`, `NETSUITE_CONSUMER_KEY/SECRET`, `NETSUITE_TOKEN_ID/SECRET`
- **Semantic search:** `OPENAI_API_KEY`

### Backfill Embeddings (Optional)

If you have existing contracts and want semantic search:

```bash
npx tsx scripts/backfill-embeddings.ts
```

## Deployment

Hosted on **Vercel** with auto-deploy from `main`.

1. Import repo on [vercel.com](https://vercel.com)
2. Add all environment variables from `.env.example`
3. Set `NEXT_PUBLIC_APP_URL` to your Vercel URL
4. Deploy

### Post-deploy Supabase config:
- Set **Site URL** to your Vercel URL (Authentication > URL Configuration)
- Add `https://your-app.vercel.app/**` to **Redirect URLs**

### Post-deploy Slack config:
- **Interactivity Request URL:** `https://your-app.vercel.app/api/slack/interactions`
- **Event Subscriptions Request URL:** `https://your-app.vercel.app/api/slack/events`

## API Routes

### Contracts
- `GET /api/contracts` — List (paginated, filterable)
- `POST /api/contracts` — Upload
- `GET/PATCH/DELETE /api/contracts/[id]` — Detail, update, soft delete
- `POST /api/contracts/[id]/reprocess` — Re-run AI extraction
- `GET/POST/DELETE /api/contracts/[id]/vendor` — Link/unlink vendor

### Search & Query
- `GET /api/search?q=...` — Semantic search
- `POST /api/query` — Natural language query agent

### Vendors & Invoices
- `GET/POST /api/vendors` — List/create
- `GET/PATCH /api/vendors/[id]` — Detail/update
- `POST /api/vendors/[id]/sync` — Sync to NetSuite
- `GET /api/vendors/[id]/invoices` — Pull invoices

### Other
- `PATCH /api/obligations` — Bulk update status
- `GET /api/analytics` — Chart data
- `GET /api/users` / `PATCH /api/users/[id]` — User management (admin)
- `POST /api/slack/events` — Slack file uploads
- `POST /api/slack/interactions` — Slack interactive buttons
- `POST /api/cron/expiring-contracts` — Tiered escalation
- `POST /api/cron/weekly-digest` — Weekly Slack digest
- `POST /api/cron/sync-invoices` — NetSuite invoice sync

## Scripts

```bash
npm run dev       # Start dev server (Turbopack)
npm run build     # Production build
npm run start     # Start production server
npm run lint      # ESLint
```

## Project Structure

```
src/
├── app/
│   ├── (protected)/      # Auth-gated pages
│   ├── api/              # API routes
│   └── auth/             # OAuth callback
├── components/
│   ├── ui/               # 13 shadcn-style primitives (no Radix)
│   ├── contracts/        # Vendor panel, invoice table, spend progress, dialogs
│   ├── search/           # Search bar, semantic results, query panel
│   └── layout/           # Sidebar, app layout
├── hooks/                # React Query hooks
├── lib/
│   ├── agents/           # AI pipeline (parser, classifier, extractor, ingestion)
│   ├── netsuite/         # NetSuite OAuth 1.0a auth + vendor API
│   ├── supabase/         # Client, server, proxy helpers
│   ├── embeddings.ts     # OpenAI embeddings + text chunking
│   ├── slack.ts          # Slack notification helpers
│   └── utils/            # Constants, formatters, chart colors
├── types/                # TypeScript types (database, contracts, analytics, netsuite)
scripts/
├── backfill-embeddings.ts
└── seed-sample-data.ts
supabase/
└── migrations/           # 6 SQL migration files
```
