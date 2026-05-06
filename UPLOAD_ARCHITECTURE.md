# MFCB Platform — File Upload & Verification Management Architecture

> Version 1.0 | 2026-05-06
> Runtime: Firebase (Cloud Functions v2, Pub/Sub, Cloud Storage, Firestore)
> Processing model: Serverless fan-out / fan-in for parallel row-level validation

---

## 1. Design Principles

| Principle | Rationale |
|-----------|-----------|
| Immutability | Every submitted row persisted before any validation; original data never overwritten |
| Idempotency | All functions safe to re-execute on retry; deduplication via batch_id + chunk_id + row_id |
| Parallelism | Rows validated in parallel chunks (500 rows/chunk); 1,000-row file = 2 concurrent functions |
| Isolation | Each institution's data processed in isolated execution context |
| Observability | Every stage writes status to Firestore; clients poll or receive real-time updates |
| Backpressure | Pub/Sub message acknowledgement only on success; failed messages retry with exponential backoff |
| Auditability | Audit log entries written at every stage boundary |

---

## 2. High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        INGESTION LAYER                              │
│                                                                     │
│  Portal Upload          REST API              SFTP                  │
│  (multipart form)       (JSON payload)        (daemon pickup)       │
│       │                      │                     │               │
│       └──────────────────────┼─────────────────────┘               │
│                              │                                      │
│                    API Gateway / Cloud Run                          │
│                    (auth, rate limit, routing)                      │
│                              │                                      │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
   Cloud Storage        batch_uploads         Firestore
   gs://mfcb-batches/   (Postgres/main DB)    batches/{batch_id}
   {institution_id}/    [status=QUEUED]       [status=QUEUED]
   {batch_id}.{ext}                           [stage=RECEIVED]

          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    STAGE 1: PARSE & TRIAGE                          │
│                                                                     │
│  Trigger: Cloud Storage finalise event (onObjectFinalized)          │
│  Function: fn-parse-batch                                           │
│  Runtime: Firebase Functions v2, Node.js 20, 4GB RAM, 540s timeout │
└─────────────────────────────────────────────────────────────────────┘
          │
          │  ┌─── Pub/Sub: mfcb-chunk-validate
          │  │    (1 message per 500-row chunk)
          ▼  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    STAGE 2: PARALLEL VALIDATION                     │
│                                                                     │
│  Trigger: Pub/Sub subscription on mfcb-chunk-validate               │
│  Function: fn-validate-chunk (N instances run concurrently)         │
│  Runtime: Firebase Functions v2, Node.js 20, 2GB RAM, 300s timeout │
│  Max concurrency: 500 function instances per topic                  │
└─────────────────────────────────────────────────────────────────────┘
          │
          │  Writes to:
          │  ├── validation_errors (Postgres — batch insert)
          │  ├── Firestore: batches/{batch_id}/chunks/{chunk_id}
          │  └── Firestore: batches/{batch_id}/progress counter
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    STAGE 3: AGGREGATION                             │
│                                                                     │
│  Trigger: Firestore onWrite on batches/{batch_id}/progress          │
│           when completed_chunks == total_chunks                     │
│  Function: fn-aggregate-batch                                       │
└─────────────────────────────────────────────────────────────────────┘
          │
          │  ┌─── Pub/Sub: mfcb-master-records
          │  │    (1 message per accepted record, or per chunk)
          ▼  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    STAGE 4: DATA MASTERING                          │
│                                                                     │
│  Trigger: Pub/Sub subscription on mfcb-master-records              │
│  Function: fn-master-records                                        │
│  Runtime: Firebase Functions v2, 4GB RAM, 540s timeout             │
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    STAGE 5: COMPLETION & NOTIFICATION               │
│                                                                     │
│  Trigger: fn-aggregate-batch signals completion                     │
│  Function: fn-notify-completion                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Stage 1 — Parse & Triage (`fn-parse-batch`)

### Trigger
```
Cloud Storage: onObjectFinalized
Bucket: gs://mfcb-batches-{env}
Object path: {institution_id}/{batch_id}/{filename}
```

For JSON API submissions (no file), the API gateway directly publishes a `mfcb-batch-json-received` Pub/Sub message containing the payload — same function handles both paths.

