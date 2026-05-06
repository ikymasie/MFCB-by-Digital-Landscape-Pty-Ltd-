# MFCB Platform — User Journeys

> Version 1.0 | 2026-05-06
> Covers all primary actor journeys end-to-end: screens visited, actions taken, system responses, decision points, error paths

---

## Journey Index

| # | Journey | Actor | Channel |
|---|---------|-------|---------|
| UJ-01 | First-Time Portal Login & MFA Setup | Any portal user | Portal |
| UJ-02 | Institution Onboarding (Bureau Side) | Bureau Ops | Portal |
| UJ-03 | Institution Technical Setup (Bank Side) | Institution Admin | Portal |
| UJ-04 | Batch File Upload — Happy Path | Institution User | Portal |
| UJ-05 | Batch File Upload — Validation Errors & Resubmission | Institution User | Portal |
| UJ-06 | API Batch Submission (Automated) | API Client (bank system) | REST API |
| UJ-07 | SFTP Batch Submission | Institution (bank batch team) | SFTP |
| UJ-08 | Credit Report Request — Match Found | Institution User | Portal |
| UJ-09 | Credit Report Request — No Match | Institution User | Portal |
| UJ-10 | Bureau Ops — Batch Monitoring & Intervention | Bureau Ops | Portal |
| UJ-11 | Data Correction Post-Ingestion | Bureau Ops + Super Admin | Portal |
| UJ-12 | Compliance Officer — Monthly Review | Compliance Officer | Portal |
| UJ-13 | Auditor — Audit Log Review | Auditor | Portal |
| UJ-14 | New Institution User Invitation | Institution Admin | Portal |
| UJ-15 | Bank Sandbox Certification | Institution Admin + Bureau Ops | Portal + API |

---

## Journey Notation

```
[Screen n.n]      Portal screen visited
{API endpoint}    API call made
<Decision>        Branch point
[System]          Automated system action (no user input)
! Error           Error state
✓ Success         Completion state
```

---

## UJ-01 — First-Time Portal Login & MFA Setup

**Actor:** Any new portal user (all roles)
**Trigger:** User receives invite email after Institution Admin or Bureau Ops creates their account
**Preconditions:** `users.status = PENDING_INVITE`; invite token valid (60 min)

```
START: User clicks invite URL in email

[Screen 1.1 — Login / Account Setup]
  User enters: full name, password, confirm password
  <Password meets requirements? (10+ chars, 1 upper, 1 number, 1 special)>
    No  → Inline validation error; user corrects
    Yes → Continue
  {POST /portal/auth/accept-invite}
    [System] Sets users.status = ACTIVE
    [System] Writes audit_logs: USER_REGISTERED

[Screen 1.4 — MFA Enrollment]
  System generates TOTP secret
  Screen displays: QR code + manual entry key
  User opens authenticator app, scans QR code
  User enters 6-digit verification code
  <Code valid?>
    No  → "Invalid code, try again" — retry up to 3×
         After 3×: "Setup failed, contact your admin"
    Yes →
  {POST /portal/auth/mfa-enroll}
    [System] Encrypts TOTP secret, stores in users.mfa_secret_encrypted
    [System] Sets users.mfa_enrolled = TRUE
    [System] Writes audit_logs: MFA_ENROLLED

[System] Redirect to role home dashboard
  INST_ADMIN / INST_USER → Screen 3.1 Batch Dashboard
  BUREAU_OPS → Screen 6.1 Ops Home Dashboard
  COMPLIANCE → Screen 6.2 Compliance Dashboard
  AUDITOR → Screen 8.1 Audit Log Viewer
  SUPER_ADMIN → Screen 6.1 Ops Home Dashboard

✓ User is fully onboarded and can use the platform
```

**Subsequent Logins:**
```
[Screen 1.1 — Login]
  Email + password
  <Credentials valid?>
    No  → Generic error (no field hint); increment failed_login_count
         After 5 failures → account locked 30 min; write ACCOUNT_LOCKED event
    Yes → Issue short-lived session_token (5 min)

[Screen 1.2 — MFA]
  User enters 6-digit OTP from authenticator
  <OTP valid?>
    No  → Increment MFA failure count; generic error
         After 3 failures → invalidate session; write MFA_FAILURE event
    Yes → Issue full session cookie; redirect to role home
```

---

## UJ-02 — Institution Onboarding (Bureau Side)

**Actor:** Bureau Ops
**Trigger:** NDA and DPA signed by institution; integration initiation received
**Preconditions:** Bureau Ops logged in with MFA; institution not yet in registry

