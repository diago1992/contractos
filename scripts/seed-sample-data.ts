/**
 * Seed script for ContractOS
 *
 * Run with: npx tsx scripts/seed-sample-data.ts
 *
 * Requires environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * This script creates sample contract records for testing the UI
 * without needing to upload and process actual documents.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const sampleContracts = [
  {
    title: "Cloud Infrastructure Services Agreement",
    counterparty_name: "AWS Australia Pty Ltd",
    document_type: "master_services_agreement" as const,
    status: "active" as const,
    extraction_status: "verified" as const,
    summary:
      "Master services agreement for cloud infrastructure and computing services including EC2, S3, RDS, and Lambda. Includes SLA commitments of 99.99% uptime and data residency requirements for Australian customer data.",
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
  },
  {
    title: "Software Development SOW - Mobile App",
    counterparty_name: "TechBuild Solutions",
    document_type: "statement_of_work" as const,
    status: "active" as const,
    extraction_status: "extracted" as const,
    summary:
      "Statement of work for development of the MoneyMe mobile application v3.0. Covers iOS and Android platforms with React Native. Includes design, development, testing, and 3 months post-launch support.",
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
  },
  {
    title: "Mutual Non-Disclosure Agreement",
    counterparty_name: "FinanceCore Ltd",
    document_type: "nda" as const,
    status: "active" as const,
    extraction_status: "verified" as const,
    summary:
      "Mutual NDA for exploratory discussions regarding potential API integration partnership. Covers financial data, customer information, and proprietary technology details.",
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
  },
  {
    title: "Office Lease - Level 12, 100 Market St",
    counterparty_name: "Dexus Property Group",
    document_type: "lease_agreement" as const,
    status: "active" as const,
    extraction_status: "extracted" as const,
    summary:
      "Commercial office lease for Level 12 at 100 Market Street, Sydney. 500sqm of office space with fit-out allowance. Includes parking allocation and shared building facilities.",
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
  },
  {
    title: "Data Processing Agreement",
    counterparty_name: "Salesforce.com",
    document_type: "vendor_agreement" as const,
    status: "under_review" as const,
    extraction_status: "extracted" as const,
    summary:
      "Data processing agreement governing Salesforce CRM usage. Covers GDPR compliance, data transfer mechanisms, sub-processor management, and breach notification procedures.",
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
  },
  {
    title: "Employment Agreement - Senior Engineer",
    counterparty_name: "Jane Smith",
    document_type: "employment_agreement" as const,
    status: "active" as const,
    extraction_status: "verified" as const,
    summary:
      "Employment agreement for Senior Software Engineer role. Full-time permanent position with standard benefits package, equity participation, and 12-month non-compete clause.",
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
  },
  {
    title: "Software License - Enterprise Analytics",
    counterparty_name: "Tableau Software",
    document_type: "license_agreement" as const,
    status: "expired" as const,
    extraction_status: "verified" as const,
    summary:
      "Enterprise license for Tableau analytics platform. 50 creator licenses and unlimited viewer licenses. Includes training credits and premium support.",
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
    file_type:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
];

const sampleTerms = [
  {
    term_type: "pricing",
    description: "Monthly compute charges based on reserved instance pricing",
    amount: 45000,
    currency: "AUD",
    frequency: "monthly",
  },
  {
    term_type: "payment",
    description: "Net 30 payment terms from invoice date",
    amount: null,
    currency: "AUD",
    frequency: "monthly",
  },
  {
    term_type: "penalty",
    description: "SLA credit of 10% monthly fee for each 0.1% below 99.99% uptime",
    amount: 4500,
    currency: "AUD",
    frequency: null,
  },
  {
    term_type: "pricing",
    description: "Fixed project fee for mobile app development",
    amount: 380000,
    currency: "AUD",
    frequency: null,
  },
  {
    term_type: "payment",
    description: "Milestone-based payments: 20% upfront, 30% at alpha, 30% at beta, 20% at launch",
    amount: null,
    currency: "AUD",
    frequency: null,
  },
  {
    term_type: "pricing",
    description: "Annual rent per sqm",
    amount: 850,
    currency: "AUD",
    frequency: "annual",
  },
  {
    term_type: "liability_cap",
    description: "Total liability capped at 12 months of fees",
    amount: 540000,
    currency: "AUD",
    frequency: null,
  },
];

const sampleObligations = [
  {
    title: "Annual security audit",
    description: "Conduct annual SOC 2 Type II audit and share report",
    obligated_party: "AWS Australia Pty Ltd",
    due_date: "2026-01-15",
    status: "pending" as const,
  },
  {
    title: "Data residency compliance",
    description: "Ensure all Australian customer data remains in ap-southeast-2 region",
    obligated_party: "AWS Australia Pty Ltd",
    due_date: null,
    status: "in_progress" as const,
  },
  {
    title: "Alpha release delivery",
    description: "Deliver alpha build with core features for testing",
    obligated_party: "TechBuild Solutions",
    due_date: "2025-09-30",
    status: "completed" as const,
  },
  {
    title: "Beta release delivery",
    description: "Deliver beta build with full feature set",
    obligated_party: "TechBuild Solutions",
    due_date: "2025-12-15",
    status: "in_progress" as const,
  },
  {
    title: "Renewal notice",
    description: "Provide written notice of intent to renew or terminate 180 days before expiry",
    obligated_party: "us",
    due_date: "2026-01-02",
    status: "pending" as const,
  },
];

const sampleRisks = [
  {
    title: "Unlimited liability for data breach",
    description:
      "The agreement does not cap liability for data breaches. MoneyMe could face unlimited exposure in case of a breach involving customer financial data.",
    severity: "critical" as const,
  },
  {
    title: "Auto-renewal with price increase clause",
    description:
      "Contract auto-renews with up to 8% annual price increase. Could result in significant cost escalation over time.",
    severity: "high" as const,
  },
  {
    title: "Broad IP assignment clause",
    description:
      "Work product IP clause is broader than necessary. May inadvertently assign pre-existing MoneyMe IP to the vendor.",
    severity: "high" as const,
  },
  {
    title: "Missing SLA for support response times",
    description: "No defined SLA for support ticket response or resolution times.",
    severity: "medium" as const,
  },
  {
    title: "Non-compete geographic scope",
    description:
      "Non-compete clause covers all of Asia-Pacific which may be overly broad and potentially unenforceable.",
    severity: "low" as const,
  },
];

async function seed() {
  console.log("Seeding ContractOS with sample data...\n");

  // Look up an existing user to set as uploaded_by
  const { data: users } = await supabase
    .from("users")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1);

  const uploadedBy = users?.[0]?.id ?? null;

  if (uploadedBy) {
    console.log(`Using user ${uploadedBy} as uploaded_by`);
  } else {
    console.log(
      "Warning: No users found. Contracts will be created without uploaded_by. Sign in first to create a user."
    );
  }

  // Insert contracts with uploaded_by
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

  // Insert commercial terms for first few contracts
  for (let i = 0; i < Math.min(sampleTerms.length, contracts.length); i++) {
    const contractIndex = i % contracts.length;
    await supabase.from("commercial_terms").insert({
      contract_id: contracts[contractIndex].id,
      ...sampleTerms[i],
    });
  }
  console.log(`Inserted ${sampleTerms.length} commercial terms`);

  // Insert obligations
  for (let i = 0; i < sampleObligations.length; i++) {
    const contractIndex = i % Math.min(4, contracts.length);
    await supabase.from("obligations").insert({
      contract_id: contracts[contractIndex].id,
      ...sampleObligations[i],
    });
  }
  console.log(`Inserted ${sampleObligations.length} obligations`);

  // Insert risk flags
  for (let i = 0; i < sampleRisks.length; i++) {
    const contractIndex = i % contracts.length;
    await supabase.from("risk_flags").insert({
      contract_id: contracts[contractIndex].id,
      ...sampleRisks[i],
    });
  }
  console.log(`Inserted ${sampleRisks.length} risk flags`);

  // Insert tags
  const tags = [
    "technology",
    "cloud",
    "multi-year",
    "mobile",
    "development",
    "confidential",
    "partnership",
    "real-estate",
    "sydney",
    "crm",
    "data-privacy",
    "employment",
    "analytics",
  ];

  for (let i = 0; i < tags.length; i++) {
    const contractIndex = i % contracts.length;
    await supabase.from("contract_tags").insert({
      contract_id: contracts[contractIndex].id,
      tag: tags[i],
    });
  }
  console.log(`Inserted ${tags.length} tags`);

  // Insert audit log entries
  for (const contract of contracts) {
    await supabase.from("audit_log").insert({
      contract_id: contract.id,
      user_id: uploadedBy,
      action: "created",
      details: { source: "seed_script" },
    });
  }
  console.log(`Inserted ${contracts.length} audit log entries`);

  console.log("\nSeed complete!");
  console.log("Contracts created:");
  contracts.forEach((c) => console.log(`  - ${c.title} (${c.id})`));
}

seed().catch(console.error);