### Responsibilities

1. **Retrieve batch metadata** from Firestore `batches/{batch_id}` (written by API gateway before enqueue)
2. **File integrity checks**
   - Verify SHA-256 hash matches value stored at upload time
   - Check file size within limits
3. **Virus scan verification** (Cloud Security Command Center result; if not passed → quarantine)
4. **File parsing**
   - Detect format: fixed-length text, CSV, Excel
   - Fixed-length: read record at defined offsets per Form G layout (field positions from DATA_DICTIONARY.md)
   - CSV / Excel: map columns to Form G JSON keys
5. **Header record validation (H)**
   - `record_type = H`
   - `supplier_reference_number` matches `batch_uploads.supplier_reference_number`
   - `month_end_date` (CCYYMMDD) matches `batch_uploads.reporting_month`
   - `version_number` = `01` (or current)
   - `file_creation_date` valid CCYYMMDD
6. **Trailer record validation (T)**
   - `record_type = T`
   - `number_of_records` == actual data record count
   - If mismatch → write `HEADER_RECORD_COUNT_MISMATCH` to `validation_errors`; set batch FAILED
7. **Persist raw records** (batch insert to `raw_submission_records`)
   - Every data row stored immutably before any further processing
   - `raw_payload` = JSON representation of all fields
8. **Chunk creation**
   - Split rows into chunks of 500
   - Total chunks = `ceil(total_records / 500)`
9. **Initialise progress tracking** in Firestore:
   ```
   batches/{batch_id}/
     status: "VALIDATING"
     stage: "CHUNK_VALIDATION"
     total_records: 1200
     total_chunks: 3
     completed_chunks: 0
     accepted_count: 0
     rejected_count: 0
     warning_count: 0
   ```
10. **Publish chunk messages** to Pub/Sub `mfcb-chunk-validate` — one per chunk

### Chunk Message Schema
```json
{
  "batch_id": "bat_uuid",
  "institution_id": "inst_uuid",
  "chunk_id": "bat_uuid_chunk_001",
  "chunk_index": 0,
  "total_chunks": 3,
  "reporting_month": "20260331",
  "rows": [
    {
      "raw_record_id": "rec_uuid_001",
      "row_number": 1,
      "fields": { /* FormGRecord JSON */ }
    }
  ]
}
```

### Error Handling
- **File-level failure** (bad header/trailer, virus, hash mismatch): write errors to `validation_errors`, update `batch_uploads.status = FAILED`, do NOT publish chunk messages
- **Parse error** (malformed Excel/CSV): same — FAILED at file level
- **Function timeout**: Cloud Storage trigger auto-retries; idempotency key (batch_id + file hash) prevents double processing

### Firestore State After Stage 1
```
batches/{batch_id}: { status: "VALIDATING", stage: "CHUNK_VALIDATION", total_chunks: 3 }
```

---

## 4. Stage 2 — Parallel Validation (`fn-validate-chunk`)

### Trigger
```
Pub/Sub: mfcb-chunk-validate
Subscription: validate-chunk-sub
Max delivery attempts: 5
Acknowledgement deadline: 300 s
```

### Concurrency Model
- Firebase Functions v2 allows multiple instances per subscription
- Each chunk message processed by a separate function instance
- For 10,000 rows: 20 chunks → 20 function instances run in parallel
- For 100,000 rows: 200 chunks → 200 concurrent instances

### Validation Order (per row, all checks sequential within a row)