```
[Screen 2.1 — Institution Registry]
  Bureau Ops clicks "Add Institution"

[Screen 2.3 — Onboarding Wizard]

  STEP 1: Institution Details
    Enters: name, SRN (e.g. BW0002), legal entity type, registration number
    <SRN unique?>
      No  → "Supplier reference number already in use"
      Yes → Continue

  STEP 2: Integration Channel
    Selects: REST API / Portal Upload / SFTP
    Enters: allowed IP ranges (CIDR)
    Optionally: uploads mTLS certificate (for tier-1 banks)

  STEP 3: Products & Account Types
    Checks account types institution will submit:
      e.g. P (Personal Loan), H (Home Loan), V (Overdraft)
    Each type validated against reference_codes ACCOUNT_TYPE table

  STEP 4: OAuth Client Setup (if REST API channel)
    System auto-generates client_id
    Bureau Ops clicks "Generate Credentials"
    {POST /institutions/{id}/api-clients}
    [System] Generates client_secret (64-char random)
    Screen shows: client_id + client_secret in ONE-TIME modal
    Bureau Ops copies credentials to share securely with bank tech team
    ! If modal closed without copying → "Regenerate" required (logs new event)

  STEP 5: Contacts
    Adds at least 1 technical contact: name, email, phone, role (PRIMARY)
    Optionally adds: Security contact, Operations contact

  STEP 6: Review & Activate
    Summary of all steps displayed
    Bureau Ops checks: "NDA signed", "DPA signed"
    Clicks "Activate Institution"
    {POST /institutions} → status = PENDING
    [System] Writes audit_logs: INSTITUTION_CREATED

  <Is this sandbox/test phase only?>
    Yes → Institution status = ACTIVE (sandbox credentials only)
          Institution sees only TEST file_type allowed until certification complete
    No  → Same; LIVE submissions blocked until certification passed (UJ-15)

✓ Institution record created; bank tech team can begin sandbox testing
```

---

## UJ-03 — Institution Technical Setup (Bank Side)

**Actor:** Institution Admin (bank IT team)
**Trigger:** Receives credentials from Bureau Ops after UJ-02
**Preconditions:** Institution ACTIVE in registry; Institution Admin account created by Bureau Ops

```
[Screen 2.2 — Institution Profile]
  Institution Admin reviews: SRN, enabled products, allowed IPs
  Verifies integration channel selected

  IF channel = REST API:
    Views client_id (secret was one-time; already shared securely)
    Configures IP allow-list for API calls
    Tests token endpoint: {POST /oauth/token}
    <Token issued?>
      No  → Check IP range, check client credentials → contact Bureau Ops
      Yes → Continue

  IF channel = Portal Upload:
    No additional technical setup; proceed to UJ-04

  IF channel = SFTP:
    [Screen 2.5 — SFTP Config]
    Bureau Ops sets SFTP directory (auto-assigned per SRN)
    Institution Admin uploads SSH public key(s) (min 1)
    Tests SFTP connection
    <Connection success?>
      No  → Review public key format, IP allow-list
      Yes → Continue

  IF webhooks desired:
    [Screen 2.6 — Webhook Config]
    Institution Admin enters HTTPS webhook URL
    Enters HMAC signing secret (min 32 chars)
    Selects events: batch.completed, batch.validation_failed, batch.rejected
    Clicks "Test Webhook"
    {POST /webhooks/batch-status/test}
    [System] Sends test payload to institution endpoint
    <Institution endpoint returned 200?>
      No  → Institution fixes their endpoint; retry
      Yes → Webhook status = ACTIVE

[Screen 2.4 — Institution User Management]
  Institution Admin invites institution users (see UJ-14)
  Each user completes UJ-01

✓ Technical integration configured; Institution Admin proceeds to sandbox testing (UJ-15)
```

---

## UJ-04 — Batch File Upload — Happy Path

**Actor:** Institution User (or Institution Admin)
**Trigger:** Month-end data extracted from core banking system; file ready
**Preconditions:** Institution ACTIVE; user logged in with MFA; file follows naming convention

