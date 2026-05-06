# MFCB Platform — Screen-by-Screen UI Analysis

> Source documents: `MFCB_Bank_Integration_API_Pack_and_System_Requirements-Ike.docx` · `Proposed BOB Form G Input layout_Comments 20260424-Ike.xlsx`
> Date: 2026-05-06 | Version: 1.0

---

## Module Index

| # | Module | Screens |
|---|--------|---------|
| 1 | Authentication & Access | 4 |
| 2 | Institution Onboarding & Management | 6 |
| 3 | Batch Submission | 6 |
| 4 | Validation & Error Review | 4 |
| 5 | Credit Report | 5 |
| 6 | Operations & Data Quality Dashboard | 5 |
| 7 | Reference Data Management | 3 |
| 8 | Audit & Compliance | 3 |
| 9 | User & Role Management | 4 |

**Total: 40 screens**

---

## Module 1 — Authentication & Access

### Screen 1.1 — Login

**Purpose:** Entry point for all portal users (Bureau Ops, Compliance, Institution Admin, Institution User, Auditor).

**Layout:** Centred card — logo, email, password, "Sign In" button, "Forgot password?" link.

**Data Requirements:**

| Field | Type | Rules |
|-------|------|-------|
| Email address | text input | Required, valid email format |
| Password | password input | Required, min 8 chars |

**Behaviour:**
- Failed login → inline error, no detail (do not reveal which field is wrong)
- After 5 failures → account lock + alert to admin
- On success → check MFA enrollment; redirect to MFA screen if enabled (all admin roles mandatory)
- Write `audit_logs` record on every attempt (success and failure)

---

### Screen 1.2 — Multi-Factor Authentication (MFA)

**Purpose:** Second factor for all administrative and institution portal users (SEC-003 — mandatory).

**Layout:** Centred card — prompt "Enter the 6-digit code from your authenticator app", OTP input (6 digits), "Verify" button, "Use backup code" link.

**Data Requirements:**

| Field | Type | Rules |
|-------|------|-------|
| OTP code | 6-digit numeric | Required, time-based, expires in 30 s |
| Backup code | alphanumeric | One-time use, 8 chars |

**Behaviour:**
- Invalid code → increment failure counter, show generic error
- 3 failures → invalidate session, log security event
- Success → set session token with scoped claims, redirect to role home

---

### Screen 1.3 — Forgot Password / Reset Password

**Purpose:** Allow portal users to reset credentials without admin intervention.

**Layout (two steps):**
- Step 1: Email input → "Send Reset Link"
- Step 2: New password + confirm password, token from email URL

**Data Requirements:**

| Field | Type | Rules |
|-------|------|-------|
| Email address | text | Must match active user record |
| New password | password | Min 10 chars, 1 upper, 1 number, 1 special |
| Confirm password | password | Must match new password |
| Reset token | URL param (hidden) | Single-use, expires 60 min |

**Behaviour:**
- Always show success message regardless of whether email exists (prevent enumeration)
- Token expiry → show expired message, offer resend
- Write `audit_logs` on password reset

---

### Screen 1.4 — MFA Enrollment Setup

**Purpose:** First-time setup flow for users who have not yet enrolled an authenticator.

**Layout:** QR code display (TOTP secret), manual entry key, "I've scanned it — verify code" field.

**Data Requirements:**

| Field | Type | Rules |
|-------|------|-------|
| TOTP secret | system-generated | Shown as QR + text fallback |
| Verification code | 6-digit numeric | Must validate against secret before activation |

**Behaviour:**
- Cannot skip for roles: Super Admin, Bureau Ops, Compliance, Auditor, Institution Admin
- On success → mark user `mfa_enrolled = true`, log event

---

## Module 2 — Institution Onboarding & Management

### Screen 2.1 — Institution Registry (List)

**Purpose:** Bureau Ops and Super Admin view all registered banks and lenders.

**Layout:** Page header + "Add Institution" button. Filterable table.

**Displayed Columns:**

| Column | Source |
|--------|--------|
| Institution Name | `institutions.name` |
| Supplier Reference Number (SRN) | `institutions.supplier_reference_number` |
| Status | `institutions.status` (Active / Suspended / Pending) |
| Products Enabled | `institutions.enabled_products` |
| Last Submission | `batch_uploads.created_at` (latest) |
| Actions | View / Edit / Suspend |

**Filters:** Status, product type, onboarding date range, search by name or SRN.

**Data Requirements (read):** `institutions`, `batch_uploads` (last submission lookup)

---

### Screen 2.2 — Institution Profile / Detail

**Purpose:** Full profile of a single institution — identity, credentials, contacts, submission history.

**Layout:** Tabbed: Overview | API Credentials | Contacts | Submission History | Audit

**Overview Tab Fields:**

| Field | Type | Rules |
|-------|------|-------|
| Institution Name | text | Mandatory |
| Supplier Reference Number | text (read-only after create) | Unique, system-assigned or manually entered |
| Status | dropdown | Active / Suspended / Pending |
| Enabled Products | multi-select | e.g. Personal Loan, Home Loan, Credit Card |
| Allowed IP Ranges | tag list | CIDR notation, validated |
| mTLS Certificate Fingerprint | text | Optional, for tier-1 banks |
| Integration Channel | radio | REST API / Portal Upload / SFTP |

**API Credentials Tab Fields:**

| Field | Type |
|-------|------|
| Client ID | text (read-only) |
| Client Secret | masked, "Regenerate" button |
| Scopes | read-only list |
| Token Expiry | read-only |

