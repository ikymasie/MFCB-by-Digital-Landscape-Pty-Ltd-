// ─── Base layout ─────────────────────────────────────────────────────────────

const BASE_URL = process.env.PORTAL_BASE_URL ?? 'https://portal.mfcb.africa';

function layout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MF Credit Bureau</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; }
    body { margin: 0; padding: 0; background-color: #F4F5F7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F4F5F7;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#F4F5F7;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0A1628 0%,#112240 100%);border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
            <img src="${BASE_URL}/logo-white.png" alt="MF Credit Bureau" width="140" style="display:inline-block;max-width:140px;" onerror="this.style.display='none'" />
            <p style="margin:12px 0 0;color:#A8B8D8;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">MF Credit Bureau</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#FFFFFF;padding:40px 40px 32px;border-left:1px solid #E5E7EB;border-right:1px solid #E5E7EB;">
            ${body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F8F9FB;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;">
            <p style="margin:0 0 8px;color:#6B7280;font-size:12px;line-height:1.6;">
              This is an automated message from MF Credit Bureau. Please do not reply directly to this email.
            </p>
            <p style="margin:0;color:#9CA3AF;font-size:11px;">
              MF Credit Bureau &bull; <a href="mailto:support@mfcb.africa" style="color:#3B7DD8;text-decoration:none;">support@mfcb.africa</a>
              &bull; <a href="${BASE_URL}" style="color:#3B7DD8;text-decoration:none;">portal.mfcb.africa</a>
            </p>
            <p style="margin:8px 0 0;color:#D1D5DB;font-size:10px;">
              &copy; ${new Date().getFullYear()} MF Credit Bureau. All rights reserved. Regulated by the Bank of Botswana.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Shared component helpers ─────────────────────────────────────────────────

function heading(text: string): string {
  return `<h1 style="margin:0 0 8px;color:#0A1628;font-size:24px;font-weight:700;line-height:1.3;">${text}</h1>`;
}

function subheading(text: string): string {
  return `<p style="margin:0 0 28px;color:#6B7280;font-size:15px;line-height:1.5;">${text}</p>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.7;">${text}</p>`;
}

function ctaButton(label: string, href: string): string {
  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:28px 0;">
      <tr>
        <td style="border-radius:8px;background:linear-gradient(135deg,#1D4ED8 0%,#3B7DD8 100%);">
          <a href="${href}" target="_blank"
             style="display:inline-block;padding:14px 32px;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.3px;border-radius:8px;">
            ${label} &rarr;
          </a>
        </td>
      </tr>
    </table>`;
}

function infoTable(rows: { label: string; value: string }[]): string {
  const cells = rows.map(r => `
    <tr>
      <td style="padding:10px 16px;background:#F8F9FB;border-bottom:1px solid #E5E7EB;color:#6B7280;font-size:13px;font-weight:600;white-space:nowrap;width:40%;">${r.label}</td>
      <td style="padding:10px 16px;background:#F8F9FB;border-bottom:1px solid #E5E7EB;color:#111827;font-size:13px;font-family:monospace;">${r.value}</td>
    </tr>`).join('');

  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
           style="border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;margin:20px 0 28px;">
      <tbody>${cells}</tbody>
    </table>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid #E5E7EB;margin:28px 0;" />`;
}

function alertBox(type: 'info' | 'warning' | 'critical', text: string): string {
  const styles = {
    info:     { bg: '#EFF6FF', border: '#3B7DD8', icon: 'ℹ️', color: '#1E40AF' },
    warning:  { bg: '#FFFBEB', border: '#F59E0B', icon: '⚠️', color: '#92400E' },
    critical: { bg: '#FEF2F2', border: '#EF4444', icon: '🚨', color: '#991B1B' },
  }[type];

  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%"
           style="background:${styles.bg};border-left:4px solid ${styles.border};border-radius:0 6px 6px 0;margin:0 0 24px;">
      <tr>
        <td style="padding:14px 18px;color:${styles.color};font-size:14px;line-height:1.5;">
          <strong>${styles.icon}&nbsp;&nbsp;</strong>${text}
        </td>
      </tr>
    </table>`;
}

// ─── EMAIL-001: User Invitation ───────────────────────────────────────────────

export function buildInvitationEmail(opts: {
  fullName: string;
  email: string;
  tempPassword: string;
  inviteToken: string;
  invitedByName: string;
  institutionName?: string;
}): { subject: string; html: string } {
  const activationUrl = `${BASE_URL}/auth/accept-invite?token=${opts.inviteToken}`;

  const body = `
    ${heading('Welcome to the MF Credit Bureau Portal')}
    ${subheading(`You've been invited by ${opts.invitedByName}${opts.institutionName ? ` on behalf of ${opts.institutionName}` : ''}.`)}

    ${paragraph(`Hello <strong>${opts.fullName}</strong>,`)}
    ${paragraph('You have been granted access to the MF Credit Bureau secure data portal. Click the button below to activate your account and set up your credentials.')}

    ${ctaButton('Activate My Account', activationUrl)}

    ${alertBox('warning', 'This activation link expires in <strong>72 hours</strong>. Do not share it with anyone.')}

    <p style="margin:0 0 8px;color:#374151;font-size:14px;font-weight:600;">Your temporary credentials:</p>
    ${infoTable([
      { label: 'Email Address', value: opts.email },
      { label: 'Temporary Password', value: opts.tempPassword },
    ])}

    ${paragraph('Upon first login you will be required to:')}
    <ol style="margin:0 0 24px;padding-left:20px;color:#374151;font-size:15px;line-height:2;">
      <li>Change your temporary password</li>
      <li>Set up Multi-Factor Authentication (MFA)</li>
    </ol>

    ${divider()}
    ${paragraph('If you cannot click the button above, copy and paste this URL into your browser:')}
    <p style="margin:0 0 20px;word-break:break-all;font-family:monospace;font-size:12px;color:#3B7DD8;">${activationUrl}</p>
    ${paragraph('If you did not expect this invitation, please contact <a href="mailto:support@mfcb.africa" style="color:#3B7DD8;">support@mfcb.africa</a> immediately.')}
  `;

  return {
    subject: 'You\'ve been invited to the MF Credit Bureau Portal',
    html: layout(body),
  };
}

// ─── EMAIL-002: Password Reset ────────────────────────────────────────────────

export function buildPasswordResetEmail(opts: {
  fullName: string;
  email: string;
  resetToken: string;
  expiresAt: Date;
}): { subject: string; html: string } {
  const resetUrl = `${BASE_URL}/auth/reset?token=${opts.resetToken}`;
  const expiry = opts.expiresAt.toLocaleString('en-BW', {
    timeZone: 'Africa/Gaborone',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const body = `
    ${heading('Reset Your Password')}
    ${subheading('We received a request to reset your MFCB Portal password.')}

    ${paragraph(`Hello <strong>${opts.fullName}</strong>,`)}
    ${paragraph('Click the button below to set a new password. This link is valid for <strong>60 minutes</strong> and can only be used once.')}

    ${ctaButton('Reset My Password', resetUrl)}

    ${infoTable([
      { label: 'Account Email', value: opts.email },
      { label: 'Link Expires', value: `${expiry} (CAT)` },
    ])}

    ${alertBox('info', 'If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.')}

    ${divider()}
    ${paragraph('If you cannot click the button above, copy and paste this URL into your browser:')}
    <p style="margin:0 0 20px;word-break:break-all;font-family:monospace;font-size:12px;color:#3B7DD8;">${resetUrl}</p>
    ${paragraph('Suspicious activity? Contact us at <a href="mailto:security@mfcb.africa" style="color:#3B7DD8;">security@mfcb.africa</a>.')}
  `;

  return {
    subject: 'Reset your MF Credit Bureau Portal password',
    html: layout(body),
  };
}

// ─── EMAIL-003a: Account Locked — to user ────────────────────────────────────

export function buildAccountLockedUserEmail(opts: {
  fullName: string;
  email: string;
  lockedAt: Date;
  unlockAt: Date;
}): { subject: string; html: string } {
  const fmt = (d: Date) => d.toLocaleString('en-BW', {
    timeZone: 'Africa/Gaborone', dateStyle: 'medium', timeStyle: 'short',
  });

  const body = `
    ${heading('Your Account Has Been Locked')}
    ${subheading('Multiple failed sign-in attempts were detected on your account.')}

    ${alertBox('critical', 'Your account has been <strong>temporarily locked</strong> for security reasons.')}

    ${paragraph(`Hello <strong>${opts.fullName}</strong>,`)}
    ${paragraph('Your MF Credit Bureau Portal account has been locked after 5 consecutive failed login attempts.')}

    ${infoTable([
      { label: 'Account Email',  value: opts.email },
      { label: 'Locked At',      value: `${fmt(opts.lockedAt)} (CAT)` },
      { label: 'Auto-Unlocks At', value: `${fmt(opts.unlockAt)} (CAT)` },
    ])}

    ${paragraph('Your account will <strong>automatically unlock after 30 minutes</strong>. If you forgot your password, you can reset it after unlocking.')}
    ${ctaButton('Reset My Password', `${BASE_URL}/auth/reset`)}

    ${alertBox('warning', 'If you did not attempt to sign in, your credentials may be compromised. Contact <strong>security@mfcb.africa</strong> immediately.')}
  `;

  return {
    subject: 'Security Alert: Your MFCB Portal account has been locked',
    html: layout(body),
  };
}

// ─── EMAIL-003b: Account Locked — to admin ───────────────────────────────────

export function buildAccountLockedAdminEmail(opts: {
  adminName: string;
  lockedUserName: string;
  lockedUserEmail: string;
  institutionName: string;
  lockedAt: Date;
}): { subject: string; html: string } {
  const fmt = (d: Date) => d.toLocaleString('en-BW', {
    timeZone: 'Africa/Gaborone', dateStyle: 'medium', timeStyle: 'short',
  });

  const body = `
    ${heading('Security Alert: User Account Locked')}
    ${subheading(`A user account in your institution has been locked due to excessive failed login attempts.`)}

    ${alertBox('warning', 'This is an automated security notification. No immediate action is required unless you suspect unauthorised access.')}

    ${paragraph(`Hello <strong>${opts.adminName}</strong>,`)}
    ${paragraph(`The following user account under <strong>${opts.institutionName}</strong> has been temporarily locked:`)}

    ${infoTable([
      { label: 'User Name',    value: opts.lockedUserName },
      { label: 'User Email',   value: opts.lockedUserEmail },
      { label: 'Institution',  value: opts.institutionName },
      { label: 'Locked At',    value: `${fmt(opts.lockedAt)} (CAT)` },
      { label: 'Reason',       value: '5 consecutive failed login attempts' },
      { label: 'Auto-Unlock',  value: '30 minutes from lock time' },
    ])}

    ${paragraph('To manage user accounts or unlock immediately, visit the User Management section:')}
    ${ctaButton('Manage Users', `${BASE_URL}/admin/users`)}

    ${paragraph('If you believe this activity is suspicious, please escalate to <a href="mailto:security@mfcb.africa" style="color:#3B7DD8;">security@mfcb.africa</a>.')}
  `;

  return {
    subject: `Security Alert: User account locked — ${opts.lockedUserName}`,
    html: layout(body),
  };
}

// ─── EMAIL-004: Batch Completed ───────────────────────────────────────────────

export function buildBatchCompletedEmail(opts: {
  recipientName: string;
  batchId: string;
  reportingMonth: string;
  totalRecords: number;
  acceptedCount: number;
  warningCount: number;
  submittedAt: Date;
  completedAt: Date;
}): { subject: string; html: string } {
  const fmt = (d: Date) => d.toLocaleString('en-BW', {
    timeZone: 'Africa/Gaborone', dateStyle: 'medium', timeStyle: 'short',
  });

  const body = `
    ${heading('Batch Processed Successfully')}
    ${subheading('All submitted records have been accepted into the credit bureau.')}

    <p style="display:inline-block;background:#D1FAE5;color:#065F46;font-size:13px;font-weight:700;padding:6px 14px;border-radius:20px;margin:0 0 28px;">✓ COMPLETED</p>

    ${paragraph(`Hello <strong>${opts.recipientName}</strong>,`)}
    ${paragraph('Your batch submission has been fully processed. Here is a summary:')}

    ${infoTable([
      { label: 'Batch ID',         value: opts.batchId },
      { label: 'Reporting Month',  value: opts.reportingMonth },
      { label: 'Submitted At',     value: fmt(opts.submittedAt) + ' (CAT)' },
      { label: 'Completed At',     value: fmt(opts.completedAt) + ' (CAT)' },
      { label: 'Total Records',    value: opts.totalRecords.toLocaleString() },
      { label: 'Accepted',         value: `✓ ${opts.acceptedCount.toLocaleString()}` },
      { label: 'Rejected',         value: '0' },
      { label: 'Warnings',         value: opts.warningCount.toLocaleString() },
    ])}

    ${opts.warningCount > 0 ? alertBox('info', `<strong>${opts.warningCount.toLocaleString()} warning(s)</strong> were raised but did not prevent acceptance. Review them in the portal for data quality purposes.`) : ''}

    ${ctaButton('View Batch Report', `${BASE_URL}/batches/${opts.batchId}`)}
  `;

  return {
    subject: `Batch processed successfully — ${opts.reportingMonth} (${opts.batchId.slice(0, 8).toUpperCase()})`,
    html: layout(body),
  };
}

// ─── EMAIL-005: Batch Validation Failed ──────────────────────────────────────

export function buildBatchValidationFailedEmail(opts: {
  recipientName: string;
  batchId: string;
  reportingMonth: string;
  totalRecords: number;
  acceptedCount: number;
  rejectedCount: number;
  warningCount: number;
}): { subject: string; html: string } {
  const acceptRate = ((opts.acceptedCount / opts.totalRecords) * 100).toFixed(1);

  const body = `
    ${heading('Action Required: Records Rejected')}
    ${subheading(`${opts.rejectedCount.toLocaleString()} record(s) failed validation and must be corrected and resubmitted.`)}

    <p style="display:inline-block;background:#FEF3C7;color:#92400E;font-size:13px;font-weight:700;padding:6px 14px;border-radius:20px;margin:0 0 28px;">⚠ PARTIAL ACCEPTANCE</p>

    ${paragraph(`Hello <strong>${opts.recipientName}</strong>,`)}
    ${paragraph('Your batch has been processed. While some records were accepted, a number failed validation. Please review the errors and resubmit the rejected rows.')}

    ${infoTable([
      { label: 'Batch ID',        value: opts.batchId },
      { label: 'Reporting Month', value: opts.reportingMonth },
      { label: 'Total Records',   value: opts.totalRecords.toLocaleString() },
      { label: 'Accepted',        value: `✓ ${opts.acceptedCount.toLocaleString()} (${acceptRate}%)` },
      { label: 'Rejected',        value: `✗ ${opts.rejectedCount.toLocaleString()}` },
      { label: 'Warnings',        value: opts.warningCount.toLocaleString() },
    ])}

    ${alertBox('warning', 'Rejected records <strong>have not</strong> been accepted into the credit bureau. You must correct and resubmit them to meet your reporting obligations.')}

    ${ctaButton('Review Errors & Resubmit', `${BASE_URL}/batches/${opts.batchId}/errors`)}

    ${paragraph('A downloadable template pre-filled with rejected rows is available in the portal to help you correct and resubmit efficiently.')}
  `;

  return {
    subject: `Action Required: ${opts.rejectedCount.toLocaleString()} records rejected — ${opts.reportingMonth}`,
    html: layout(body),
  };
}

// ─── EMAIL-006: Batch Hard Failure ───────────────────────────────────────────

export function buildBatchFailedEmail(opts: {
  recipientName: string;
  batchId: string;
  reportingMonth: string;
  submittedAt: Date;
  failureReason: string;
}): { subject: string; html: string } {
  const fmt = (d: Date) => d.toLocaleString('en-BW', {
    timeZone: 'Africa/Gaborone', dateStyle: 'medium', timeStyle: 'short',
  });

  const body = `
    ${heading('Batch Could Not Be Processed')}
    ${subheading('A critical error prevented your submission from being processed.')}

    <p style="display:inline-block;background:#FEE2E2;color:#991B1B;font-size:13px;font-weight:700;padding:6px 14px;border-radius:20px;margin:0 0 28px;">✗ FAILED</p>

    ${paragraph(`Hello <strong>${opts.recipientName}</strong>,`)}
    ${paragraph('Unfortunately, your batch submission encountered a critical error and could not be processed. No records have been loaded into the credit bureau.')}

    ${infoTable([
      { label: 'Batch ID',        value: opts.batchId },
      { label: 'Reporting Month', value: opts.reportingMonth },
      { label: 'Submitted At',    value: fmt(opts.submittedAt) + ' (CAT)' },
      { label: 'Failure Reason',  value: opts.failureReason },
    ])}

    ${alertBox('critical', 'Please correct the issue with your file and <strong>resubmit a new batch</strong>. The failed submission does not count towards your monthly reporting obligation.')}

    ${ctaButton('Submit a New Batch', `${BASE_URL}/batches/new`)}

    ${paragraph('If you believe this failure is a system error, please contact <a href="mailto:support@mfcb.africa" style="color:#3B7DD8;">support@mfcb.africa</a> and quote your Batch ID.')}
  `;

  return {
    subject: `Batch submission failed — please resubmit (${opts.batchId.slice(0, 8).toUpperCase()})`,
    html: layout(body),
  };
}

// ─── EMAIL-007: DLQ Alert (Internal — Bureau Ops) ────────────────────────────

export function buildDlqAlertEmail(opts: {
  batchId: string;
  chunkId: string;
  institutionName: string;
  srn: string;
  dlqTopicName: string;
  failedAt: Date;
  lastError: string;
}): { subject: string; html: string } {
  const fmt = (d: Date) => d.toLocaleString('en-BW', {
    timeZone: 'Africa/Gaborone', dateStyle: 'medium', timeStyle: 'short',
  });

  const body = `
    ${heading('Pipeline Chunk Stuck in Dead Letter Queue')}
    ${subheading('A batch processing chunk has exhausted all retry attempts and requires manual intervention.')}

    ${alertBox('critical', 'This batch is <strong>stalled</strong>. The affected institution will not receive a completion notification until this is resolved.')}

    ${infoTable([
      { label: 'Batch ID',    value: opts.batchId },
      { label: 'Chunk ID',    value: opts.chunkId },
      { label: 'Institution', value: `${opts.institutionName} (${opts.srn})` },
      { label: 'DLQ Topic',   value: opts.dlqTopicName },
      { label: 'Failed At',   value: fmt(opts.failedAt) + ' (CAT)' },
      { label: 'Last Error',  value: opts.lastError },
    ])}

    ${ctaButton('Open Batch in Ops Dashboard', `${BASE_URL}/ops/batches/${opts.batchId}`)}

    <p style="margin:0 0 8px;color:#374151;font-size:14px;font-weight:600;">Recommended resolution steps:</p>
    <ol style="margin:0 0 24px;padding-left:20px;color:#374151;font-size:14px;line-height:2;">
      <li>Check Cloud Run logs for <code>fn-validate-chunk</code> / <code>fn-master-records</code></li>
      <li>Verify Cloud SQL Postgres connectivity and connection pool health</li>
      <li>Force-retry the chunk from the Batch Processing Queue (Screen 6.3)</li>
      <li>If unresolvable, quarantine the chunk and contact engineering</li>
    </ol>

    ${alertBox('info', 'Chunk status has been set to <strong>DLQ</strong> in Firestore. Raw data remains intact in Cloud Storage — no data loss has occurred.')}
  `;

  return {
    subject: `[CRITICAL] Pipeline chunk stuck in DLQ — ${opts.institutionName} / ${opts.batchId.slice(0, 8).toUpperCase()}`,
    html: layout(body),
  };
}

// ─── EMAIL-008: Institution Certified ────────────────────────────────────────

export function buildCertificationEmail(opts: {
  adminName: string;
  institutionName: string;
  srn: string;
  certifiedByName: string;
  certifiedAt: Date;
}): { subject: string; html: string } {
  const fmt = (d: Date) => d.toLocaleString('en-BW', {
    timeZone: 'Africa/Gaborone', dateStyle: 'long', timeStyle: 'short',
  });

  const body = `
    ${heading('Certification Approved')}
    ${subheading(`${opts.institutionName} is now approved for LIVE batch submissions.`)}

    <p style="display:inline-block;background:#D1FAE5;color:#065F46;font-size:13px;font-weight:700;padding:6px 14px;border-radius:20px;margin:0 0 28px;">✓ CERTIFIED FOR LIVE SUBMISSIONS</p>

    ${paragraph(`Dear <strong>${opts.adminName}</strong>,`)}
    ${paragraph(`Congratulations! <strong>${opts.institutionName}</strong> has successfully completed the MF Credit Bureau certification process. You are now authorised to submit LIVE production data.`)}

    ${infoTable([
      { label: 'Institution',   value: opts.institutionName },
      { label: 'SRN',          value: opts.srn },
      { label: 'Certified By', value: opts.certifiedByName },
      { label: 'Certified At', value: fmt(opts.certifiedAt) + ' (CAT)' },
    ])}

    <p style="margin:0 0 8px;color:#374151;font-size:14px;font-weight:600;">You may now submit LIVE data via:</p>
    <ul style="margin:0 0 24px;padding-left:20px;color:#374151;font-size:14px;line-height:2;">
      <li><strong>Portal Upload</strong> — available immediately via the portal</li>
      <li><strong>REST API</strong> — Client ID &amp; Secret available under Institution Profile → API Credentials</li>
      <li><strong>SFTP</strong> — as configured during onboarding</li>
    </ul>

    ${alertBox('info', 'Monthly LIVE submissions are due by the <strong>15th of the following month</strong>. Ensure your file naming convention is strictly observed.')}

    ${ctaButton('Go to Submission Portal', `${BASE_URL}/batches/new`)}

    ${paragraph('For support, contact <a href="mailto:support@mfcb.africa" style="color:#3B7DD8;">support@mfcb.africa</a>.')}
  `;

  return {
    subject: `Certification Approved — ${opts.institutionName} is cleared for LIVE submissions`,
    html: layout(body),
  };
}
