import { NextResponse } from 'next/server';
import { resetLocalUserPasswordByToken } from '@/lib/local-database';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const { token, password } = await request.json();
  const resetToken = String(token ?? '').trim();
  const nextPassword = String(password ?? '');
  if (!resetToken || nextPassword.length < 6) {
    return NextResponse.json({ message: 'A reset link and a password of at least 6 characters are required.' }, { status: 400 });
  }
  const result = resetLocalUserPasswordByToken(resetToken, nextPassword);
  if (result === 'expired') return NextResponse.json({ message: 'This password reset link has expired.' }, { status: 410 });
  if (result !== 'success') return NextResponse.json({ message: 'This password reset link is invalid.' }, { status: 401 });
  return NextResponse.json({ message: 'Password updated successfully. You can now sign in.' });
}