**Contacts Tab:** List of technical contacts — name, email, phone, role (Primary / Security / Operations).

**Data Requirements:** `institutions`, `api_clients`, contact persons table

---

### Screen 2.3 — New Institution Onboarding Wizard

**Purpose:** Step-by-step onboarding aligned to Section 15 process in the requirements doc.

**Steps:**

| Step | Name | Key Fields |
|------|------|------------|
| 1 | Institution Details | Name, SRN, legal entity type, registration number, address |
| 2 | Integration Channel | Channel selection, IP ranges, certificate upload (optional) |
| 3 | Products & Account Types | Product checkboxes aligned to account type table (B, C, D, E, F, G, H, I, M, N, O, P, R, S, T, U, V, W, X, Y, Z) |
| 4 | OAuth Client Setup | Auto-generate client_id/secret, display once with copy |
| 5 | Contacts | At least 1 technical contact (name, email, phone) |
| 6 | Review & Activate | Summary, confirm NDA/DPA signed checkbox, Activate button |

**Data Requirements (write):** `institutions`, `api_clients`, contacts

---

### Screen 2.4 — Institution User Management

**Purpose:** Institution Admin manages users within their own institution. Bureau Ops sees all institutions.

**Layout:** User list with role badge. "Invite User" button.

**User List Columns:** Name, Email, Role, Status, Last Login, Actions (Edit / Deactivate).

**Invite User Form Fields:**

| Field | Type | Rules |
|-------|------|-------|
| Email | text | Valid email, not already registered |
| Role | dropdown | Institution Admin / Institution User |
| Full Name | text | Mandatory |

**Behaviour:** Send invite email with time-limited signup link. User completes password and MFA setup.

**Data Requirements:** `users`, `roles`, `institutions`

---

### Screen 2.5 — SFTP Configuration

**Purpose:** Configure SFTP batch transfer settings for institutions using fallback channel.

**Layout:** Form card within Institution Profile.

**Fields:**

| Field | Type | Rules |
|-------|------|-------|
| SFTP Directory Path | text | Auto-assigned per SRN |
| Authorised Public Keys | textarea (PEM) | At least 1 required for SFTP |
| Pickup Schedule | time selector | Default: 01:00 daily |
| File Naming Pattern | text (read-only) | `{SRN}_ALL_{L/T}702_M_{CCYYMMDD}_{seq1}_{seq2}.txt` |

**Data Requirements:** `sftp_config` linked to `institutions`

---

### Screen 2.6 — Webhook Configuration

**Purpose:** Institution configures endpoint to receive batch completion/validation notifications.

**Layout:** Form within Institution Profile → Webhook tab.

**Fields:**

| Field | Type | Rules |
|-------|------|-------|
| Webhook URL | URL | HTTPS only, must pass test ping |
| Secret (for HMAC signing) | password | Min 32 chars, stored hashed |
| Events subscribed | checkboxes | batch.completed, batch.validation_failed, batch.rejected |
| Retry policy | read-only | 3 retries with exponential backoff |
| "Test Webhook" button | action | Sends test payload, shows response code |

**Data Requirements:** `webhook_configs` linked to `institutions`

---

## Module 3 — Batch Submission

### Screen 3.1 — Batch Dashboard (List)

**Purpose:** Institution user views all their submissions. Bureau Ops sees all institutions.

**Layout:** Summary cards (Total Submitted, Accepted, Rejected, Pending) + filterable table.

**Summary Cards:**

| Card | Metric |
|------|--------|
| This Month Submissions | count of `batch_uploads` for current reporting month |
| Acceptance Rate | accepted_count / total_records * 100 |
| Outstanding Errors | sum of unresolved validation_errors |
| Pending Processing | batches with status IN_PROGRESS / QUEUED |

**Table Columns:**

| Column | Source |
|--------|--------|
| Batch ID | `batch_uploads.batch_id` |
| Reporting Month | `batch_uploads.reporting_month` |
| File Type | TEST / LIVE |
| Submission Channel | REST / Portal / SFTP |
| Submitted At | `batch_uploads.created_at` |
| Total Records | `batch_uploads.total_records` |
| Accepted | `batch_uploads.accepted_count` |
| Rejected | `batch_uploads.rejected_count` |
| Status | QUEUED / VALIDATING / COMPLETED / FAILED |
| Actions | View / Download Errors |

**Filters:** Reporting month, file type (TEST/LIVE), status, submission date range.

**Data Requirements:** `batch_uploads`, `validation_errors` (count join)

---

### Screen 3.2 — New Batch Submission — File Upload

**Purpose:** Portal-based submission for MFIs and smaller lenders using CSV, Excel, or fixed-length Form G file.

**Layout:** Drag-and-drop upload zone + metadata form.

**Form Fields:**

| Field | Type | Rules |
|-------|------|-------|
| Supplier Reference Number | text (pre-filled from session) | Read-only for institution users |
| Reporting Month | date picker (month-end) | CCYYMMDD, must be ≤ today, not in future |
| File Type | radio: TEST / LIVE | LIVE requires prior clean TEST submission on record |
| Sequence Number | integer | Auto-incremented per SRN + reporting_month; editable for resubmission |
| File | file input | Accepted: .txt, .csv, .xlsx. Max 50 MB. Virus scan on upload |
| Idempotency Key | text (auto-generated) | UUID, shown to user for reference |

**Post-Upload Behaviour:**
- Display file name, size, hash (SHA-256) for user confirmation
- "Submit" → POST `/batches/file`, receive `batch_id`
- Redirect to Screen 3.3 (Batch Status)

