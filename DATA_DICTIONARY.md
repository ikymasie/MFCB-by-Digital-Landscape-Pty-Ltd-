# MFCB Platform — Data Dictionary

> Version 1.0 | 2026-05-06
> Source: SCREENS_UI_ANALYSIS.md · Form G Proposed Layout · MFCB System Requirements

---

## Conventions

| Symbol | Meaning |
|--------|---------|
| `M` | Mandatory — must be present and non-null |
| `C` | Conditional — mandatory when stated condition is true |
| `O` | Optional — may be null/blank |
| `PK` | Primary key |
| `FK` | Foreign key |
| `A n` | Alpha, max n characters, left-aligned, space-filled |
| `N n` | Numeric, max n characters, right-aligned, zero-filled |
| `AN n` | Alphanumeric, max n characters |
| `CCYYMMDD` | Numeric 8-char date: century + year + month + day |
| `ISO 8601` | Database/API timestamp: `YYYY-MM-DDTHH:MM:SSZ` |

---

## Table 1: `institutions`

Stores all registered banks, MFIs, and lenders.

| Column | Type | Len | Status | Description | Validation |
|--------|------|-----|--------|-------------|------------|
| `institution_id` | UUID | — | PK | System-generated unique identifier | Auto-generated |
| `name` | VARCHAR | 120 | M | Legal trading name of institution | Non-empty, A–Z, 0–9, space, punctuation |
| `supplier_reference_number` | VARCHAR | 10 | M | Unique SRN assigned to institution per product | Unique, AN10, uppercase, format: `BW####` or bureau-defined pattern |
| `status` | ENUM | — | M | `PENDING` / `ACTIVE` / `SUSPENDED` / `DEACTIVATED` | Must be one of allowed values |
| `integration_channel` | ENUM | — | M | `REST_API` / `PORTAL_UPLOAD` / `SFTP` | Must be one of allowed values |
| `enabled_products` | JSONB / TEXT[] | — | M | List of account types permitted for this institution | Each entry must be in account_type reference table |
| `allowed_ip_ranges` | JSONB | — | O | Array of CIDR strings for IP allow-listing | Valid CIDR notation each |
| `mtls_cert_fingerprint` | VARCHAR | 128 | O | SHA-256 fingerprint of mTLS certificate | Hex string, 64 chars |
| `onboarded_at` | TIMESTAMP | — | M | Date institution was activated | ISO 8601, not in future |
| `onboarded_by` | UUID | — | M | FK → `users.user_id` of bureau staff who activated | Must reference valid bureau user |
| `created_at` | TIMESTAMP | — | M | Record creation timestamp | Auto-set |
| `updated_at` | TIMESTAMP | — | M | Last update timestamp | Auto-set |

---

## Table 2: `api_clients`

Machine-to-machine OAuth clients per institution.

| Column | Type | Len | Status | Description | Validation |
|--------|------|-----|--------|-------------|------------|
| `client_id` | UUID | — | PK | System-generated client identifier | Auto-generated |
| `institution_id` | UUID | — | M, FK | References `institutions.institution_id` | Must exist |
| `client_secret_hash` | VARCHAR | 255 | M | Argon2id hash of client secret | Never stored plain |
| `scopes` | TEXT[] | — | M | Granted OAuth scopes | Each scope must be in scope catalogue |
| `allowed_ip_ranges` | JSONB | — | O | IP allow-list override for this client | Valid CIDR |
| `token_ttl_seconds` | INTEGER | — | M | Access token lifetime | 3600–86400 |
| `expires_at` | TIMESTAMP | — | O | Optional hard expiry date | Must be in future if set |
| `status` | ENUM | — | M | `ACTIVE` / `REVOKED` | — |
| `last_used_at` | TIMESTAMP | — | O | Timestamp of last token issuance | Auto-updated |
| `created_at` | TIMESTAMP | — | M | — | Auto-set |
| `created_by` | UUID | — | M | FK → `users.user_id` | Must reference bureau staff user |

---

## Table 3: `users`

All portal users across roles.

| Column | Type | Len | Status | Description | Validation |
|--------|------|-----|--------|-------------|------------|
| `user_id` | UUID | — | PK | — | Auto-generated |
| `email` | VARCHAR | 255 | M | Login email address | Valid email format, unique |
| `full_name` | VARCHAR | 120 | M | Display name | Non-empty |
| `password_hash` | VARCHAR | 255 | M | Argon2id hash | Never stored plain |
| `role_id` | UUID | — | M, FK | References `roles.role_id` | Must exist |
| `institution_id` | UUID | — | C, FK | References `institutions.institution_id` | Required for `INST_ADMIN`, `INST_USER`; NULL for bureau roles |
| `mfa_enrolled` | BOOLEAN | — | M | Whether TOTP enrolled | Default FALSE; enforced TRUE for all roles before portal access |
| `mfa_secret_encrypted` | TEXT | — | C | AES-256 encrypted TOTP secret | Required when `mfa_enrolled = TRUE` |
| `status` | ENUM | — | M | `ACTIVE` / `LOCKED` / `INACTIVE` | — |
| `failed_login_count` | SMALLINT | — | M | Current consecutive failure count | 0–99; resets on success |
| `locked_until` | TIMESTAMP | — | O | Auto-lock expiry | Set when `failed_login_count >= 5` |
| `last_login_at` | TIMESTAMP | — | O | — | Auto-updated on success |
| `invited_by` | UUID | — | O, FK | FK → `users.user_id` of inviter | — |
| `created_at` | TIMESTAMP | — | M | — | Auto-set |
| `updated_at` | TIMESTAMP | — | M | — | Auto-set |

