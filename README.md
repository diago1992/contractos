# ContractOS

Internal contract management system for MoneyMe. AI-powered document ingestion, structured metadata extraction, vendor/spend tracking, and proactive alerting.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Database:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **AI:** Claude Sonnet (extraction), Claude Haiku (classification), OpenAI (embeddings)
- **UI:** React 19, Tailwind CSS v4, custom shadcn/ui-style components
- **Charts:** Recharts
- **Integrations:** Slack (push notifications, slash commands, file ingestion), NetSuite (vendor sync, invoice tracking)

## Features

- Upload PDF/DOCX contracts via drag-and-drop or Slack
- AI classification (10 document types) and full metadata extraction
- Human-in-the-loop verification workflow
- Dashboard with search, filters, pagination, bulk actions
- Contract detail view with commercial terms, obligations, vendor/spend, audit log
- Obligation tracking with inline status management
- Analytics dashboard (6 charts)
- NetSuite vendor sync and invoice spend tracking
- Tiered renewal escalation alerts
- Semantic search with pgvector embeddings
- Natural language query agent (RAG)
- Role-based access control (viewer, contributor, reviewer, admin)
- Realtime updates via Supabase channels

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Supabase project (with Auth, Storage, and Realtime enabled)
- Anthropic API key

### Setup

```bash
# Clone and install
npm install

# Copy environment variables
cp .env.example .env.local
# Fill in all values in .env.local

# Apply database migrations (via Supabase dashboard SQL editor or CLI)
# Run in order: 001, 002, 003, 004, 005
# Files are in supabase/migrations/

# Seed sample data (optional)
npx tsx scripts/seed-sample-data.ts

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The first user to sign in is auto-promoted to admin.

### Database Migrations

Apply migrations in order via the Supabase SQL editor or `supabase db push`:

| File | Purpose |
|------|---------|
| `001_initial_schema.sql` | Core schema: contracts, terms, obligations, risks, tags, links, audit, notifications |
| `002_storage_bucket.sql` | Private contracts storage bucket |
| `003_v2_vendors_invoices_obligations.sql` | Vendors, invoices, contract-vendor join, obligation enhancements |
| `004_add_document_types_column.sql` | Fix: adds missing `document_types` array column |
| `005_semantic_search.sql` | pgvector extension, contract chunks, embeddings, escalation tracking |

### Environment Variables

See `.env.example` for all required and optional variables. At minimum you need:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`

Optional integrations (gracefully degrade when not configured):

- **Slack:** `SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID`, `SLACK_SIGNING_SECRET`
- **NetSuite:** `NETSUITE_ACCOUNT_ID`, `NETSUITE_CONSUMER_KEY/SECRET`, `NETSUITE_TOKEN_ID/SECRET`
- **Semantic search:** `OPENAI_API_KEY`

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
│   ├── (protected)/      # Auth-gated pages (dashboard, upload, contracts, analytics, calendar, etc.)
│   ├── api/              # API routes (contracts, vendors, analytics, obligations, cron, slack, query)
│   └── auth/             # OAuth callback
├── components/
│   ├── ui/               # 14 shadcn-style primitives (no Radix dependency)
│   ├── contracts/        # Contract-specific components (vendor panel, invoice table, etc.)
│   ├── layout/           # Sidebar, topbar, app layout
│   └── ...               # Search, upload, notifications
├── hooks/                # React Query hooks for all data fetching
├── lib/
│   ├── agents/           # AI pipeline (parser, classifier, extractor, ingestion orchestrator)
│   ├── netsuite/         # NetSuite OAuth 1.0a auth + vendor API
│   ├── supabase/         # Client, server, proxy helpers
│   └── utils/            # Constants, formatters, chart colors
└── types/                # TypeScript type definitions
```
