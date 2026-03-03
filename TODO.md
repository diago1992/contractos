# ContractOS — Project Status & TODO

**Last updated:** March 2026

---

## What's Built (Complete)

### Core Platform
- [x] Next.js 16 App Router + Supabase + TypeScript
- [x] Google OAuth authentication (via Supabase Auth)
- [x] Role-based access control (viewer / contributor / reviewer / admin)
- [x] Row-level security on all tables
- [x] Dark mode (next-themes)
- [x] Responsive sidebar + topbar layout

### Document Upload & Storage
- [x] Drag-and-drop file upload (PDF + DOCX)
- [x] Supabase Storage (private bucket with RLS)
- [x] Batch upload support
- [x] Realtime upload progress via Supabase channels

### AI Extraction Pipeline
- [x] Document parsing (pdf-parse for PDF, mammoth for DOCX)
- [x] Classification via Claude Haiku (tool_use) — primary + secondary types
- [x] Full metadata extraction via Claude Sonnet (tool_use) — title, counterparty, dates, terms, obligations, risks, tags
- [x] Human-in-the-loop verification workflow (reviewer+ can verify)
- [x] Audit logging for all AI operations

### Dashboard
- [x] Contract list with search, filters (type, status, extraction status), pagination
- [x] Sortable + selectable table with bulk actions (status change, soft delete, CSV export)
- [x] Stats cards (active, pending review, expiring soon, recently added)
- [x] Realtime status updates via Supabase channels

### Contract Detail Page
- [x] AI summary card
- [x] Structured metadata grid (dates, governing law, renewal, counterparty)
- [x] Visual timeline (effective → notice → expiry)
- [x] Related contracts (parent/child linking with type)
- [x] Commercial terms tab (table view)
- [x] Obligations tab with status dropdown (reviewer+), bulk selection, risk badges, overdue highlighting
- [x] Vendor & Spend tab (vendor card, spend progress bar, invoice table)
- [x] Audit log tab (timeline view)

### Notifications
- [x] In-app notification bell with unread count
- [x] Realtime notification delivery
- [x] Mark as read / mark all read / delete

### Slack Integration
- [x] Push notifications for upload, extraction, expiry, spend thresholds
- [x] Slash command `/contracts search [query]`
- [x] File ingestion from Slack (upload a file → auto-creates contract + runs AI pipeline)
- [x] Request signature verification

### Analytics Dashboard
- [x] Summary stat cards (total contracts, total value, avg value)
- [x] Contracts by status (pie chart)
- [x] Contracts by type (bar chart)
- [x] Expiry timeline — 12 months ahead (bar chart)
- [x] Risk flags by severity (horizontal bar)
- [x] Contract value over time (line chart)
- [x] Obligations by status (pie chart)

### NetSuite GL Integration
- [x] OAuth 1.0a TBA auth (HMAC-SHA256, no npm dependency)
- [x] Vendor CRUD (create, search, get)
- [x] Vendor ↔ contract linking (many-to-many)
- [x] Push vendors to NetSuite / link to existing NS vendors
- [x] Pull vendor invoices via SuiteQL
- [x] Invoice upsert + local caching
- [x] Spend vs contract value progress bar (green/yellow/red thresholds)
- [x] Spend threshold notifications (80% warning, 100% exceeded)
- [x] Cron endpoint for batch invoice sync

### Obligation Tracking
- [x] Status management (pending, in_progress, completed, overdue, waived)
- [x] Inline status dropdown for reviewer+ role
- [x] Bulk status update with floating action bar
- [x] Optimistic UI updates with rollback
- [x] Audit logging per status change
- [x] Overdue visual highlighting (red left border)
- [x] Per-item risk computation

### Cron Jobs
- [x] Expiring contracts notifications
- [x] NetSuite invoice sync + spend threshold alerts

### Admin
- [x] User management page (admin-only)
- [x] Role assignment (viewer → admin)
- [x] First user auto-promoted to admin

---

## Known Issues / Tech Debt

