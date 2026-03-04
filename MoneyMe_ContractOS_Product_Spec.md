# ContractOS — Internal Document Management System

## Product Specification v2.0

**Owner:** Diago | MoneyMe
**Date:** March 2026
**Status:** Deployed — [contractos-omega.vercel.app](https://contractos-omega.vercel.app)

---

## 1. Problem Statement

MoneyMe manages hundreds of contracts, NDAs, and commercial arrangements across its lending operations, technology partnerships, and vendor relationships. Today these documents live across email threads, local drives, and scattered cloud folders with no centralised visibility into renewal dates, commercial terms, counterparty obligations, or expiry risk.

The result: missed renewal windows, duplicated effort tracking terms manually, no single source of truth for commercial exposure, and zero proactive alerting when action is required.

---

## 2. Vision

A single internal platform — **ContractOS** — that ingests, indexes, summarises, and monitors every commercial document in the business. AI agents extract and maintain structured metadata. A live dashboard gives leadership instant visibility. Slack-native push notifications ensure nothing slips.

---

## 3. Design Principles

- **Start simple, scale later.** Google Drive as initial document store (avoids Azure AD permissioning delays). Migrate to Azure Blob / SharePoint in Phase 2 once the system proves value.
- **AI-first metadata.** No manual data entry for contract terms — agents extract everything on upload.
- **Push over pull.** The system comes to you via Slack, not the other way around.
- **Auditability.** Every extraction, edit, and notification is logged.

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    USERS (Browser / Slack)               │
└──────────┬──────────────────────────────┬───────────────┘
           │                              │
     ┌─────▼─────┐                 ┌──────▼──────┐
     │ Dashboard  │                 │  Slack Bot  │
     │ (React)    │                 │  (Push +    │
     │            │                 │   Commands) │
     └─────┬─────┘                 └──────┬──────┘
           │                              │
     ┌─────▼──────────────────────────────▼───────────┐
     │              API LAYER (FastAPI / Node)         │
     │  ┌──────────┐  ┌───────────┐  ┌─────────────┐  │
     │  │ Contract  │  │ Search &  │  │ Notification│  │
     │  │ CRUD      │  │ Query     │  │ Engine      │  │
     │  └──────────┘  └───────────┘  └─────────────┘  │
     └─────┬──────────────────────────────────────────┘
           │
     ┌─────▼──────────────────────────────────────────┐
     │              AGENTIC LAYER                      │
     │  ┌──────────────┐  ┌────────────────────────┐  │
     │  │ Ingestion    │  │ Monitor Agent           │  │
     │  │ Agent        │  │ (cron: renewals,        │  │
     │  │ (extract,    │  │  expirations, anomalies)│  │
     │  │  classify,   │  ├────────────────────────┤  │
     │  │  summarise)  │  │ Query Agent             │  │
     │  └──────────────┘  │ (natural language       │  │
     │                    │  contract questions)     │  │
     │                    └────────────────────────┘  │
     └─────┬──────────────────────────────────────────┘
           │
     ┌─────▼──────────────────────────────────────────┐
     │              DATA LAYER                         │
     │  ┌──────────┐  ┌───────────┐  ┌─────────────┐  │
     │  │ Postgres │  │ Google    │  │ Vector DB   │  │
     │  │ (metadata│  │ Drive     │  │ (embeddings │  │
     │  │  + audit)│  │ (docs)    │  │  for search)│  │
     │  └──────────┘  └───────────┘  └─────────────┘  │
     └────────────────────────────────────────────────┘
```

---

## 5. Document Storage — Phase 1: Google Drive

### Why Google Drive to Start

Azure Blob + AD permissioning will take weeks to configure correctly across MoneyMe's security policies. Google Drive gives us a shared folder structure, native preview, version history, and a well-documented API — all usable within days.

### Folder Structure

```
ContractOS/
├── 01_NDAs/
│   ├── Active/
│   └── Expired/
├── 02_Vendor_Agreements/
├── 03_Partnership_Agreements/
│   ├── Partner/
│   ├── Channel/
│   └── Technology/
├── 04_Employment_Contracts/
├── 05_Lease_Property/
├── 06_Regulatory_Licences/
├── 07_Lending_Facilities/
│   ├── Warehouse/
│   └── Corporate/
├── 08_Insurance/
└── 09_Other/
```

### Phase 2 Migration Path

When ready, a migration script copies all documents from Google Drive → Azure Blob Storage, remaps document references in Postgres, and switches the storage adapter. The API layer abstracts storage behind an interface (`StorageProvider`) so the rest of the system is unaffected.

---

## 6. Agentic AI Layer

This is the core differentiator. Three distinct agents handle different responsibilities.

### 6.1 Ingestion Agent

**Trigger:** New document uploaded to Google Drive (via webhook) or manually submitted through the dashboard.

**Pipeline:**

1. **Document parsing** — PDF/DOCX text extraction via `pdfplumber` / `python-docx`. OCR fallback for scanned docs via `Tesseract`.
2. **Classification** — LLM classifies the document type: NDA, MSA, SLA, SOW, lease, licence, employment contract, facility agreement, insurance policy, other.
3. **Entity & term extraction** — Structured extraction into a JSON schema:

```json
{
  "document_type": "Master Services Agreement",
  "counterparty": "TechPartner Pty Ltd",
  "counterparty_abn": "12 345 678 901",
  "effective_date": "2025-03-01",
  "expiry_date": "2027-02-28",
  "auto_renewal": true,
  "renewal_notice_period_days": 90,
  "termination_for_convenience": true,
  "termination_notice_days": 30,
  "governing_law": "NSW, Australia",
  "commercial_terms": {
    "fee_type": "monthly_fixed",
    "amount": 45000,
    "currency": "AUD",
    "escalation": "CPI annually",
    "payment_terms_days": 30
  },
  "key_obligations": [
    "SLA: 99.9% uptime",
    "Data residency: Australia only",
    "Insurance: $10M professional indemnity"
  ],
  "confidentiality_period_months": 24,
  "ip_ownership": "Client retains all IP",
  "liability_cap": "12 months fees",
  "tags": ["technology", "platform", "lending"],
  "risk_flags": [
    "Unlimited liability for IP infringement",
    "No force majeure clause"
  ],
  "summary": "2-year MSA with TechPartner for platform services. $45K/month with CPI escalation. Auto-renews unless 90 days notice given. Key risk: unlimited IP liability."
}
```

4. **Human-in-the-loop review** — Extracted data is flagged as "AI-extracted, pending review" in the dashboard. A team member confirms or corrects. Once confirmed, status moves to "Verified".
5. **Embedding generation** — Full document text is chunked and embedded (OpenAI `text-embedding-3-large` or Azure OpenAI equivalent) and stored in Pinecone / pgvector for semantic search.

**LLM:** Claude via Anthropic API (Sonnet for extraction, Haiku for classification). Alternatively Azure OpenAI GPT-4o if keeping everything in the Azure ecosystem is preferred later.

### 6.2 Monitor Agent

**Runs:** Daily cron job (6:00 AM AEST).

**Responsibilities:**

| Check | Logic | Action |
|-------|-------|--------|
| Renewal approaching | `expiry_date - renewal_notice_period_days` ≤ today + 30 | Slack alert to contract owner |
| Renewal critical | ≤ 7 days to notice deadline | Slack escalation to leadership channel |
| Contract expired | `expiry_date` < today AND not renewed | Move to "Expired" folder, update status |
| Commercial anomaly | Fee changes, missing payments flagged in linked systems | Slack alert with context |
| Unsigned documents | Document uploaded > 14 days ago, status still "Draft" | Reminder to contract owner |
| Compliance check | Insurance/licence expiry approaching | Slack alert to compliance team |

**Escalation chain:**

- **30 days out:** Notify contract owner via DM
- **14 days out:** Notify contract owner + their manager in team channel
- **7 days out:** Post to `#contracts-critical` channel + tag leadership
- **Overdue:** Daily reminder until resolved

### 6.3 Query Agent

**Interface:** Slack slash command `/contract` + dashboard search bar.

**Capabilities:**

- Natural language questions: *"What's our total monthly spend on technology vendors?"*
- Cross-contract analysis: *"Which contracts have auto-renewal clauses expiring in Q2?"*
- Counterparty lookup: *"Show me everything we have with [Vendor Name]"*
- Obligation tracking: *"What insurance minimums are required across all our MSAs?"*
- Comparison: *"How do the terms of our current warehouse facility compare to the previous one?"*

**Implementation:** RAG pipeline — query → embedding → retrieve relevant contract chunks from vector DB → Claude synthesises answer with citations back to specific documents and clauses.

---

## 7. Live Dashboard

### 7.1 Overview Page

A single-screen summary showing:

- **Total active contracts** with breakdown by type (pie/donut chart)
- **Total commercial exposure** — aggregated monthly/annual committed spend and revenue
- **Upcoming renewals** — next 90 days, sorted by urgency (red/amber/green)
- **Recently added** — last 10 documents ingested
- **Risk flags** — contracts with unresolved AI-flagged risks
- **Verification queue** — documents awaiting human review of AI extraction

### 7.2 Contract Detail View

Each contract has a detail page showing:

- AI-generated summary (2-3 sentences)
- Full extracted metadata in structured format
- Timeline visualisation (effective → renewal notice → expiry)
- Linked documents (amendments, side letters, related NDAs)
- Audit log (who uploaded, who verified, what changed)
- Direct link to source document in Google Drive
- Notes and comments from team members
- Status badge: Draft / Active / Under Review / Expiring Soon / Expired / Terminated

### 7.3 Analytics Views

- **Spend dashboard** — by counterparty, by category, monthly trend
- **Renewal calendar** — month-by-month view of all renewal dates
- **Counterparty map** — all agreements with a given entity in one view
- **Expiry heatmap** — concentration risk (e.g., 15 contracts all expire in June)
- **Obligation tracker** — outstanding obligations grouped by type

### 7.4 Search

- Full-text search across all contract content
- Semantic search ("contracts with change of control provisions")
- Filtered search by: type, counterparty, date range, status, commercial value, tags
- Results show relevant snippet with highlighted matches

---

## 8. Slack Integration

### 8.1 Push Notifications

| Event | Channel | Format |
|-------|---------|--------|
| New contract ingested | `#contracts-feed` | Summary card with type, counterparty, key dates |
| Renewal reminder (30d) | DM to owner | Actionable message with "Renew" / "Let Expire" / "Snooze" buttons |
| Renewal critical (7d) | `#contracts-critical` | Red alert with escalation context |
| AI extraction complete | DM to uploader | "Review extracted terms" button linking to dashboard |
| Risk flag detected | `#contracts-risk` | Risk description + link to contract |
| Weekly digest | `#contracts-weekly` | Top renewals, new contracts, unresolved flags |
| Monthly commercial summary | `#leadership` | Total spend/revenue, changes from prior month |

### 8.2 Slack Commands

| Command | Action |
|---------|--------|
| `/contract search [query]` | Natural language search across all contracts |
| `/contract summary [counterparty]` | Quick summary of all agreements with an entity |
| `/contract renewals` | List upcoming renewals next 30 days |
| `/contract upload` | Get a link to upload a new document |
| `/contract status [doc name]` | Check status of a specific contract |
| `/contract spend [category]` | Quick commercial summary |

### 8.3 Interactive Workflows

- **Renewal decision flow:** Bot sends renewal reminder → user clicks "Renew" → bot creates a task in the dashboard, notifies legal team, and updates contract status to "Renewal In Progress"
- **Approval flow:** New contract uploaded → bot sends to designated approver → approver clicks "Approve" / "Request Changes" → status updates accordingly

---

## 9. Data Model

### Core Tables (Postgres)

```sql
-- Central contract record
contracts
├── id (UUID, PK)
├── title (text)
├── document_type (enum)
├── status (enum: draft, active, under_review, expiring_soon, expired, terminated)
├── counterparty_name (text)
├── counterparty_abn (text, nullable)
├── effective_date (date)
├── expiry_date (date, nullable)
├── auto_renewal (boolean)
├── renewal_notice_period_days (int, nullable)
├── termination_notice_days (int, nullable)
├── governing_law (text)
├── summary (text)  -- AI-generated
├── extraction_status (enum: pending, extracted, verified)
├── extracted_by_model (text)  -- e.g. "claude-sonnet-4-5"
├── verified_by (UUID, FK → users, nullable)
├── verified_at (timestamp, nullable)
├── drive_file_id (text)  -- Google Drive reference
├── drive_folder_path (text)
├── owner_user_id (UUID, FK → users)
├── created_at (timestamp)
├── updated_at (timestamp)
└── deleted_at (timestamp, nullable)  -- soft delete

-- Financial terms
commercial_terms
├── id (UUID, PK)
├── contract_id (UUID, FK → contracts)
├── fee_type (enum: monthly_fixed, annual_fixed, per_transaction, revenue_share, etc.)
├── amount (decimal)
├── currency (text, default 'AUD')
├── escalation_clause (text, nullable)
├── payment_terms_days (int)
└── notes (text, nullable)

-- Extracted obligations and provisions
obligations
├── id (UUID, PK)
├── contract_id (UUID, FK → contracts)
├── obligation_type (enum: sla, insurance, data_residency, reporting, etc.)
├── description (text)
├── due_date (date, nullable)
├── recurring (boolean)
└── status (enum: active, completed, overdue)

-- AI-detected risk flags
risk_flags
├── id (UUID, PK)
├── contract_id (UUID, FK → contracts)
├── severity (enum: low, medium, high, critical)
├── description (text)
├── resolved (boolean, default false)
├── resolved_by (UUID, FK → users, nullable)
└── resolved_at (timestamp, nullable)

-- Tags for flexible categorisation
contract_tags
├── contract_id (UUID, FK → contracts)
└── tag (text)

-- Links between related contracts
contract_links
├── parent_contract_id (UUID, FK → contracts)
├── child_contract_id (UUID, FK → contracts)
└── link_type (enum: amendment, side_letter, related_nda, renewal_of, replacement)

-- Full audit trail
audit_log
├── id (UUID, PK)
├── contract_id (UUID, FK → contracts)
├── user_id (UUID, FK → users, nullable)
├── action (text)  -- e.g. "ai_extraction", "manual_edit", "status_change"
├── details (jsonb)
├── created_at (timestamp)

-- Notification tracking
notifications
├── id (UUID, PK)
├── contract_id (UUID, FK → contracts)
├── notification_type (text)
├── channel (text)  -- slack_dm, slack_channel, email
├── recipient (text)
├── sent_at (timestamp)
├── acknowledged (boolean, default false)
```

---

## 10. Tech Stack (As Built)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 16 (App Router, Turbopack) + React 19 + TypeScript + Tailwind CSS v4 | Full-stack framework, server components + API routes |
| UI Components | Custom shadcn/ui-style primitives (no Radix dependency) | 13 components: Button, Card, Dialog, Dropdown, Select, Badge, etc. |
| Charts | Recharts | 6 interactive charts on analytics dashboard |
| Database | Supabase (PostgreSQL + pgvector + Auth + Storage + RLS) | Single platform for DB, auth, file storage, and realtime |
| Document Storage | Supabase Storage | Private bucket with authenticated access |
| AI — Extraction | Claude Sonnet (Anthropic SDK, tool_use) | Structured extraction via function calling |
| AI — Classification | Claude Haiku | Fast, cheap document type detection |
| AI — Embeddings | OpenAI text-embedding-3-small + pgvector | 1536-dim vectors, cosine similarity search |
| AI — RAG/Query | Claude Haiku | Natural language answers from contract context |
| Slack | @slack/web-api | Push notifications, file ingestion, interactive buttons |
| NetSuite | REST API with OAuth 1.0a TBA (HMAC-SHA256) | Vendor sync, invoice tracking |
| Hosting | Vercel | Auto-deploy from GitHub main branch |
| Auth | Google OAuth via Supabase Auth | Single sign-on for all MoneyMe users |

---

## 11. Security & Access Control

### Roles

| Role | Dashboard | Upload | Verify AI | Edit Metadata | Delete | Admin |
|------|-----------|--------|-----------|---------------|--------|-------|
| Viewer | ✓ | — | — | — | — | — |
| Contributor | ✓ | ✓ | — | — | — | — |
| Reviewer | ✓ | ✓ | ✓ | ✓ | — | — |
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

### Document-Level Permissions

Some contracts (employment, executive compensation, M&A) need restricted access. Implement folder-level permissions in Google Drive that mirror the application roles. Phase 2 adds row-level security in Postgres.

### AI Data Handling

- Documents are sent to Claude/OpenAI APIs for processing. Ensure API agreements cover data handling requirements.
- Consider Anthropic's zero-data-retention API option or Azure OpenAI (data stays in your Azure tenant).
- All extracted metadata is stored in MoneyMe-controlled Postgres. No contract content is cached in third-party vector DBs beyond embeddings (which are not reversible to original text).

---

## 12. Build Status

### Completed (v2.0)

- **Auth & RBAC** — Google OAuth via Supabase, 4 roles enforced via RLS + API checks
- **Contract CRUD** — Upload PDF/DOCX, paginated list, detail view, soft delete
- **AI Pipeline** — Classification (Haiku) + extraction (Sonnet tool_use) + verification workflow
- **Dashboard** — Stats cards, search, filters, pagination, bulk actions
- **Contract Detail** — Summary, commercial terms, obligations, risk flags, vendor & spend, audit log
- **Obligation Tracking** — Inline status management, bulk updates, overdue highlighting
- **Analytics Dashboard** — 6 recharts visualizations (status, type, expiry, risk, value, obligations)
- **Renewal Calendar** — Month grid with color-coded contract chips
- **Counterparty Map** — Contracts grouped by counterparty, searchable
- **Semantic Search** — OpenAI embeddings + pgvector similarity search
- **Query Agent (RAG)** — Natural language questions answered by Claude Haiku
- **Slack Integration** — File ingestion, expiry notifications with interactive buttons (Renew/Expire/Snooze), weekly digest
- **Tiered Escalation** — 30d/14d/7d/overdue with deduplication via escalation_log
- **NetSuite Integration** — OAuth 1.0a TBA, vendor CRUD, invoice sync, spend threshold alerts
- **User Management** — Admin role management page
- **Security Hardening** — Auth on all routes, input sanitization, role escalation prevention, focus traps, keyboard nav
- **Deployment** — Vercel auto-deploy from GitHub, live at contractos-omega.vercel.app

### Future Enhancements

- Contract generation from templates using AI
- Clause library with approved clause catalogue
- Bulk upload (50+ files at once)
- Amendment tracking (link amendments to parent contracts)
- Rate limiting on API routes
- Error boundaries on analytics/calendar pages
- Dark mode refinements

---

## 13. Cost Estimate

| Item | Monthly Cost (AUD) |
|------|-------------------|
| Supabase (Free tier, then Pro ~$25/month) | ~$25 |
| Vercel (Free tier for testing, Pro ~$20/month) | ~$20 |
| Claude API (Sonnet extraction + Haiku queries) | ~$50 |
| OpenAI Embeddings (text-embedding-3-small) | ~$5 |
| Slack (existing workspace) | $0 |
| NetSuite (existing instance) | $0 |
| **Total** | **~$100/month** |

Costs scale with document volume. Expect under $300/month for up to 1,000 contracts.

---

## 14. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI extraction inaccuracy | Wrong renewal dates, missed terms | Human-in-the-loop verification; confidence scores on all extractions; critical fields (dates, amounts) require manual sign-off |
| Google Drive permissions too open | Sensitive contracts accessible to wrong people | Folder-level sharing restrictions; Phase 2 migrates to Azure with proper RBAC |
| Slack notification fatigue | Team ignores alerts | Tiered escalation; snooze functionality; weekly digest consolidation; user-configurable alert preferences |
| API data residency concerns | Contract text leaves AU infrastructure | Use Azure OpenAI (data stays in tenant) or Anthropic zero-retention API; embeddings are not reversible |
| Single point of failure (one admin) | System becomes tribal knowledge | Documented runbooks; at least 2 admins trained; infrastructure as code |

---

## 15. Open Questions

1. **Who owns contract verification?** Legal team, finance, or individual contract owners?
2. **Integration with existing finance systems?** Do we want automated reconciliation of contract fees against actual payments?
3. **Retention policy?** How long do we keep expired contracts and their metadata?
4. **Contract generation** — is there appetite to use AI to draft standard NDAs/MSAs from approved templates?
5. **Budget approval** — who signs off on the ~$160/month Phase 1 spend and engineering time allocation?

---

## 16. Next Steps

1. Team testing via [contractos-omega.vercel.app](https://contractos-omega.vercel.app)
2. Upload existing contract portfolio (PDF/DOCX)
3. Review AI extractions and verify accuracy
4. Configure NetSuite sandbox credentials for vendor sync testing
5. Set up Vercel Cron for automated escalation and weekly digest
6. Gather feedback and prioritise v3 enhancements
