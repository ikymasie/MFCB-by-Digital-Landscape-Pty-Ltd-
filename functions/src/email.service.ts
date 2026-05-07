import * as nodemailer from 'nodemailer';
import { config } from './config';

let _transport: nodemailer.Transporter | null = null;

function getTransport(): nodemailer.Transporter {
  if (_transport) return _transport;

  _transport = nodemailer.createTransport({
    host: config.email.smtpHost,
    port: config.email.smtpPort,
    secure: true,
    auth: {
      user: config.email.smtpUser,
      pass: config.email.smtpPassword,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  });

  return _transport;
}

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export async function sendMail(opts: SendMailOptions): Promise<void> {
  const recipients = Array.isArray(opts.to) ? opts.to.join(', ') : opts.to;

  if (process.env.NODE_ENV === 'development') {
    console.log('\n────────────────────────────────────────────');
    console.log(`[EMAIL] To:      ${recipients}`);
    console.log(`[EMAIL] Subject: ${opts.subject}`);
    console.log('[EMAIL] Body:   (HTML — see template)');
    console.log('────────────────────────────────────────────\n');
    return;
  }

  const transport = getTransport();

  await transport.sendMail({
    from: `"${config.email.fromName}" <${config.email.smtpUser}>`,
    to: recipients,
    replyTo: opts.replyTo,
    subject: opts.subject,
    html: opts.html,
    text: opts.text ?? stripHtml(opts.html),
  });
}

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