---

## Table 4: `roles`

Role definitions.

| Column | Type | Len | Status | Description |
|--------|------|-----|--------|-------------|
| `role_id` | UUID | — | PK | — |
| `role_name` | VARCHAR | 50 | M | `SUPER_ADMIN`, `BUREAU_OPS`, `COMPLIANCE`, `INST_ADMIN`, `INST_USER`, `AUDITOR`, `API_CLIENT` |
| `scope` | ENUM | — | M | `PLATFORM` / `INSTITUTION` |
| `description` | TEXT | — | O | Human-readable description |

---

## Table 5: `role_permissions`

Join table: role → permission grants.

| Column | Type | Status | Description |
|--------|------|--------|-------------|
| `role_id` | UUID | PK, FK | References `roles.role_id` |
| `permission_key` | VARCHAR(80) | PK | Permission key from catalogue |
| `scope_restriction` | ENUM | O | `OWN_INSTITUTION` / `ALL` / NULL |

---

## Table 6: `batch_uploads`

One record per batch submission (file or JSON).

| Column | Type | Len | Status | Description | Validation |
|--------|------|-----|--------|-------------|------------|
| `batch_id` | UUID | — | PK | — | Auto-generated |
| `institution_id` | UUID | — | M, FK | — | Must exist |
| `supplier_reference_number` | VARCHAR | 10 | M | Copied from institution at submission time | Must match `institutions.supplier_reference_number` |
| `reporting_month` | CHAR | 8 | M | Month-end date of data `CCYYMMDD` | Valid date, day must be last day of month, not in future |
| `file_type` | ENUM | — | M | `TEST` / `LIVE` | LIVE requires prior clean TEST on record |
| `sequence_number` | SMALLINT | — | M | Submission sequence for same SRN + reporting_month | ≥ 1; increments per resubmission |
| `idempotency_key` | UUID | — | M | Client-supplied idempotency key | Unique per `institution_id` + `reporting_month` + `sequence_number` |
| `source_file_name` | VARCHAR | 120 | C | Original file name | Required for file uploads; must match naming convention pattern |
| `file_hash_sha256` | CHAR | 64 | C | SHA-256 of uploaded file | Required for file uploads |
| `file_size_bytes` | BIGINT | — | C | File size | Required for file uploads |
| `channel` | ENUM | — | M | `REST_API` / `PORTAL_UPLOAD` / `SFTP` | — |
| `status` | ENUM | — | M | `QUEUED` / `VALIDATING` / `COMPLETED` / `FAILED` / `QUARANTINED` | — |
| `stage` | VARCHAR | 50 | M | Current processing stage | e.g. `HEADER_TRAILER`, `FIELD_VALIDATION`, `MASTERING` |
| `total_records` | INTEGER | — | O | Count of data records in file/payload | Set after parse; excludes header and trailer |
| `accepted_count` | INTEGER | — | O | Records passing all validations | Set after validation |
| `rejected_count` | INTEGER | — | O | Records failing validation | Set after validation |
| `warning_count` | INTEGER | — | O | Records with warnings (not rejected) | Set after validation |
| `header_supplier_ref` | VARCHAR | 10 | O | Supplier reference from file header | Cross-validated against `supplier_reference_number` |
| `header_month_end` | CHAR | 8 | O | Month-end from file header | Must match `reporting_month` |
| `header_version` | CHAR | 2 | O | File version from header | Format: `01`, `02`, … |
| `header_file_creation_date` | CHAR | 8 | O | File creation date from header | Valid CCYYMMDD |
| `trailer_record_count` | INTEGER | — | O | Record count from trailer | Must equal `total_records` |
| `queued_at` | TIMESTAMP | — | M | When batch entered queue | Auto-set |
| `started_at` | TIMESTAMP | — | O | When processing began | Auto-set |
| `completed_at` | TIMESTAMP | — | O | When processing finished | Auto-set |
| `submitted_by_user_id` | UUID | — | O | FK → `users.user_id` for portal submissions | NULL for API/SFTP |
| `submitted_by_client_id` | UUID | — | O | FK → `api_clients.client_id` for API submissions | NULL for portal |
| `correlation_id` | VARCHAR | 100 | M | X-Correlation-Id from request | — |
| `created_at` | TIMESTAMP | — | M | — | Auto-set |

---

## Table 7: `raw_submission_records`

Immutable copy of every submitted row. Never updated; corrections create new rows.

| Column | Type | Len | Status | Description | Validation |
|--------|------|-----|--------|-------------|------------|
| `raw_record_id` | UUID | — | PK | — | Auto-generated |
| `batch_id` | UUID | — | M, FK | References `batch_uploads.batch_id` | Must exist |
| `row_number` | INTEGER | — | M | 1-based position in file/array | ≥ 1 |
| `record_type` | CHAR | 1 | M | `D` for data record | Must = `D` for monthly data |
| `raw_payload` | JSONB | — | M | Original submitted field values as JSON | — |
| `is_correction` | BOOLEAN | — | M | TRUE if this row is a compensating correction | Default FALSE |
| `corrects_raw_record_id` | UUID | — | C | FK → original `raw_record_id` | Required when `is_correction = TRUE` |
| `correction_reason` | TEXT | — | C | Reason for correction | Required when `is_correction = TRUE` |
| `correction_approved_by` | UUID | — | C | FK → `users.user_id` of approver | Required when `is_correction = TRUE` |
| `created_at` | TIMESTAMP | — | M | — | Auto-set |

