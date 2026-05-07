import { FormGRecord, ValidationError } from '../types';
import { ErrorCodes } from '../error-codes';

// ---------------------------------------------------------------------------
// Date helpers (exported for reuse in file-validator.ts)
// ---------------------------------------------------------------------------

/**
 * Parse a CCYYMMDD string to a Date object.
 * Returns null if the string is blank, all-zeros, or not a valid calendar date.
 */
export function parseDate(ccyymmdd: string): Date | null {
  const t = ccyymmdd.trim();
  if (t === '' || /^0+$/.test(t)) return null;
  if (!/^\d{8}$/.test(t)) return null;

  const year  = parseInt(t.substring(0, 4), 10);
  const month = parseInt(t.substring(4, 6), 10);
  const day   = parseInt(t.substring(6, 8), 10);

  if (year < 1900 || month < 1 || month > 12 || day < 1) return null;

  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null;
  }
  return d;
}

/**
 * Calculate the number of whole calendar months between two CCYYMMDD strings.
 * Returns 0 if either date is invalid or start > end.
 */
export function monthsBetween(startCcyymmdd: string, endCcyymmdd: string): number {
  const start = parseDate(startCcyymmdd);
  const end   = parseDate(endCcyymmdd);
  if (!start || !end) return 0;
  const months = (end.getFullYear() - start.getFullYear()) * 12
               + (end.getMonth() - start.getMonth());
  return Math.max(0, months);
}

/**
 * Add a number of months to a CCYYMMDD date string.
 * Returns a Date or null.
 */
