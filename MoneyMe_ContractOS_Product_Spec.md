# ContractOS — Internal Document Management System

## Product Specification v1.0

**Owner:** Diago | MoneyMe  
**Date:** March 2026  
**Status:** Draft for Review

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

## 10. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React + TypeScript + Tailwind | Standard, fast to build, reusable components |
| Charts | Recharts or Tremor | Clean dashboard components |
| API | FastAPI (Python) | Strong async support, great for AI pipelines |
| Database | PostgreSQL + pgvector | Single DB for structured data + vector search |
| Document Storage (Phase 1) | Google Drive API | Fast to set up, no permissioning overhead |
| Document Storage (Phase 2) | Azure Blob Storage | Enterprise-grade, aligns with existing infra |
| AI — Extraction | Claude API (Sonnet) | Best-in-class document understanding |
| AI — Classification | Claude API (Haiku) | Fast, cheap, accurate for categorisation |
| AI — Embeddings | OpenAI text-embedding-3-large | Strong retrieval performance |
| AI — RAG/Query | Claude API (Sonnet) | Nuanced synthesis with citations |
| Task Queue | Celery + Redis | Async document processing |
| Slack | Slack Bolt SDK (Python) | Official SDK, supports interactivity |
| Hosting | Azure App Service or Railway | Azure for prod alignment, Railway for speed |
| Auth | Google OAuth (Phase 1) → Azure AD (Phase 2) | Matches storage migration path |

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

## 12. Phased Rollout

### Phase 1 — Foundation (Weeks 1–4)

- Google Drive folder structure set up
- Postgres schema deployed
- Ingestion Agent: upload → extract → store metadata
- Basic dashboard: contract list, detail view, search (text only)
- Manual upload via dashboard UI
- Slack: `#contracts-feed` notifications for new uploads

**Success criteria:** 50+ existing contracts uploaded, extracted, and verified. Team can find any contract in < 30 seconds.

### Phase 2 — Intelligence (Weeks 5–8)

- Monitor Agent: renewal alerts, expiry tracking, escalation chains
- Slack push: renewal reminders, weekly digest, risk alerts
- Slack commands: `/contract search`, `/contract renewals`
- Dashboard analytics: spend summary, renewal calendar, counterparty map
- Semantic search via embeddings
- Human-in-the-loop verification workflow

**Success criteria:** Zero missed renewal deadlines. Leadership has real-time visibility into commercial exposure.

### Phase 3 — Scale (Weeks 9–12)

- Query Agent: natural language questions across the contract corpus
- Bulk upload tool (drag-and-drop 50+ files at once)
- Amendment tracking (link amendments to parent contracts)
- Approval workflows via Slack interactive messages
- Obligation tracker with recurring reminders
- API for integration with other MoneyMe internal tools (e.g., finance system, CRM)

**Success criteria:** Query Agent accurately answers 80%+ of contract questions without requiring manual lookup.

### Phase 4 — Enterprise (Months 4–6)

- Migrate storage from Google Drive → Azure Blob
- Azure AD SSO integration
- Row-level security in Postgres
- Contract generation: draft new NDAs/MSAs from templates using AI
- Clause library: catalogue of approved clauses for quick insertion
- Multi-department workspace support with department-specific compliance tracking

---

## 13. Cost Estimate (Phase 1–2)

| Item | Monthly Cost (AUD) |
|------|-------------------|
| Google Workspace (if not already on it) | $0 (existing) |
| PostgreSQL (managed, e.g., Supabase or Railway) | ~$40 |
| Claude API (Sonnet — ~500 docs × $0.10/extraction) | ~$50 |
| OpenAI Embeddings (500 docs × $0.01) | ~$5 |
| Hosting (Railway or small Azure App Service) | ~$50 |
| Redis (managed) | ~$15 |
| Slack (existing workspace) | $0 |
| **Total Phase 1–2** | **~$160/month** |

Phase 3–4 costs scale with usage but likely remain under $500/month until hitting thousands of documents.

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

1. Review and sign off this spec
2. Set up Google Drive folder structure
3. Spin up Postgres + basic API
4. Build and test Ingestion Agent with 10 sample contracts
5. Deploy MVP dashboard
6. Begin bulk upload of existing contracts
