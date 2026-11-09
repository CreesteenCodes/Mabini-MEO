import { NextResponse } from 'next/server';
import { findLocalUser } from '@/lib/local-database';
import { normalizeKey, clearLockout, isLocked } from '@/lib/lockout';
import { getMasterPassword } from '@/lib/master-password';

export const runtime = 'nodejs';

function getAdminUnlockCode(): string {
  return getMasterPassword();
}

function isAdminRole(role: string | null | undefined): boolean {
  return role === 'Head Engineer';
}

export async function POST(request: Request) {
  const { username, masterCode } = await request.json();
  const identifier = String(username ?? '').trim();
  if (!identifier) {
    return NextResponse.json({ message: 'Username is required.' }, { status: 400 });
  }

  const key = normalizeKey(identifier);

  const role = findLocalUser(identifier)?.role ?? null;

  const isAdmin = isAdminRole(role);
  const providedMaster = String(masterCode ?? '').trim();
  const adminUnlockCode = getAdminUnlockCode();
  if (isAdmin && providedMaster !== adminUnlockCode) {
    return NextResponse.json(
      { message: 'Invalid master unlock code.', requiresMaster: true },
      { status: 401 }
    );
  }

  const wasLocked = isLocked(key).locked;
  clearLockout(key);

  return NextResponse.json({
    success: true,
    unlocked: true,
    wasLocked,
    message: wasLocked ? 'Account unlocked.' : 'Account is not currently locked.',
  });
}

export async function PATCH(request: Request) {
  const { currentPassword, newPassword } = await request.json();
  const currentValue = String(currentPassword ?? '').trim();
  const nextValue = String(newPassword ?? '').trim();

  if (!currentValue || !nextValue) {
    return NextResponse.json({ message: 'Current and new password are required.' }, { status: 400 });
  }

  const currentAdminUnlockCode = getAdminUnlockCode();
  if (currentValue !== currentAdminUnlockCode) {
    return NextResponse.json({ message: 'Current master password is incorrect.' }, { status: 401 });
  }

  if (nextValue.length < 6) {
    return NextResponse.json({ message: 'New password must be at least 6 characters long.' }, { status: 400 });
  }

  const { setMasterPassword } = await import('@/lib/master-password');
  const saved = setMasterPassword(nextValue);

  if (!saved) {
    return NextResponse.json({ message: 'Unable to save the new master password.' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: 'Master password updated successfully.',
  });
}