function addMonths(ccyymmdd: string, n: number): Date | null {
  const d = parseDate(ccyymmdd);
  if (!d) return null;
  d.setMonth(d.getMonth() + n);
  return d;
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function domainErr(
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

// ---------------------------------------------------------------------------
// Layer 4 — identity and date domain rules
// ---------------------------------------------------------------------------

export function validateLayer4(
  record: FormGRecord,
  rowNumber: number,
  reportingMonthDate: Date,
): ValidationError[] {
  const errors: ValidationError[] = [];

  // ---- Omang format ----
  const omang = record.omang_id_number.trim();
  if (omang !== '') {
    if (!/^\d{9}$/.test(omang)) {
      errors.push(domainErr(
        rowNumber, 'omang_id_number', ErrorCodes.INVALID_OMANG_FORMAT,
        `Omang ID must be exactly 9 numeric digits, got '${omang}'`,
        omang, 'IDENTITY',
      ));
    } else {
      // 5th digit (index 4) must be '1' or '2'
      const fifthDigit = omang[4];
      if (fifthDigit !== '1' && fifthDigit !== '2') {
        errors.push(domainErr(
          rowNumber, 'omang_id_number', ErrorCodes.INVALID_OMANG_FORMAT,
          `Omang ID 5th digit must be '1' or '2' (gender indicator), got '${fifthDigit}'`,
          omang, 'IDENTITY',
        ));
      }

      // Must not be all-zero or all-same-digit dummy value
      if (/^(\d)\1{8}$/.test(omang)) {
        errors.push(domainErr(
          rowNumber, 'omang_id_number', ErrorCodes.INVALID_OMANG_FORMAT,
          `Omang ID '${omang}' appears to be a dummy/placeholder value (all same digit)`,
          omang, 'IDENTITY',
        ));
      }
    }
  }

  // ---- Surname domain checks ----
  const surname = record.surname.trim();
  if (surname !== '') {
    if (surname.length < 2) {
      errors.push(domainErr(
        rowNumber, 'surname', ErrorCodes.SURNAME_TOO_SHORT,
        `Surname must be at least 2 characters, got '${surname}'`,
        surname, 'IDENTITY',
      ));
    } else {
      // Must contain at least one vowel (A E I O U Y, case-insensitive — already uppercase from parser)
      if (!/[AEIOUY]/i.test(surname)) {
        errors.push(domainErr(
          rowNumber, 'surname', ErrorCodes.SURNAME_NO_VOWEL,
          `Surname '${surname}' must contain at least one vowel (A, E, I, O, U, Y)`,
          surname, 'IDENTITY',
        ));
      }

      // Only [A-Z \-'] allowed
      if (!/^[A-Z \-']+$/.test(surname)) {
        errors.push(domainErr(
          rowNumber, 'surname', ErrorCodes.SURNAME_INVALID_CHARS,
          `Surname '${surname}' contains invalid characters; only [A-Z, space, hyphen, apostrophe] allowed`,
          surname, 'IDENTITY',
        ));
      }
    }
  }

  // ---- date_of_birth ----
  const dob = record.date_of_birth.trim();
  if (dob !== '' && !/^0+$/.test(dob)) {
    const dobDate = parseDate(dob);
    if (dobDate && dobDate > reportingMonthDate) {
      errors.push(domainErr(
        rowNumber, 'date_of_birth', ErrorCodes.FUTURE_DATE,
        `date_of_birth '${dob}' is in the future`,
        dob, 'DATE',
      ));
    }
  }

  // ---- date_account_opened ----
  const opened = record.date_account_opened.trim();
  if (opened !== '' && !/^0+$/.test(opened)) {
    const openedDate = parseDate(opened);
    if (openedDate) {
      if (openedDate > reportingMonthDate) {
        errors.push(domainErr(
          rowNumber, 'date_account_opened', ErrorCodes.FUTURE_DATE,
          `date_account_opened '${opened}' is in the future`,
          opened, 'DATE',
        ));
      }
    }
  }

  // ---- last_payment_date ----
  const lastPmt = record.last_payment_date.trim();
  if (lastPmt !== '' && !/^0+$/.test(lastPmt)) {
    const lastPmtDate = parseDate(lastPmt);
    if (lastPmtDate) {
      // Must not be in the future
      if (lastPmtDate > reportingMonthDate) {
        errors.push(domainErr(
          rowNumber, 'last_payment_date', ErrorCodes.FUTURE_DATE,
          `last_payment_date '${lastPmt}' is in the future`,
          lastPmt, 'DATE',
        ));
      }

      // Must not be before date_account_opened
      const openedDate = parseDate(record.date_account_opened.trim());
      if (openedDate && lastPmtDate < openedDate) {
        errors.push(domainErr(
          rowNumber, 'last_payment_date', ErrorCodes.DATE_BEFORE_ACCOUNT_OPEN,
          `last_payment_date '${lastPmt}' is before date_account_opened '${record.date_account_opened.trim()}'`,
          lastPmt, 'DATE',
        ));
      }

      // Must not be more than 36 months before month-end (REJECT)
      const threshold36 = addMonths(
        `${reportingMonthDate.getFullYear()}${String(reportingMonthDate.getMonth() + 1).padStart(2,'0')}${String(reportingMonthDate.getDate()).padStart(2,'0')}`,
        -36,
      );
      if (threshold36 && lastPmtDate < threshold36) {
        errors.push(domainErr(
          rowNumber, 'last_payment_date', ErrorCodes.DATE_OLDER_THAN_36_MONTHS,
          `last_payment_date '${lastPmt}' is more than 36 months before the reporting month`,
          lastPmt, 'DATE',
        ));
      }

      // Must not be more than 60 months before month-end (WARN)
      const threshold60 = addMonths(
        `${reportingMonthDate.getFullYear()}${String(reportingMonthDate.getMonth() + 1).padStart(2,'0')}${String(reportingMonthDate.getDate()).padStart(2,'0')}`,
        -60,
      );
      if (threshold60 && lastPmtDate < threshold60) {
        errors.push(domainErr(
          rowNumber, 'last_payment_date', ErrorCodes.DATE_OLDER_THAN_60_MONTHS,
          `last_payment_date '${lastPmt}' is more than 60 months before the reporting month`,
          lastPmt, 'DATE', 'WARN',
        ));
      }
    }
  }

  // ---- Phone fields ----
  const phoneFields: Array<keyof FormGRecord> = ['telephone_h', 'cellular_telephone', 'telephone_w'];
  for (const field of phoneFields) {
    const val = (record[field] as string).trim();
    if (val !== '') {
      if (val.length !== 10) {
        errors.push(domainErr(
          rowNumber, field, ErrorCodes.PHONE_INVALID_LENGTH,
          `${field} must be exactly 10 digits, got ${val.length} characters`,
          val, 'IDENTITY',
        ));
      } else if (!/^\d{10}$/.test(val)) {
        errors.push(domainErr(
          rowNumber, field, ErrorCodes.PHONE_NON_NUMERIC,
          `${field} must contain only numeric digits`,
          val, 'IDENTITY',
        ));
      }
    }
  }

  // ---- Email ----
  const email = record.email_address.trim();
  if (email !== '') {
    const atIdx = email.indexOf('@');
    if (atIdx === -1) {
      errors.push(domainErr(
        rowNumber, 'email_address', ErrorCodes.EMAIL_INVALID_FORMAT,
        `Email address must contain '@'`,
        email, 'IDENTITY',
      ));
    } else if (atIdx === 0) {
      errors.push(domainErr(
        rowNumber, 'email_address', ErrorCodes.EMAIL_INVALID_FORMAT,
        `Email address must have at least one character before '@'`,
        email, 'IDENTITY',
      ));
    } else {
      const domain = email.substring(atIdx + 1);
      if (domain.startsWith('.')) {
        errors.push(domainErr(
          rowNumber, 'email_address', ErrorCodes.EMAIL_INVALID_FORMAT,
          `Email domain must not start with '.'`,
          email, 'IDENTITY',
        ));
      }
    }
  }

  return errors;
}