```
LAYER 1 — Format & Length
  For each field in row:
    Check field length ≤ defined max length (from Form G layout)
    Check alpha fields: only [A-Z], [-], ['], [ ] or specified chars
    Check numeric fields: only [0-9]
    Check CCYYMMDD dates: valid calendar date

LAYER 2 — Mandatory Field Presence
  Check all M-status fields present and non-blank
  Check conditional fields present when trigger condition true:
    - passport_number present IF omang_id_number blank
    - deferred_payment_start_date present IF payment_type = "02"
    - status_date present IF status_code not in (B,C,D,P,S,T,U,V,Y,Z)
    - third_party_name present IF status_code = "A"
    - no_of_participants > 0 IF account_ownership_type = "02"
    - loan_term > 0 IF account_type IN (D,H,I,N,P,T,Y)
    - income_frequency present IF income > 0

LAYER 3 — Reference Table Checks
  For each code field:
    Look up reference_codes (pre-loaded into function memory at cold start)
    Check code exists for the relevant code_type
    Check code not deprecated as of reporting_month

LAYER 4 — Domain-Specific Rules
  Omang: is_string_numeric AND length=9 AND char[4] IN ('1','2')
         AND NOT IN ('000000000','111111111','222222222','333333333')
  Passport: alphanumeric, ≤16 chars
  Surname: >2 chars; contains vowel (A/E/I/O/U/Y); valid chars
  Dates: not in future; not before date_account_opened;
         last_payment_date not >36 months before month-end
         last_payment_date not >60 months before month-end (prescription)
  Phone: 10 digits exactly; numeric; not zero-filled
  Email: contains @; TLD not starting with '.'; char before '@'

LAYER 5 — Financial Logic
  opening_balance rules by account_type and status_code
  current_balance rules by account_type and status_code
  instalment = 0 if status IN (C,P,V,T)
  amount_overdue = 0 if status IN (C,P,T,V)
  if months_in_arrears > 0 THEN amount_overdue mandatory
  if months_in_arrears > 0 THEN amount_overdue > 0
  current_balance_indicator = C THEN months_in_arrears = 00

LAYER 6 — Status Code Rules
  Look up status_account_type_rules for (account_type, status_code) combination
  is_allowed_monthly must be TRUE

LAYER 7 — Cross-Field Rules
  status_code = A → third_party_name not blank AND account_sold_to_third_party = "01"
  payment_type = 02 → deferred_payment_start_date > month_end_date
  payment_type = 02 → deferred_payment_start_date ≤ 23 months after month_end_date
  account_ownership_type = 02 → no_of_participants > 0
```

### Duplicate Detection (within chunk + cross-chunk)

**Within-chunk duplicates:** Check each row's unique key (SRN + account_number + sub_account_number + branch_code) against other rows in same chunk.

**Cross-chunk duplicates:** Before publishing chunk messages (in Stage 1), `fn-parse-batch` writes all unique keys to Firestore `batches/{batch_id}/account_keys/{key_hash}`. Each `fn-validate-chunk` instance checks Firestore for collisions atomically using Firestore transactions.

```
Firestore transaction:
  Read: batches/{batch_id}/account_keys/{sha256(SRN+acct+sub+branch)}
  If exists → write DUPLICATE_ACCOUNT_KEY error
  If not exists → write key (with raw_record_id)
```

### Writing Errors (Batch Insert)

After processing all rows in chunk, function performs ONE batch write:

```javascript
// Postgres batch insert — all errors for chunk at once
await db.transaction(async (trx) => {
  if (errors.length > 0) {
    await trx('validation_errors').insert(errors);
  }
  if (acceptedRows.length > 0) {
    // Stage accepted raw_record_ids for mastering
    await trx('accepted_records_staging').insert(acceptedRows.map(r => ({
      raw_record_id: r.raw_record_id,
      batch_id: r.batch_id,
      chunk_id: chunkId
    })));
  }
});
```

### Chunk Completion — Firestore Counter Update

After batch write succeeds, function updates Firestore using an atomic increment:

```javascript
// Firestore atomic counter — safe for concurrent function instances
await firestore.runTransaction(async (t) => {
  const batchRef = firestore.doc(`batches/${batchId}`);
  const batchDoc = await t.get(batchRef);
  const current = batchDoc.data();

  t.update(batchRef, {
    completed_chunks: FieldValue.increment(1),
    accepted_count: FieldValue.increment(chunkAcceptedCount),
    rejected_count: FieldValue.increment(chunkRejectedCount),
    warning_count: FieldValue.increment(chunkWarningCount),
    // Store per-chunk result for debugging
    [`chunks.${chunkId}`]: {
      status: 'COMPLETE',
      accepted: chunkAcceptedCount,
      rejected: chunkRejectedCount,
      completed_at: FieldValue.serverTimestamp()
    }
  });
});
```

### Message Acknowledgement

