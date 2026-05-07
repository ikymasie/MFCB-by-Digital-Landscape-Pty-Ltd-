import { FormGRecord, ValidationError } from '../types';
import { ErrorCodes } from '../error-codes';
import { parseDate } from './layer4-domain';

// ---------------------------------------------------------------------------
// Status × Account type matrix
// ---------------------------------------------------------------------------

const ALL_STATUS_CODES = ['B','C','D','E','I','J','L','P','T','U','V','W','Y','Z'];

/**
 * Account types where Early Settlement (E) is NOT allowed.
 * Rule: no E for F, G, M, O, U, V, W, X, Z (and also B per the notes)
 */
const NO_EARLY_SETTLEMENT = new Set(['B','F','G','M','O','U','V','W','X','Z']);

/**
 * Account types where Voluntarily Surrendered (V) is NOT allowed.
 * Rule: no V for B, G, M, U, W, Z
 */
const NO_VOLUNTARY_SURRENDER = new Set(['B','G','M','U','W','Z']);

/**
 * Build the allowed status codes per account type.
 * Start with ALL statuses allowed, then remove disallowed ones per above rules.
 */
function buildAllowedMatrix(): Map<string, Set<string>> {
  const matrix = new Map<string, Set<string>>();

  // All known account type codes
  const ALL_ACCOUNT_TYPES = [
    'B','C','D','E','F','G','H','I','M','N','O','P','R','S','T','U','V','W','X','Y','Z',
  ];

  for (const at of ALL_ACCOUNT_TYPES) {
    const allowed = new Set(ALL_STATUS_CODES);

    if (NO_EARLY_SETTLEMENT.has(at)) {
      allowed.delete('E');
    }
    if (NO_VOLUNTARY_SURRENDER.has(at)) {
      allowed.delete('V');
    }

    matrix.set(at, allowed);
  }

  return matrix;
}

const ALLOWED_STATUS_MATRIX = buildAllowedMatrix();

// ---------------------------------------------------------------------------
// Status codes that do NOT require a status_date
// ---------------------------------------------------------------------------
const NO_STATUS_DATE_REQUIRED = new Set(['B','C','D','P','S','T','U','V','Y','Z']);

// ---------------------------------------------------------------------------
// Deferred payment type
// ---------------------------------------------------------------------------
const DEFERRED_PAYMENT_TYPE = '02';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusErr(
  rowNumber: number,
  field: string,
  code: string,
  message: string,
  raw_value: string | null,
  category: ValidationError['error_category'],
  severity: ValidationError['severity'] = 'REJECT',
): ValidationError {
  return { row_number: rowNumber, field, code, severity, raw_value, message, error_category: category };
}

function isBlankDate(val: string): boolean {
  const t = val.trim();
  return t === '' || /^0+$/.test(t);
}

// ---------------------------------------------------------------------------
// Layer 6 — status code rules and deferred payment checks
// ---------------------------------------------------------------------------

export function validateLayer6(
  record: FormGRecord,
  rowNumber: number,
  reportingMonthDate: Date,
): ValidationError[] {
  const errors: ValidationError[] = [];

  const statusCode   = record.status_code.trim();
  const accountType  = record.account_type.trim();
  const statusDate   = record.status_date.trim();
  const paymentType  = record.payment_type.trim();
  const deferredDate = record.deferred_payment_start_date.trim();

  // ---- Status code vs account type matrix ----

  if (statusCode !== '' && accountType !== '') {
    const allowedForType = ALLOWED_STATUS_MATRIX.get(accountType);
    if (allowedForType && !allowedForType.has(statusCode)) {
      errors.push(statusErr(
        rowNumber, 'status_code', ErrorCodes.INVALID_STATUS_FOR_ACCOUNT_TYPE,
        `status_code '${statusCode}' is not allowed for account_type '${accountType}'`,
        statusCode, 'STATUS',
      ));
    }
  }

  // ---- Status date required ----
  // Required when status_code is populated AND not in the set that doesn't require it

  if (statusCode !== '' && !NO_STATUS_DATE_REQUIRED.has(statusCode) && isBlankDate(statusDate)) {
    errors.push(statusErr(
      rowNumber, 'status_date', ErrorCodes.STATUS_DATE_REQUIRED,
      `status_date is required for status_code '${statusCode}'`,
      null, 'STATUS',
    ));
  }

  // ---- Deferred payment checks ----

  if (paymentType === DEFERRED_PAYMENT_TYPE) {
    // DEFERRED_DATE_REQUIRED: deferred start date must be present
    if (isBlankDate(deferredDate)) {
      errors.push(statusErr(
        rowNumber, 'deferred_payment_start_date', ErrorCodes.DEFERRED_DATE_REQUIRED,
        `deferred_payment_start_date is required when payment_type is '${DEFERRED_PAYMENT_TYPE}'`,
        null, 'STATUS',
      ));
    } else {
      const deferredDateObj = parseDate(deferredDate);
      if (deferredDateObj) {
        // DEFERRED_DATE_PAST: deferred start date must be after (not on/before) reporting month
        if (deferredDateObj <= reportingMonthDate) {
          errors.push(statusErr(
            rowNumber, 'deferred_payment_start_date', ErrorCodes.DEFERRED_DATE_PAST,
            `deferred_payment_start_date '${deferredDate}' must be after the reporting month`,
            deferredDate, 'STATUS',
          ));
        }
      }
    }
  }

  // DEFERRED_DATE_TOO_FAR: regardless of payment type, if populated, must not be >23 months after reporting month
  if (!isBlankDate(deferredDate)) {
    const deferredDateObj = parseDate(deferredDate);
    if (deferredDateObj) {
      const maxDate = new Date(reportingMonthDate);
      maxDate.setMonth(maxDate.getMonth() + 23);
      if (deferredDateObj > maxDate) {
        errors.push(statusErr(
          rowNumber, 'deferred_payment_start_date', ErrorCodes.DEFERRED_DATE_TOO_FAR,
          `deferred_payment_start_date '${deferredDate}' is more than 23 months after the reporting month`,
          deferredDate, 'STATUS',
        ));
      }
    }
  }

  return errors;
}
