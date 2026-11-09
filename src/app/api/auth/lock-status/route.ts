import { NextResponse } from 'next/server';
import { listLockedKeys, isLocked } from '@/lib/lockout';

export async function GET() {
  const keys = listLockedKeys();
  const locked: Record<string, number> = {};
  keys.forEach((key) => {
    const { retryAfterSeconds } = isLocked(key);
    locked[key] = retryAfterSeconds;
  });
  return NextResponse.json({ locked });
}
