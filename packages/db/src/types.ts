// ============================================================
// MFCB Database TypeScript Interfaces — all 22 tables
// ============================================================

export interface Institution {
  institution_id: string;
  name: string;
  supplier_reference_number: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  integration_channel: 'REST_API' | 'PORTAL_UPLOAD' | 'SFTP';
  enabled_products: string[];
  allowed_ip_ranges: Record<string, unknown> | null;
  mtls_cert_fingerprint: string | null;
  onboarded_at: Date | null;
  onboarded_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ApiClient {
  client_id: string;
  institution_id: string;
  client_secret_hash: string;
  scopes: string[];
  allowed_ip_ranges: Record<string, unknown> | null;
  token_ttl_seconds: number;
  expires_at: Date | null;
  status: 'ACTIVE' | 'REVOKED';
  last_used_at: Date | null;
  created_at: Date;
  created_by: string;
}

export interface User {
  user_id: string;
  email: string;
  full_name: string;
  password_hash: string;
  role_id: string;
  institution_id: string | null;
  mfa_enrolled: boolean;
  mfa_secret_encrypted: string | null;
  status: 'ACTIVE' | 'LOCKED' | 'INACTIVE';
  failed_login_count: number;
  locked_until: Date | null;
  last_login_at: Date | null;
  invited_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Role {
  role_id: string;
  role_name: string;
  scope: 'PLATFORM' | 'INSTITUTION';
  description: string | null;
}

export interface RolePermission {
  role_id: string;
  permission_key: string;
  scope_restriction: 'OWN_INSTITUTION' | 'ALL' | null;
}

export interface BatchUpload {
  batch_id: string;
  institution_id: string;
  supplier_reference_number: string;
  reporting_month: string;
  file_type: 'TEST' | 'LIVE';
  sequence_number: number;
  idempotency_key: string;
  source_file_name: string | null;
  file_hash_sha256: string | null;
  file_size_bytes: number | null;
  channel: 'REST_API' | 'PORTAL_UPLOAD' | 'SFTP';
  status: 'QUEUED' | 'VALIDATING' | 'COMPLETED' | 'FAILED' | 'QUARANTINED';
  stage: string;
  total_records: number | null;
  accepted_count: number | null;
  rejected_count: number | null;
  warning_count: number | null;
  header_supplier_ref: string | null;
  header_month_end: string | null;
  header_version: string | null;
  header_file_creation_date: string | null;
  trailer_record_count: number | null;
  queued_at: Date;
  started_at: Date | null;
  completed_at: Date | null;
  submitted_by_user_id: string | null;
  submitted_by_client_id: string | null;
  correlation_id: string;
  created_at: Date;
}

export interface RawSubmissionRecord {
  raw_record_id: string;
  batch_id: string;
  row_number: number;
  record_type: string;
  raw_payload: Record<string, unknown>;
  is_correction: boolean;
  corrects_raw_record_id: string | null;
  correction_reason: string | null;
  correction_approved_by: string | null;
  created_at: Date;
}

export interface ValidationError {
  error_id: string;
  batch_id: string;
  raw_record_id: string | null;
  row_number: number | null;
  field: string | null;
  code: string;
  severity: 'REJECT' | 'WARN';
  raw_value: string | null;
  message: string;
  error_category: 'IDENTITY' | 'DATE' | 'FINANCIAL' | 'STATUS' | 'REFERENCE' | 'DUPLICATE' | 'CROSS_FIELD' | 'FILE_LEVEL';
  created_at: Date;
}

export interface Borrower {
  borrower_id: string;
  omang_id_number: string | null;
  passport_number: string | null;
  surname: string;
  forename_1: string;
  forename_2: string | null;
  forename_3: string | null;
  title: string | null;
  gender: string;
  date_of_birth: string;
  nationality: string | null;
  marital_status: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface BorrowerIdentifier {
  identifier_id: string;
  borrower_id: string;
  id_type: 'OMANG' | 'PASSPORT' | 'OTHER_ID';
  id_value: string;
  effective_from: Date;
  effective_to: Date | null;
  source_institution_id: string;
  source_batch_id: string;
}

export interface BorrowerAddress {
  address_id: string;
  borrower_id: string;
  address_type: 'RESIDENTIAL' | 'POSTAL';
  line_1: string;
  line_2: string;
  line_3: string | null;
  line_4: string | null;
  postal_code: string | null;
  owner_tenant: string | null;
  effective_from: Date;
  effective_to: Date | null;
  source_batch_id: string;
}

export interface BorrowerEmployment {
  employment_id: string;
  borrower_id: string;
  employer_name: string | null;
  occupation: string | null;
  income: number | null;
  income_frequency: string | null;
  source_batch_id: string;
  reporting_month: string;
}

export interface CreditAccount {
  credit_account_id: string;
  institution_id: string;
  borrower_id: string;
  branch_code: string | null;
  account_number: string;
  sub_account_number: string;
  account_ownership_type: string;
  loan_reason_code: string;
  payment_type: string;
  account_type: string;
  date_account_opened: string;
  deferred_payment_start_date: string | null;
  last_payment_date: string | null;
  opening_balance_or_credit_limit: number;
  current_balance: number | null;
  current_balance_indicator: string;
  instalment_amount: number | null;
  months_in_arrears: string;
  amount_overdue: number | null;
  status_code: string | null;
  status_date: string | null;
  repayment_frequency: string;
  loan_term: string | null;
  no_of_participants: number | null;
  third_party_name: string | null;
  account_sold_to_third_party: string | null;
  old_supplier_branch_code: string | null;
  old_account_number: string | null;
  old_sub_account_number: string | null;
  old_supplier_reference_no: string | null;
  cellular_telephone: string | null;
  telephone_h: string | null;
  telephone_w: string | null;
  email_address: string | null;
  first_reporting_month: string;
  last_reporting_month: string;
  created_at: Date;
  updated_at: Date;
}

export interface RepaymentHistory {
  history_id: string;
  credit_account_id: string;
  reporting_month: string;
  months_in_arrears: string;
  current_balance: number;
  instalment_amount: number;
  amount_overdue: number;
  payment_type: string;
  status_code: string | null;
  batch_id: string;
  created_at: Date;
}

export interface AccountStatusEvent {
  event_id: string;
  credit_account_id: string;
  status_code: string;
  status_date: string;
  submitted_month: string;
  batch_id: string;
  created_at: Date;
}

export interface CreditInquiry {
  inquiry_id: string;
  institution_id: string;
  requested_by_user_id: string | null;
  requested_by_client_id: string | null;
  search_type: 'OMANG' | 'PASSPORT' | 'ACCOUNT_NUMBER' | 'CELLULAR' | 'SURNAME_DOB';
  search_value_masked: string;
  inquiry_reason: string;
  customer_consent_reference: string | null;
  result: 'MATCH' | 'NO_MATCH' | 'MATCH_REVIEW_REQUIRED';
  borrower_id: string | null;
  report_id: string | null;
  correlation_id: string;
  ip_address: string;
  created_at: Date;
}

export interface AuditLog {
  audit_id: string;
  actor_id: string;
  actor_type: 'USER' | 'API_CLIENT' | 'SYSTEM';
  institution_id: string | null;
  action: string;
  object_type: string | null;
  object_id: string | null;
  correlation_id: string;
  ip_address: string;
  result: 'SUCCESS' | 'FAILURE';
  detail: Record<string, unknown> | null;
  event_category: 'AUTH' | 'DATA' | 'ADMIN' | 'REPORT' | 'SECURITY' | 'CONFIG';
  timestamp: Date;
}

export interface ReferenceCode {
  code_type: string;
  code: string;
  description: string;
  definition: string | null;
  effective_date: string;
  deprecated_at: string | null;
  display_order: number | null;
  created_by: string;
  approved_by: string | null;
  created_at: Date;
}

export interface StatusAccountTypeRule {
  account_type: string;
  status_code: string;
  is_allowed_monthly: boolean;
  is_allowed_daily: boolean;
  updated_by: string;
  updated_at: Date;
}

export interface WebhookConfig {
  webhook_id: string;
  institution_id: string;
  url: string;
  secret_hash: string;
  events: string[];
  status: 'ACTIVE' | 'PAUSED' | 'FAILED';
  failure_count: number;
  created_at: Date;
}

export interface SftpConfig {
  sftp_config_id: string;
  institution_id: string;
  sftp_directory: string;
  authorised_public_keys: Record<string, unknown>;
  pickup_schedule_cron: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: Date;
}

export interface CertificationTest {
  cert_test_id: string;
  institution_id: string;
  scenario_code: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'PASS' | 'FAIL';
  linked_batch_id: string | null;
  linked_inquiry_id: string | null;
  notes: string | null;
  completed_at: Date | null;
  completed_by: string | null;
}