**Validation Feedback (client-side pre-flight):**
- File naming convention check: `{SRN}_ALL_{L/T}702_M_{CCYYMMDD}_{seq}_{seq}.txt`
- Warn if file name does not match convention (not reject — server validates)

**Data Requirements (write):** `batch_uploads`, `raw_submission_records`

---

### Screen 3.3 — Batch Status Detail

**Purpose:** Real-time status of a single batch showing processing progress and outcome.

**Layout:** Status banner + metric tiles + timeline + actions.

**Status Banner:** QUEUED → VALIDATING → COMPLETED (with accepted/rejected split) or FAILED.

**Metric Tiles:**

| Tile | Value |
|------|-------|
| Total Records | `batch_uploads.total_records` |
| Accepted | `batch_uploads.accepted_count` |
| Rejected | `batch_uploads.rejected_count` |
| Warnings | `batch_uploads.warning_count` |
| Processing Time | `completed_at - started_at` |

**Batch Metadata Panel:**

| Field | Value |
|-------|-------|
| Batch ID | UUID |
| Reporting Month | CCYYMMDD |
| File Type | TEST / LIVE |
| Sequence Number | integer |
| Source File Name | original filename |
| File Hash (SHA-256) | hex string |
| Submitted By | user name / API client |
| Submitted At | ISO 8601 timestamp |
| Idempotency Key | UUID |

**Timeline:** Visual steps — Received → Parsed → Header/Trailer Validated → Record Validation → Mastering → Completed.

**Actions:**
- "View Errors" → Screen 3.4
- "Download Rejected Rows (CSV)" → export
- "Resubmit" (visible for FAILED or COMPLETED with rejections) → opens Screen 3.2 pre-filled

**Data Requirements:** `batch_uploads`, `validation_errors` (count), `audit_logs`

---

### Screen 3.4 — Validation Errors (Rejected Rows)

**Purpose:** Institution user reviews field-level errors to correct and resubmit.

**Layout:** Error summary by category + paginated error table + download button.

**Error Summary Panel (grouped by error code category):**

| Category | Count |
|----------|-------|
| Identity Errors (Omang/Passport) | n |
| Date Errors | n |
| Financial Field Errors | n |
| Status Code Errors | n |
| Reference Table Errors | n |
| Duplicate Records | n |
| Cross-field Rule Failures | n |

**Error Table Columns:**

| Column | Source |
|--------|--------|
| Row Number | `validation_errors.row_number` |
| Field | `validation_errors.field` |
| Error Code | `validation_errors.code` e.g. `INVALID_OMANG_FORMAT` |
| Severity | REJECT / WARN |
| Raw Value Submitted | `validation_errors.raw_value` |
| Human-readable Message | `validation_errors.message` |

**Key Error Codes (from Form G rules):**

| Code | Trigger |
|------|---------|
| `INVALID_OMANG_FORMAT` | Not 9 numeric, char 5 not 1/2, repeated dummy value |
| `INVALID_PASSPORT` | Not alphanumeric or invalid country format |
| `MISSING_MANDATORY_FIELD` | Mandatory field empty |
| `INVALID_DATE_FORMAT` | Not CCYYMMDD |
| `FUTURE_DATE` | Date of birth / account opened in future |
| `INVALID_STATUS_FOR_ACCOUNT_TYPE` | Status/account-type combination not in allowed matrix |
| `AMOUNT_OVERDUE_REQUIRED` | Months in arrears > 0 but no overdue amount |
| `INSTALMENT_REQUIRED` | Current balance > 0 but instalment is zero |
| `DUPLICATE_ACCOUNT_KEY` | SRN + account_number + sub_account + branch duplicate in batch |
| `INVALID_REFERENCE_CODE` | Code not in reference table (ownership type, payment type, etc.) |
| `DEFERRED_DATE_REQUIRED` | Payment type = 02 but deferred_payment_start_date is zero |
| `TERMS_REQUIRED` | Account type D/H/I/N/P/T/Y but loan term = 0 |

**Actions:** "Download Errors (CSV)", "Download Rejected Rows Template" (pre-filled for correction).

**Data Requirements:** `validation_errors`, `batch_uploads`

---

### Screen 3.5 — Accepted Records Reconciliation

**Purpose:** Institution can verify which records were accepted for reconciliation against their source system.

**Layout:** Table of accepted record keys.

**Table Columns:**

| Column | Source |
|--------|--------|
| Row Number | `raw_submission_records.row_number` |
| Omang / Passport | masked (last 4 visible) |
| Account Number | `credit_accounts.account_number` |
| Sub Account Number | `credit_accounts.sub_account_number` |
| Branch Code | `credit_accounts.branch_code` |
| Borrower ID (internal) | `borrowers.borrower_id` |
| Reporting Month | as submitted |

**Actions:** Download as CSV. Filter by account number.

**Data Requirements:** `raw_submission_records`, `credit_accounts`, `borrowers`

---

### Screen 3.6 — SFTP Batch Monitor (Bureau Ops Only)

**Purpose:** Ops team monitors automated SFTP batch pickups.

**Layout:** Table of SFTP-received files with status and auto-triggered batch IDs.

**Columns:** File name, Received At, Size (bytes), SHA-256 hash, Auto-assigned Batch ID, Processing Status, Errors.

**Data Requirements:** `sftp_incoming_log` linked to `batch_uploads`

---

## Module 4 — Data Validation & Quality

### Screen 4.1 — Data Quality Dashboard

**Purpose:** Compliance and Bureau Ops monitor submission quality trends across all institutions.

