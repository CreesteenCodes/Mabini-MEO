import fs from 'fs';
import path from 'path';

const MASTER_PASSWORD_FILE = path.join(process.cwd(), 'data', 'master-password.txt');

export function getMasterPassword(): string {
  const envValue = process.env.ADMIN_UNLOCK_CODE?.trim();
  if (envValue) {
    return envValue;
  }

  try {
    if (fs.existsSync(MASTER_PASSWORD_FILE)) {
      const saved = fs.readFileSync(MASTER_PASSWORD_FILE, 'utf8').trim();
      if (saved) {
        return saved;
      }
    }
  } catch {
    // Ignore file read errors and fall back to the default.
  }

  return 'master123';
}

export function setMasterPassword(newPassword: string): boolean {
  const value = newPassword.trim();
  if (!value) {
    return false;
  }

  try {
    fs.mkdirSync(path.dirname(MASTER_PASSWORD_FILE), { recursive: true });
    fs.writeFileSync(MASTER_PASSWORD_FILE, value, 'utf8');
    process.env.ADMIN_UNLOCK_CODE = value;
    return true;
  } catch {
    return false;
  }
}
