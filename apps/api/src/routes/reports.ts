import { Router, IRouter, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { db } from '../db/client';
import { authenticateJwt } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { validateBody } from '../middleware/validate';
import { auditLog } from '../middleware/auditLog';
import { reportLimiter } from '../middleware/rateLimiter';

interface Borrower {
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
}

interface CreditAccount {
  credit_account_id: string;
  institution_id: string;
  borrower_id: string;
  account_number: string;
  [key: string]: unknown;
}

interface RepaymentHistory {
  history_id: string;
  credit_account_id: string;
  reporting_month: string;
  [key: string]: unknown;
}

interface BorrowerAddress {
  address_id: string;
  borrower_id: string;
  [key: string]: unknown;
}

const router: IRouter = Router();

// ============================================================
// Schemas
// ============================================================

const inquireSchema = z.object({
  search_type: z.enum(['OMANG', 'PASSPORT', 'ACCOUNT_NUMBER', 'CELLULAR', 'SURNAME_DOB']),
  search_value: z.string().min(1),
  inquiry_reason: z.string().min(1).max(255),
  customer_consent_reference: z.string().optional(),
});

// ============================================================
// Mask search value — show last 4 chars only
// ============================================================

function maskValue(value: string): string {
  if (value.length <= 4) return '****';
  return `${'*'.repeat(value.length - 4)}${value.slice(-4)}`;
}

// ============================================================
// POST /reports/inquire
// ============================================================

router.post(
  '/inquire',
  authenticateJwt,
  requirePermission('reports:request'),
  reportLimiter,
  validateBody(inquireSchema),
  auditLog('REPORT_REQUESTED', 'REPORT'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as z.infer<typeof inquireSchema>;
      const institutionId = req.user!.institutionId;

      if (!institutionId) {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Institution context required for report inquiry',
          correlationId: req.correlationId,
        });
        return;
      }

      // Find borrower
      let borrower: Borrower | null = null;

      switch (body.search_type) {
        case 'OMANG':
          borrower = await db('borrowers')
            .where('omang_id_number', body.search_value)
            .first() ?? null;
          break;

        case 'PASSPORT':
          borrower = await db('borrowers')
            .where('passport_number', body.search_value)
            .first() ?? null;
          break;

        case 'ACCOUNT_NUMBER':
          const accountRow = await db('credit_accounts')
            .where('account_number', body.search_value)
            .first();
          if (accountRow) {
            borrower = await db('borrowers')
              .where('borrower_id', accountRow.borrower_id)
              .first() ?? null;
          }
          break;

        case 'CELLULAR':
          const cellAccountRow = await db('credit_accounts')
            .where('cellular_telephone', body.search_value)
            .first();
          if (cellAccountRow) {
            borrower = await db('borrowers')
              .where('borrower_id', cellAccountRow.borrower_id)
              .first() ?? null;
          }
          break;

        case 'SURNAME_DOB': {
          const parts = body.search_value.split(':');
          const surname = parts[0] ?? '';
          const dob = parts[1] ?? '';
          borrower = await db('borrowers')
            .whereILike('surname', surname)
            .where('date_of_birth', dob)
            .first() ?? null;
          break;
        }
      }

      const result = borrower ? 'MATCH' : 'NO_MATCH';
      const inquiryId = randomUUID();
      const now = new Date();

      await db('credit_inquiries').insert({
        inquiry_id: inquiryId,
        institution_id: institutionId,
        requested_by_user_id: req.user!.type === 'USER' ? req.user!.id : null,
        requested_by_client_id: req.user!.type === 'API_CLIENT' ? req.user!.id : null,
        search_type: body.search_type,
        search_value_masked: maskValue(body.search_value),
        inquiry_reason: body.inquiry_reason,
        customer_consent_reference: body.customer_consent_reference ?? null,
        result,
        borrower_id: borrower?.borrower_id ?? null,
        report_id: null,
        correlation_id: req.correlationId ?? randomUUID(),
        ip_address: req.ip ?? '0.0.0.0',
        created_at: now,
      });

      res.json({
        inquiry_id: inquiryId,
        result,
        borrower_id: borrower?.borrower_id ?? null,
        report_id: null,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ============================================================
// GET /reports/:inquiryId
// ============================================================

router.get(
  '/:inquiryId',
  authenticateJwt,
  requirePermission('reports:read'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const inquiry = await db('credit_inquiries')
        .where('inquiry_id', req.params.inquiryId)
        .first();

      if (!inquiry) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: 'Inquiry not found',
          correlationId: req.correlationId,
        });
        return;
      }

      // Institution isolation
      if (req.user!.institutionId && inquiry.institution_id !== req.user!.institutionId) {
        res.status(403).json({
          error: 'FORBIDDEN',
          message: 'Insufficient permissions',
          correlationId: req.correlationId,
        });
        return;
      }

      let borrowerSummary = null;

      if (inquiry.result === 'MATCH' && inquiry.borrower_id) {
        const borrower = await db('borrowers')
          .where('borrower_id', inquiry.borrower_id)
          .first() as Borrower | null;

        if (borrower) {
          // Get credit accounts
          const accounts = await db('credit_accounts')
            .where('borrower_id', inquiry.borrower_id)
            .select('*') as CreditAccount[];

          // Get repayment history (last 36 months)
          const thirtySixMonthsAgo = new Date();
          thirtySixMonthsAgo.setMonth(thirtySixMonthsAgo.getMonth() - 36);
          const cutoffMonth = thirtySixMonthsAgo.toISOString().slice(0, 7);

          const accountIds = accounts.map((a) => a.credit_account_id);
          const repaymentHistory: RepaymentHistory[] = accountIds.length > 0
            ? await db('repayment_history')
                .whereIn('credit_account_id', accountIds)
                .where('reporting_month', '>=', cutoffMonth)
                .orderBy('reporting_month', 'desc')
                .select('*')
            : [];

          // Addresses (non-sensitive)
          const addresses = await db('borrower_addresses')
            .where('borrower_id', inquiry.borrower_id)
            .select('*') as BorrowerAddress[];

          // NEVER include income field — regulatory requirement
          borrowerSummary = {
            borrower_id: borrower.borrower_id,
            omang_id_number: borrower.omang_id_number,
            passport_number: borrower.passport_number,
            surname: borrower.surname,
            forename_1: borrower.forename_1,
            forename_2: borrower.forename_2,
            forename_3: borrower.forename_3,
            title: borrower.title,
            gender: borrower.gender,
            date_of_birth: borrower.date_of_birth,
            nationality: borrower.nationality,
            marital_status: borrower.marital_status,
            addresses,
            credit_accounts: accounts,
            repayment_history: repaymentHistory,
          };
        }
      }

      res.json({
        inquiry: {
          inquiry_id: inquiry.inquiry_id,
          search_type: inquiry.search_type,
          search_value_masked: inquiry.search_value_masked,
          inquiry_reason: inquiry.inquiry_reason,
          result: inquiry.result,
          created_at: inquiry.created_at,
        },
        borrower: borrowerSummary,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