**Layout:** Date range filter + summary KPI row + charts + institution league table.

**KPI Row:**

| KPI | Calculation |
|-----|-------------|
| Overall Acceptance Rate (%) | accepted / total * 100, all institutions, selected period |
| Total Records Submitted | sum `batch_uploads.total_records` |
| Total Rejected Records | sum `batch_uploads.rejected_count` |
| Institutions with >5% Rejection Rate | count |
| Late Submissions | batches submitted after the 15th of following month |

**Charts:**
- Monthly acceptance rate trend (line chart, per institution or all)
- Top 10 error codes by frequency (bar chart)
- Submission volume per institution (grouped bar, monthly)
- Rejection rate distribution (histogram)

**Institution League Table:**

| Column | Value |
|--------|-------|
| Institution | name |
| SRN | supplier_reference_number |
| Submissions This Period | count |
| Acceptance Rate | % |
| Top Error Code | most frequent |
| Quality Score | computed 0–100 |
| Trend | up/down arrow vs prior period |

**Data Requirements:** `batch_uploads`, `validation_errors`, `institutions`

---

### Screen 4.2 — Institution Submission Compliance Monitor

**Purpose:** Track whether institutions submit monthly as required, flag late or missing submissions.

**Layout:** Calendar heatmap (month × institution) + alert list.

**Heatmap:** Green = submitted on time, Amber = late, Red = not submitted, Grey = no data expected.

**Alert List:** Institution name, expected reporting month, days late, last contact attempt.

**Data Requirements:** `batch_uploads`, `institutions`, expected submission schedule config

---

### Screen 4.3 — Resubmission History

**Purpose:** Track correction cycles — how many resubmissions were needed before clean acceptance.

**Layout:** Per institution, per reporting month — timeline of submission attempts.

**Columns:** SRN, Reporting Month, Attempt #, Submitted At, Accepted, Rejected, Cumulative Rejections Resolved.

**Data Requirements:** `batch_uploads` (all sequences for same SRN + reporting_month)

---

### Screen 4.4 — Manual Data Correction Request

**Purpose:** Bureau Ops initiates or approves corrections to accepted data records when a proven error is identified post-ingestion.

**Layout:** Correction form referencing a specific raw_record_id.

**Fields:**

| Field | Type | Rules |
|-------|------|-------|
| Batch ID | reference (read-only) | From original submission |
| Row Number | integer | From original submission |
| Field to Correct | dropdown | List of Form G fields |
| Original Value | text (read-only) | From `raw_submission_records` |
| Corrected Value | text | Validated against field rules |
| Correction Reason | textarea | Mandatory |
| Supporting Reference | text | e.g. dispute number, regulatory directive |

**Behaviour:**
- Creates compensating record in `raw_submission_records` (never overwrites original — SEC-008)
- Requires 2-person approval for financial fields (maker-checker)
- Writes full `audit_logs` entry including actor, timestamp, before/after values

**Data Requirements:** `raw_submission_records`, `validation_errors`, `audit_logs`

---

## Module 5 — Credit Report

### Screen 5.1 — Borrower Search

**Purpose:** Institution user or bureau ops initiates a credit inquiry by searching for a borrower.

**Layout:** Search form + results list.

**Search Fields (at least one required):**

| Field | Type | Rules |
|-------|------|-------|
| Omang ID Number | text | 9 numeric, validates format |
| Passport Number | text | Alphanumeric, 16 chars max |
| Account Number | text | From submitted account data |
| Cellular Telephone | text | 10 digits, numeric |
| Surname + Date of Birth | text + date | Combined match, requires both |

**Inquiry Metadata (mandatory before search):**

| Field | Type | Rules |
|-------|------|-------|
| Inquiry Reason | dropdown | e.g. Credit Application, Account Review, Affordability Assessment |
| Customer Consent Reference | text | Reference to signed consent; mandatory unless legally exempted |

**Search Results:**

| Column | Value |
|--------|-------|
| Match Confidence | Exact / Possible |
| Borrower ID | internal UUID (masked) |
| Surname, Forename | from `borrowers` |
| Omang (masked) | last 4 visible |
| DOB | from `borrowers` |
| Active Accounts | count |

**Behaviour:**
- NO_MATCH → log inquiry, show "No record found" (no error — correct behaviour)
- MATCH_REVIEW_REQUIRED → multiple candidates, show list with disambiguation
- All searches write to `credit_inquiries` and `audit_logs` before returning results
- Institution sees only what their product permission allows (SEC-009)

**Data Requirements (write):** `credit_inquiries`, `audit_logs`
**Data Requirements (read):** `borrowers`, `borrower_identifiers`

---

### Screen 5.2 — Credit Report View

**Purpose:** Full credit report for a matched borrower.

**Layout:** Sections accordion or tabs: Identity | Addresses | Employment | Account Summary | Active Accounts | Closed Accounts | Adverse Events | Repayment History | Inquiries | Report Metadata.

**Identity Section:**

| Field | Source |
|-------|--------|
| Full Name | `borrowers.surname` + forenames |
| Omang (masked) | `borrower_identifiers` |
| Passport (masked) | `borrower_identifiers` |
| Date of Birth | `borrowers.date_of_birth` |
| Gender | `borrowers.gender` |

**Address Section:** Residential address lines 1–4, postal code. Postal address. Owner/Tenant indicator.

**Employment Section:** Employer name, occupation, income frequency (income value masked — regulatory requirement: "may not be displayed or returned by bureaux, must be fully masked").

**Account Summary Section:**

