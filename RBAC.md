# MFCB Platform — Role-Based Access Control (RBAC)

> Version 1.0 | 2026-05-06
> Source: SCREENS_UI_ANALYSIS.md · MFCB_Bank_Integration_API_Pack_and_System_Requirements

---

## 1. Role Definitions

| Role ID | Role Name | Scope | Actor Type |
|---------|-----------|-------|------------|
| `SUPER_ADMIN` | Super Admin | Platform-wide, all institutions | Bureau staff (privileged) |
| `BUREAU_OPS` | Bureau Operations | All institutions — batch management, onboarding, quality | Bureau staff |
| `COMPLIANCE` | Compliance Officer | Read-only across all data; regulatory exports | Bureau staff |
| `INST_ADMIN` | Institution Admin | Own institution only — users, submissions, reports | Bank / lender staff |
| `INST_USER` | Institution User | Own institution — submissions and reports (read) | Bank / lender staff |
| `AUDITOR` | Auditor | Audit logs, security events, regulatory exports (read-only) | Bureau / external auditor |
| `API_CLIENT` | API Client | Machine-to-machine, no portal access | System integration |

---

## 2. Permission Catalogue

All discrete permissions used in scope/RBAC checks.

| Permission Key | Description |
|----------------|-------------|
| `auth:login` | Authenticate via portal |
| `institutions:read` | View institution list and profiles |
| `institutions:create` | Create new institution |
| `institutions:edit` | Edit institution profile, status, products |
| `institutions:suspend` | Suspend or deactivate institution |
| `users:read` | View users |
| `users:create` | Invite new user |
| `users:edit` | Edit user role, status |
| `users:mfa_reset` | Reset another user's MFA |
| `batches:submit` | Submit batch (JSON or file) |
| `batches:read` | View batch status and metadata |
| `batches:errors:read` | View validation errors for batches |
| `batches:accepted:read` | View accepted records for reconciliation |
| `batches:force_retry` | Force-retry a stuck batch (ops only) |
| `batches:quarantine` | Quarantine a batch for manual review |
| `reports:request` | Initiate credit report inquiry |
| `reports:read` | View generated credit report |
| `reports:pdf` | Download credit report as PDF |
| `inquiries:read_own` | View own institution's inquiry history |
| `inquiries:read_all` | View inquiry history across all institutions |
| `reference:read` | Read reference code tables |
| `reference:edit` | Create, deprecate reference codes |
| `reference:approve` | Approve pending reference code changes |
| `audit:read` | View audit log |
| `audit:export` | Export audit log (itself logged) |
| `security_events:read` | View security event log |
| `corrections:request` | Request a data correction |
| `corrections:approve` | Approve a data correction (maker-checker) |
| `regulatory_reports:export` | Generate and download regulatory reports |
| `sandbox:manage` | Manage certification test scenarios |
| `webhooks:configure` | Configure webhook endpoints |
| `webhooks:test` | Send test webhook payload |
| `sftp:configure` | Configure SFTP settings |
| `api_clients:create` | Create API client credentials |
| `api_clients:regenerate` | Regenerate API client secret |
| `api_clients:revoke` | Revoke API client |
| `ops:queue:read` | View batch processing queue |
| `ops:queue:manage` | Force retry / quarantine queue items |
| `data_quality:read` | View data quality dashboard |
| `compliance_dashboard:read` | View compliance dashboard |
| `status_matrix:edit` | Edit status × account type matrix |

---

## 3. Role → Permission Matrix

`✓` = granted | `—` = not granted | `(own)` = own institution only

