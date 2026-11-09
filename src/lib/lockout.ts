export const MAX_ATTEMPTS = 3;
export const LOCKOUT_MS = 15 * 60 * 1000;

export interface AttemptRecord {
  count: number;
  lockedUntil: number;
  lockoutCount: number;
}

const attemptStore = new Map<string, AttemptRecord>();

export function normalizeKey(identifier: string): string {
  return String(identifier ?? '').trim().toLowerCase();
}

export function isLocked(key: string): { locked: boolean; retryAfterSeconds: number } {
  const rec = attemptStore.get(key);
  if (rec && rec.count >= MAX_ATTEMPTS && Date.now() < rec.lockedUntil) {
    return { locked: true, retryAfterSeconds: Math.ceil((rec.lockedUntil - Date.now()) / 1000) };
  }
  return { locked: false, retryAfterSeconds: 0 };
}

export function getAttempts(key: string): AttemptRecord {
  const now = Date.now();
  const rec = attemptStore.get(key);
  if (!rec) {
    return { count: 0, lockedUntil: 0, lockoutCount: 0 };
  }
  if (rec.lockedUntil > 0 && now >= rec.lockedUntil) {
    return { count: 0, lockedUntil: 0, lockoutCount: rec.lockoutCount };
  }
  return rec;
}

function recordFailure(key: string): AttemptRecord {
  const now = Date.now();
  const rec = getAttempts(key);
  const locked = rec.count + 1 >= MAX_ATTEMPTS;
  const next: AttemptRecord = locked
    ? {
        count: rec.count + 1,
        lockedUntil: now + (rec.lockoutCount + 1) * LOCKOUT_MS,
        lockoutCount: rec.lockoutCount + 1,
      }
    : { count: rec.count + 1, lockedUntil: 0, lockoutCount: rec.lockoutCount };
  attemptStore.set(key, next);
  return next;
}

export function recordSuccess(key: string): void {
  attemptStore.delete(key);
}

export function clearLockout(key: string): boolean {
  const rec = attemptStore.get(key);
  if (!rec) return false;

  attemptStore.set(key, {
    count: 0,
    lockedUntil: 0,
    lockoutCount: rec.lockoutCount,
  });
  return true;
}

export function clearLockoutIfPresent(key: string): boolean {
  return clearLockout(normalizeKey(key));
}

export function listLockedKeys(): string[] {
  const now = Date.now();
  const keys: string[] = [];
  attemptStore.forEach((rec, key) => {
    if (rec.count >= MAX_ATTEMPTS && now < rec.lockedUntil) {
      keys.push(key);
    }
  });
  return keys;
}

export function recordFailureAndGetCount(key: string): AttemptRecord {
  return recordFailure(key);
}

export function lockoutExpiredAt(key: string): number | null {
  const rec = attemptStore.get(key);
  if (rec && rec.count >= MAX_ATTEMPTS && rec.lockedUntil > Date.now()) {
    return rec.lockedUntil;
  }
  return null;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins} min ${secs} sec` : `${secs} sec`;
}