| Field | Calculated |
|-------|-----------|
| Total Active Accounts | count status not in (C, T, V, Z) |
| Total Closed Accounts | count status in (C, T, V) |
| Total Current Exposure | sum `current_balance` active accounts |
| Total Monthly Instalment | sum `instalment_amount` active accounts |
| Adverse Accounts | count accounts with status in (L, W, J) |

**Active Accounts Table:**

| Column | Source |
|--------|--------|
| Institution | `institutions.name` |
| Account Type | decoded from account_type code |
| Account Number (masked) | last 4 visible |
| Opened Date | `credit_accounts.date_account_opened` |
| Opening Balance / Limit | `credit_accounts.opening_balance_or_credit_limit` |
| Current Balance | `credit_accounts.current_balance` |
| Instalment | `credit_accounts.instalment_amount` |
| Months in Arrears | `credit_accounts.months_in_arrears` |
| Amount Overdue | `credit_accounts.amount_overdue` |
| Repayment Frequency | decoded from code |
| Payment Type | decoded from code |
| Status | decoded from status_code |
| Status Date | `account_status_events.status_date` |

**Closed Accounts Table:** Same columns; status will be C/T/V/W/Z.

**Adverse Events Section:** Status events (L=Handed Over, W=Written Off, J=Repossession, Z=Deceased) with status date. Displayed up to 2 years per regulations.

**Repayment History Section:** Monthly grid (last 24 months) — rows = account, columns = month, cell = arrears bucket (0/1/2/3/4/5/6+).

**Inquiries Section:**

| Column | Source |
|--------|--------|
| Inquiry Date | `credit_inquiries.created_at` |
| Institution | `institutions.name` |
| Inquiry Reason | `credit_inquiries.inquiry_reason` |

**Report Metadata:**

| Field | Value |
|-------|-------|
| Report ID | `credit_inquiries.inquiry_id` (or `report_id`) |
| Generated At | ISO 8601 |
| Generated By | institution name |
| Correlation ID | from request |

**Actions:** "Download PDF", "Close Report" (session-scoped, no caching of PII)

**Data Requirements:** `borrowers`, `borrower_identifiers`, `credit_accounts`, `repayment_history`, `account_status_events`, `credit_inquiries`, `institutions`

---

### Screen 5.3 — Inquiry History (Institution View)

**Purpose:** Institution reviews their own inquiry audit trail.

**Layout:** Filterable table.

**Columns:** Report ID, Search Parameter (masked), Matched Borrower (masked), Inquiry Reason, Requested By, Timestamp, Result (Match / No Match / Review Required).

**Filters:** Date range, inquiry reason, result type, requesting user.

**Data Requirements:** `credit_inquiries` (filtered by `institution_id`)

---

### Screen 5.4 — Inquiry Audit Trail (Bureau Ops / Auditor View)

**Purpose:** Bureau Ops and Auditors see all inquiries across all institutions for monitoring and compliance.

**Layout:** Same as 5.3 but unfiltered by institution + institution column added.

**Additional Columns:** Institution Name, SRN.

**Data Requirements:** `credit_inquiries`, `institutions`, `audit_logs`

---

### Screen 5.5 — No-Match / Multiple-Match Resolution (Bureau Ops)

**Purpose:** Manual review when automated matching returns MATCH_REVIEW_REQUIRED.

**Layout:** Side-by-side candidate comparison.

**Per Candidate:** Omang, name, DOB, address, last submission SRN, active accounts.

**Actions:** Confirm Match (links inquiry to specific `borrower_id`), Reject All (log as NO_MATCH), Escalate.

**Data Requirements:** `borrowers`, `borrower_identifiers`, `credit_accounts`, `credit_inquiries`

---

## Module 6 — Operations & Data Quality Dashboard

### Screen 6.1 — Operations Home Dashboard (Bureau Ops)

**Purpose:** Single-pane view of platform health and daily activity.

**Layout:** KPI row + activity feed + alerts panel.

**KPI Row:**

| KPI | Source |
|-----|--------|
| Batches Received Today | `batch_uploads` count |
| Currently Processing | status = IN_PROGRESS |
| Failed Batches (last 24 h) | status = FAILED |
| Active Institutions | `institutions.status` = Active count |
| Credit Reports Issued Today | `credit_inquiries` count |
| System Uptime | from monitoring |

**Alerts Panel:** High-rejection batches (>30%), institutions not submitted this month, failed webhook deliveries, security events (failed logins, 403s).

**Activity Feed:** Latest 20 batch events, report requests, admin changes — each with actor, timestamp, action.

**Data Requirements:** `batch_uploads`, `credit_inquiries`, `institutions`, `audit_logs`

---

### Screen 6.2 — Compliance Dashboard

**Purpose:** Compliance officers monitor regulatory obligations — late submissions, rejection trends, inquiry usage patterns.

**Layout:** Tabs: Submission Compliance | Inquiry Compliance | Data Quality.

**Submission Compliance Tab:**

| Metric | Value |
|--------|-------|
| Institutions with on-time submissions (%) | this month |
| Average days from month-end to submission | per institution |
| Institutions with 3+ consecutive late submissions | flag list |

**Inquiry Compliance Tab:**

| Metric | Value |
|--------|-------|
| Total inquiries this period | count |
| Inquiries without consent reference | flag (should be 0) |
| Top inquiry reasons | bar chart |
| Institutions exceeding inquiry rate limits | flag |

**Data Quality Tab:** Mirrors Screen 4.1 but focused on regulatory threshold — any field with >10% error rate flagged as systemic issue requiring institution engagement.

