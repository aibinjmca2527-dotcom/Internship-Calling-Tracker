import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import { ResumeAttachment } from '@/types/email';

// Resumes list definition
export const RESUME_FILES = [
  {
    originalFile: 'Aibin_Joseph_Resume.pdf',
    cleanFilename: 'Resume_Aibin_Joseph.pdf',
    studentName: 'Aibin Joseph',
  },
  {
    originalFile: 'MilanSijo_Resume-1.pdf',
    cleanFilename: 'Resume_Milan_Sijo.pdf',
    studentName: 'Milan Sijo',
  },
  {
    originalFile: 'Edwin_Joseph_Resume.pdf',
    cleanFilename: 'Resume_Edwin_Joseph.pdf',
    studentName: 'Edwin Joseph',
  },
  {
    originalFile: 'Seba_M_Thampy_Resume.pdf',
    cleanFilename: 'Resume_Seba_M_Thampy.pdf',
    studentName: 'Seba M Thampy',
  },
  {
    originalFile: 'Lakshmi_Sabu_Resume.pdf',
    cleanFilename: 'Resume_Lakshmi_Sabu.pdf',
    studentName: 'Lakshmi Sabu',
  },
];

/**
 * Returns list of verified resumes with sizes and verification status
 */
export function getVerifiedResumes(): ResumeAttachment[] {
  const resumesDir = path.join(process.cwd(), 'public', 'resumes');
  
  return RESUME_FILES.map((item) => {
    const fullPath = path.join(resumesDir, item.originalFile);
    let sizeBytes = 0;
    let exists = false;

    try {
      if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        sizeBytes = stat.size;
        exists = true;
      }
    } catch {
      exists = false;
    }

    return {
      filename: item.cleanFilename,
      displayName: item.originalFile,
      studentName: item.studentName,
      sizeBytes,
      relativePath: `/resumes/${encodeURIComponent(item.originalFile)}`,
      exists,
    };
  });
}

/**
 * Returns configured sender accounts (Aibin, Lakshmi, Seba)
 */
export function getActiveSenders() {
  const senders = [
    {
      id: 'aibin',
      name: process.env.SENDER_AIBIN_NAME || 'Aibin Joseph',
      email: process.env.SENDER_AIBIN_EMAIL || process.env.GMAIL_USER || 'aibinjoseph9605573691@gmail.com',
      password: process.env.SENDER_AIBIN_APP_PASSWORD || process.env.GMAIL_APP_PASSWORD,
      isActive: Boolean(process.env.SENDER_AIBIN_APP_PASSWORD || process.env.GMAIL_APP_PASSWORD),
    },
    {
      id: 'lakshmi',
      name: process.env.SENDER_LAKSHMI_NAME || 'Lakshmi Sabu',
      email: process.env.SENDER_LAKSHMI_EMAIL || 'sabulakshmi801@gmail.com',
      password: process.env.SENDER_LAKSHMI_APP_PASSWORD,
      isActive: Boolean(process.env.SENDER_LAKSHMI_APP_PASSWORD),
    },
    {
      id: 'seba',
      name: process.env.SENDER_SEBA_NAME || 'Seba M Thampy',
      email: process.env.SENDER_SEBA_EMAIL || 'sebatiji15@gmail.com',
      password: process.env.SENDER_SEBA_APP_PASSWORD,
      isActive: Boolean(process.env.SENDER_SEBA_APP_PASSWORD),
    },
  ];

  return senders;
}

// Reusable Transporters and Preloaded Attachments Cache for High Speed
const transporterMap = new Map<string, ReturnType<typeof nodemailer.createTransport>>();
let cachedResumeAttachments: Array<{ filename: string; content: Buffer; contentType: string }> | null = null;

export function getPreloadedResumeAttachments() {
  if (cachedResumeAttachments && cachedResumeAttachments.length === RESUME_FILES.length) {
    return cachedResumeAttachments;
  }

  const resumesDir = path.join(process.cwd(), 'public', 'resumes');
  cachedResumeAttachments = RESUME_FILES.map((item) => {
    const fullPath = path.join(resumesDir, item.originalFile);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Resume file not found: ${item.originalFile}`);
    }
    const content = fs.readFileSync(fullPath);
    return {
      filename: item.cleanFilename,
      content,
      contentType: 'application/pdf',
    };
  });

  return cachedResumeAttachments;
}

/**
 * Creates or retrieves reusable pooled Nodemailer Transporter using specified sender credentials
 */
export function getMailTransporter(sender?: { email: string; password?: string }) {
  const user = sender?.email || process.env.GMAIL_USER;
  const pass = sender?.password || process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error(`Gmail SMTP credentials not configured for sender: ${user || 'default'}`);
  }

  if (!transporterMap.has(user)) {
    transporterMap.set(
      user,
      nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user,
          pass,
        },
        pool: true,
        maxConnections: 3,
        maxMessages: 100,
      })
    );
  }

  return transporterMap.get(user)!;
}

/**
 * Send an email with all 5 student resumes attached
 */
export async function sendOutreachEmail({
  to,
  companyName,
  subjectTemplate,
  bodyTemplate,
  sender,
}: {
  to: string;
  companyName: string;
  subjectTemplate: string;
  bodyTemplate: string;
  sender?: { name: string; email: string; password?: string };
}) {
  const activeSenders = getActiveSenders().filter((s) => s.isActive);
  const selectedSender = sender || activeSenders[0] || {
    name: 'Aibin Joseph',
    email: process.env.GMAIL_USER || 'aibinjoseph9605573691@gmail.com',
    password: process.env.GMAIL_APP_PASSWORD,
  };

  const transporter = getMailTransporter(selectedSender);

  // Replace placeholders
  const subject = subjectTemplate
    .replace(/{{company_name}}/gi, companyName)
    .replace(/\[company name\]/gi, companyName);

  const bodyText = bodyTemplate
    .replace(/{{company_name}}/gi, companyName)
    .replace(/\[company name\]/gi, companyName);

  // Convert plain text newlines into HTML paragraphs/breaks
  const bodyHtml = bodyText
    .split('\n\n')
    .map((paragraph) => `<p style="margin: 0 0 14px 0; line-height: 1.6; color: #1e293b; font-size: 15px;">${paragraph.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  // Collect preloaded in-memory attachments
  const attachments = getPreloadedResumeAttachments();

  const mailOptions = {
    from: `"${selectedSender.name} (Saintgits MCA Outreach)" <${selectedSender.email}>`,
    replyTo: selectedSender.email,
    to,
    subject,
    text: bodyText,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 24px 16px;">
        ${bodyHtml}
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
        <p style="font-size: 12px; color: #64748b; margin: 0;">
          📎 <strong>Attached:</strong> Resumes of Aibin Joseph, Milan Sijo, Edwin Joseph, Seba M Thampy, and Lakshmi Sabu (PDF).
        </p>
      </div>
    `,
    attachments,
  };

  const info = await transporter.sendMail(mailOptions);
  return {
    ...info,
    sentByName: selectedSender.name,
    sentByEmail: selectedSender.email,
  };
}
