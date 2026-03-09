/**
 * Seed script for ContractOS v3
 *
 * Run with: npx tsx scripts/seed-sample-data.ts
 *
 * Requires environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Vendor-centric seed: creates vendors first, then contracts under them,
 * with all v3 columns populated (cost_centre, annual_value, mm_owner, etc.)
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// ---------------------------------------------------------------------------
// Vendors
// ---------------------------------------------------------------------------

const sampleVendors = [
  {
    name: "AWS Australia Pty Ltd",
    legal_name: "Amazon Web Services Australia Pty Ltd",
    trading_name: "AWS",
    industry: "Technology",
    abn: "63 605 345 891",
    gst_registered: true,
    website: "https://aws.amazon.com",
    currency: "AUD",
    payment_terms: "Net 30",
    default_gl_code: "6100",
    default_tax_code: "GST",
    contact_name: "Michael Torres",
    contact_title: "Enterprise Account Manager",
    contact_email: "m.torres@aws.amazon.com",
    contact_phone: "+61 2 8001 4500",
    address_street: "Level 37, 2 Park Street",
    address_city: "Sydney",
    address_country: "Australia",
    bank_account_name: "Amazon Web Services Australia Pty Ltd",
    bank_bsb: "032-000",
    bank_account_number: "123456",
    bank_name: "Westpac",
    bank_verified: true,
    email: "billing-au@aws.amazon.com",
    phone: "+61 2 8001 4500",
    address: "Level 37, 2 Park Street, Sydney NSW 2000",
  },
  {
    name: "TechBuild Solutions",
    legal_name: "TechBuild Solutions Pty Ltd",
    trading_name: "TechBuild",
    industry: "Technology",
    abn: "51 234 567 890",
    gst_registered: true,
    website: "https://techbuild.com.au",
    currency: "AUD",
    payment_terms: "Milestone-based",
    default_gl_code: "6200",
    default_tax_code: "GST",
    contact_name: "Rachel Kim",
    contact_title: "Delivery Director",
    contact_email: "rachel.kim@techbuild.com.au",
    contact_phone: "+61 3 9876 5432",
    address_street: "Suite 401, 120 Spencer Street",
    address_city: "Melbourne",
    address_country: "Australia",
    bank_account_name: "TechBuild Solutions Pty Ltd",
    bank_bsb: "063-010",
    bank_account_number: "789012",
    bank_name: "Commonwealth Bank",
    bank_verified: true,
    email: "accounts@techbuild.com.au",
    phone: "+61 3 9876 5432",
    address: "Suite 401, 120 Spencer Street, Melbourne VIC 3000",
  },
  {
    name: "FinanceCore Ltd",
    legal_name: "FinanceCore Limited",
    trading_name: "FinanceCore",
    industry: "Finance",
    abn: "72 345 678 901",
    gst_registered: true,
    website: "https://financecore.com",
    currency: "AUD",
    payment_terms: "Net 45",
    default_gl_code: "6300",
    default_tax_code: "GST",
    contact_name: "Andrew Chen",
    contact_title: "Partnership Manager",
    contact_email: "a.chen@financecore.com",
    contact_phone: "+61 2 9123 4567",
    address_street: "Level 22, 1 Macquarie Place",
    address_city: "Sydney",
    address_country: "Australia",
    bank_account_name: "FinanceCore Limited",
    bank_bsb: "082-001",
    bank_account_number: "345678",
    bank_name: "NAB",
    bank_verified: true,
    email: "partnerships@financecore.com",
    phone: "+61 2 9123 4567",
    address: "Level 22, 1 Macquarie Place, Sydney NSW 2000",
  },
  {
    name: "Dexus Property Group",
    legal_name: "Dexus Funds Management Limited",
    trading_name: "Dexus",
    industry: "Real Estate",
    abn: "24 002 123 456",
    gst_registered: true,
    website: "https://www.dexus.com",
    currency: "AUD",
    payment_terms: "Monthly in advance",
    default_gl_code: "6400",
    default_tax_code: "GST",
    contact_name: "Sarah Mitchell",
    contact_title: "Leasing Manager",
    contact_email: "s.mitchell@dexus.com",
    contact_phone: "+61 2 9017 1100",
    address_street: "Level 25, 264 George Street",
    address_city: "Sydney",
    address_country: "Australia",
    bank_account_name: "Dexus Funds Management Limited",
    bank_bsb: "032-003",
    bank_account_number: "901234",
    bank_name: "Westpac",
    bank_verified: true,
    email: "leasing@dexus.com",
    phone: "+61 2 9017 1100",
    address: "Level 25, 264 George Street, Sydney NSW 2000",
  },
  {
    name: "Salesforce.com",
    legal_name: "Salesforce.com Singapore Pte Ltd",
    trading_name: "Salesforce",
    industry: "Technology",
    abn: "55 789 012 345",
    gst_registered: true,
    website: "https://www.salesforce.com",
    currency: "USD",
    payment_terms: "Net 30",
    default_gl_code: "6100",
    default_tax_code: "GST-Free",
    contact_name: "David Nguyen",
    contact_title: "Account Executive",
    contact_email: "d.nguyen@salesforce.com",
    contact_phone: "+61 2 8023 9000",
    address_street: "Level 15, 1 Market Street",
    address_city: "Sydney",
    address_country: "Australia",
    bank_account_name: "Salesforce.com Singapore Pte Ltd",
    bank_bsb: "062-000",
    bank_account_number: "567890",
    bank_name: "CBA",
    bank_verified: false,
    bank_swift: "CTBAAU2S",
    email: "billing-apac@salesforce.com",
    phone: "+61 2 8023 9000",
    address: "Level 15, 1 Market Street, Sydney NSW 2000",
  },
  {
    name: "Tableau Software",
    legal_name: "Tableau Software LLC",
    trading_name: "Tableau",
    industry: "Analytics",
    abn: "44 567 890 123",
    gst_registered: false,
    website: "https://www.tableau.com",
    currency: "USD",
    payment_terms: "Annual upfront",
    default_gl_code: "6150",
    default_tax_code: "GST-Free",
    contact_name: "Emma Brooks",
    contact_title: "Renewal Specialist",
    contact_email: "e.brooks@tableau.com",
    contact_phone: "+1 206 633 3400",
    address_street: "1621 N 34th Street",
    address_city: "Seattle",
    address_country: "United States",
    bank_account_name: "Tableau Software LLC",
    bank_bsb: "",
    bank_account_number: "",
    bank_name: "Wells Fargo",
    bank_verified: false,
    bank_swift: "WFBIUS6S",
    bank_iban: "US12345678901234567890",
    email: "renewals@tableau.com",
    phone: "+1 206 633 3400",
    address: "1621 N 34th Street, Seattle WA 98103, USA",
  },
];

// ---------------------------------------------------------------------------
// Contracts (with v3 columns)
// ---------------------------------------------------------------------------

const sampleContracts = [
  {
    title: "Cloud Infrastructure Services Agreement",
    counterparty_name: "AWS Australia Pty Ltd",
    document_type: "master_services_agreement" as const,
    status: "active" as const,
    extraction_status: "verified" as const,
    summary: "Master services agreement for cloud infrastructure and computing services including EC2, S3, RDS, and Lambda. Includes SLA commitments of 99.99% uptime and data residency requirements for Australian customer data.",
    effective_date: "2024-01-15",
    expiry_date: "2027-01-14",
    notice_period_days: 90,
    auto_renewal: true,
    renewal_term_months: 12,
    governing_law: "New South Wales, Australia",
    file_path: "seed/aws-msa.pdf",
    file_name: "AWS_MSA_2024.pdf",
    file_size_bytes: 2450000,
    file_type: "application/pdf",
    cost_centre: "Technology",
    annual_value: 540000,
    mm_owner: "Sarah Chen",
    on_file: true,
    notice_deadline: "2026-10-16",
  },
  {
    title: "Software Development SOW - Mobile App",
    counterparty_name: "TechBuild Solutions",
    document_type: "statement_of_work" as const,
    status: "active" as const,
    extraction_status: "extracted" as const,
    summary: "Statement of work for development of the MoneyMe mobile application v3.0. Covers iOS and Android platforms with React Native. Includes design, development, testing, and 3 months post-launch support.",
    effective_date: "2025-06-01",
    expiry_date: "2026-03-31",
    notice_period_days: 30,
    auto_renewal: false,
    renewal_term_months: null,
    governing_law: "New South Wales, Australia",
    file_path: "seed/techbuild-sow.pdf",
    file_name: "TechBuild_SOW_MobileApp.pdf",
    file_size_bytes: 890000,
    file_type: "application/pdf",
    cost_centre: "Technology",
    annual_value: 380000,
    mm_owner: "James Wong",
    on_file: true,
    notice_deadline: "2026-03-01",
  },
  {
    title: "Mutual Non-Disclosure Agreement",
    counterparty_name: "FinanceCore Ltd",
    document_type: "nda" as const,
    status: "active" as const,
    extraction_status: "verified" as const,
    summary: "Mutual NDA for exploratory discussions regarding potential API integration partnership. Covers financial data, customer information, and proprietary technology details.",
    effective_date: "2025-09-01",
    expiry_date: "2027-08-31",
    notice_period_days: null,
    auto_renewal: false,
    renewal_term_months: null,
    governing_law: "New South Wales, Australia",
    file_path: "seed/financecore-nda.pdf",
    file_name: "FinanceCore_NDA_2025.pdf",
    file_size_bytes: 345000,
    file_type: "application/pdf",
    cost_centre: "Legal",
    annual_value: null,
    mm_owner: "David Park",
    on_file: true,
    notice_deadline: null,
  },
  {
    title: "Office Lease - Level 12, 100 Market St",
    counterparty_name: "Dexus Property Group",
    document_type: "lease_agreement" as const,
    status: "active" as const,
    extraction_status: "extracted" as const,
    summary: "Commercial office lease for Level 12 at 100 Market Street, Sydney. 500sqm of office space with fit-out allowance. Includes parking allocation and shared building facilities.",
    effective_date: "2023-07-01",
    expiry_date: "2026-06-30",
    notice_period_days: 180,
    auto_renewal: true,
    renewal_term_months: 36,
    governing_law: "New South Wales, Australia",
    file_path: "seed/dexus-lease.pdf",
    file_name: "Dexus_Office_Lease.pdf",
    file_size_bytes: 4200000,
    file_type: "application/pdf",
    cost_centre: "Operations",
    annual_value: 425000,
    mm_owner: "Lisa Taylor",
    on_file: true,
    notice_deadline: "2025-12-31",
  },
  {
    title: "Data Processing Agreement",
    counterparty_name: "Salesforce.com",
    document_type: "vendor_agreement" as const,
    status: "under_review" as const,
    extraction_status: "extracted" as const,
    summary: "Data processing agreement governing Salesforce CRM usage. Covers GDPR compliance, data transfer mechanisms, sub-processor management, and breach notification procedures.",
    effective_date: "2025-01-01",
    expiry_date: "2026-12-31",
    notice_period_days: 60,
    auto_renewal: true,
    renewal_term_months: 12,
    governing_law: "New South Wales, Australia",
    file_path: "seed/salesforce-dpa.pdf",
    file_name: "Salesforce_DPA_2025.pdf",
    file_size_bytes: 1100000,
    file_type: "application/pdf",
    cost_centre: "Technology",
    annual_value: 180000,
    mm_owner: "Sarah Chen",
    on_file: false,
    notice_deadline: "2026-11-01",
  },
  {
    title: "Employment Agreement - Senior Engineer",
    counterparty_name: "Jane Smith",
    document_type: "employment_agreement" as const,
    status: "active" as const,
    extraction_status: "verified" as const,
    summary: "Employment agreement for Senior Software Engineer role. Full-time permanent position with standard benefits package, equity participation, and 12-month non-compete clause.",
    effective_date: "2025-03-15",
    expiry_date: null,
    notice_period_days: 30,
    auto_renewal: false,
    renewal_term_months: null,
    governing_law: "New South Wales, Australia",
    file_path: "seed/employment-jsmith.pdf",
    file_name: "Employment_JSmith.pdf",
    file_size_bytes: 560000,
    file_type: "application/pdf",
    cost_centre: "HR",
    annual_value: 185000,
    mm_owner: "HR Team",
    on_file: true,
    notice_deadline: null,
  },
  {
    title: "Software License - Enterprise Analytics",
    counterparty_name: "Tableau Software",
    document_type: "license_agreement" as const,
    status: "expired" as const,
    extraction_status: "verified" as const,
    summary: "Enterprise license for Tableau analytics platform. 50 creator licenses and unlimited viewer licenses. Includes training credits and premium support.",
    effective_date: "2023-04-01",
    expiry_date: "2025-03-31",
    notice_period_days: 60,
    auto_renewal: false,
    renewal_term_months: null,
    governing_law: "New South Wales, Australia",
    file_path: "seed/tableau-license.pdf",
    file_name: "Tableau_License_Agreement.pdf",
    file_size_bytes: 780000,
    file_type: "application/pdf",
    cost_centre: "Technology",
    annual_value: 95000,
    mm_owner: "James Wong",
    on_file: false,
    notice_deadline: null,
  },
  {
    title: "Amendment #2 - Cloud Services Agreement",
    counterparty_name: "AWS Australia Pty Ltd",
    document_type: "amendment" as const,
    status: "draft" as const,
    extraction_status: "pending" as const,
    summary: null,
    effective_date: null,
    expiry_date: null,
    notice_period_days: null,
    auto_renewal: false,
    renewal_term_months: null,
    governing_law: null,
    file_path: "seed/aws-amendment-2.docx",
    file_name: "AWS_Amendment_2.docx",
    file_size_bytes: 125000,
    file_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    cost_centre: "Technology",
    annual_value: null,
    mm_owner: "Sarah Chen",
    on_file: false,
    notice_deadline: null,
  },
];

// Map: contract title → vendor name (for creating join records)
const contractVendorMap: Record<string, string> = {
  "Cloud Infrastructure Services Agreement": "AWS Australia Pty Ltd",
  "Software Development SOW - Mobile App": "TechBuild Solutions",
  "Mutual Non-Disclosure Agreement": "FinanceCore Ltd",
  "Office Lease - Level 12, 100 Market St": "Dexus Property Group",
  "Data Processing Agreement": "Salesforce.com",
  "Software License - Enterprise Analytics": "Tableau Software",
  "Amendment #2 - Cloud Services Agreement": "AWS Australia Pty Ltd",
  // Employment Agreement — no vendor link
};

// ---------------------------------------------------------------------------
// Commercial Terms
// ---------------------------------------------------------------------------

const sampleTerms = [
  { term_type: "pricing", description: "Monthly compute charges based on reserved instance pricing", amount: 45000, currency: "AUD", frequency: "monthly" },
  { term_type: "payment", description: "Net 30 payment terms from invoice date", amount: null, currency: "AUD", frequency: "monthly" },
  { term_type: "penalty", description: "SLA credit of 10% monthly fee for each 0.1% below 99.99% uptime", amount: 4500, currency: "AUD", frequency: null },
  { term_type: "pricing", description: "Fixed project fee for mobile app development", amount: 380000, currency: "AUD", frequency: null },
  { term_type: "payment", description: "Milestone-based payments: 20% upfront, 30% at alpha, 30% at beta, 20% at launch", amount: null, currency: "AUD", frequency: null },
  { term_type: "pricing", description: "Annual rent per sqm", amount: 850, currency: "AUD", frequency: "annual" },
  { term_type: "liability_cap", description: "Total liability capped at 12 months of fees", amount: 540000, currency: "AUD", frequency: null },
];

// ---------------------------------------------------------------------------
// Obligations (with v3 risk + category)
// ---------------------------------------------------------------------------

const sampleObligations = [
  { title: "Annual security audit", description: "Conduct annual SOC 2 Type II audit and share report", obligated_party: "AWS Australia Pty Ltd", due_date: "2026-01-15", status: "pending" as const, risk: "High", category: "compliance" },
  { title: "Data residency compliance", description: "Ensure all Australian customer data remains in ap-southeast-2 region", obligated_party: "AWS Australia Pty Ltd", due_date: null, status: "in_progress" as const, risk: "High", category: "legal" },
  { title: "Alpha release delivery", description: "Deliver alpha build with core features for testing", obligated_party: "TechBuild Solutions", due_date: "2025-09-30", status: "completed" as const, risk: "Medium", category: "operational" },
  { title: "Beta release delivery", description: "Deliver beta build with full feature set", obligated_party: "TechBuild Solutions", due_date: "2025-12-15", status: "in_progress" as const, risk: "Medium", category: "operational" },
  { title: "Renewal notice", description: "Provide written notice of intent to renew or terminate 180 days before expiry", obligated_party: "us", due_date: "2026-01-02", status: "pending" as const, risk: "High", category: "notice" },
];

// ---------------------------------------------------------------------------
// Risk Flags
// ---------------------------------------------------------------------------

const sampleRisks = [
  { title: "Unlimited liability for data breach", description: "The agreement does not cap liability for data breaches. MoneyMe could face unlimited exposure in case of a breach involving customer financial data.", severity: "critical" as const },
  { title: "Auto-renewal with price increase clause", description: "Contract auto-renews with up to 8% annual price increase. Could result in significant cost escalation over time.", severity: "high" as const },
  { title: "Broad IP assignment clause", description: "Work product IP clause is broader than necessary. May inadvertently assign pre-existing MoneyMe IP to the vendor.", severity: "high" as const },
  { title: "Missing SLA for support response times", description: "No defined SLA for support ticket response or resolution times.", severity: "medium" as const },
  { title: "Non-compete geographic scope", description: "Non-compete clause covers all of Asia-Pacific which may be overly broad and potentially unenforceable.", severity: "low" as const },
];

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

const sampleInvoices = [
  { vendor_name: "AWS Australia Pty Ltd", invoice_number: "INV-AWS-2025-001", amount: 45000, amount_paid: 45000, amount_remaining: 0, status: "paid_in_full" as const, invoice_date: "2025-01-01", due_date: "2025-01-31", date_paid: "2025-01-28" },
  { vendor_name: "AWS Australia Pty Ltd", invoice_number: "INV-AWS-2025-002", amount: 47500, amount_paid: 47500, amount_remaining: 0, status: "paid_in_full" as const, invoice_date: "2025-02-01", due_date: "2025-02-28", date_paid: "2025-02-25" },
  { vendor_name: "AWS Australia Pty Ltd", invoice_number: "INV-AWS-2025-003", amount: 46200, amount_paid: 0, amount_remaining: 46200, status: "open" as const, invoice_date: "2025-03-01", due_date: "2025-03-31", date_paid: null },
  { vendor_name: "TechBuild Solutions", invoice_number: "INV-TB-001", amount: 76000, amount_paid: 76000, amount_remaining: 0, status: "paid_in_full" as const, invoice_date: "2025-06-01", due_date: "2025-06-15", date_paid: "2025-06-12" },
  { vendor_name: "TechBuild Solutions", invoice_number: "INV-TB-002", amount: 114000, amount_paid: 114000, amount_remaining: 0, status: "paid_in_full" as const, invoice_date: "2025-10-01", due_date: "2025-10-15", date_paid: "2025-10-14" },
  { vendor_name: "Dexus Property Group", invoice_number: "INV-DX-Q1-2025", amount: 106250, amount_paid: 106250, amount_remaining: 0, status: "paid_in_full" as const, invoice_date: "2025-01-01", due_date: "2025-01-01", date_paid: "2024-12-28" },
  { vendor_name: "Dexus Property Group", invoice_number: "INV-DX-Q2-2025", amount: 106250, amount_paid: 0, amount_remaining: 106250, status: "overdue" as const, invoice_date: "2025-04-01", due_date: "2025-04-01", date_paid: null },
  { vendor_name: "Salesforce.com", invoice_number: "INV-SF-2025-001", amount: 180000, amount_paid: 90000, amount_remaining: 90000, status: "partially_paid" as const, invoice_date: "2025-01-15", due_date: "2025-02-14", date_paid: null },
];

// ---------------------------------------------------------------------------
// Discussions
// ---------------------------------------------------------------------------

const sampleDiscussions = [
  { vendor_name: "AWS Australia Pty Ltd", body: "Need to review the auto-renewal clause before October. The 8% annual increase is concerning — we should negotiate a cap at CPI + 2%." },
  { vendor_name: "TechBuild Solutions", body: "Alpha delivery looks on track. Beta might slip by 2 weeks due to the new compliance requirements from Risk team." },
  { vendor_name: "Dexus Property Group", body: "Lease renewal discussion starting Q4. Should we consider the Barangaroo office as an alternative? More space, similar price per sqm." },
];

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

const tags = ["technology", "cloud", "multi-year", "mobile", "development", "confidential", "partnership", "real-estate", "sydney", "crm", "data-privacy", "employment", "analytics"];

// ===========================================================================
// Seed function
// ===========================================================================

async function seed() {
  console.log("Seeding ContractOS v3 with vendor-centric sample data...\n");

  // ---- Look up existing user ----
  const { data: users } = await supabase
    .from("users")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1);

  const uploadedBy = users?.[0]?.id ?? null;

  if (uploadedBy) {
    console.log(`Using user ${uploadedBy} as uploaded_by\n`);
  } else {
    console.log("Warning: No users found. Sign in first to create a user.\n");
  }

  // ---- Cleanup existing seed data (FK order) ----
  console.log("Cleaning up existing data...");
  const tables = ["discussions", "invoices", "contract_vendors", "contract_tags", "risk_flags", "obligations", "commercial_terms", "audit_log", "contracts", "vendors"];
  for (const table of tables) {
    // contract_tags has no created_at column, use tag column instead
    const filter = table === "contract_tags"
      ? supabase.from(table).delete().neq("tag", "")
      : supabase.from(table).delete().gte("created_at", "2000-01-01");
    const { error } = await filter;
    if (error) {
      console.warn(`  Warning cleaning ${table}: ${error.message}`);
    } else {
      console.log(`  Cleared ${table}`);
    }
  }
  console.log("");

  // ---- Insert vendors ----
  const { data: vendors, error: vendorError } = await supabase
    .from("vendors")
    .insert(sampleVendors)
    .select("id, name");

  if (vendorError) {
    console.error("Error inserting vendors:", vendorError);
    process.exit(1);
  }
  console.log(`Inserted ${vendors.length} vendors`);

  const vendorByName: Record<string, string> = {};
  vendors.forEach((v) => { vendorByName[v.name] = v.id; });

  // ---- Insert contracts ----
  const contractsToInsert = sampleContracts.map((c) => ({
    ...c,
    uploaded_by: uploadedBy,
  }));

  const { data: contracts, error: contractError } = await supabase
    .from("contracts")
    .insert(contractsToInsert)
    .select("id, title");

  if (contractError) {
    console.error("Error inserting contracts:", contractError);
    process.exit(1);
  }
  console.log(`Inserted ${contracts.length} contracts`);

  const contractByTitle: Record<string, string> = {};
  contracts.forEach((c) => { contractByTitle[c.title] = c.id; });

  // ---- Insert contract_vendors join records ----
  const cvRecords = Object.entries(contractVendorMap)
    .filter(([, vendorName]) => vendorByName[vendorName])
    .map(([contractTitle, vendorName]) => ({
      contract_id: contractByTitle[contractTitle],
      vendor_id: vendorByName[vendorName],
    }))
    .filter((r) => r.contract_id && r.vendor_id);

  if (cvRecords.length > 0) {
    const { error: cvError } = await supabase.from("contract_vendors").insert(cvRecords);
    if (cvError) {
      console.error("Error inserting contract_vendors:", cvError);
    } else {
      console.log(`Inserted ${cvRecords.length} contract_vendors links`);
    }
  }

  // ---- Insert invoices ----
  const invoiceRecords = sampleInvoices
    .map((inv) => {
      const vendorId = vendorByName[inv.vendor_name];
      if (!vendorId) return null;
      const { vendor_name, ...rest } = inv;
      return { ...rest, vendor_id: vendorId };
    })
    .filter(Boolean);

  if (invoiceRecords.length > 0) {
    const { error: invError } = await supabase.from("invoices").insert(invoiceRecords);
    if (invError) {
      console.error("Error inserting invoices:", invError);
    } else {
      console.log(`Inserted ${invoiceRecords.length} invoices`);
    }
  }

  // ---- Insert commercial terms ----
  for (let i = 0; i < sampleTerms.length; i++) {
    const contractIndex = i % contracts.length;
    await supabase.from("commercial_terms").insert({
      contract_id: contracts[contractIndex].id,
      ...sampleTerms[i],
    });
  }
  console.log(`Inserted ${sampleTerms.length} commercial terms`);

  // ---- Insert obligations ----
  for (let i = 0; i < sampleObligations.length; i++) {
    const contractIndex = i % Math.min(4, contracts.length);
    await supabase.from("obligations").insert({
      contract_id: contracts[contractIndex].id,
      ...sampleObligations[i],
    });
  }
  console.log(`Inserted ${sampleObligations.length} obligations`);

  // ---- Insert risk flags ----
  for (let i = 0; i < sampleRisks.length; i++) {
    const contractIndex = i % contracts.length;
    await supabase.from("risk_flags").insert({
      contract_id: contracts[contractIndex].id,
      ...sampleRisks[i],
    });
  }
  console.log(`Inserted ${sampleRisks.length} risk flags`);

  // ---- Insert tags ----
  for (let i = 0; i < tags.length; i++) {
    const contractIndex = i % contracts.length;
    await supabase.from("contract_tags").insert({
      contract_id: contracts[contractIndex].id,
      tag: tags[i],
    });
  }
  console.log(`Inserted ${tags.length} tags`);

  // ---- Insert discussions ----
  if (uploadedBy) {
    for (const disc of sampleDiscussions) {
      const vendorId = vendorByName[disc.vendor_name];
      if (!vendorId) continue;
      await supabase.from("discussions").insert({
        vendor_id: vendorId,
        user_id: uploadedBy,
        body: disc.body,
      });
    }
    console.log(`Inserted ${sampleDiscussions.length} discussions`);
  } else {
    console.log("Skipped discussions (no user found)");
  }

  // ---- Insert audit log ----
  for (const contract of contracts) {
    await supabase.from("audit_log").insert({
      contract_id: contract.id,
      user_id: uploadedBy,
      action: "created",
      details: { source: "seed_script" },
    });
  }
  console.log(`Inserted ${contracts.length} audit log entries`);

  // ---- Summary ----
  console.log("\nSeed complete!");
  console.log("\nVendors:");
  vendors.forEach((v) => console.log(`  - ${v.name} (${v.id})`));
  console.log("\nContracts:");
  contracts.forEach((c) => console.log(`  - ${c.title} (${c.id})`));
}

seed().catch(console.error);