**Data Requirements:** `batch_uploads`, `credit_inquiries`, `validation_errors`, `institutions`

---

### Screen 6.3 — Batch Processing Queue (Ops Real-Time)

**Purpose:** Ops team monitors live processing pipeline.

**Layout:** Queue table with auto-refresh (every 30 s).

**Columns:** Batch ID, SRN, Institution, Submitted At, Stage, Records, Processing Duration, ETA, Actions (Force Retry, Quarantine).

**Stages:** Received → Virus Scan → Parse → Header/Trailer → Field Validation → Cross-Field → Duplicate Check → Mastering → Complete.

**Data Requirements:** `batch_uploads` (live status), internal queue metrics

---

### Screen 6.4 — Institution Engagement (Ops Remediation)

**Purpose:** Ops tracks communication with institutions regarding repeated data quality issues.

**Layout:** Per institution — submission quality history + notes log.

**Notes Log:** Ops user adds timestamped notes (e.g. "Called John at FNBB — mapping fix for Omang field in progress, ETA 20260515").

**Quality Trend Chart:** Rejection rate over last 12 months for the institution.

**Data Requirements:** `institutions`, `batch_uploads`, `validation_errors`, ops notes table

---

### Screen 6.5 — Sandbox / Certification Centre (Bureau Ops + Institution)

**Purpose:** Manage institution certification against test scenarios before production LIVE submissions are enabled.

**Layout:** Checklist of required test scenarios.

**Test Scenarios Checklist:**

| # | Test | Required |
|---|------|---------|
| 1 | Submit clean TEST batch (≥100 records) | Yes |
| 2 | Receive and review validation error report | Yes |
| 3 | Correct errors, resubmit with seq+1 | Yes |
| 4 | Header/trailer mismatch test | Yes |
| 5 | Duplicate submission rejection test | Yes |
| 6 | Credit report inquiry — known match | Yes |
| 7 | Credit report inquiry — no match | Yes |
| 8 | Access isolation test (403 on other institution data) | Yes |
| 9 | Webhook notification receipt | If webhook configured |

**Status per scenario:** Not Started / In Progress / Pass / Fail.

**Data Requirements:** `certification_tests` per institution, linked to `batch_uploads` and `credit_inquiries`

---

## Module 7 — Reference Data Management

### Screen 7.1 — Reference Code Tables (List)

**Purpose:** Bureau Ops or Super Admin views all configurable reference code tables.

**Layout:** Accordion list of tables.

**Tables Managed:**

| Table | Codes |
|-------|-------|
| Account Status Codes | B,C,D,E,I,J,L,P,T,U,V,W,Y,Z |
| Account Types | B,C,D,E,F,G,H,I,M,N,O,P,R,S,T,U,V,W,X,Y,Z |
| Ownership Types | 00,01,02,03,04,05 |
| Repayment Frequency | 00–06 |
| Loan Reason Codes (Botswana) | A,B,C,D,F,H,J,O,R,S |
| Payment Types | 00–10 |
| Income Frequency | M,W,F,Q,A |
| Title / Salutation | ADV,CAPT,COL,DR,DS,JUDGE,KAPT,KOL,LADY,LORD,LT,MAJ,ME,MEJ,MEV,MISS,MNR,MR,MRS,MS,PAST,PROF,REV,SERS,SGT,SIR |
| Record Types | C,D,H,R,T |

**Data Requirements:** `reference_codes` (code_type, code, description, effective_date, deprecated_at)

---

### Screen 7.2 — Reference Code Detail / Edit

**Purpose:** View, add, or deprecate a code within a table.

**Fields:**

| Field | Type | Rules |
|-------|------|-------|
| Code | text | Unique within code_type, uppercase |
| Description | text | Mandatory |
| Definition / Notes | textarea | Optional |
| Effective Date | date | Must be in future for new codes; approval required |
| Deprecated Date | date | Optional; sets code as invalid after date |
| Status | read-only | Active / Deprecated |

**Behaviour:**
- Changes require approval by second admin before taking effect
- All changes logged to `audit_logs`
- On deprecation, connected institutions notified via system alert
- Removing active code requires checking no live `validation_errors` or `credit_accounts` reference it

**Data Requirements:** `reference_codes`, `audit_logs`, change approval workflow

---

### Screen 7.3 — Status × Account Type Validity Matrix

**Purpose:** Visual management of which status codes are allowed per account type (from Status & Acc Type sheet).

**Layout:** Grid — rows = account types (B through Z), columns = status codes (B,C,D,E,I,J,L,P,T,U,V,W,Y,Z).

**Cell States:** Allowed (green tick) / Not Allowed (red cross).

**Edit Mode:** Toggle cells. Requires Super Admin + second-person approval.

**Data Requirements:** `status_account_type_rules` (account_type, status_code, is_allowed)

---

## Module 8 — Audit & Compliance

### Screen 8.1 — Audit Log Viewer

**Purpose:** Auditors and Super Admin review immutable system-wide audit trail.

**Layout:** Filterable, paginated log table. Read-only. No edit, delete, or export without explicit permissions.

**Columns:**

| Column | Source |
|--------|--------|
| Audit ID | `audit_logs.audit_id` |
| Timestamp | ISO 8601 |
| Actor | user name or API client ID |
| Institution | institution name |
| Action | e.g. LOGIN, BATCH_SUBMITTED, REPORT_REQUESTED, ROLE_CHANGED, CONFIG_CHANGED |
| Object Type | e.g. batch, borrower, user, reference_code |
| Object ID | UUID |
| Correlation ID | `audit_logs.correlation_id` |
| IP Address | from request |
| Result | SUCCESS / FAILURE |
| Details | JSON (expandable) |