- Function acknowledges Pub/Sub message ONLY after Firestore + Postgres writes succeed
- If either write fails: function throws → Pub/Sub retries with exponential backoff
- Retry schedule: 10s, 30s, 90s, 270s, 810s
- After 5 delivery attempts: message goes to dead-letter topic `mfcb-chunk-validate-dlq`
- DLQ triggers alert to Bureau Ops (Screen 6.3 shows stuck chunk)

### Idempotency

Each chunk message includes `chunk_id`. Before processing:
```javascript
const chunkStatusDoc = await firestore.doc(`batches/${batchId}/chunks/${chunkId}`).get();
if (chunkStatusDoc.exists && chunkStatusDoc.data().status === 'COMPLETE') {
  // Already processed — ack message and exit
  return;
}
```

---

## 5. Stage 3 — Aggregation (`fn-aggregate-batch`)

### Trigger
```
Firestore: onDocumentUpdated
Path: batches/{batch_id}
Condition: when completed_chunks == total_chunks
```

### Responsibilities

1. **Verify completion**: double-check all chunk statuses = COMPLETE in Firestore
2. **Compile final counts**: read `accepted_count`, `rejected_count`, `warning_count` from Firestore
3. **Update main database**: write final counts + status to `batch_uploads` (Postgres)
4. **Determine batch outcome**:
   - `rejected_count = 0` → status = COMPLETED_CLEAN
   - `rejected_count > 0 AND accepted_count > 0` → status = COMPLETED_WITH_ERRORS
   - `accepted_count = 0` → status = COMPLETED_ALL_REJECTED
   - File-level failure → status = FAILED (set in Stage 1; aggregation skips)
5. **Publish mastering messages** to `mfcb-master-records` for accepted rows
6. **Update Firestore batch status** to MASTERING
7. **Write audit log**: action = BATCH_VALIDATION_COMPLETE

### Mastering Message Schema

```json
{
  "batch_id": "bat_uuid",
  "institution_id": "inst_uuid",
  "reporting_month": "20260331",
  "mastering_chunk_id": "master_bat_uuid_001",
  "records": [
    {
      "raw_record_id": "rec_uuid",
      "row_number": 1,
      "fields": { /* accepted FormGRecord */ }
    }
  ]
}
```

Mastering chunks: 200 records per message (smaller than validation chunks — mastering has more DB work).

---

## 6. Stage 4 — Data Mastering (`fn-master-records`)

### Trigger
```
Pub/Sub: mfcb-master-records
Subscription: master-records-sub
```

### Responsibilities

For each accepted record in chunk, within a single Postgres transaction:

#### 6.1 Borrower Identity Resolution

```
1. Look up borrowers by omang_id_number OR passport_number
2. <Exact match found?>
     Yes → Use existing borrower_id; continue to step 4
     No  →
3. <Fuzzy match? (surname + DOB + at least one ID token)>
     Yes → Flag MATCH_REVIEW_REQUIRED; write to pending_matches for Bureau Ops
           Store record; do not create new borrower yet
     No  → Create new borrowers record; assign new borrower_id
4. Upsert borrower_identifiers (insert new identifier if changed/added)
5. Upsert borrower_addresses (insert if changed vs. last submission)
6. Upsert borrower_employment (insert for reporting_month)
```

#### 6.2 Account Upsert

```
Unique key: institution_id + account_number + sub_account_number + branch_code

1. SELECT credit_account_id WHERE unique key matches
2. <Account exists?>
     No  → INSERT credit_accounts (new account)
     Yes → UPDATE credit_accounts with latest financial fields and status
3. Insert repayment_history record for this reporting_month
   (one row per account per reporting_month — idempotent via ON CONFLICT DO UPDATE)
4. IF status_code present AND different from last month:
     INSERT account_status_events
```

#### 6.3 Transaction Isolation

All 200 records in a mastering chunk processed in one Postgres transaction. If transaction fails:
- Roll back entire chunk
- Pub/Sub retries the chunk message
- Idempotency: `ON CONFLICT DO UPDATE` prevents double inserts on retry

