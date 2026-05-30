import { supabase } from './supabase';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Call Supabase Edge Function (server-side) — RESEND_API_KEY is stored as a secret
    // in the Edge Function, never exposed to the client
    const { data, error: fnError } = await supabase.functions.invoke('send-email', {
      body: params,
    });

    if (fnError) {
      return { success: false, error: fnError.message };
    }

    const result = data as { success?: boolean; error?: string };
    if (!result.success) {
      return { success: false, error: result.error || 'Unknown error' };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export function buildNotificationEmail(params: {
  type: 'project' | 'task' | 'deadline' | 'daily_summary';
  recipientName: string;
  content: {
    title: string;
    message: string;
    link?: string;
  };
}): { subject: string; html: string; text: string } {
  const { type, recipientName, content: c } = params;

  const baseSubject: Record<string, string> = {
    project: '📋 New Project Update - DevFlow',
    task: '✅ Task Update - DevFlow',
    deadline: '⏰ Deadline Reminder - DevFlow',
    daily_summary: '📊 Daily Summary - DevFlow',
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px;">
    <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px;text-align:center;">
        <h1 style="color:white;margin:0;font-size:24px;font-weight:700;">DevFlow</h1>
        <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">Project Management Dashboard</p>
      </div>
      <div style="padding:32px;">
        <p style="margin:0 0 8px;font-size:14px;color:#64748b;">Hi ${recipientName},</p>
        <h2 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#1e293b;">${c.title}</h2>
        <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">${c.message}</p>
        ${c.link ? `<a href="${c.link}" style="display:inline-block;background:#4f46e5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Open DevFlow</a>` : ''}
      </div>
      <div style="padding:24px 32px;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="margin:0;font-size:12px;color:#94a3b8;">Sent by DevFlow Dashboard</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const text = `${c.title}\n\nHi ${recipientName},\n\n${c.message}\n${c.link ? `\nOpen DevFlow: ${c.link}` : ''}\n\nSent by DevFlow Dashboard`;

  return {
    subject: baseSubject[type] || 'DevFlow Notification',
    html,
    text,
  };
}
