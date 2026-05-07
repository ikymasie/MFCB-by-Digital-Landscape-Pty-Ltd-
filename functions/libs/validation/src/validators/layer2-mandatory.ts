import { FormGRecord, ValidationError } from '../types';
import { ErrorCodes } from '../error-codes';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function rejectErr(
  rowNumber: number,
  field: string | null,
  code: string,
  message: string,
  raw_value: string | null,
  category: ValidationError['error_category'],
): ValidationError {
  return { row_number: rowNumber, field, code, severity: 'REJECT', raw_value, message, error_category: category };
}

// ---------------------------------------------------------------------------
// Mandatory fields (non-empty after trim)
// ---------------------------------------------------------------------------

const MANDATORY_FIELDS: Array<{ field: keyof FormGRecord; category: ValidationError['error_category'] }> = [
  { field: 'surname',                         category: 'IDENTITY'  },
  { field: 'forename_1',                      category: 'IDENTITY'  },
  { field: 'gender',                          category: 'IDENTITY'  },
  { field: 'date_of_birth',                   category: 'DATE'      },
  { field: 'account_number',                  category: 'IDENTITY'  },
  { field: 'sub_account_number',              category: 'IDENTITY'  },
  { field: 'account_ownership_type',          category: 'REFERENCE' },
  { field: 'loan_reason_code',                category: 'REFERENCE' },
  { field: 'payment_type',                    category: 'REFERENCE' },
  { field: 'account_type',                    category: 'REFERENCE' },
  { field: 'date_account_opened',             category: 'DATE'      },
  { field: 'opening_balance_or_credit_limit', category: 'FINANCIAL' },
  { field: 'current_balance_indicator',       category: 'FINANCIAL' },
  { field: 'months_in_arrears',               category: 'FINANCIAL' },
  { field: 'repayment_frequency',             category: 'REFERENCE' },
  { field: 'residential_address_line_1',      category: 'IDENTITY'  },
  { field: 'residential_address_line_2',      category: 'IDENTITY'  },
];

// ---------------------------------------------------------------------------
// Layer 2 — mandatory field presence
// ---------------------------------------------------------------------------

export function validateLayer2(record: FormGRecord, rowNumber: number): ValidationError[] {
  const errors: ValidationError[] = [];

  // record_type must be 'D'
  const recType = record.record_type.trim();
  if (recType !== 'D') {
    errors.push(rejectErr(
      rowNumber, 'record_type', ErrorCodes.MISSING_MANDATORY_FIELD,
      `record_type must be 'D' for data records, got '${recType}'`,
      recType, 'IDENTITY',
    ));
  }

  // Standard mandatory fields
  for (const { field, category } of MANDATORY_FIELDS) {
    const val = (record[field] as string).trim();
    if (val === '') {
      errors.push(rejectErr(
        rowNumber, field, ErrorCodes.MISSING_MANDATORY_FIELD,
        `Mandatory field '${field}' is missing or empty`,
        null, category,
      ));
    }
  }

  // Identity check: at least one of omang or passport must be present
  const omang    = record.omang_id_number.trim();
  const passport = record.passport_number.trim();
  if (omang === '' && passport === '') {
    errors.push(rejectErr(
      rowNumber, null, ErrorCodes.MISSING_OMANG_AND_PASSPORT,
      'At least one of omang_id_number or passport_number must be provided',
      null, 'IDENTITY',
    ));
  }

  return errors;
}