```sql
-- Example: upsert credit_accounts
INSERT INTO credit_accounts (
  institution_id, borrower_id, branch_code, account_number, sub_account_number,
  account_type, opening_balance_or_credit_limit, current_balance, ...
)
VALUES (...)
ON CONFLICT (institution_id, account_number, sub_account_number, branch_code)
DO UPDATE SET
  current_balance = EXCLUDED.current_balance,
  months_in_arrears = EXCLUDED.months_in_arrears,
  amount_overdue = EXCLUDED.amount_overdue,
  instalment_amount = EXCLUDED.instalment_amount,
  status_code = EXCLUDED.status_code,
  status_date = EXCLUDED.status_date,
  last_reporting_month = EXCLUDED.last_reporting_month,
  updated_at = NOW()
WHERE credit_accounts.last_reporting_month < EXCLUDED.last_reporting_month;
-- Prevents older batch from overwriting newer data
```

---

## 7. Stage 5 — Completion & Notification (`fn-notify-completion`)

### Trigger
```
Pub/Sub: mfcb-batch-complete
Published by: fn-aggregate-batch when mastering chunk counter = total_mastering_chunks
```

### Responsibilities

1. **Final batch_uploads update**: status = COMPLETED; `completed_at` = now
2. **Firestore update**: `batches/{batch_id}.status = COMPLETED`
3. **Webhook delivery**: if institution has active webhook config
   ```json
   {
     "event": "batch.completed",
     "batch_id": "...",
     "institution_id": "...",
     "reporting_month": "20260331",
     "status": "COMPLETED",
     "accepted_count": 1200,
     "rejected_count": 50,
     "warning_count": 5,
     "timestamp": "2026-05-06T10:03:22Z",
     "signature": "HMAC-SHA256=abc123..."
   }
   ```
4. **Write audit log**: action = BATCH_COMPLETED
5. **Update data quality metrics**: increment institution quality score in analytics table
6. **Portal real-time update**: Firestore change propagates to portal via real-time listener

---

## 8. Real-Time Status Updates (Portal)

Portal clients subscribe to Firestore document for live batch status:

```javascript
// Portal frontend (React / Next.js)
const unsubscribe = firestore
  .doc(`batches/${batchId}`)
  .onSnapshot((doc) => {
    const data = doc.data();
    setBatchStatus(data.status);
    setBatchStage(data.stage);
    setProgress({
      completed: data.completed_chunks,
      total: data.total_chunks,
      accepted: data.accepted_count,
      rejected: data.rejected_count
    });
    if (data.status === 'COMPLETED' || data.status === 'FAILED') {
      unsubscribe(); // Stop listening once terminal state reached
    }
  });
```

Firestore document structure (real-time read model):
```
batches/{batch_id}/
  status: "VALIDATING" | "MASTERING" | "COMPLETED" | "FAILED"
  stage: "CHUNK_VALIDATION" | "AGGREGATION" | "MASTERING" | "NOTIFICATION"
  total_records: 1200
  total_chunks: 3
  total_mastering_chunks: 6
  completed_chunks: 2
  completed_mastering_chunks: 0
  accepted_count: 850
  rejected_count: 50
  warning_count: 5
  updated_at: Timestamp
  chunks/
    {chunk_id}/
      status: "COMPLETE" | "PROCESSING" | "FAILED"
      accepted: 500
      rejected: 0
      completed_at: Timestamp
```

---

## 9. Firebase Function Definitions

### Function Registry

| Function Name | Trigger | Memory | Timeout | Max Instances | Region |
|--------------|---------|--------|---------|---------------|--------|
| `fn-parse-batch` | Cloud Storage finalise | 4 GB | 540 s | 50 | africa-south1 |
| `fn-validate-chunk` | Pub/Sub: mfcb-chunk-validate | 2 GB | 300 s | 500 | africa-south1 |
| `fn-aggregate-batch` | Firestore onWrite: batches/{id} | 1 GB | 120 s | 10 | africa-south1 |
| `fn-master-records` | Pub/Sub: mfcb-master-records | 4 GB | 540 s | 200 | africa-south1 |
| `fn-notify-completion` | Pub/Sub: mfcb-batch-complete | 512 MB | 60 s | 20 | africa-south1 |
| `fn-sftp-pickup` | Cloud Scheduler (cron: 0 1 * * *) | 1 GB | 300 s | 1 | africa-south1 |
| `fn-webhook-deliver` | Pub/Sub: mfcb-webhook-outbound | 512 MB | 30 s | 100 | africa-south1 |
| `fn-dlq-alert` | Pub/Sub: mfcb-chunk-validate-dlq | 256 MB | 30 s | 5 | africa-south1 |

