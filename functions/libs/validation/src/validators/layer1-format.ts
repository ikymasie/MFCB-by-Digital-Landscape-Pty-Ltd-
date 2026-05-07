import { FormGRecord, ValidationError } from '../types';
import { ErrorCodes } from '../error-codes';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function err(
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

/**
 * Return true when the string represents a "blank / not supplied" date:
 * all spaces, all zeros, or empty after trim.
 */
function isBlankDate(value: string): boolean {
  const t = value.trim();
  return t === '' || /^0+$/.test(t);
}

/**
 * Validate a CCYYMMDD date string is a valid calendar date.
 * Returns false when the value is blank (caller decides whether blank is allowed).
 */
function isValidCcyymmdd(value: string): boolean {
  const t = value.trim();
  if (!/^\d{8}$/.test(t)) return false;
  const year  = parseInt(t.substring(0, 4), 10);
  const month = parseInt(t.substring(4, 6), 10);
  const day   = parseInt(t.substring(6, 8), 10);
  if (year < 1900 || month < 1 || month > 12 || day < 1) return false;
  // Use Date to check day is within the month
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

const DATE_FIELDS: Array<keyof FormGRecord> = [
  'date_of_birth',
  'date_account_opened',
  'deferred_payment_start_date',
  'last_payment_date',
  'status_date',
];

// ---------------------------------------------------------------------------
// Layer 1 — field format and length checks
// ---------------------------------------------------------------------------

export function validateLayer1(record: FormGRecord, rowNumber: number): ValidationError[] {
  const errors: ValidationError[] = [];

  // --- omang_id_number ---
  const omang = record.omang_id_number.trim();
  if (omang !== '') {
    if (!/^\d{9}$/.test(omang)) {
      errors.push(err(
        rowNumber, 'omang_id_number', ErrorCodes.INVALID_OMANG_FORMAT,
        `Omang ID must be exactly 9 numeric digits after trimming, got '${omang}'`,
        omang, 'IDENTITY',
      ));
    }
  }

  // --- passport_number ---
  const passport = record.passport_number.trim();
  if (passport !== '') {
    if (passport.length > 16) {
      errors.push(err(
        rowNumber, 'passport_number', ErrorCodes.INVALID_PASSPORT_FORMAT,
        `Passport number exceeds maximum length of 16 characters`,
        passport, 'IDENTITY',
      ));
    } else if (!/^[A-Z0-9]+$/.test(passport)) {
      errors.push(err(
        rowNumber, 'passport_number', ErrorCodes.INVALID_PASSPORT_FORMAT,
        `Passport number must contain only alphanumeric characters [A-Z0-9]`,
        passport, 'IDENTITY',
      ));
    }
  }

  // --- gender ---
  const gender = record.gender.trim();
  if (gender !== '' && gender !== 'M' && gender !== 'F') {
    errors.push(err(
      rowNumber, 'gender', ErrorCodes.INVALID_GENDER,
      `Gender must be 'M' or 'F', got '${gender}'`,
      gender, 'IDENTITY',
    ));
  }

  // --- date fields ---
  for (const field of DATE_FIELDS) {
    const val = record[field] as string;
    if (!isBlankDate(val)) {
      if (!isValidCcyymmdd(val)) {
        errors.push(err(
          rowNumber, field, ErrorCodes.INVALID_DATE_FORMAT,
          `Date field '${field}' value '${val}' is not a valid CCYYMMDD date`,
          val, 'DATE',
        ));
      }
    }
  }

  // --- surname ---
  const surname = record.surname.trim();
  if (surname !== '') {
    if (surname.length > 25) {
      errors.push(err(
        rowNumber, 'surname', ErrorCodes.SURNAME_INVALID_CHARS,
        `Surname exceeds maximum length of 25 characters`,
        surname, 'IDENTITY',
      ));
    }
    if (!/^[A-Z \-']+$/.test(surname)) {
      errors.push(err(
        rowNumber, 'surname', ErrorCodes.SURNAME_INVALID_CHARS,
        `Surname contains invalid characters; only [A-Z, space, hyphen, apostrophe] allowed`,
        surname, 'IDENTITY',
      ));
    }
  }

  // --- forenames ---
  const forenameFields: Array<keyof FormGRecord> = ['forename_1', 'forename_2', 'forename_3'];
  for (const field of forenameFields) {
    const val = (record[field] as string).trim();
    if (val !== '') {
      if (val.length > 14) {
        errors.push(err(
          rowNumber, field, ErrorCodes.MISSING_MANDATORY_FIELD,
          `${field} exceeds maximum length of 14 characters`,
          val, 'IDENTITY',
        ));
      }
      if (!/^[A-Z \-']+$/.test(val)) {
        errors.push(err(
          rowNumber, field, ErrorCodes.MISSING_MANDATORY_FIELD,
          `${field} contains invalid characters; only [A-Z, space, hyphen, apostrophe] allowed`,
          val, 'IDENTITY',
        ));
      }
    }
  }

  // --- telephone fields ---
  const phoneFields: Array<keyof FormGRecord> = ['telephone_h', 'cellular_telephone', 'telephone_w'];
  for (const field of phoneFields) {
    const val = (record[field] as string).trim();
    if (val !== '') {
      if (val.length !== 10) {
        errors.push(err(
          rowNumber, field, ErrorCodes.PHONE_INVALID_LENGTH,
          `${field} must be exactly 10 digits, got ${val.length} characters`,
          val, 'IDENTITY',
        ));
      } else if (!/^\d{10}$/.test(val)) {
        errors.push(err(
          rowNumber, field, ErrorCodes.PHONE_NON_NUMERIC,
          `${field} must contain only digits`,
          val, 'IDENTITY',
        ));
      }
    }
  }

  // --- email_address ---
  const email = record.email_address.trim();
  if (email !== '') {
    const atIdx = email.indexOf('@');
    if (atIdx === -1) {
      errors.push(err(
        rowNumber, 'email_address', ErrorCodes.EMAIL_INVALID_FORMAT,
        `Email address must contain '@'`,
        email, 'IDENTITY',
      ));
    } else if (atIdx === 0) {
      errors.push(err(
        rowNumber, 'email_address', ErrorCodes.EMAIL_INVALID_FORMAT,
        `Email address must have at least one character before '@'`,
        email, 'IDENTITY',
      ));
    } else {
      const domain = email.substring(atIdx + 1);
      if (domain.startsWith('.')) {
        errors.push(err(
          rowNumber, 'email_address', ErrorCodes.EMAIL_INVALID_FORMAT,
          `Email domain (part after '@') must not start with '.'`,
          email, 'IDENTITY',
        ));
      }
    }
  }

  // --- account_number ---
  const accountNumber = record.account_number.trim();
  if (accountNumber !== '') {
    if (accountNumber.length > 25) {
      errors.push(err(
        rowNumber, 'account_number', ErrorCodes.MISSING_MANDATORY_FIELD,
        `account_number exceeds maximum length of 25 characters`,
        accountNumber, 'IDENTITY',
      ));
    }
    if (/\s/.test(accountNumber)) {
      errors.push(err(
        rowNumber, 'account_number', ErrorCodes.MISSING_MANDATORY_FIELD,
        `account_number must not contain embedded spaces`,
        accountNumber, 'IDENTITY',
      ));
    } else if (!/^[A-Z0-9/\-]+$/.test(accountNumber)) {
      errors.push(err(
        rowNumber, 'account_number', ErrorCodes.MISSING_MANDATORY_FIELD,
        `account_number contains invalid characters; only [A-Z0-9/\\-] allowed`,
        accountNumber, 'IDENTITY',
      ));
    }
  }

  // --- sub_account_number ---
  const subAccount = record.sub_account_number.trim();
  if (subAccount !== '') {
    if (subAccount.length > 4) {
      errors.push(err(
        rowNumber, 'sub_account_number', ErrorCodes.MISSING_MANDATORY_FIELD,
        `sub_account_number exceeds maximum length of 4 characters`,
        subAccount, 'IDENTITY',
      ));
    } else if (!/^[A-Z0-9/\-]+$/.test(subAccount)) {
      errors.push(err(
        rowNumber, 'sub_account_number', ErrorCodes.MISSING_MANDATORY_FIELD,
        `sub_account_number contains invalid characters; only [A-Z0-9/\\-] allowed`,
        subAccount, 'IDENTITY',
      ));
    }
  }

  // --- current_balance_indicator ---
  const cbi = record.current_balance_indicator.trim();
  if (cbi !== '' && cbi !== 'D' && cbi !== 'C') {
    errors.push(err(
      rowNumber, 'current_balance_indicator', ErrorCodes.INVALID_CURRENT_BALANCE_INDICATOR,
      `current_balance_indicator must be 'D' or 'C', got '${cbi}'`,
      cbi, 'FINANCIAL',
    ));
  }

  // --- opening_balance_or_credit_limit ---
  const openBal = record.opening_balance_or_credit_limit.trim();
  if (openBal !== '' && !/^\d+$/.test(openBal)) {
    errors.push(err(
      rowNumber, 'opening_balance_or_credit_limit', ErrorCodes.OPENING_BALANCE_REQUIRED,
      `opening_balance_or_credit_limit must be all digits when populated, got '${openBal}'`,
      openBal, 'FINANCIAL',
    ));
  }

  // --- months_in_arrears ---
  const mia = record.months_in_arrears.trim();
  if (mia !== '') {
    if (!/^\d{2}$/.test(mia)) {
      errors.push(err(
        rowNumber, 'months_in_arrears', ErrorCodes.MISSING_MANDATORY_FIELD,
        `months_in_arrears must be a 2-digit numeric value '00'-'99', got '${mia}'`,
        mia, 'FINANCIAL',
      ));
    }
  }

  // --- no_of_participants ---
  const noOfParticipants = record.no_of_participants.trim();
  if (noOfParticipants !== '' && !/^\d+$/.test(noOfParticipants)) {
    errors.push(err(
      rowNumber, 'no_of_participants', ErrorCodes.MISSING_MANDATORY_FIELD,
      `no_of_participants must be numeric when populated, got '${noOfParticipants}'`,
      noOfParticipants, 'IDENTITY',
    ));
  }

  return errors;
}
