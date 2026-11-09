import { NextResponse } from 'next/server';
import { addActivityLog, authenticateLocalUser } from '@/lib/local-database';
import {
  MAX_ATTEMPTS,
  clearLockoutIfPresent,
  formatDuration,
  isLocked,
  normalizeKey,
  recordFailureAndGetCount,
  recordSuccess,
} from '@/lib/lockout';

export const runtime = 'nodejs';

function lockedResponse(key: string): NextResponse {
  const { retryAfterSeconds } = isLocked(key);
  return NextResponse.json(
    {
      message: `Account locked due to too many failed attempts. Try again in ${formatDuration(retryAfterSeconds)}.`,
      locked: true,
      retryAfterSeconds,
    },
    { status: 423 }
  );
}

export async function POST(request: Request) {
  const { username, password } = await request.json();
  const identifier = String(username ?? '').trim();
  const passwordValue = String(password ?? '');
  const key = normalizeKey(identifier);

  if (!identifier || !passwordValue) {
    return NextResponse.json({ message: 'Username and password are required.' }, { status: 400 });
  }
  if (isLocked(key).locked) return lockedResponse(key);

  const user = authenticateLocalUser(identifier, passwordValue);
  if (user?.status === 'Inactive') {
    return NextResponse.json(
      { message: 'This account is inactive. Contact your administrator.' },
      { status: 403 }
    );
  }
  if (!user) {
    const next = recordFailureAndGetCount(key);
    if (next.count >= MAX_ATTEMPTS) return lockedResponse(key);
    return NextResponse.json(
      { message: `Invalid username or password. ${MAX_ATTEMPTS - next.count} attempt(s) remaining.` },
      { status: 401 }
    );
  }

  recordSuccess(key);
  clearLockoutIfPresent(key);
  addActivityLog({ user: user.username, action: 'Login', details: `User ${user.username} logged in` });
  return NextResponse.json({
    id: user.userId,
    name: user.name,
    email: user.email,
    role: user.role,
  });
}