### Environment Variables per Function

```
POSTGRES_CONNECTION_STRING   — Cloud SQL (Postgres) connection string via Secret Manager
FIRESTORE_PROJECT_ID         — Firebase project ID
VIRUS_SCAN_API_KEY           — Cloud Security Command Center or third-party AV API key
INTERNAL_HMAC_KEY            — For signing internal Pub/Sub messages
WEBHOOK_SIGNING_KEY_VAULT    — Secret Manager path for per-institution HMAC keys
AUDIT_LOG_TABLE              — "audit_logs" (Postgres table name)
CHUNK_SIZE                   — "500" (rows per validation chunk)
MASTERING_CHUNK_SIZE         — "200" (records per mastering chunk)
MAX_FILE_SIZE_BYTES          — "52428800" (50 MB)
ALLOWED_FILE_EXTENSIONS      — "txt,csv,xlsx"
```

---

## 10. Pub/Sub Topic & Subscription Configuration

| Topic | Subscription | Ack Deadline | Max Delivery | Retry Policy | Dead Letter Topic |
|-------|-------------|-------------|-------------|-------------|-------------------|
| `mfcb-chunk-validate` | `validate-chunk-sub` | 300 s | 5 | Exp backoff 10s–810s | `mfcb-chunk-validate-dlq` |
| `mfcb-master-records` | `master-records-sub` | 540 s | 5 | Exp backoff 10s–810s | `mfcb-master-records-dlq` |
| `mfcb-batch-complete` | `notify-completion-sub` | 60 s | 3 | Exp backoff 5s–60s | `mfcb-batch-complete-dlq` |
| `mfcb-webhook-outbound` | `webhook-deliver-sub` | 30 s | 10 | Exp backoff 30s–270s | `mfcb-webhook-dlq` |

**Message ordering:** NOT enabled (parallel execution requires no ordering guarantee).
**Message retention:** 7 days (allows replay for disaster recovery).

---

## 11. Cloud Storage Bucket Structure

```
gs://mfcb-batches-prod/
  {institution_id}/
    {batch_id}/
      original/
        {filename}            ← Original uploaded file (immutable)
      processed/
        chunks/
          chunk_001.json      ← Parsed chunk (for debugging)
          chunk_002.json
      exports/
        rejected_rows.csv     ← Generated error export
        accepted_keys.csv     ← Reconciliation export

gs://mfcb-batches-quarantine/
  {institution_id}/
    {batch_id}/
      {filename}              ← Files failing virus scan or file-level validation

gs://mfcb-sftp-inbox/
  {institution_id}/
    pending/
      {filename}              ← SFTP-dropped files awaiting processing
    processed/
      {filename}              ← Moved after successful parse trigger
```

**Bucket settings:**
- Versioning: enabled (object history retained 90 days)
- Uniform bucket-level IAM (no per-object ACLs)
- Encryption: Google-managed encryption keys (CMEK for production)
- Lifecycle: delete `processed/` objects after 365 days; `quarantine/` after 90 days

---

## 12. Scale Analysis

### Throughput Model

| Scenario | Records | Chunks | Parallel Functions | Est. Wall Clock Time |
|----------|---------|--------|--------------------|----------------------|
| Small MFI | 500 | 1 | 1 | ~30 s |
| Mid-size bank | 5,000 | 10 | 10 | ~45 s |
| Large bank | 50,000 | 100 | 100 | ~90 s |
| Tier-1 bank | 100,000 | 200 | 200 | ~120 s |
| Month-end peak (all institutions) | 500,000 | 1,000 | 500* | ~5–8 min |

*Firebase Functions default limit 1,000 instances per project; configurable up to 3,000.

### Cost Optimisation

- Cold start minimised: validation rules (reference_codes) loaded once per function cold start, cached in module scope
- Postgres connection pooling via Cloud SQL Proxy + pg-pool (max 10 connections per function instance)
- Firestore reads minimised: reference tables cached in function memory, refreshed on cold start
- Large files (>10,000 rows): Cloud Storage streaming parse (do not load entire file into memory)