```
[Screen 3.1 — Batch Dashboard]
  User reviews last submission status
  Clicks "New Submission"

[Screen 3.2 — New Batch Upload]
  Pre-filled: Supplier Reference Number (from session — read-only)
  User selects: Reporting Month (e.g. 20260331)
  User selects: File Type = LIVE (or TEST for first-time)
  Sequence Number: auto-set to 1 (first submission for this month)
  User drags or selects file: BW0001_ALL_L702_M_20260331_1_1.txt

  [Client-side pre-flight]
    Checks file name matches pattern
    Checks file extension (.txt / .csv / .xlsx)
    Checks file size ≤ 50 MB
    <Any pre-flight failure?>
      Yes → Inline warning before submit (not a block — server validates authoritatively)

  User reviews: filename, file size, auto-computed SHA-256 hash
  Clicks "Submit Batch"

  {POST /batches/file} (multipart/form-data)
    [System] Virus scan
    [System] Computes SHA-256, checks naming convention
    [System] Creates batch_uploads record: status = QUEUED
    [System] Stores raw file in Cloud Storage
    [System] Publishes parse-trigger message to Pub/Sub

  Response: 202 Accepted → batch_id returned
  User redirected to:

[Screen 3.3 — Batch Status Detail]
  Status banner: QUEUED → VALIDATING (auto-refresh every 5 s via polling or WebSocket)

  [System — Async Firebase Function Pipeline]
    Parse file → validate header/trailer → chunk rows → parallel row validation
    (See UPLOAD_ARCHITECTURE.md for detail)

  Timeline updates as stages complete:
    ✓ Received
    ✓ Virus Scan Passed
    ✓ File Parsed (total_records updated)
    ✓ Header/Trailer Validated
    ⟳ Row Validation (progress: 800/1200 rows validated...)
    ✓ Row Validation Complete
    ✓ Mastering
    ✓ Complete

  Final status: COMPLETED
  Tiles show: Total 1200 | Accepted 1200 | Rejected 0 | Warnings 0

  [System] Webhook fired to institution endpoint (if configured):
    event: batch.completed, accepted_count: 1200, rejected_count: 0

✓ Clean submission. All records ingested into bureau master store.

  User optionally clicks "View Accepted Records"
[Screen 3.5 — Accepted Records Reconciliation]
  Reconciles row count against source system
  Optionally downloads CSV

✓ JOURNEY COMPLETE
```

---

## UJ-05 — Batch File Upload — Validation Errors & Resubmission

**Actor:** Institution User
**Trigger:** Same as UJ-04 but file contains data quality issues
**Preconditions:** Same as UJ-04

```
[Screens 3.2 → 3.3] (same upload steps as UJ-04)

[Screen 3.3 — Batch Status Detail] after processing
  Status: COMPLETED
  Tiles show: Total 1200 | Accepted 1100 | Rejected 100 | Warnings 5
  Alert banner: "100 records rejected. Review errors before resubmission."

  [System] Webhook fired:
    event: batch.validation_failed, rejected_count: 100

  User clicks "View Errors"

[Screen 3.4 — Validation Errors]
  Error summary panel:
    IDENTITY errors: 12   (bad Omang format, missing passport)
    DATE errors: 8        (future date of birth, last payment date in future)
    FINANCIAL errors: 45  (opening balance = 0 for account type P)
    STATUS errors: 20     (status code not allowed for account type)
    REFERENCE errors: 15  (invalid repayment frequency code)

  User reviews error table (paginated, sortable by row number / field / code)
  For each row: sees raw_value submitted + exact error message

  User clicks "Download Rejected Rows Template"
  [System] Generates CSV: rejected rows pre-filled with original values + error column
  User opens CSV in core banking team's extract tool

  --- Bank-side correction cycle ---
  Bank IT maps errors back to source system fields
  Corrects:
    - Omang validation logic in extract
    - Date formatting (CCYYMMDD compliance)
    - Opening balance rules by account type
    - Status code to account type mapping
    - Repayment frequency codes aligned to reference table

  Bank re-extracts corrected records
  Prepends corrected rows + all previously accepted rows into new file
  File name: BW0001_ALL_L702_M_20260331_2_2.txt (seq 2)
  --- End bank-side correction ---

[Screen 3.2 — New Batch Upload]
  Sequence Number: 2 (auto-incremented; user can verify)
  File: BW0001_ALL_L702_M_20260331_2_2.txt
  Clicks "Submit Batch"

  {POST /batches/file}
    [System] Validates new sequence > prior sequence for same SRN + reporting_month
    [System] Processes batch through full pipeline

[Screen 3.3 — Batch Status Detail] (second submission)
  Status: COMPLETED
  Tiles: Total 1200 | Accepted 1200 | Rejected 0

✓ Clean resubmission. Month-end data fully ingested.

  <Still have rejections after seq 2?>
    Yes → Repeat cycle; increment sequence number each time
         After 3 resubmissions: system flags institution for Bureau Ops engagement
         Bureau Ops contacts institution (UJ-10)
```