**Filters:** Actor, institution, action type, date range, result, correlation ID.

**Behaviour:**
- Records are append-only; UI has no edit/delete actions (SEC-008)
- Export requires Auditor or Super Admin role + is itself logged

**Data Requirements:** `audit_logs`

---

### Screen 8.2 — Security Event Log

**Purpose:** Security-focused view of authentication, authorisation failures, and anomalies.

**Layout:** Same structure as 8.1 but pre-filtered to security event categories.

**Surfaced Event Types:**

| Event | Trigger |
|-------|---------|
| AUTH_FAILURE | wrong password or expired token |
| MFA_FAILURE | wrong OTP, 3rd failure triggers lockout |
| ACCOUNT_LOCKED | after n failed attempts |
| FORBIDDEN_ACCESS | 403 on API call |
| SCOPE_VIOLATION | token valid but wrong scope |
| CROSS_INSTITUTION_ATTEMPT | institution A accessing institution B data |
| UNUSUAL_INQUIRY_VOLUME | institution exceeds hourly inquiry threshold |
| ADMIN_PRIVILEGE_CHANGE | role escalation or permission change |

**Alerting:** High-severity events (CROSS_INSTITUTION_ATTEMPT, UNUSUAL_INQUIRY_VOLUME) create in-app alerts and optionally email/Slack notification to Super Admin.

**Data Requirements:** `audit_logs` (filtered on event category), `security_alerts`

---

### Screen 8.3 — Regulatory Reporting Export

**Purpose:** Compliance officer generates periodic reports for regulator (Bank of Botswana / NBFIRA).

**Layout:** Report selector + date range + "Generate" button.

**Available Reports:**

| Report | Contents |
|--------|---------|
| Monthly Submission Summary | Per institution: records submitted, accepted, rejected, late |
| Data Quality Trend | Error rates by field category over period |
| Inquiry Activity Summary | Inquiry counts by institution and purpose |
| Adverse Event Summary | Count of W, L, J, Z status events ingested by period |
| New Institutions Report | Institutions onboarded in period |

**Output formats:** PDF, CSV.

**Data Requirements:** `batch_uploads`, `validation_errors`, `credit_inquiries`, `account_status_events`, `institutions`

---

## Module 9 — User & Role Management

### Screen 9.1 — User List (All Roles)

**Purpose:** Super Admin views and manages all platform users. Institution Admin manages their own institution users.

**Layout:** Searchable, filterable table.

**Columns:** Full Name, Email, Role, Institution, Status (Active / Locked / Inactive), MFA Enrolled, Last Login, Actions (Edit / Lock / Deactivate).

**Filters:** Role, institution, status, MFA enrolled (Y/N).

**Data Requirements:** `users`, `roles`, `institutions`

---

### Screen 9.2 — User Profile / Edit

**Purpose:** Edit a user's role, status, or contact details.

**Fields:**

| Field | Type | Rules |
|-------|------|-------|
| Full Name | text | Mandatory |
| Email | text | Immutable after creation (contact admin to change) |
| Role | dropdown | See role list below |
| Institution | dropdown | Required for institution-scoped roles |
| Status | radio | Active / Locked / Inactive |
| MFA Status | read-only + "Reset MFA" action | Super Admin only |

**Roles:**

| Role | Scope |
|------|-------|
| Super Admin | Platform-wide, all modules |
| Bureau Ops | All institutions, batch and quality management |
| Compliance | Read-only across all data; regulatory reports |
| Institution Admin | Own institution users, submissions, reports |
| Institution User | Own institution submissions and reports (read) |
| Auditor | Audit log read-only, regulatory exports |
| API Client | Machine-to-machine, no portal access |

**Behaviour:**
- Role change requires own MFA confirmation + logged to `audit_logs`
- Cannot demote own Super Admin account
- Deactivation immediately invalidates all active sessions

**Data Requirements:** `users`, `roles`, `institutions`, `audit_logs`

---

### Screen 9.3 — Role Permissions Matrix (Super Admin)

**Purpose:** Visualise and manage which permissions each role has.

**Layout:** Grid — rows = roles, columns = permissions/screens/API scopes.

**Permission Categories:**

| Category | Permissions |
|----------|------------|
| Batches | submit:data, read:batch, read:errors, admin:batch |
| Reports | read:reports |
| Reference Data | read:reference, admin:reference |
| Institutions | admin:institution |
| Audit | read:audit |
| Users | admin:users |
| Webhooks | webhook:receive |

**Cell States:** Granted / Not Granted. Edit requires Super Admin.

**Data Requirements:** `roles`, `role_permissions`

---

### Screen 9.4 — API Client Management

**Purpose:** Manage machine-to-machine API clients for bank integration (distinct from portal users).

**Layout:** Table of API clients per institution + "Create Client" button.

**Client Columns:** Client ID, Institution, Scopes, Created At, Last Used, Status, Expiry.

**Create Client Form:**

| Field | Type | Rules |
|-------|------|-------|
| Institution | dropdown | Required |
| Scopes | multi-select | `submit:data`, `read:batch`, `read:errors`, `read:reports`, `admin:institution`, `webhook:receive` |
| Client Secret | auto-generated | Shown once; hashed in storage (SEC-006) |
| IP Allow-list | tag input | CIDR or single IP |
| Token TTL | dropdown | 1h / 6h / 24h |
| Expiry Date | date | Optional; auto-rotate on expiry |

