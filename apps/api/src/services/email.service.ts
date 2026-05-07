import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';

// ─── Transport singleton ──────────────────────────────────────────────────────

let _transport: Transporter | null = null;

function getTransport(): Transporter {
  if (_transport) return _transport;

  _transport = nodemailer.createTransport({
    host: config.email.smtpHost,
    port: config.email.smtpPort,
    secure: true, // SSL/TLS on port 465
    auth: {
      user: config.email.fromAddress,
      pass: config.email.smtpPassword,
    },
    tls: {
      // Enforce strict certificate validation in production
      rejectUnauthorized: config.nodeEnv === 'production',
    },
    // Connection pool for high-throughput scenarios
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  });

  return _transport;
}

// ─── Public interface ─────────────────────────────────────────────────────────

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  /** Optional plain-text fallback — auto-stripped from HTML if omitted */
  text?: string;
  replyTo?: string;
}

/**
 * Send a transactional email.
 * In development, logs the email to console instead of delivering.
 */
export async function sendMail(opts: SendMailOptions): Promise<void> {
  const recipients = Array.isArray(opts.to) ? opts.to.join(', ') : opts.to;

  if (config.nodeEnv === 'development') {
    console.log('\n────────────────────────────────────────────');
    console.log(`[EMAIL] To:      ${recipients}`);
    console.log(`[EMAIL] Subject: ${opts.subject}`);
    console.log('[EMAIL] Body:   (HTML — see template)');
    console.log('────────────────────────────────────────────\n');
    return;
  }

  const transport = getTransport();

  await transport.sendMail({
    from: `"${config.email.fromName}" <${config.email.fromAddress}>`,
    to: recipients,
    replyTo: opts.replyTo,
    subject: opts.subject,
    html: opts.html,
    text: opts.text ?? stripHtml(opts.html),
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Minimal HTML stripper for plain-text fallback */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|tr|li|h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