---

## Table 8: `validation_errors`

One row per field-level or file-level validation failure.

| Column | Type | Len | Status | Description | Validation |
|--------|------|-----|--------|-------------|------------|
| `error_id` | UUID | — | PK | — | Auto-generated |
| `batch_id` | UUID | — | M, FK | — | Must exist |
| `raw_record_id` | UUID | — | O, FK | NULL for file-level errors | — |
| `row_number` | INTEGER | — | C | Row number in source file | Required for record-level errors |
| `field` | VARCHAR | 80 | C | API JSON key of failing field | e.g. `omang_id_number`, `status_code` |
| `code` | VARCHAR | 80 | M | Machine-readable error code | Uppercase snake_case, e.g. `INVALID_OMANG_FORMAT` |
| `severity` | ENUM | — | M | `REJECT` / `WARN` | — |
| `raw_value` | TEXT | — | O | Submitted value that triggered error | Stored as-is, no normalisation |
| `message` | TEXT | — | M | Human-readable description | — |
| `error_category` | ENUM | — | M | `IDENTITY` / `DATE` / `FINANCIAL` / `STATUS` / `REFERENCE` / `DUPLICATE` / `CROSS_FIELD` / `FILE_LEVEL` | — |
| `created_at` | TIMESTAMP | — | M | — | Auto-set |

**Standard Error Codes:**