**Behaviour:**
- Secret displayed once at creation in a modal — user must copy it
- "Regenerate Secret" invalidates old secret immediately (breaking change — warn user)
- All credential operations logged to `audit_logs`

**Data Requirements:** `api_clients`, `institutions`, `audit_logs`

---

## Appendix A — Data Entity Quick Reference

| Entity | Key Fields | Used By |
|--------|-----------|---------|
| `institutions` | institution_id, supplier_reference_number, status | M2, M3, M5, M6, M9 |
| `api_clients` | client_id, institution_id, scopes, secret_hash | M2, M9 |
| `batch_uploads` | batch_id, institution_id, reporting_month, sequence_number, file_type, status, total/accepted/rejected counts | M3, M4, M6 |
| `raw_submission_records` | raw_record_id, batch_id, row_number, raw_payload | M3, M4 |
| `validation_errors` | error_id, batch_id, row_number, field, code, severity, raw_value, message | M3, M4 |
| `borrowers` | borrower_id, omang_id_number, passport_number, surname, forenames, dob, gender | M5 |
| `borrower_identifiers` | identifier_id, borrower_id, id_type, id_value, history | M5 |
| `credit_accounts` | credit_account_id, institution_id, account_number, sub_account_number, branch_code, account_type, opening_balance, current_balance, instalment, months_in_arrears, amount_overdue, status_code, status_date | M5 |
| `repayment_history` | credit_account_id, reporting_month, months_in_arrears (point-in-time) | M5 |
| `account_status_events` | credit_account_id, status_code, status_date, submitted_month | M5, M8 |
| `credit_inquiries` | inquiry_id, institution_id, borrower_id, inquiry_reason, consent_reference, result, timestamp | M5, M8 |
| `audit_logs` | audit_id, actor_id, action, object_type, object_id, correlation_id, timestamp, ip, result | M8 (all modules write) |
| `reference_codes` | code_type, code, description, effective_date, deprecated_at | M7 |
| `users` | user_id, email, role, institution_id, mfa_enrolled, status | M1, M9 |
| `roles` | role_id, name, scope | M9 |

---

## Appendix B — Form G Field → Screen Mapping

| Form G Field | API Key | Mandatory | Screens that Display / Validate |
|---|---|---|---|
| Record Type | record_type | M | 3.2, 3.4 |
| OMANG ID Number | omang_id_number | M | 3.2, 3.4, 5.1, 5.2 |
| Passport Number | passport_number | Cond | 3.2, 3.4, 5.1, 5.2 |
| Gender | gender | M | 3.4, 5.2 |
| Date of Birth | date_of_birth | M | 3.4, 5.2 |
| Branch Code | branch_code | Opt | 3.4, 5.2 |
| Account Number | account_number | M | 3.4, 3.5, 5.2 |
| Sub Account Number | sub_account_number | M | 3.4, 3.5, 5.2 |
| Surname | surname | M | 3.4, 5.1, 5.2 |
| Title / Salutation | title | Opt | 5.2 |
| Forename 1/2/3 | forename_1/2/3 | M/Cond | 3.4, 5.2 |
| Residential Address Lines 1–4 | residential_address_line_1–4 | M/Opt | 5.2 |
| Postal Code (Residential) | residential_postal_code | Opt | 5.2 |
| Owner/Tenant | owner_tenant | Opt | 5.2 |
| Postal Address Lines 1–4 | postal_address_line_1–4 | Opt | 5.2 |
| Account Ownership Type | account_ownership_type | M | 3.4, 5.2 |
| Loan Reason | loan_reason_code | M | 3.4, 5.2 |
| Payment Type | payment_type | M | 3.4, 5.2, 7.1 |
| Type of Account | account_type | M | 3.4, 5.2, 7.1, 7.3 |
| Date Account Opened | date_account_opened | M | 3.4, 5.2 |
| Deferred Payment Start Date | deferred_payment_start_date | Cond | 3.4, 5.2 |
| Last Payment Date | last_payment_date | Cond | 3.4, 5.2 |
| Opening Balance / Credit Limit | opening_balance_or_credit_limit | M | 3.4, 5.2 |
| Current Balance | current_balance | Cond | 3.4, 5.2 |
| Current Balance Indicator | current_balance_indicator | M | 3.4, 5.2 |
| Instalment Amount | instalment_amount | Cond | 3.4, 5.2 |
| Months in Arrears | months_in_arrears | M | 3.4, 5.2 |
| Amount Overdue | amount_overdue | Cond | 3.4, 5.2 |
| Status Code | status_code | Cond | 3.4, 5.2, 7.3 |
| Repayment Frequency | repayment_frequency | M | 3.4, 5.2, 7.1 |
| Loan Term / Duration | loan_term | Cond | 3.4, 5.2 |
| Status Date | status_date | Cond | 3.4, 5.2 |
| Employer | employer_name | Opt | 5.2 |
| Occupation | occupation | Opt | 5.2 |
| Income | income | Opt | 5.2 (masked, never displayed) |
| Income Frequency | income_frequency | Opt | 3.4, 7.1 |
| Cellular Telephone | cellular_telephone | Opt | 5.1 (search only) |
| Home / Work Telephone | telephone_h / telephone_w | Opt | 5.2 |
| Third Party Name | third_party_name | Cond | 5.2 |
| Account Sold to 3rd Party | account_sold_to_third_party | Cond | 5.2 |
| No. of Participants (Joint) | no_of_participants | Cond | 3.4, 5.2 |
| Old Supplier / Branch / Account | old_supplier_* | Opt | 3.2 (migration only) |
