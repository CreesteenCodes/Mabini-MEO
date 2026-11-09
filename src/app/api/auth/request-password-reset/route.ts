import nodemailer from 'nodemailer';
import { NextResponse } from 'next/server';
import { createPasswordResetToken } from '@/lib/local-database';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const { email } = await request.json();
  const normalizedEmail = String(email ?? '').trim().toLowerCase();
  if (!normalizedEmail) return NextResponse.json({ message: 'Registered email is required.' }, { status: 400 });

  const reset = createPasswordResetToken(normalizedEmail);
  if (!reset) return NextResponse.json({ message: 'No account is registered with that email.' }, { status: 404 });

  const sender = process.env.SMTP_FROM_EMAIL || 'ortegajeicelmae@gmail.com';
  const appPassword = process.env.SMTP_APP_PASSWORD;
  if (!appPassword) {
    return NextResponse.json({ message: 'Gmail SMTP is not configured. Add SMTP_APP_PASSWORD to .env.' }, { status: 503 });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: sender,
        pass: appPassword,
      },
    });
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(reset.token)}`;
    await transporter.sendMail({
      from: sender,
      to: reset.user.email,
      subject: 'Reset your Local Road Monitoring System password',
      text: `Reset your password using this link: ${resetUrl}\n\nThis link expires in 10 minutes.`,
      html: `<p>We received a request to reset your password.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 10 minutes.</p>`,
    });
    return NextResponse.json({ message: 'A password reset link was sent to your registered email.' });
  } catch (error) {
    console.error('Gmail password reset failed.', error);
    return NextResponse.json({ message: 'Unable to send the reset email. Check the Gmail App Password configuration.' }, { status: 502 });
  }
}