### Bottlenecks and Mitigations

| Bottleneck | Mitigation |
|-----------|-----------|
| Postgres connection exhaustion at peak | Connection pool + PgBouncer sidecar on Cloud SQL |
| Firestore write rate limit (1 write/s per document) | Distributed counters (10 sub-documents, sum on read) |
| Pub/Sub message size limit (10 MB) | Chunks stored in Cloud Storage; message contains only GCS path reference for large rows |
| Cold start latency for fn-validate-chunk | Minimum instances = 5 (keep-warm); reduces cold start from 3–5 s to 0 |
| Cross-chunk duplicate detection race condition | Firestore transaction with row-level locking on account_keys sub-collection |

---

## 13. Dead Letter Queue (DLQ) Handling

```
mfcb-chunk-validate-dlq
  └─► fn-dlq-alert
        ├── Updates Firestore: batches/{batch_id}/chunks/{chunk_id}.status = "DLQ"
        ├── Updates batch_uploads.status = "PARTIAL_FAILURE" (if some chunks succeeded)
        ├── Writes audit_logs: CHUNK_PROCESSING_FAILED
        ├── Creates alert in security_alerts for Bureau Ops (Screen 6.3)
        └── Sends notification to Bureau Ops email

Bureau Ops action:
  Screen 6.3 — Batch Queue Monitor
    Sees stuck chunk with status DLQ
    Reviews error detail (from fn-dlq-alert logs)
    Investigates root cause:
      - Malformed data in chunk (specific rows)
      - Postgres connection failure
      - Reference table inconsistency
    Clicks "Force Retry" → re-publishes chunk message to mfcb-chunk-validate
    OR Clicks "Quarantine Chunk" → marks rows as unprocessable; notifies institution
```

---

## 14. SFTP Pickup Architecture (`fn-sftp-pickup`)

```
Runs on schedule: cron 01:00 daily (Cloud Scheduler)

1. Connect to SFTP server (SSH key from Secret Manager)
2. List /sftp/inbound/{SRN}/pending/ for each active institution
3. For each file found:
   a. Validate filename matches naming convention regex
   b. Compute SHA-256 hash of file
   c. Copy to Cloud Storage: gs://mfcb-batches-prod/{institution_id}/{batch_id}/original/{filename}
   d. Write batch_uploads record: channel = SFTP, status = QUEUED
   e. Move SFTP file from pending/ to processed/
   f. Write sftp_incoming_log: filename, received_at, file_hash, batch_id
   g. Write audit_logs: SFTP_FILE_RECEIVED
   h. (Cloud Storage finalise event automatically triggers fn-parse-batch)
4. Any file failing step 3a (naming) → move to /sftp/inbound/{SRN}/rejected/
   Write audit_logs: SFTP_FILE_NAMING_INVALID
   Notify institution via webhook or email
```

---

## 15. File Upload Security Controls

| Control | Implementation |
|---------|---------------|
| Virus scan | ClamAV or Google Cloud Security Command Center malware scanning on upload; fn-parse-batch checks scan result tag on object metadata before processing |
| File size limit | Enforced at API gateway (50 MB max); Cloud Storage enforces via CORS config |
| File type validation | Extension check (client-side warning) + content-type sniffing in fn-parse-batch (magic bytes for xlsx, csv detection) |
| SHA-256 integrity | Computed on upload; stored in batch_uploads; re-verified in fn-parse-batch |
| Storage IAM | Cloud Functions service account has read/write to mfcb-batches only; no public access |
| Signed URLs | Portal file uploads use short-lived signed URLs (15 min); file goes directly to Cloud Storage without passing through API server |
| Quarantine bucket | Separate bucket for virus/invalid files; Cloud Functions service account has no read access to quarantine bucket (ops only) |
| Encryption at rest | AES-256; CMEK using Cloud KMS for production bucket |
| Encryption in transit | TLS 1.3 enforced for all Cloud Storage API calls |

---

## 16. Monitoring & Alerting

### Firebase / GCP Metrics to Monitor