| Code | Category | Trigger Condition |
|------|----------|-------------------|
| `INVALID_OMANG_FORMAT` | IDENTITY | Not 9 numeric; char 5 not `1` or `2`; repeated dummy (`000000000`–`333333333`) |
| `MISSING_OMANG_AND_PASSPORT` | IDENTITY | Both `omang_id_number` and `passport_number` are blank |
| `INVALID_PASSPORT_FORMAT` | IDENTITY | Not alphanumeric; length > 16 |
| `INVALID_GENDER` | IDENTITY | Not `M` or `F` (when populated) |
| `MISSING_MANDATORY_FIELD` | IDENTITY/FINANCIAL | Any mandatory field blank |
| `INVALID_DATE_FORMAT` | DATE | Not CCYYMMDD format |
| `FUTURE_DATE` | DATE | `date_of_birth`, `date_account_opened`, `last_payment_date` after today |
| `DATE_BEFORE_ACCOUNT_OPEN` | DATE | `last_payment_date` before `date_account_opened` (non-new account) |
| `DATE_OLDER_THAN_36_MONTHS` | DATE | `last_payment_date` > 36 months before month-end |
| `DATE_OLDER_THAN_60_MONTHS` | DATE | `last_payment_date` > 60 months (prescription period) |
| `DEFERRED_DATE_REQUIRED` | DATE | `payment_type = 02` and `deferred_payment_start_date = 0` |
| `DEFERRED_DATE_PAST` | DATE | `deferred_payment_start_date` before month-end |
| `DEFERRED_DATE_TOO_FAR` | DATE | `deferred_payment_start_date` > 23 months after month-end |
| `OPENING_BALANCE_REQUIRED` | FINANCIAL | Account type in (B,D,H,I,M,N,P,T,Y) and `opening_balance = 0` |
| `OPENING_BALANCE_MUST_BE_ZERO` | FINANCIAL | Account type in (F,O,S,U,W,X) and `opening_balance > 0` |
| `INSTALMENT_REQUIRED` | FINANCIAL | `current_balance > 0` and `instalment_amount = 0` |
| `INSTALMENT_MUST_BE_ZERO` | FINANCIAL | Status code in (C,P,V,T) and `instalment_amount > 0` |
| `AMOUNT_OVERDUE_REQUIRED` | FINANCIAL | `months_in_arrears > 0` and `amount_overdue = 0` |
| `AMOUNT_OVERDUE_MUST_BE_ZERO` | FINANCIAL | Status code in (C,P,T,V) and `amount_overdue > 0` |
| `MONTHS_ARREARS_EXCEEDS_OPEN_DURATION` | FINANCIAL | `months_in_arrears` > months since `date_account_opened` |
| `INVALID_STATUS_FOR_ACCOUNT_TYPE` | STATUS | Status code not permitted for given account type (per matrix) |
| `STATUS_DATE_REQUIRED` | STATUS | `status_code` populated but `status_date = 0` |
| `INVALID_REFERENCE_CODE` | REFERENCE | Code not found in relevant reference table |
| `INVALID_OWNERSHIP_TYPE` | REFERENCE | `account_ownership_type` not in ownership type table |
| `INVALID_REPAYMENT_FREQUENCY` | REFERENCE | Not in repayment frequency table |
| `INVALID_PAYMENT_TYPE` | REFERENCE | Not in payment type table |
| `INVALID_ACCOUNT_TYPE` | REFERENCE | Not in account type table |
| `LOAN_TERM_REQUIRED` | CROSS_FIELD | Account type in (D,H,I,N,P,T,Y) and `loan_term = 0` |
| `THIRD_PARTY_NAME_REQUIRED` | CROSS_FIELD | `status_code = A` and `third_party_name` blank |
| `THIRD_PARTY_ACCOUNT_REQUIRED` | CROSS_FIELD | `status_code = A` and `account_sold_to_third_party ≠ 01` |
| `JOINT_PARTICIPANTS_REQUIRED` | CROSS_FIELD | `account_ownership_type = 02` and `no_of_participants = 0` |
| `DUPLICATE_ACCOUNT_KEY` | DUPLICATE | Same SRN + `account_number` + `sub_account_number` + `branch_code` appears twice in batch |
| `DUPLICATE_LIVE_SUBMISSION` | DUPLICATE | Live batch with same SRN + `reporting_month` + `sequence_number` already accepted |
| `HEADER_RECORD_COUNT_MISMATCH` | FILE_LEVEL | Record count in header/trailer does not match actual data record count |
| `INVALID_FILE_NAMING` | FILE_LEVEL | Source file name does not match `{SRN}_ALL_{L/T}702_M_{CCYYMMDD}_{seq}_{seq}.txt` |
| `SUPPLIER_REF_MISMATCH` | FILE_LEVEL | Header SRN does not match authenticated institution's SRN |
| `PHONE_INVALID_LENGTH` | IDENTITY | Phone field < 10 or > 10 digits |
| `PHONE_NON_NUMERIC` | IDENTITY | Phone field contains non-numeric characters |
| `EMAIL_INVALID_FORMAT` | IDENTITY | Missing `@`, top-level domain starts with `.`, no char before `@` |
| `SURNAME_TOO_SHORT` | IDENTITY | Surname < 2 characters |
| `SURNAME_NO_VOWEL` | IDENTITY | Surname has no vowel (A,E,I,O,U,Y) |
| `SURNAME_INVALID_CHARS` | IDENTITY | Surname contains chars outside [A–Z], [-], ['], [ ] |
| `INVALID_CURRENT_BALANCE_INDICATOR` | FINANCIAL | Not `D` or `C` |

---

## Table 9: `borrowers`

Master borrower identity record (deduplicated across institutions).

| Column | Type | Len | Status | Description | Validation |
|--------|------|-----|--------|-------------|------------|
| `borrower_id` | UUID | — | PK | — | Auto-generated |
| `omang_id_number` | CHAR | 9 | C | Botswana national ID (Omang) | 9 numeric; char 5 in ('1','2'); not dummy value |
| `passport_number` | VARCHAR | 16 | C | Passport or other foreign ID | Alphanumeric; at least one of Omang/Passport required |
| `surname` | VARCHAR | 25 | M | Borrower surname | A–Z, apostrophe, hyphen, embedded spaces; > 2 chars; at least one vowel |
| `forename_1` | VARCHAR | 14 | M | First forename or initial | A–Z, apostrophe, hyphen |
| `forename_2` | VARCHAR | 14 | O | Second forename | Same char rules |
| `forename_3` | VARCHAR | 14 | O | Third forename | Same char rules |
| `title` | VARCHAR | 5 | O | Salutation | Must be in title reference table when populated |
| `gender` | CHAR | 1 | M | `M` or `F` | — |
| `date_of_birth` | CHAR | 8 | M | CCYYMMDD | Valid date; not in future |
| `nationality` | VARCHAR | 25 | O | Nationality text | A–Z, space |
| `marital_status` | VARCHAR | 10 | O | `MARRIED` / `SINGLE` / `DIVORCED` / `OTHER` | — |
| `created_at` | TIMESTAMP | — | M | — | Auto-set |
| `updated_at` | TIMESTAMP | — | M | — | Auto-set |

---

## Table 10: `borrower_identifiers`

History of identity tokens per borrower (supports ID changes over time).

| Column | Type | Len | Status | Description | Validation |
|--------|------|-----|--------|-------------|------------|
| `identifier_id` | UUID | — | PK | — | Auto-generated |
| `borrower_id` | UUID | — | M, FK | — | Must exist |
| `id_type` | ENUM | — | M | `OMANG` / `PASSPORT` / `OTHER_ID` | — |
| `id_value` | VARCHAR | 16 | M | The identity number | Format validated per type |
| `effective_from` | TIMESTAMP | — | M | When this identifier became active | — |
| `effective_to` | TIMESTAMP | — | O | When superseded | NULL = currently active |
| `source_institution_id` | UUID | — | M, FK | Institution that submitted this identifier | — |
| `source_batch_id` | UUID | — | M, FK | Batch where first seen | — |

---

## Table 11: `borrower_addresses`

Address history per borrower.

| Column | Type | Len | Status | Description |
|--------|------|-----|--------|-------------|
| `address_id` | UUID | — | PK | — |
| `borrower_id` | UUID | — | M, FK | — |
| `address_type` | ENUM | — | M | `RESIDENTIAL` / `POSTAL` |
| `line_1` | VARCHAR | 25 | M | Street number and street name, or building number and name |
| `line_2` | VARCHAR | 25 | M | Suburb |
| `line_3` | VARCHAR | 25 | O | Town name |
| `line_4` | VARCHAR | 25 | O | Country name |
| `postal_code` | VARCHAR | 6 | O | Postal code |
| `owner_tenant` | CHAR | 1 | O | `O` = Owner, `T` = Tenant |
| `effective_from` | TIMESTAMP | — | M | — |
| `effective_to` | TIMESTAMP | — | O | NULL = current |
| `source_batch_id` | UUID | — | M, FK | — |

---

## Table 12: `borrower_employment`

Employment data per borrower (latest per institution submission).

| Column | Type | Len | Status | Description | Validation |
|--------|------|-----|--------|-------------|------------|
| `employment_id` | UUID | — | PK | — | — |
| `borrower_id` | UUID | — | M, FK | — | — |
| `employer_name` | VARCHAR | 60 | O | Company name | A–Z, 0–9; not borrower's own name; not prefixed with T/A |
| `occupation` | VARCHAR | 20 | O | Job title | A–Z, 0–9, apostrophe, hyphen |
| `income` | INTEGER | 9 | O | Gross income in whole Pula | Stored only; never returned in API responses |
| `income_frequency` | CHAR | 1 | C | `M`/`W`/`F`/`Q`/`A` | Required when `income` populated; must be in income frequency table |
| `source_batch_id` | UUID | — | M, FK | — | — |
| `reporting_month` | CHAR | 8 | M | Month data pertains to | — |

---

## Table 13: `credit_accounts`

Master account record per borrower per institution per account.

| Column | Type | Len | Status | Form G Field | Validation |
|--------|------|-----|--------|--------------|------------|
| `credit_account_id` | UUID | — | PK | — | Auto-generated |
| `institution_id` | UUID | — | M, FK | — | Must exist |
| `borrower_id` | UUID | — | M, FK | — | Must exist |
| `branch_code` | VARCHAR | 8 | O | Branch Code | A–Z, 0–9, `/`, `\`, `-`; no leading zeros unless system zero-fills |
| `account_number` | VARCHAR | 25 | M | Account Number | A–Z, 0–9, `/`, `\`, `-`; no embedded spaces; unique match key part |
| `sub_account_number` | VARCHAR | 4 | M | Sub Account Number | Same char rules; unique match key part |
| `account_ownership_type` | CHAR | 2 | M | Account Ownership Type | Must be in ownership type table (`00`–`05`) |
| `loan_reason_code` | CHAR | 2 | M | Loan Reason | Must be in loan reason code table |
| `payment_type` | CHAR | 2 | M | Payment Type | Must be in payment type table (`00`–`10`) |
| `account_type` | CHAR | 2 | M | Type of Account | Must be in account type table (B,C,D,E,F,G,H,I,M,N,O,P,R,S,T,U,V,W,X,Y,Z) |
| `date_account_opened` | CHAR | 8 | M | Date Account Opened | Valid CCYYMMDD; not in future; ≤ month-end date |
| `deferred_payment_start_date` | CHAR | 8 | C | Deferred Payment Start Date | Required when `payment_type = 02`; must be after month-end; ≤ 23 months ahead |
| `last_payment_date` | CHAR | 8 | C | Last Payment Date | Valid CCYYMMDD; not in future; not > 36 months before month-end (unless status date within 36 months); not before `date_account_opened` |
| `opening_balance_or_credit_limit` | INTEGER | 9 | M | Opening Balance / Credit Limit | Whole Pula only; no decimals; rules by account type (see error codes) |
| `current_balance` | INTEGER | 9 | C | Current Balance | Whole Pula; conditional rules by account type and status |
| `current_balance_indicator` | CHAR | 1 | M | Current Balance Debit Indicator | `D` or `C` |
| `instalment_amount` | INTEGER | 9 | C | Instalment Amount | Whole Pula; 0 if status in (C,P,V,T); mandatory if current_balance > 0 |
| `months_in_arrears` | CHAR | 2 | M | Months in Arrears | `00`–`99`; must not exceed months account open; if > 0 then amount_overdue mandatory |
| `amount_overdue` | INTEGER | 8 | C | Amount Overdue | Whole Pula; 0 if status in (C,P,T,V); mandatory if `months_in_arrears > 0` |
| `status_code` | CHAR | 2 | C | Status Code | Must be in status table and allowed for this `account_type`; status_date mandatory if populated |
| `status_date` | CHAR | 8 | C | Status Date | Valid CCYYMMDD; mandatory when `status_code` not in (B,C,D,P,S,T,U,V,Y,Z) |
| `repayment_frequency` | CHAR | 2 | M | Repayment Frequency | Must be in repayment frequency table (`00`–`06`) |
| `loan_term` | CHAR | 4 | C | Loan Term / Duration | Numeric; mandatory for account types (D,H,I,N,P,T,Y); > 0 |
| `no_of_participants` | SMALLINT | — | C | No. of Participants in Joint Loan | > 0; mandatory when `account_ownership_type = 02` |
| `third_party_name` | VARCHAR | 60 | C | Third Party Name | Mandatory when `status_code = A` |
| `account_sold_to_third_party` | CHAR | 2 | C | Account Sold to 3rd Party | Must = `01` when `status_code = A` |
| `old_supplier_branch_code` | VARCHAR | 8 | O | Old Supplier Branch Code | Migration use only |
| `old_account_number` | VARCHAR | 25 | O | Old Account Number | Migration use only |
| `old_sub_account_number` | CHAR | 4 | O | Old Sub Account No | Migration use only |
| `old_supplier_reference_no` | VARCHAR | 10 | O | Old Supplier Reference No | Migration use only |
| `cellular_telephone` | VARCHAR | 10 | O | Cellular Telephone | 10 digits; numeric; not zero-filled; not defaulted to supplier number |
| `telephone_h` | VARCHAR | 10 | O | Home Telephone | Same rules as cellular |
| `telephone_w` | VARCHAR | 10 | O | Work Telephone | Same rules as cellular |
| `email_address` | VARCHAR | 100 | O | Email Address | `@` present; TLD not starting with `.`; char before `@` |
| `first_reporting_month` | CHAR | 8 | M | — | Set on first submission for this account |
| `last_reporting_month` | CHAR | 8 | M | — | Updated each submission |
| `created_at` | TIMESTAMP | — | M | — | Auto-set |
| `updated_at` | TIMESTAMP | — | M | — | Auto-set |

---

## Table 14: `repayment_history`

Point-in-time monthly snapshot of account financial state.

| Column | Type | Len | Status | Description |
|--------|------|-----|--------|-------------|
| `history_id` | UUID | — | PK | — |
| `credit_account_id` | UUID | — | M, FK | — |
| `reporting_month` | CHAR | 8 | M | CCYYMMDD month-end date |
| `months_in_arrears` | CHAR | 2 | M | As reported for this month |
| `current_balance` | INTEGER | — | M | As reported |
| `instalment_amount` | INTEGER | — | M | As reported |
| `amount_overdue` | INTEGER | — | M | As reported |
| `payment_type` | CHAR | 2 | M | As reported |
| `status_code` | CHAR | 2 | O | Status code if submitted this month |
| `batch_id` | UUID | — | M, FK | Source batch for this snapshot |
| `created_at` | TIMESTAMP | — | M | — |

---

## Table 15: `account_status_events`

Status code history (each occurrence of a new status code).

| Column | Type | Len | Status | Description | Validation |
|--------|------|-----|--------|-------------|------------|
| `event_id` | UUID | — | PK | — | Auto-generated |
| `credit_account_id` | UUID | — | M, FK | — | Must exist |
| `status_code` | CHAR | 2 | M | Status code at event | Must be in status table |
| `status_date` | CHAR | 8 | M | Date of status occurrence | Valid CCYYMMDD |
| `submitted_month` | CHAR | 8 | M | Reporting month when submitted | — |
| `batch_id` | UUID | — | M, FK | Source batch | — |
| `created_at` | TIMESTAMP | — | M | — | Auto-set |

---

## Table 16: `credit_inquiries`

Every credit report request — immutable audit record.

| Column | Type | Len | Status | Description | Validation |
|--------|------|-----|--------|-------------|------------|
| `inquiry_id` | UUID | — | PK | — | Auto-generated |
| `institution_id` | UUID | — | M, FK | Requesting institution | Must exist |
| `requested_by_user_id` | UUID | — | O, FK | Portal user; NULL for API | — |
| `requested_by_client_id` | UUID | — | O, FK | API client; NULL for portal | — |
| `search_type` | ENUM | — | M | `OMANG` / `PASSPORT` / `ACCOUNT_NUMBER` / `CELLULAR` / `SURNAME_DOB` | — |
| `search_value_masked` | VARCHAR | 50 | M | Masked search value for audit (last 4 visible) | — |
| `inquiry_reason` | VARCHAR | 50 | M | Purpose code or text | Non-empty |
| `customer_consent_reference` | VARCHAR | 100 | C | Reference to signed consent | Required unless legally exempted purpose |
| `result` | ENUM | — | M | `MATCH` / `NO_MATCH` / `MATCH_REVIEW_REQUIRED` | — |
| `borrower_id` | UUID | — | O, FK | Matched borrower; NULL for NO_MATCH | — |
| `report_id` | UUID | — | O | Generated report ID | NULL for NO_MATCH |
| `correlation_id` | VARCHAR | 100 | M | — | From request header |
| `ip_address` | INET | — | M | Requester IP | — |
| `created_at` | TIMESTAMP | — | M | — | Auto-set |

---

## Table 17: `audit_logs`

Immutable append-only audit trail. No UPDATE or DELETE permitted.

| Column | Type | Len | Status | Description |
|--------|------|-----|--------|-------------|
| `audit_id` | UUID | — | PK | — |
| `actor_id` | UUID | — | M | User ID or API client ID performing action |
| `actor_type` | ENUM | — | M | `USER` / `API_CLIENT` / `SYSTEM` |
| `institution_id` | UUID | — | O | Actor's institution (NULL for bureau staff) |
| `action` | VARCHAR | 80 | M | Action code e.g. `LOGIN`, `BATCH_SUBMITTED`, `REPORT_REQUESTED`, `ROLE_CHANGED`, `DATA_CORRECTION_APPROVED`, `REFERENCE_CODE_CHANGED`, `API_SECRET_REGENERATED`, `AUDIT_EXPORT`, `INSTITUTION_SUSPENDED` |
| `object_type` | VARCHAR | 50 | O | Type of affected object e.g. `batch`, `borrower`, `user`, `reference_code` |
| `object_id` | UUID | — | O | ID of affected object |
| `correlation_id` | VARCHAR | 100 | M | Request correlation ID |
| `ip_address` | INET | — | M | Source IP |
| `result` | ENUM | — | M | `SUCCESS` / `FAILURE` |
| `detail` | JSONB | — | O | Before/after values, error details, additional context |
| `event_category` | ENUM | — | M | `AUTH` / `DATA` / `ADMIN` / `REPORT` / `SECURITY` / `CONFIG` |
| `timestamp` | TIMESTAMP | — | M | Exact event time (microsecond precision) |

---

## Table 18: `reference_codes`

All configurable code tables (account type, status, payment type, etc.).

| Column | Type | Len | Status | Description | Validation |
|--------|------|-----|--------|-------------|------------|
| `code_type` | VARCHAR | 50 | PK | Table identifier e.g. `ACCOUNT_TYPE`, `STATUS_CODE`, `PAYMENT_TYPE` | — |
| `code` | VARCHAR | 10 | PK | The code value | Uppercase |
| `description` | VARCHAR | 120 | M | Human-readable name | Non-empty |
| `definition` | TEXT | — | O | Extended rules / notes | — |
| `effective_date` | DATE | — | M | Date code becomes valid | — |
| `deprecated_at` | DATE | — | O | Date code is retired; NULL = active | Must be after `effective_date` |
| `display_order` | SMALLINT | — | O | UI sort order | — |
| `created_by` | UUID | — | M, FK | FK → `users.user_id` | — |
| `approved_by` | UUID | — | O, FK | FK → `users.user_id` | Required before `effective_date` |
| `created_at` | TIMESTAMP | — | M | — | Auto-set |

**Reference Code Types and Valid Codes:**

| code_type | Codes |
|-----------|-------|
| `RECORD_TYPE` | C, D, H, R, T |
| `ACCOUNT_TYPE` | B, C, D, E, F, G, H, I, M, N, O, P, R, S, T, U, V, W, X, Y, Z |
| `STATUS_CODE` | B, C, D, E, I, J, L, P, T, U, V, W, Y, Z |
| `OWNERSHIP_TYPE` | 00, 01, 02, 03, 04, 05 |
| `REPAYMENT_FREQUENCY` | 00, 01, 02, 03, 04, 05, 06 |
| `LOAN_REASON_CODE` | A, B, C, D, F, H, J, O, R, S |
| `PAYMENT_TYPE` | 00, 01, 02, 03, 04, 05, 06, 07, 08, 09, 10 |
| `INCOME_FREQUENCY` | M, W, F, Q, A |
| `TITLE` | ADV, CAPT, COL, DR, DS, JUDGE, KAPT, KOL, LADY, LORD, LT, MAJ, ME, MEJ, MEV, MISS, MNR, MR, MRS, MS, PAST, PROF, REV, SERS, SGT, SIR |

---

## Table 19: `status_account_type_rules`

Defines allowed status codes per account type (from Status & Acc Type matrix).

| Column | Type | Status | Description |
|--------|------|--------|-------------|
| `account_type` | CHAR(2) | PK, FK | References `reference_codes` where `code_type = ACCOUNT_TYPE` |
| `status_code` | CHAR(2) | PK, FK | References `reference_codes` where `code_type = STATUS_CODE` |
| `is_allowed_monthly` | BOOLEAN | M | Whether combination valid in monthly file |
| `is_allowed_daily` | BOOLEAN | M | Whether combination valid in daily file |
| `updated_by` | UUID | M, FK | Last editor |
| `updated_at` | TIMESTAMP | M | — |

---

## Table 20: `webhook_configs`

Webhook endpoint configuration per institution.

| Column | Type | Len | Status | Description | Validation |
|--------|------|-----|--------|-------------|------------|
| `webhook_id` | UUID | — | PK | — | — |
| `institution_id` | UUID | — | M, FK | — | Must exist |
| `url` | VARCHAR | 500 | M | HTTPS endpoint URL | Must be HTTPS; must pass test ping at config time |
| `secret_hash` | VARCHAR | 255 | M | HMAC signing secret hash | Min 32 chars before hash |
| `events` | TEXT[] | M | M | Subscribed event types | Each must be: `batch.completed`, `batch.validation_failed`, `batch.rejected` |
| `status` | ENUM | — | M | `ACTIVE` / `PAUSED` / `FAILED` | FAILED after 10 consecutive delivery failures |
| `failure_count` | SMALLINT | — | M | Consecutive delivery failures | Resets to 0 on success |
| `created_at` | TIMESTAMP | — | M | — | Auto-set |

---

## Table 21: `sftp_config`

SFTP batch transfer configuration per institution.

| Column | Type | Len | Status | Description |
|--------|------|-----|--------|-------------|
| `sftp_config_id` | UUID | — | PK | — |
| `institution_id` | UUID | — | M, FK | — |
| `sftp_directory` | VARCHAR | 200 | M | Auto-assigned inbox path per SRN |
| `authorised_public_keys` | JSONB | — | M | Array of PEM public key strings; at least 1 required |
| `pickup_schedule_cron` | VARCHAR | 50 | M | Cron expression for automated pickup |
| `status` | ENUM | — | M | `ACTIVE` / `INACTIVE` |
| `created_at` | TIMESTAMP | — | M | — |

---

## Table 22: `certification_tests`

Tracks sandbox certification scenarios per institution.

| Column | Type | Status | Description |
|--------|------|--------|-------------|
| `cert_test_id` | UUID | PK | — |
| `institution_id` | UUID | M, FK | — |
| `scenario_code` | VARCHAR(50) | M | e.g. `CLEAN_TEST_BATCH`, `ERROR_REMEDIATION`, `NO_MATCH_INQUIRY` |
| `status` | ENUM | M | `NOT_STARTED` / `IN_PROGRESS` / `PASS` / `FAIL` |
| `linked_batch_id` | UUID | O, FK | For batch-related scenarios |
| `linked_inquiry_id` | UUID | O, FK | For report-related scenarios |
| `notes` | TEXT | O | Ops notes |
| `completed_at` | TIMESTAMP | O | — |
| `completed_by` | UUID | O, FK | FK → `users.user_id` |

---

## File Naming Convention

Format: `{SRN}_ALL_{TYPE}702_M_{CCYYMMDD}_{seq1}_{seq2}.txt`

| Part | Description | Rules |
|------|-------------|-------|
| `{SRN}` | Supplier Reference Number | Matches `institutions.supplier_reference_number` |
| `ALL` | Literal | Fixed value |
| `{TYPE}` | `L` = Live, `T` = Test | Matches `batch_uploads.file_type` |
| `702` | Literal format version | Fixed value |
| `M` | Monthly indicator | Fixed value |
| `{CCYYMMDD}` | Month-end date | Valid month-end date |
| `{seq1}` | Primary sequence number | Starts at 1; increments per resubmission |
| `{seq2}` | Secondary sequence | Matches `seq1` unless split file scenario |
| `.txt` | Extension | ASCII fixed-length format |

**Examples:**
- `BW0001_ALL_L702_M_20260331_1_1.txt` — Live file, March 2026, first submission
- `BW0001_ALL_T702_M_20260331_1_1.txt` — Test file, March 2026
- `BW0001_ALL_L702_M_20260331_2_2.txt` — Live resubmission (seq 2)

---

## Form G Fixed-Length Record Layout (Monthly Data Record)

| Field | API Key | Format | Len | Offset | Status |
|-------|---------|--------|-----|--------|--------|
| Record Type | `record_type` | A 1 | 1 | 1 | M |
| OMANG ID Number | `omang_id_number` | N 13 | 13 | 2 | M |
| Passport Number | `passport_number` | A 16 | 16 | 15 | C |
| Gender | `gender` | A 1 | 1 | 31 | M |
| Date of Birth | `date_of_birth` | N 8 | 8 | 32 | M |
| Branch Code | `branch_code` | A 8 | 8 | 40 | O |
| Account Number | `account_number` | A 25 | 25 | 48 | M |
| Sub Account Number | `sub_account_number` | A 4 | 4 | 73 | M |
| Surname | `surname` | A 25 | 25 | 77 | M |
| Title | `title` | A 5 | 5 | 102 | O |
| Forename 1 | `forename_1` | A 14 | 14 | 107 | M |
| Forename 2 | `forename_2` | A 14 | 14 | 121 | C |
| Forename 3 | `forename_3` | A 14 | 14 | 135 | C |
| Residential Address Line 1 | `residential_address_line_1` | A 25 | 25 | 149 | M |
| Residential Address Line 2 | `residential_address_line_2` | A 25 | 25 | 174 | M |
| Residential Address Line 3 | `residential_address_line_3` | A 25 | 25 | 199 | O |
| Residential Address Line 4 | `residential_address_line_4` | A 25 | 25 | 224 | O |
| Residential Postal Code | `residential_postal_code` | A 6 | 6 | 249 | O |
| Owner/Tenant | `owner_tenant` | A 1 | 1 | 255 | O |
| Postal Address Line 1 | `postal_address_line_1` | A 25 | 25 | 256 | O |
| Postal Address Line 2 | `postal_address_line_2` | A 25 | 25 | 281 | O |
| Postal Address Line 3 | `postal_address_line_3` | A 25 | 25 | 306 | O |
| Postal Address Line 4 | `postal_address_line_4` | A 25 | 25 | 331 | O |
| Postal Post Code | `postal_post_code` | A 6 | 6 | 356 | O |
| Account Ownership Type | `account_ownership_type` | A 2 | 2 | 362 | M |
| Loan Reason | `loan_reason_code` | A 2 | 2 | 364 | M |
| Payment Type | `payment_type` | A 2 | 2 | 366 | M |
| Type of Account | `account_type` | A 2 | 2 | 368 | M |
| Date Account Opened | `date_account_opened` | N 8 | 8 | 370 | M |
| Deferred Payment Start Date | `deferred_payment_start_date` | N 8 | 8 | 378 | C |
| Last Payment Date | `last_payment_date` | N 8 | 8 | 386 | C |
| Opening Balance / Credit Limit | `opening_balance_or_credit_limit` | N 9 | 9 | 394 | M |
| Current Balance | `current_balance` | N 9 | 9 | 403 | C |
| Current Balance Indicator | `current_balance_indicator` | A 1 | 1 | 412 | M |
| Instalment Amount | `instalment_amount` | N 9 | 9 | 413 | C |
| Months in Arrears | `months_in_arrears` | N 2 | 2 | 422 | M |
| Amount Overdue | `amount_overdue` | N 8 | 8 | 424 | C |
| Status Code | `status_code` | A 2 | 2 | 432 | C |
| Repayment Frequency | `repayment_frequency` | N 2 | 2 | 434 | M |
| Loan Term / Duration | `loan_term` | N 4 | 4 | 436 | C |
| Status Date | `status_date` | N 8 | 8 | 440 | C |
| Old Supplier Branch Code | `old_supplier_branch_code` | A 8 | 8 | 448 | O |
| Old Account Number | `old_account_number` | A 25 | 25 | 456 | O |
| Old Sub Account No | `old_sub_account_number` | A 4 | 4 | 481 | O |
| Old Supplier Reference No | `old_supplier_reference_no` | A 10 | 10 | 485 | O |
| Home Telephone | `telephone_h` | N 10 | 10 | 495 | O |
| Cellular Telephone | `cellular_telephone` | N 10 | 10 | 505 | O |
| Work Telephone | `telephone_w` | N 10 | 10 | 515 | O |
| Income Frequency | `income_frequency` | A 1 | 1 | 525 | O |
| Third Party Name | `third_party_name` | A 60 | 60 | 526 | C |
| Account Sold to Third Party | `account_sold_to_third_party` | A 2 | 2 | 586 | C |
| No. of Participants in Joint Loan | `no_of_participants` | N 3 | 3 | 588 | C |
| Employer | `employer_name` | A 60 | 60 | 591 | O |
| Occupation | `occupation` | A 20 | 20 | 651 | O |
| Income | `income` | N 9 | 9 | 671 | O |
| Email Address | `email_address` | A 100 | 100 | 680 | O |
