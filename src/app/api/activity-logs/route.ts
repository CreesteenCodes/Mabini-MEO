import { NextResponse } from 'next/server';
import { addActivityLog, listActivityLogs } from '@/lib/local-database';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ logs: listActivityLogs() });
}

export async function POST(request: Request) {
  const payload = await request.json();
  if (!payload?.user || !payload?.action || !payload?.details) {
    return NextResponse.json({ message: 'User, action, and details are required.' }, { status: 400 });
  }
  return NextResponse.json({ log: addActivityLog({
    user: String(payload.user),
    action: String(payload.action),
    details: String(payload.details),
  }) }, { status: 201 });
}