- [ ] **`document_types` column missing from migrations** — The `contracts.document_types text[]` column is used in code (ingestion pipeline + detail page) but is NOT in `001_initial_schema.sql`. If deploying fresh from migrations, AI extraction will fail on this field. Needs a migration: `ALTER TABLE contracts ADD COLUMN document_types text[];`
- [ ] **`.env.example` out of date** — Only has 4 vars. Missing: `SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID`, `SLACK_SIGNING_SECRET`, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`, `DATABASE_PASSWORD`, and all `NETSUITE_*` vars
- [ ] **README.md is default Next.js boilerplate** — No setup instructions, migration guide, or architecture docs
- [ ] **No CLAUDE.md** — Project conventions only in Claude Code memory system, not in repo
- [ ] **Middleware deprecation warning** — Next.js 16 deprecated `middleware.ts` in favor of `proxy`. Works but logs a warning on every build

---

## Not Yet Built (from Product Spec)

### Spec Phase 2 — Intelligence (Partially Done)
- [ ] **Tiered escalation chain for renewals** — Spec calls for 30d → 14d → 7d → overdue escalation with different channels and recipients. Current cron sends one-time expiry alerts only.
- [ ] **Slack renewal workflow** — Interactive "Renew" / "Let Expire" / "Snooze" buttons on renewal reminders
- [ ] **Weekly digest** — Slack message summarising top renewals, new contracts, unresolved flags
- [ ] **Semantic search** — pgvector / embeddings for "find contracts with change of control provisions". Current search is text-only (tsvector full-text search).
- [ ] **Renewal calendar view** — Month-by-month visual calendar of renewal/expiry dates
- [ ] **Counterparty map** — All agreements with a given entity in one view

### Spec Phase 3 — Scale
- [ ] **Query Agent** — Natural language questions across the contract corpus via RAG (embeddings + Claude). Slash command `/contract search` currently does basic text search, not semantic.
- [ ] **Amendment tracking workflow** — Amendments are linkable to parents but there's no guided "create amendment" flow
- [ ] **Approval workflows** — Slack interactive messages for contract approval routing
- [ ] **Recurring obligation reminders** — Obligations with recurring due dates + auto-reminder cron
- [ ] **API for external integrations** — Documented REST API for CRM / finance system integration

### Spec Phase 4 — Enterprise
- [ ] **Azure Blob Storage migration** — Currently on Supabase Storage. Spec envisions Azure Blob + SharePoint.
- [ ] **Azure AD SSO** — Currently Google OAuth only
- [ ] **Contract generation** — AI-drafted NDAs/MSAs from approved templates
- [ ] **Clause library** — Catalogue of approved clauses for insertion
- [ ] **Multi-department workspaces** — Department-specific compliance tracking
- [ ] **OCR fallback** — Scanned PDFs (Tesseract). Currently only text-based PDF/DOCX.

### Analytics Enhancements (from Spec §7.3)
- [ ] **Spend dashboard by counterparty** — Current analytics shows aggregate value only, not broken down by vendor/counterparty
- [ ] **Expiry heatmap** — Concentration risk visualisation
- [ ] **Obligation tracker view** — Dedicated page for cross-contract obligation management

### Other
- [ ] **Contract notes/comments** — Spec §7.2 mentions team member notes on contract detail. Not implemented.
- [ ] **User-configurable alert preferences** — Spec §14 mentions snooze and per-user notification settings
- [ ] **Confidence scores on extractions** — Spec §6.1 mentions confidence scores for critical fields

---

## Environment Setup (for reference)

```bash
# Required env vars
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=

# Slack (optional — features degrade gracefully)
SLACK_BOT_TOKEN=
SLACK_CHANNEL_ID=
SLACK_SIGNING_SECRET=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=

# NetSuite (optional — vendor sync disabled without these)
NETSUITE_ACCOUNT_ID=
NETSUITE_CONSUMER_KEY=
NETSUITE_CONSUMER_SECRET=
NETSUITE_TOKEN_ID=
NETSUITE_TOKEN_SECRET=
```

```bash
# Run migrations
# Apply 001, 002, 003 via Supabase dashboard SQL editor or supabase db push

# Seed sample data
npx tsx scripts/seed-sample-data.ts

# Dev
npm run dev

# Build
npm run build
```