| Permission | SUPER_ADMIN | BUREAU_OPS | COMPLIANCE | INST_ADMIN | INST_USER | AUDITOR | API_CLIENT |
|---|---|---|---|---|---|---|---|
| `auth:login` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| `institutions:read` | ✓ | ✓ | ✓ | ✓ (own) | — | ✓ | — |
| `institutions:create` | ✓ | ✓ | — | — | — | — | — |
| `institutions:edit` | ✓ | ✓ | — | ✓ (own) | — | — | — |
| `institutions:suspend` | ✓ | — | — | — | — | — | — |
| `users:read` | ✓ | ✓ | — | ✓ (own) | — | — | — |
| `users:create` | ✓ | ✓ | — | ✓ (own) | — | — | — |
| `users:edit` | ✓ | ✓ | — | ✓ (own) | — | — | — |
| `users:mfa_reset` | ✓ | — | — | — | — | — | — |
| `batches:submit` | ✓ | ✓ | — | ✓ (own) | ✓ (own) | — | ✓ (own) |
| `batches:read` | ✓ | ✓ | ✓ | ✓ (own) | ✓ (own) | ✓ | ✓ (own) |
| `batches:errors:read` | ✓ | ✓ | ✓ | ✓ (own) | ✓ (own) | ✓ | ✓ (own) |
| `batches:accepted:read` | ✓ | ✓ | — | ✓ (own) | ✓ (own) | — | ✓ (own) |
| `batches:force_retry` | ✓ | ✓ | — | — | — | — | — |
| `batches:quarantine` | ✓ | ✓ | — | — | — | — | — |
| `reports:request` | ✓ | ✓ | — | ✓ (own) | ✓ (own) | — | ✓ (own) |
| `reports:read` | ✓ | ✓ | — | ✓ (own) | ✓ (own) | — | ✓ (own) |
| `reports:pdf` | ✓ | ✓ | — | ✓ (own) | ✓ (own) | — | — |
| `inquiries:read_own` | ✓ | ✓ | ✓ | ✓ (own) | ✓ (own) | ✓ | ✓ (own) |
| `inquiries:read_all` | ✓ | ✓ | ✓ | — | — | ✓ | — |
| `reference:read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `reference:edit` | ✓ | ✓ | — | — | — | — | — |
| `reference:approve` | ✓ | — | — | — | — | — | — |
| `audit:read` | ✓ | ✓ (own+ops) | — | — | — | ✓ | — |
| `audit:export` | ✓ | — | — | — | — | ✓ | — |
| `security_events:read` | ✓ | ✓ | — | — | — | ✓ | — |
| `corrections:request` | ✓ | ✓ | — | — | — | — | — |
| `corrections:approve` | ✓ | — | — | — | — | — | — |
| `regulatory_reports:export` | ✓ | — | ✓ | — | — | ✓ | — |
| `sandbox:manage` | ✓ | ✓ | — | ✓ (own) | — | — | — |
| `webhooks:configure` | ✓ | ✓ | — | ✓ (own) | — | — | — |
| `webhooks:test` | ✓ | ✓ | — | ✓ (own) | — | — | — |
| `sftp:configure` | ✓ | ✓ | — | — | — | — | — |
| `api_clients:create` | ✓ | ✓ | — | — | — | — | — |
| `api_clients:regenerate` | ✓ | ✓ | — | — | — | — | — |
| `api_clients:revoke` | ✓ | — | — | — | — | — | — |
| `ops:queue:read` | ✓ | ✓ | — | — | — | — | — |
| `ops:queue:manage` | ✓ | ✓ | — | — | — | — | — |
| `data_quality:read` | ✓ | ✓ | ✓ | ✓ (own) | — | — | — |
| `compliance_dashboard:read` | ✓ | ✓ | ✓ | — | — | ✓ | — |
| `status_matrix:edit` | ✓ | — | — | — | — | — | — |

---

## 4. Screen Access Matrix

`✓` = full access | `R` = read-only | `(own)` = restricted to own institution | `—` = no access

| Screen | SUPER_ADMIN | BUREAU_OPS | COMPLIANCE | INST_ADMIN | INST_USER | AUDITOR | API_CLIENT |
|--------|---|---|---|---|---|---|---|
| **Module 1 — Auth** | | | | | | | |
| 1.1 Login | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| 1.2 MFA | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| 1.3 Forgot/Reset Password | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| 1.4 MFA Enrollment | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| **Module 2 — Institutions** | | | | | | | |
| 2.1 Institution Registry | ✓ | ✓ | R | R (own) | — | R | — |
| 2.2 Institution Profile | ✓ | ✓ | R | ✓ (own) | — | R | — |
| 2.3 Onboarding Wizard | ✓ | ✓ | — | — | — | — | — |
| 2.4 Institution User Mgmt | ✓ | ✓ | — | ✓ (own) | — | — | — |
| 2.5 SFTP Config | ✓ | ✓ | — | — | — | — | — |
| 2.6 Webhook Config | ✓ | ✓ | — | ✓ (own) | — | — | — |
| **Module 3 — Batch** | | | | | | | |
| 3.1 Batch Dashboard | ✓ | ✓ | R | ✓ (own) | R (own) | R | — |
| 3.2 New Batch Upload | ✓ | ✓ | — | ✓ (own) | ✓ (own) | — | API only |
| 3.3 Batch Status Detail | ✓ | ✓ | R | ✓ (own) | R (own) | R | API only |
| 3.4 Validation Errors | ✓ | ✓ | R | ✓ (own) | R (own) | R | API only |
| 3.5 Accepted Records | ✓ | ✓ | — | ✓ (own) | ✓ (own) | — | API only |
| 3.6 SFTP Batch Monitor | ✓ | ✓ | — | — | — | — | — |
| **Module 4 — Quality** | | | | | | | |
| 4.1 Data Quality Dashboard | ✓ | ✓ | R | R (own) | — | — | — |
| 4.2 Submission Compliance | ✓ | ✓ | R | — | — | R | — |
| 4.3 Resubmission History | ✓ | ✓ | R | R (own) | — | R | — |
| 4.4 Manual Correction | ✓ | ✓ | — | — | — | — | — |
| **Module 5 — Credit Report** | | | | | | | |
| 5.1 Borrower Search | ✓ | ✓ | — | ✓ (own) | ✓ (own) | — | API only |
| 5.2 Credit Report View | ✓ | ✓ | — | ✓ (own) | ✓ (own) | — | API only |
| 5.3 Inquiry History (inst) | ✓ | ✓ | R | R (own) | R (own) | R | — |
| 5.4 Inquiry Audit (all) | ✓ | ✓ | R | — | — | R | — |
| 5.5 Match Resolution | ✓ | ✓ | — | — | — | — | — |
| **Module 6 — Ops** | | | | | | | |
| 6.1 Ops Home Dashboard | ✓ | ✓ | — | — | — | — | — |
| 6.2 Compliance Dashboard | ✓ | ✓ | R | — | — | R | — |
| 6.3 Batch Queue Monitor | ✓ | ✓ | — | — | — | — | — |
| 6.4 Institution Engagement | ✓ | ✓ | — | — | — | — | — |
| 6.5 Sandbox / Cert Centre | ✓ | ✓ | — | ✓ (own) | — | — | — |
| **Module 7 — Reference Data** | | | | | | | |
| 7.1 Reference Tables List | ✓ | ✓ | R | R | R | R | R (API) |
| 7.2 Reference Code Edit | ✓ | ✓ | — | — | — | — | — |
| 7.3 Status × Acct Matrix | ✓ | R | — | — | — | — | — |
| **Module 8 — Audit** | | | | | | | |
| 8.1 Audit Log Viewer | ✓ | R (ops-scoped) | — | — | — | R | — |
| 8.2 Security Event Log | ✓ | R | — | — | — | R | — |
| 8.3 Regulatory Export | ✓ | — | ✓ | — | — | ✓ | — |
| **Module 9 — Users** | | | | | | | |
| 9.1 User List | ✓ | ✓ | — | ✓ (own) | — | — | — |
| 9.2 User Profile / Edit | ✓ | ✓ | — | ✓ (own) | — | — | — |
| 9.3 Role Permissions Matrix | ✓ | — | — | — | — | — | — |
| 9.4 API Client Management | ✓ | ✓ | — | — | — | — | — |

---

## 5. API OAuth Scope → Role Mapping

| OAuth Scope | Allowed Roles | Notes |
|-------------|--------------|-------|
| `submit:data` | `INST_ADMIN`, `INST_USER`, `API_CLIENT`, `SUPER_ADMIN`, `BUREAU_OPS` | Own institution only for inst roles |
| `read:batch` | `INST_ADMIN`, `INST_USER`, `API_CLIENT`, `SUPER_ADMIN`, `BUREAU_OPS`, `COMPLIANCE`, `AUDITOR` | Own institution partition for inst/API roles |
| `read:errors` | `INST_ADMIN`, `INST_USER`, `API_CLIENT`, `SUPER_ADMIN`, `BUREAU_OPS`, `COMPLIANCE`, `AUDITOR` | Own institution partition |
| `read:reports` | `INST_ADMIN`, `INST_USER`, `API_CLIENT`, `SUPER_ADMIN`, `BUREAU_OPS` | Own institution partition |
| `admin:institution` | `SUPER_ADMIN`, `BUREAU_OPS` | Bureau staff only |
| `webhook:receive` | `API_CLIENT` | Inbound webhook receiver scope |
| `read:reference` | All authenticated | Public reference data |
| `read:audit` | `SUPER_ADMIN`, `BUREAU_OPS`, `AUDITOR` | Audit-grade roles only |

---

## 6. Data Partition Rules (Institution Isolation)

These rules apply **in addition to** role permissions. They are enforced at the service layer, not just the UI.

| Rule | Enforcement |
|------|-------------|
| Institution users and API clients can only access batches where `batch_uploads.institution_id = token.institution_id` | Query filter — never a URL-only check |
| Institution users can only view `validation_errors` and `raw_submission_records` belonging to their own batches | Join through `batch_uploads.institution_id` |
| Credit inquiries are partitioned: institution sees only `credit_inquiries.institution_id = token.institution_id` | Query filter |
| Credit report response content is filtered to the institution's enabled products (`institutions.enabled_products`) | Service-layer field filter |
| Income field (`income`) is never returned in credit report responses regardless of role | Hard-coded mask — regulatory requirement |
| An attempt by institution A to access institution B's resources returns HTTP 403 and writes a `CROSS_INSTITUTION_ATTEMPT` security event | Middleware check before controller |
| `BUREAU_OPS` audit log access is scoped to operational events; security investigation events require `SUPER_ADMIN` or `AUDITOR` | Log query filter by event_category |

---

## 7. MFA Requirements by Role

| Role | MFA Required | Enforcement Point |
|------|-------------|-------------------|
| `SUPER_ADMIN` | Mandatory, cannot skip | Login flow — no portal access without MFA enrolled |
| `BUREAU_OPS` | Mandatory | Login flow |
| `COMPLIANCE` | Mandatory | Login flow |
| `INST_ADMIN` | Mandatory | Login flow |
| `INST_USER` | Mandatory | Login flow |
| `AUDITOR` | Mandatory | Login flow |
| `API_CLIENT` | N/A — uses OAuth client credentials | Token endpoint |

---

## 8. Session and Token Rules

| Rule | Value |
|------|-------|
| Portal session TTL (idle) | 30 minutes |
| Portal session TTL (absolute) | 8 hours |
| OAuth access token TTL (default) | 1 hour |
| OAuth access token TTL (configurable max) | 24 hours |
| Session invalidated on: | Role change, account lock, deactivation, manual revoke |
| Concurrent session policy | Single active session per portal user (second login invalidates first) |
| Failed login lockout threshold | 5 attempts |
| Lockout duration | 30 minutes (auto-unlock) or manual unlock by admin |

---

## 9. Elevated Action Controls (Maker-Checker)

Actions that require a second approver distinct from the initiator.

| Action | Initiator Role | Approver Role | Log Action |
|--------|---------------|--------------|-----------|
| Data correction to a financial field | `BUREAU_OPS` | `SUPER_ADMIN` | `DATA_CORRECTION_APPROVED` |
| Suspend an institution | `BUREAU_OPS` | `SUPER_ADMIN` | `INSTITUTION_SUSPENDED` |
| Reference code deprecation | `BUREAU_OPS` | `SUPER_ADMIN` | `REFERENCE_CODE_DEPRECATED` |
| New reference code activation | `BUREAU_OPS` | `SUPER_ADMIN` | `REFERENCE_CODE_ACTIVATED` |
| Status × Account Type matrix change | `SUPER_ADMIN` only | — (Super Admin self-approves with MFA re-auth) | `STATUS_MATRIX_CHANGED` |
| API client secret regeneration | `BUREAU_OPS` | `SUPER_ADMIN` | `API_SECRET_REGENERATED` |
| Audit log export | `AUDITOR` / `SUPER_ADMIN` | — (self, but logged) | `AUDIT_EXPORT` |

---

## 10. Field-Level Security Rules

| Field | Rule | Roles with Access |
|-------|------|-------------------|
| `income` | Never displayed; fully masked in all report responses | None (stored only) |
| `omang_id_number` | Masked in UI (last 4 visible) in lists; full value in report sections for authorised roles | `INST_ADMIN`, `INST_USER`, `BUREAU_OPS`, `SUPER_ADMIN` in credit report context only |
| `passport_number` | Same masking as Omang | Same as above |
| `account_number` | Last 4 visible in reconciliation and report lists | All authorised roles |
| `client_secret` | Shown once at creation; never retrievable after | `SUPER_ADMIN`, `BUREAU_OPS` (creation only) |
| `password_hash` | Never exposed via any API or UI | System only |
| `raw_submission_records.raw_payload` | Bureau Ops + Super Admin for correction workflow only | `BUREAU_OPS`, `SUPER_ADMIN` |