| Metric | Alert Threshold | Destination |
|--------|----------------|-------------|
| `fn-validate-chunk` error rate | > 5% in 5 min window | Bureau Ops email + Screen 6.1 |
| `fn-validate-chunk` p99 execution time | > 250 s | Bureau Ops alert |
| Pub/Sub `mfcb-chunk-validate` oldest unacked message age | > 600 s | Bureau Ops alert |
| DLQ message count | > 0 | Immediate Bureau Ops alert |
| Cloud SQL connection count | > 80% of max | Platform alert |
| Firestore write latency | > 5 s p99 | Platform alert |
| Batch FAILED rate (all institutions) | > 10% in 1 h | Bureau Ops + Super Admin |
| File upload size anomaly | Single file > 45 MB | Warn (not block) |

### Firebase Console Dashboards

- **Function health**: invocation count, error rate, execution duration per function
- **Pub/Sub health**: publish rate, ack rate, oldest unacked, DLQ depth
- **Firestore operations**: read/write/delete counts, latency
- **Cloud Storage**: object count, storage size, egress by bucket

---

## 17. Disaster Recovery for Batch Processing

| Scenario | Recovery Approach |
|----------|------------------|
| fn-validate-chunk all instances fail | DLQ captures messages; Bureau Ops force-retries after root cause fixed |
| Cloud SQL Postgres unreachable | Pub/Sub retries (up to 810 s); if beyond retry window → DLQ; no data loss (raw records already in Cloud Storage) |
| Firestore outage | Functions fail and retry; Firestore is multi-region by default |
| Partial chunk completion | Idempotent writes + Firestore counter tracks exactly which chunks completed; incomplete batch resumable |
| Cloud Storage object deleted | Versioning enabled; restore from object version history |
| Full region failure | Multi-region Firestore; Cloud SQL failover replica in secondary region; RPO ≤ 1 h; RTO ≤ 4 h for batch processing |
| Replay entire batch | Re-trigger fn-parse-batch by copying original file object to trigger bucket path; same batch_id used; idempotency prevents duplicate raw records |

---

## 18. Development & Testing Strategy

### Local Development

```bash
# Firebase emulator suite
firebase emulators:start --only functions,firestore,pubsub,storage

# Seed reference data
node scripts/seed-reference-codes.js --emulator

# Test with sample file
curl -X POST http://localhost:5001/mfcb-dev/africa-south1/uploadBatch \
  -F "file=@test-data/BW0001_ALL_T702_M_20260331_1_1.txt" \
  -F "batch_id=bat_test_001" \
  -H "Authorization: Bearer test-token"
```

### Integration Tests Per Stage

| Stage | Test | Expected |
|-------|------|---------|
| Stage 1 | Upload valid 1000-row fixed-length file | 2 chunk messages published; raw records written |
| Stage 1 | Upload file with header/trailer mismatch | FAILED immediately; no chunk messages |
| Stage 1 | Upload file with virus flag | QUARANTINED; no processing |
| Stage 2 | Publish chunk with invalid Omang rows | Errors written; accepted_count correct |
| Stage 2 | Publish same chunk_id twice | Idempotent; no duplicate errors |
| Stage 2 | Publish chunk with duplicate account keys | DUPLICATE_ACCOUNT_KEY error written |
| Stage 3 | Simulate all chunks completing | Aggregation fires; mastering messages published |
| Stage 4 | Master chunk with new borrower | New borrowers row created |
| Stage 4 | Master chunk with existing borrower (update) | Existing borrower updated; new repayment_history row |
| Stage 4 | Master same chunk twice | No duplicate records (idempotent) |
| Stage 5 | Simulate completion trigger | Webhook delivered; batch_uploads.status = COMPLETED |

### Load Testing

Target: 100,000-row batch completing within 3 minutes end-to-end.

```bash
# Generate test file: 100k rows
node scripts/generate-test-file.js --rows 100000 --srn BW0001 --month 20260331

# Upload and time
time curl -X POST https://sandbox-api.mfcb.co.bw/v1/batches/file \
  -F "file=@BW0001_ALL_T702_M_20260331_1_1.txt" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $(uuidgen)"
```

Monitor Firebase console during load test for:
- Function instance count (should scale to ~200 for 100k rows)
- p99 execution time
- Error rate
- Cloud SQL connection saturation
