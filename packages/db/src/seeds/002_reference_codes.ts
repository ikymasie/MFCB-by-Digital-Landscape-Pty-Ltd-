import type { Knex } from 'knex';

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';
const EFFECTIVE_DATE = '2024-01-01';

interface RefCode {
  code_type: string;
  code: string;
  description: string;
  effective_date: string;
  created_by: string;
}

function buildCodes(
  code_type: string,
  entries: Record<string, string>,
): RefCode[] {
  return Object.entries(entries).map(([code, description]) => ({
    code_type,
    code,
    description,
    effective_date: EFFECTIVE_DATE,
    created_by: SYSTEM_USER_ID,
  }));
}

export async function seed(knex: Knex): Promise<void> {
  const recordType = buildCodes('RECORD_TYPE', {
    C: 'Header Record',
    D: 'Data Record',
    H: 'Header',
    R: 'Repayment Header',
    T: 'Trailer',
  });

  const accountType = buildCodes('ACCOUNT_TYPE', {
    B: 'Mortgage Bond',
    C: 'Credit Card',
    D: 'Personal Loan',
    E: 'Educational Loan',
    F: 'Revolving Facility',
    G: 'Guarantee',
    H: 'Home Loan',
    I: 'Instalment Sale',
    M: 'Micro Loan',
    N: 'Consolidation Loan',
    O: 'Overdraft',
    P: 'Vehicle Finance',
    R: 'Revolving Credit Plan',
    S: 'Store Card',
    T: 'Term Loan',
    U: 'Utility Account',
    V: 'Other Revolving',
    W: 'Lease',
    X: 'Line of Credit',
    Y: 'Student Loan',
    Z: 'Other',
  });

  const statusCode = buildCodes('STATUS_CODE', {
    B: 'Bad Debt Written Off',
    C: 'Closed/Settled',
    D: 'Debt Review',
    E: 'Early Settlement',
    I: 'In Arrears',
    J: 'Judgment',
    L: 'Legal Action',
    P: 'Paid Up',
    T: 'Transferred',
    U: 'Under Administration',
    V: 'Voluntarily Surrendered',
    W: 'Written Off',
    Y: 'Prescribed',
    Z: 'Fraud',
  });

  const ownershipType = buildCodes('OWNERSHIP_TYPE', {
    '00': 'Individual',
    '01': 'Sole Proprietor',
    '02': 'Joint',
    '03': 'Partnership',
    '04': 'Company',
    '05': 'Close Corporation',
  });

  const repaymentFrequency = buildCodes('REPAYMENT_FREQUENCY', {
    '00': 'Unknown',
    '01': 'Monthly',
    '02': 'Weekly',
    '03': 'Fortnightly',
    '04': 'Quarterly',
    '05': 'Annual',
    '06': 'Irregular',
  });

  const loanReasonCode = buildCodes('LOAN_REASON_CODE', {
    A: 'Agriculture',
    B: 'Business',
    C: 'Construction',
    D: 'Debt Consolidation',
    F: 'Furniture and Equipment',
    H: 'Home Improvements',
    J: 'Joint',
    O: 'Other',
    R: 'Refinancing',
    S: 'Study',
  });

  const paymentType = buildCodes('PAYMENT_TYPE', {
    '00': 'Normal',
    '01': 'Balloon',
    '02': 'Deferred',
    '03': 'Interest Only',
    '04': 'Graduated',
    '05': 'Stepped',
    '06': 'Seasonal',
    '07': 'Revolving',
    '08': 'Flexi',
    '09': 'Draw Down',
    '10': 'Other',
  });

  const incomeFrequency = buildCodes('INCOME_FREQUENCY', {
    M: 'Monthly',
    W: 'Weekly',
    F: 'Fortnightly',
    Q: 'Quarterly',
    A: 'Annual',
  });

  const title = buildCodes('TITLE', {
    ADV: 'Advocate',
    CAPT: 'Captain',
    COL: 'Colonel',
    DR: 'Doctor',
    DS: 'Dominee',
    JUDGE: 'Judge',
    KAPT: 'Kaptein',
    KOL: 'Kolonel',
    LADY: 'Lady',
    LORD: 'Lord',
    LT: 'Lieutenant',
    MAJ: 'Major',
    ME: 'Me',
    MEJ: 'Mejuffrou',
    MEV: 'Mevrou',
    MISS: 'Miss',
    MNR: 'Mnr',
    MR: 'Mr',
    MRS: 'Mrs',
    MS: 'Ms',
    PAST: 'Pastor',
    PROF: 'Professor',
    REV: 'Reverend',
    SERS: 'Sersant',
    SGT: 'Sergeant',
    SIR: 'Sir',
  });

  const allCodes: RefCode[] = [
    ...recordType,
    ...accountType,
    ...statusCode,
    ...ownershipType,
    ...repaymentFrequency,
    ...loanReasonCode,
    ...paymentType,
    ...incomeFrequency,
    ...title,
  ];

  await knex('reference_codes')
    .insert(allCodes)
    .onConflict(['code_type', 'code'])
    .ignore();
}