---

## UJ-06 — API Batch Submission (Automated)

**Actor:** API Client (bank's automated system)
**Trigger:** Scheduled monthly extract job at bank; runs on agreed date
**Preconditions:** `api_clients` record ACTIVE; token not expired; IP in allow-list

```
STEP 1: Token acquisition
  {POST /oauth/token}
    grant_type=client_credentials
    client_id={uuid}
    client_secret={secret}
  Response: access_token (JWT, 1 h TTL)

  <Token issued?>
    No (401) → Check client credentials, IP range, expiry date → alert bank ops team
    Yes → Store token for request duration

STEP 2: Submit batch
  {POST /batches}
    Headers:
      Authorization: Bearer {token}
      Idempotency-Key: {uuid — generated by bank system, stored for retry safety}
      X-Correlation-Id: {bank-generated correlation ID}
    Body: JSON payload with supplier_reference_number, reporting_month,
          file_type, sequence_number, records[]

  <Response?>
    202 → store batch_id; proceed to polling (step 3)
    400 → fix JSON payload structure; retry
    401 → re-acquire token (expired); retry
    403 → check scopes, IP allow-list; alert bank ops
    409 → idempotency hit (prior submission) or duplicate live sequence
          If idempotency: retrieve prior batch_id from response, poll that batch
          If duplicate sequence: increment sequence_number; retry with new Idempotency-Key
    422 → top-level validation fail (file-level); fix and resubmit
    429 → rate limit; wait for Retry-After header value; retry
    5xx → wait 60 s; retry up to 3×; alert bank ops if persists

STEP 3: Poll batch status
  Loop: {GET /batches/{batch_id}}
    Every 30 s until status IN (COMPLETED, FAILED)

  <Final status?>
    COMPLETED with rejected_count = 0 → ✓ all accepted
    COMPLETED with rejected_count > 0 →
      {GET /batches/{batch_id}/errors}
      Bank system logs errors to internal ticket/remediation queue
      Bank re-extracts corrected records; increment sequence_number
      Return to STEP 2 with new payload + new Idempotency-Key
    FAILED →
      Bank system alerts ops team; manual investigation
      {GET /batches/{batch_id}/errors} for file-level errors

STEP 4: Reconcile (optional but recommended)
  {GET /batches/{batch_id}/accepted-records}
  Bank system reconciles accepted account keys against source system

✓ Automated monthly cycle complete. All audit events written by platform.
```

---

## UJ-07 — SFTP Batch Submission

**Actor:** Bank batch operations team
**Trigger:** Scheduled monthly job drops fixed-length text file in SFTP inbox
**Preconditions:** SFTP config active; SSH key authorised; file naming correct

```
STEP 1: File transfer
  Bank system connects to SFTP server via SSH key
  Uploads: BW0001_ALL_L702_M_20260331_1_1.txt
  To: /sftp/inbound/BW0001/

STEP 2: Automated pickup
  [System — SFTP Daemon] polls /sftp/inbound/ on schedule (default: 01:00 daily)
  Detects new file matching pattern {SRN}_ALL_{L/T}702_M_{CCYYMMDD}_{seq}_{seq}.txt
  Copies file to Cloud Storage: gs://mfcb-batches/{institution_id}/{batch_id}.txt
  Writes sftp_incoming_log record
  Triggers: same pipeline as POST /batches/file

  [System] Creates batch_uploads record, publishes Pub/Sub parse message
  [System] Writes audit_logs: SFTP_FILE_RECEIVED

STEP 3: Institution notified
  IF webhook configured:
    Webhook fires: event = batch.completed or batch.validation_failed

  IF no webhook:
    Institution User checks portal:

[Screen 3.1 — Batch Dashboard]
  New batch appears (channel = SFTP)
  User clicks to view status

[Screen 3.3 — Batch Status Detail]
  Same status / error flow as UJ-04 / UJ-05

  <Corrections needed?>
    Yes → Bank uploads corrected file with seq 2 to SFTP
         System picks up on next daemon run (or bank notifies Bureau Ops for expedited pickup)

✓ SFTP submission processed; same validation + ingestion pipeline as portal upload
```

---

## UJ-08 — Credit Report Request — Match Found

**Actor:** Institution User (credit analyst at bank)
**Trigger:** Customer applies for a loan; analyst requests credit check
**Preconditions:** Institution has `read:reports` permission; user logged in with MFA

```
[Screen 5.1 — Borrower Search]
  Analyst enters:
    Search type: OMANG
    Search value: 123456789
    Inquiry reason: CREDIT_APPLICATION
    Customer consent reference: CONS-2026-3847 (consent form reference number)
  Clicks "Search"

  [System — before search executes]
    Writes credit_inquiries record (immutable, regardless of result)
    Writes audit_logs: REPORT_REQUESTED

  {POST /credit-reports/search}
    [System] Validates Omang format
    [System] Searches borrowers + borrower_identifiers
    [System] Finds exact match → result = MATCH
    [System] Generates report_id
    [System] Assembles report from all bureau data sources

  Response: { result: "MATCH", report_id: "rpt_uuid" }

  <Institution's enabled_products covers data in report?>
    [System] Filters accounts to only account types in institution's enabled_products
    [System] Masks income (always null)
    [System] Masks Omang/passport (last 4 visible)

[Screen 5.2 — Credit Report View]
  Analyst sees:
    Identity section: MODISE, THABO, DOB: 1985-03-15, M, Omang: *****6789
    Address: 12 Khama Street, Gaborone
    Employment: Government of Botswana, Teacher (income masked)
    Account Summary: 3 active accounts, BWP 90,000 exposure, BWP 5,500/month
    Active Accounts table (3 rows)
    Closed Accounts table (1 row)
    Adverse Events: none
    Repayment History: 24-month grid — all current (0 months arrears)
    Inquiries: 2 prior inquiries from other institutions
    Contributing Institutions: 3 institutions

  Analyst reviews report; makes credit decision in bank system
  Optionally clicks "Download PDF"
  {GET /credit-reports/{report_id}/pdf}
  [System] Writes audit_logs: REPORT_PDF_DOWNLOADED

✓ Credit report retrieved. Inquiry permanently logged for audit.

  <Customer disputes report content after loan decision?>
    Analyst contacts Bureau Ops
    Bureau Ops investigates via UJ-11 (Data Correction)
```

---

## UJ-09 — Credit Report Request — No Match

**Actor:** Institution User
**Trigger:** New customer; no prior credit history expected

```
[Screen 5.1 — Borrower Search]
  Same form as UJ-08
  Analyst enters Omang: 987654321
  Clicks "Search"

  [System] Searches; finds no matching borrower record

  {POST /credit-reports/search}
    Response: { result: "NO_MATCH", inquiry_id: "inq_uuid" }

  [System] Still writes credit_inquiries (inquiry logged even for no-match)
  [System] Writes audit_logs: REPORT_REQUESTED (result: NO_MATCH)

[Screen 5.1] — result panel appears:
  "No credit record found for this borrower."
  Inquiry reference: inq_uuid

  Analyst notes: customer has no credit history with participating institutions
  Bank makes credit decision based on own criteria (no bureau adverse data)

  <Analyst believes match should exist (possible identity data issue)?>
    Analyst contacts Bureau Ops with inquiry_id
    Bureau Ops investigates in Screen 5.5 — Match Resolution
    [System] MATCH_REVIEW_REQUIRED flow (Manual resolution — UJ-10 handles this)

✓ No-match correctly handled. Inquiry audit trail maintained.
```

---

## UJ-10 — Bureau Ops — Batch Monitoring & Intervention

**Actor:** Bureau Ops
**Trigger:** Daily operations monitoring; alert fires; institution reports issue
**Preconditions:** Bureau Ops logged in with MFA

```
[Screen 6.1 — Ops Home Dashboard]
  Bureau Ops reviews morning dashboard:
    Alert: "FNB Botswana (BW0003) — batch submitted 3 days ago, status: VALIDATING (stuck)"
    Alert: "Stanbic Botswana (BW0004) — rejection rate 45% (threshold: 30%)"
    Alert: "BBS (BW0007) — no submission for March 2026 (due 15 April)"

  SCENARIO A: Stuck batch
    [Screen 6.3 — Batch Queue Monitor]
    Finds bat_uuid for BW0003 — stage: FIELD_VALIDATION, processing_time: 3 days
    Investigates: checks Cloud Function logs (Firebase console)
    Identifies: one chunk failed due to memory error on oversized row
    Clicks "Force Retry" for the stuck chunk
    [System] Re-queues the failed chunk message in Pub/Sub
    Batch resumes processing
    Writes audit_logs: BATCH_FORCE_RETRIED

  SCENARIO B: High rejection rate
    [Screen 3.1 — Batch Dashboard] (filtered to BW0004)
    Opens latest batch → Screen 3.4 Validation Errors
    Reviews: 45% rejection — all from INVALID_STATUS_FOR_ACCOUNT_TYPE
    Bulk of errors: status code 'N' used (Non-Performing) with account type V (Overdraft)
    Status 'N' not allowed for account type V per status_account_type_rules

    [Screen 6.4 — Institution Engagement]
    Bureau Ops logs note: "Stanbic using legacy CRB status code N for overdrafts.
                           Correct mapping: status code should be blank (0 MIA) or W/L.
                           Called John Doe (tech lead): fix ETA 20260520."
    Institution is flagged for follow-up

  SCENARIO C: Missing submission
    [Screen 4.2 — Submission Compliance Monitor]
    Calendar shows BBS (BW0007) — red cell for March 2026
    Bureau Ops emails contact from institution profile
    Logs note in Screen 6.4
    <No response after 5 days?>
      Escalates to Compliance Officer via internal process

  SCENARIO D: Multiple resubmissions (>3 for same month)
    [Screen 4.3 — Resubmission History]
    BW0008 has submitted seq 1, 2, 3, 4 — still 20% rejection rate
    Bureau Ops schedules call with institution's tech team
    Offers to review their extract mapping file against Form G spec
    Logs all interactions in Screen 6.4

✓ Bureau Ops resolves operational issues; institutions corrected or engaged
```

---

## UJ-11 — Data Correction Post-Ingestion

**Actor:** Bureau Ops (initiator) + Super Admin (approver)
**Trigger:** Institution reports data error in accepted record; dispute investigation; regulatory directive
**Preconditions:** Error proven factually incorrect; original submission identified

```
[Screen 4.4 — Manual Data Correction Request]

  Bureau Ops locates record:
    Enters batch_id (from institution) OR raw_record_id
    System retrieves original submitted values from raw_submission_records

  Bureau Ops fills correction form:
    Batch ID: bat_uuid (read-only)
    Row Number: 145 (read-only)
    Field to Correct: omang_id_number
    Original Value: 987654321 (read-only — from raw_submission_records)
    Corrected Value: 876543210
    Correction Reason: "Consumer submitted correct Omang during dispute;
                        original extract truncated leading digit. See dispute ref: DISP-2026-0047"
    Supporting Reference: DISP-2026-0047

  Clicks "Submit for Approval"
  [System] Creates compensating raw_submission_records row (is_correction=TRUE)
  [System] Routes to approval queue
  [System] Notifies Super Admin

  --- Super Admin approval ---
  Super Admin receives notification
  [Screen 4.4 — Correction Approval View]
    Reviews: original value, corrected value, reason, supporting reference
    <Same person as submitter?>
      Yes → Cannot approve own correction (maker-checker)
    Clicks "Approve Correction"
    Re-authenticates with MFA (step-up auth for elevated action)
    {PATCH correction — approve}
    [System] Writes audit_logs: DATA_CORRECTION_APPROVED (before/after values, both actors)
    [System] Triggers re-mastering for affected borrower_id
    [System] Updates credit_accounts, borrowers with corrected values
  --- End approval ---

  Institution notified of correction completion
  New credit report inquiry will reflect corrected data

✓ Correction applied with full immutable audit trail. Original data preserved.
```

---

## UJ-12 — Compliance Officer — Monthly Review

**Actor:** Compliance Officer
**Trigger:** Month-end regulatory review cycle (typically first week of following month)
**Preconditions:** Compliance Officer logged in with MFA

```
[Screen 6.2 — Compliance Dashboard]

  TASK 1: Submission compliance check
    Reviews: "Submission Compliance" tab
    Checks: all active institutions submitted for prior month-end
    <Any missing?>
      Yes → Flags institution; generates note for Bureau Ops
            Prepares list for regulatory disclosure if required
    Checks: institutions with >5% rejection rate (systemic data quality issues)
    Checks: institutions with 3+ consecutive late submissions

  TASK 2: Inquiry audit review
    Reviews: "Inquiry Compliance" tab
    Checks: all inquiries have consent references (should be 0 without)
    <Any inquiries without consent_reference?>
      Yes → Escalates to Super Admin; may require institution warning letter
    Reviews: top inquiry reasons — flags unusual volume spikes
    <Any institution exceeding inquiry rate threshold?>
      Yes → Security event logged; Compliance initiates investigation

  TASK 3: Data quality trend
    Reviews: "Data Quality" tab
    Checks: fields with >10% error rate (systemic extract issue)
    Documents findings for quarterly regulatory report

  TASK 4: Generate regulatory report
    [Screen 8.3 — Regulatory Reporting Export]
    Selects report: "Monthly Submission Summary"
    Sets date range: March 2026
    Clicks "Generate"
    {POST /audit/logs/export} (with regulatory_reports scope)
    [System] Writes audit_logs: REGULATORY_REPORT_EXPORTED
    Downloads PDF for submission to Bank of Botswana / NBFIRA

✓ Monthly compliance review complete; findings documented; report generated
```

---

## UJ-13 — Auditor — Audit Log Review

**Actor:** External or internal Auditor
**Trigger:** Periodic audit engagement; regulatory request; incident investigation
**Preconditions:** Auditor logged in with MFA; audit:read scope granted

```
[Screen 8.1 — Audit Log Viewer]

  SCENARIO A: Trace a specific batch submission
    Filters: action = BATCH_SUBMITTED, institution = FNB Botswana, date = March 2026
    Finds batch submission record: actor, timestamp, correlation_id, IP
    Expands detail: raw payload metadata, file hash
    Traces forward: finds BATCH_FILE_PARSED, VALIDATION_COMPLETE, BATCH_COMPLETED events
    All linked by correlation_id

  SCENARIO B: Verify no data was altered
    Filters: action = DATA_CORRECTION_APPROVED
    Reviews: all corrections — original values, corrected values, actor, approver
    Verifies: no correction has same initiator and approver (maker-checker)

  SCENARIO C: Review credit report inquiries for a period
    [Screen 5.4 — Inquiry Audit Trail]
    Filters: date range, institution
    Verifies: every inquiry has inquiry_reason populated
    Verifies: no inquiry without customer_consent_reference (unless exempt reason)

  SCENARIO D: Security event review
    [Screen 8.2 — Security Event Log]
    Filters: event_category = SECURITY, date range
    Reviews: AUTH_FAILURE events (normal pattern vs. suspicious burst)
    Identifies: one CROSS_INSTITUTION_ATTEMPT event — Institution A attempted to access B's batch
    Escalates to Super Admin for investigation

  TASK: Export audit log for regulators
    Clicks "Export Audit Log"
    Selects filters + format (CSV)
    {POST /audit/logs/export}
    [System] Writes audit_logs: AUDIT_EXPORT (the export itself is audited)
    Downloads file

✓ Audit completed. Evidence chain intact; immutable records verified.
```

---

## UJ-14 — New Institution User Invitation

**Actor:** Institution Admin
**Trigger:** New staff member needs platform access
**Preconditions:** Institution Admin logged in; institution has user slots

```
[Screen 9.1 — User List]
  Institution Admin clicks "Invite User"

[Screen 9.2 — Invite Form]
  Enters: Full Name, Email, Role (Institution Admin or Institution User)
  <Email already registered?>
    Yes → "A user with this email already exists"
    No  → Continue
  Clicks "Send Invite"

  [System] Creates users record: status = PENDING_INVITE
  [System] Generates invite token (SHA-256 random, 60 min expiry)
  [System] Sends invite email with signup URL
  [System] Writes audit_logs: USER_INVITED

  New user receives email; completes UJ-01 (First-Time Login & MFA Setup)

  <Invite not used within 60 min?>
    Institution Admin sees status = INVITE_EXPIRED in user list
    Clicks "Resend Invite"
    [System] Generates new token; sends new email

✓ User onboarded; MFA-enrolled; ready to submit batches or request reports
```

---

## UJ-15 — Bank Sandbox Certification

**Actor:** Institution Admin (bank) + Bureau Ops (MFCB)
**Trigger:** Institution is ACTIVE (sandbox); ready to go LIVE
**Preconditions:** UJ-02 and UJ-03 complete; sandbox credentials working

```
[Screen 6.5 — Sandbox / Certification Centre]

  Bureau Ops opens certification checklist for institution

  SCENARIO 1: Clean TEST batch
    Institution submits TEST file with ≥100 records
    {POST /batches/file} with file_type = TEST
    <All records accepted?>
      No  → Institution corrects (UJ-05 flow); Bureau Ops marks FAIL
      Yes → Bureau Ops marks PASS

  SCENARIO 2: Validation error receipt + remediation
    Bureau Ops provides deliberately flawed test file to institution
    Institution submits; reviews errors in Screen 3.4
    Institution corrects; resubmits with seq 2
    <Clean resubmission?>
      Yes → Bureau Ops marks PASS

  SCENARIO 3: Header/trailer mismatch
    Institution submits file with trailer record_count ≠ actual row count
    [System] Rejects file at file-level: HEADER_RECORD_COUNT_MISMATCH
    Institution confirms they received the error; understands file-level rejection
    Bureau Ops marks PASS

  SCENARIO 4: Duplicate submission rejection
    Institution re-submits same LIVE sequence for same month
    <System returns 409 DUPLICATE_LIVE_SUBMISSION?>
      Yes → Institution confirms understanding; marks PASS

  SCENARIO 5: Credit report — known match
    Bureau Ops provides test borrower Omang (seeded in sandbox)
    Institution submits {POST /credit-reports/search} with consent reference
    <Match returned with full report?>
      Yes → Institution reviews report sections; marks PASS

  SCENARIO 6: Credit report — no match
    Institution searches for non-existent Omang
    <NO_MATCH returned with inquiry logged?>
      Yes → PASS

  SCENARIO 7: Access isolation
    Institution A attempts: {GET /batches/{batch_id_from_institution_B}}
    <Returns 403 FORBIDDEN?>
      Yes → PASS

  SCENARIO 8: Webhook receipt (if configured)
    Bureau Ops triggers test webhook: {POST /webhooks/batch-status/test}
    Institution confirms receipt and signature verification
    PASS

  <All scenarios PASS?>
    No  → Continue remediation; re-test failed scenarios
    Yes →
      Bureau Ops clicks "Enable LIVE Submissions" in institution profile
      [System] Removes TEST-only restriction
      [System] Writes audit_logs: INSTITUTION_CERTIFIED_FOR_LIVE
      Institution Admin notified: "Your institution is now authorised for live submissions"

  First LIVE submission:
    Bureau Ops monitors in Screen 6.1 / 6.3
    Confirms first accepted records visible in bureau master store
    Reconciles accepted/rejected counts with institution
    Archives certification evidence

✓ Institution certified. Live data flowing. Bureau and bank teams confirm go-live.
```

---

## Journey Cross-Reference

| Journey | Key Screens | Key Endpoints | Audit Events |
|---------|------------|---------------|--------------|
| UJ-01 | 1.1, 1.2, 1.4 | /auth/login, /auth/mfa-enroll | LOGIN_SUCCESS, MFA_ENROLLED |
| UJ-02 | 2.1, 2.3, 9.4 | POST /institutions, POST /api-clients | INSTITUTION_CREATED, API_CLIENT_CREATED |
| UJ-03 | 2.2, 2.5, 2.6 | /oauth/token, /webhooks/test | TOKEN_ISSUED, WEBHOOK_TEST_SENT |
| UJ-04 | 3.1, 3.2, 3.3, 3.5 | POST /batches/file, GET /batches/{id} | BATCH_FILE_UPLOADED, BATCH_COMPLETED |
| UJ-05 | 3.4, 3.2 | GET /batches/{id}/errors | BATCH_VALIDATION_FAILED, ERROR_TEMPLATE_DOWNLOADED |
| UJ-06 | — (API only) | /oauth/token, POST /batches, GET /batches/{id} | TOKEN_ISSUED, BATCH_SUBMITTED |
| UJ-07 | 3.1, 3.3 | (SFTP trigger → /batches/file pipeline) | SFTP_FILE_RECEIVED |
| UJ-08 | 5.1, 5.2 | POST /credit-reports/search, GET /credit-reports/{id} | REPORT_REQUESTED, REPORT_RETRIEVED |
| UJ-09 | 5.1 | POST /credit-reports/search | REPORT_REQUESTED (NO_MATCH) |
| UJ-10 | 6.1, 6.3, 6.4, 3.4 | GET /batches/{id}/errors | BATCH_FORCE_RETRIED |
| UJ-11 | 4.4 | PATCH /corrections/{id}/approve | CORRECTION_REQUESTED, DATA_CORRECTION_APPROVED |
| UJ-12 | 6.2, 8.3 | POST /audit/logs/export | REGULATORY_REPORT_EXPORTED |
| UJ-13 | 8.1, 8.2, 5.4 | GET /audit/logs, POST /audit/logs/export | AUDIT_EXPORT |
| UJ-14 | 9.1, 9.2 | POST /portal/auth/invite | USER_INVITED, USER_REGISTERED |
| UJ-15 | 6.5, 3.3, 5.1, 5.2 | Full test suite | INSTITUTION_CERTIFIED_FOR_LIVE |
