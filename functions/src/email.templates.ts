import { config } from './config';

const BASE_URL = config.email.portalUrl;

function layout(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MF Credit Bureau</title>
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
        <tr>
          <td style="background:linear-gradient(135deg,#0A1628 0%,#112240 100%);border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
            <img src="${BASE_URL}/logo-white.png" alt="MF Credit Bureau" width="140" style="display:inline-block;max-width:140px;" onerror="this.style.display='none'" />
            <p style="margin:12px 0 0;color:#A8B8D8;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:600;">MF Credit Bureau</p>
          </td>
        </tr>
        <tr>
          <td style="background:#FFFFFF;padding:40px 40px 32px;border-left:1px solid #E5E7EB;border-right:1px solid #E5E7EB;">
            ${body}
          </td>
        </tr>
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
  `;
  return {
    subject: `Action Required: ${opts.rejectedCount.toLocaleString()} records rejected — ${opts.reportingMonth}`,
    html: layout(body),
  };
}

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
    ${alertBox('critical', 'Please correct the issue with your file and <strong>resubmit a new batch</strong>.')}
    ${ctaButton('Submit a New Batch', `${BASE_URL}/batches/new`)}
  `;
  return {
    subject: `Batch submission failed — please resubmit (${opts.batchId.slice(0, 8).toUpperCase()})`,
    html: layout(body),
  };
}

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
    ${alertBox('critical', 'This batch is <strong>stalled</strong>.')}
    ${infoTable([
      { label: 'Batch ID',    value: opts.batchId },
      { label: 'Chunk ID',    value: opts.chunkId },
      { label: 'Institution', value: `${opts.institutionName} (${opts.srn})` },
      { label: 'DLQ Topic',   value: opts.dlqTopicName },
      { label: 'Failed At',   value: fmt(opts.failedAt) + ' (CAT)' },
      { label: 'Last Error',  value: opts.lastError },
    ])}
    ${ctaButton('Open Batch in Ops Dashboard', `${BASE_URL}/ops/batches/${opts.batchId}`)}
  `;
  return {
    subject: `[CRITICAL] Pipeline chunk stuck in DLQ — ${opts.institutionName} / ${opts.batchId.slice(0, 8).toUpperCase()}`,
    html: layout(body),
  };
}
