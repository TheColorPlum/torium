/**
 * Resend email client
 * Used for sending magic link emails
 */

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface ResendResponse {
  id: string;
}

export interface ResendError {
  statusCode: number;
  message: string;
  name: string;
}

/**
 * Send an email via Resend API
 */
export async function sendEmail(
  apiKey: string,
  params: SendEmailParams
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Torium <noreply@torium.app>',
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json() as ResendError;
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}`,
      };
    }

    const data = await response.json() as ResendResponse;
    return { success: true, id: data.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Generate magic link email HTML
 */
export function generateMagicLinkEmail(verifyUrl: string): { html: string; text: string } {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px 20px; background: #f9fafb;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="color: #8E4585; margin: 0 0 24px; font-size: 24px;">Sign in to Torium</h1>
    <p style="color: #374151; line-height: 1.6; margin: 0 0 24px;">
      Click the button below to sign in to your Torium account. This link expires in 15 minutes.
    </p>
    <a href="${verifyUrl}" style="display: inline-block; background: #8E4585; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500;">
      Sign in to Torium
    </a>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
      If you didn't request this email, you can safely ignore it.
    </p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">
    <p style="color: #9ca3af; font-size: 12px; margin: 0;">
      Torium — Short links, beautifully simple.
    </p>
  </div>
</body>
</html>
  `.trim();

  const text = `
Sign in to Torium

Click the link below to sign in to your Torium account. This link expires in 15 minutes.

${verifyUrl}

If you didn't request this email, you can safely ignore it.

— Torium
  `.trim();

  return { html, text };
}
