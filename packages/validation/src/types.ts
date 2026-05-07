export interface FormGRecord {
  // Identity
  record_type: string;           // 1 char
  omang_id_number: string;       // 13 chars (9 numeric + 4 spaces or zeros in fixed format)
  passport_number: string;       // 16 chars
  gender: string;                // 1 char
  date_of_birth: string;         // 8 chars CCYYMMDD
  surname: string;               // 25 chars
  title: string;                 // 5 chars
  forename_1: string;            // 14 chars
  forename_2: string;            // 14 chars
  forename_3: string;            // 14 chars
  // Address
  residential_address_line_1: string;  // 25
  residential_address_line_2: string;  // 25
  residential_address_line_3: string;  // 25
  residential_address_line_4: string;  // 25
  residential_postal_code: string;     // 6
  owner_tenant: string;                // 1
  postal_address_line_1: string;       // 25
  postal_address_line_2: string;       // 25
  postal_address_line_3: string;       // 25
  postal_address_line_4: string;       // 25
  postal_post_code: string;            // 6
  // Account
  branch_code: string;                // 8
  account_number: string;             // 25
  sub_account_number: string;         // 4
  account_ownership_type: string;     // 2
  loan_reason_code: string;           // 2
  payment_type: string;               // 2
  account_type: string;               // 2
  date_account_opened: string;        // 8 CCYYMMDD
  deferred_payment_start_date: string; // 8 CCYYMMDD
  last_payment_date: string;          // 8 CCYYMMDD
  opening_balance_or_credit_limit: string;  // 9 numeric
  current_balance: string;            // 9 numeric
  current_balance_indicator: string;  // 1
  instalment_amount: string;          // 9 numeric
  months_in_arrears: string;          // 2 numeric
  amount_overdue: string;             // 8 numeric
  status_code: string;                // 2
  repayment_frequency: string;        // 2 numeric
  loan_term: string;                  // 4 numeric
  status_date: string;                // 8 CCYYMMDD
  // Old account refs
  old_supplier_branch_code: string;   // 8
  old_account_number: string;         // 25
  old_sub_account_number: string;     // 4
  old_supplier_reference_no: string;  // 10
  // Contact
  telephone_h: string;                // 10
  cellular_telephone: string;         // 10
  telephone_w: string;                // 10
  income_frequency: string;           // 1
  third_party_name: string;           // 60
  account_sold_to_third_party: string; // 2
  no_of_participants: string;         // 3 numeric
  employer_name: string;              // 60
  occupation: string;                 // 20
  // NOTE: income field is intentionally excluded from this interface (regulatory requirement)
  email_address: string;              // 100
}

export interface ValidationError {
  row_number: number;
  field: string | null;
  code: string;
  severity: 'REJECT' | 'WARN';
  raw_value: string | null;
  message: string;
  error_category: 'IDENTITY' | 'DATE' | 'FINANCIAL' | 'STATUS' | 'REFERENCE' | 'DUPLICATE' | 'CROSS_FIELD' | 'FILE_LEVEL';
}

export interface ValidationResult {
  total_records: number;
  accepted_count: number;
  rejected_count: number;
  warning_count: number;
  errors: ValidationError[];
  record_results: RecordValidationResult[];
}

export interface RecordValidationResult {
  row_number: number;
  is_valid: boolean;   // true if no REJECT errors
  errors: ValidationError[];
  parsed: FormGRecord;
}

export interface FileValidationResult {
  is_valid: boolean;
  supplier_reference_number: string;
  reporting_month: string;
  file_version: string;
  file_creation_date: string;
  record_count_from_trailer: number;
  errors: ValidationError[];
}

export interface BatchContext {
  institution_supplier_ref: string;  // SRN from the authenticated institution
  reporting_month: string;           // CCYYMMDD of month-end
  file_type: 'TEST' | 'LIVE';
  source_file_name?: string;
  account_keys_seen: Set<string>;    // for duplicate detection within batch
}
