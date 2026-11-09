import Database from 'better-sqlite3';
import { createHash, randomBytes, randomInt, randomUUID, scryptSync, timingSafeEqual } from 'crypto';
import fs from 'fs';
import path from 'path';
import { DEMO_LOCAL_ROADS, DEMO_USERS, type DemoUser } from '@/lib/demo-data';

export type StoredRecord = Record<string, unknown> & { id: string };
export type LocalUser = Omit<DemoUser, 'password'> & {
  status: 'Active' | 'Inactive';
  createdDate?: string;
  archivedAt?: string;
};

const databasePath = path.join(process.cwd(), 'data', 'local-road.sqlite');
const legacyUsersPath = path.join(process.cwd(), 'data', 'demo-users.json');

let database: Database.Database | undefined;

function purgeExpiredArchives(db: Database.Database): void {
  const purge = db.transaction(() => {
    for (const table of ['maintenance_records', 'inspections', 'roads', 'users'] as const) {
      db.prepare(`
        DELETE FROM ${table}
        WHERE archived_at IS NOT NULL
          AND archived_at <= datetime('now', '-30 days')
      `).run();
    }
  });
  purge();
}

function getDatabase(): Database.Database {
  if (database) {
    purgeExpiredArchives(database);
    return database;
  }

  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  database = new Database(databasePath);
  database.pragma('journal_mode = WAL');
  database.pragma('foreign_keys = ON');
  database.exec(`
    CREATE TABLE IF NOT EXISTS roads (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      archived_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS inspections (
      id TEXT PRIMARY KEY,
      road_id TEXT NOT NULL REFERENCES roads(id) ON DELETE CASCADE,
      data TEXT NOT NULL,
      archived_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS maintenance_records (
      id TEXT PRIMARY KEY,
      road_id TEXT NOT NULL REFERENCES roads(id) ON DELETE CASCADE,
      data TEXT NOT NULL,
      archived_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Active',
      archived_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS password_reset_codes (
      email TEXT PRIMARY KEY,
      code_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token_hash TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS activity_logs (
      id TEXT PRIMARY KEY,
      user TEXT NOT NULL,
      action TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      details TEXT NOT NULL
    );
  `);
  const roadColumns = database.prepare('PRAGMA table_info(roads)').all() as Array<{ name: string }>;
  if (!roadColumns.some((column) => column.name === 'archived_at')) {
    database.exec('ALTER TABLE roads ADD COLUMN archived_at TEXT');
  }
  for (const table of ['inspections', 'maintenance_records']) {
    const columns = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    if (!columns.some((column) => column.name === 'archived_at')) database.exec(`ALTER TABLE ${table} ADD COLUMN archived_at TEXT`);
  }
  const userColumns = database.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>;
  if (!userColumns.some((column) => column.name === 'archived_at')) database.exec('ALTER TABLE users ADD COLUMN archived_at TEXT');

  seedRoads(database);
  seedUsers(database);
  purgeExpiredArchives(database);
  return database;
}

function seedRoads(db: Database.Database): void {
  const count = db.prepare('SELECT COUNT(*) AS count FROM roads').get() as { count: number };
  if (count.count > 0) return;

  const insert = db.prepare('INSERT INTO roads (id, data) VALUES (?, ?)');
  const seed = db.transaction(() => {
    DEMO_LOCAL_ROADS.forEach((road) => insert.run(road.id, JSON.stringify(road)));
  });
  seed();
}

function readLegacyUsers(): DemoUser[] {
  if (!fs.existsSync(legacyUsersPath)) return DEMO_USERS;
  const parsed: unknown = JSON.parse(fs.readFileSync(legacyUsersPath, 'utf8'));
  if (
    !Array.isArray(parsed) ||
    parsed.some((user) =>
      !user ||
      typeof user.userId !== 'string' ||
      typeof user.name !== 'string' ||
      typeof user.email !== 'string' ||
      typeof user.username !== 'string' ||
      typeof user.password !== 'string' ||
      typeof user.role !== 'string'
    )
  ) {
    throw new Error('The existing local user data file is invalid.');
  }
  return parsed as DemoUser[];
}

function hashPassword(password: string): string {
  const salt = randomUUID();
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function seedUsers(db: Database.Database): void {
  const count = db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number };
  if (count.count > 0) return;

  const insert = db.prepare(`
    INSERT INTO users (id, name, email, username, password_hash, role, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const seed = db.transaction(() => {
    readLegacyUsers().forEach((user) => {
      insert.run(
        user.userId,
        user.name,
        user.email.toLowerCase(),
        user.username,
        hashPassword(user.password),
        user.role,
        user.status ?? 'Active'
      );
    });
  });
  seed();
}

function readRecords(table: 'roads' | 'inspections' | 'maintenance_records'): StoredRecord[] {
  const rows = getDatabase()
    .prepare(`SELECT data FROM ${table} WHERE archived_at IS NULL ORDER BY created_at DESC, rowid DESC`)
    .all() as Array<{ data: string }>;
  return rows.map((row) => JSON.parse(row.data) as StoredRecord);
}

function saveRecord(
  table: 'roads' | 'inspections' | 'maintenance_records',
  record: StoredRecord,
  roadId?: string
): void {
  const db = getDatabase();
  if (table === 'roads') {
    db.prepare(`
      INSERT INTO roads (id, data) VALUES (?, ?)
      ON CONFLICT(id) DO UPDATE SET data = excluded.data
    `).run(record.id, JSON.stringify(record));
    return;
  }

  if (!roadId) throw new Error('A road ID is required for this record.');
  db.prepare(`
    INSERT INTO ${table} (id, road_id, data) VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET road_id = excluded.road_id, data = excluded.data
  `).run(record.id, roadId, JSON.stringify(record));
}

export function listRoads(): StoredRecord[] {
  return readRecords('roads');
}

export function saveRoad(record: StoredRecord): void {
  saveRecord('roads', record);
}

function parseDateOnly(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)));
  if (
    date.getUTCFullYear() !== Number(yearText) ||
    date.getUTCMonth() !== Number(monthText) - 1 ||
    date.getUTCDate() !== Number(dayText)
  ) return null;
  return date;
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getAnniversaryDate(completionDate: Date, year: number): Date {
  const month = completionDate.getUTCMonth();
  const day = completionDate.getUTCDate();
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDayOfMonth)));
}

export function syncAnnualFollowUps(today = new Date()): void {
  const db = getDatabase();
  const todayDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const todayText = formatDateOnly(todayDate);
  const currentYear = todayDate.getUTCFullYear();
  const roadRows = db.prepare('SELECT id, data FROM roads WHERE archived_at IS NULL').all() as Array<{ id: string; data: string }>;
  const insertInspection = db.prepare(`
    INSERT OR IGNORE INTO inspections (id, road_id, data)
    VALUES (?, ?, ?)
  `);
  const updateRoad = db.prepare('UPDATE roads SET data = ? WHERE id = ? AND archived_at IS NULL');

  const sync = db.transaction(() => {
    for (const row of roadRows) {
      const road = JSON.parse(row.data) as StoredRecord & {
        actualCompletionDate?: string;
        annualInspectionYears?: number[];
        annualValidationEntries?: Array<{
          year: number;
          dueDate: string;
          result: 'Pending' | 'Validated' | 'Return for Revision';
          remarks: string;
        }>;
      };
      const completionDate = parseDateOnly(road.actualCompletionDate);
      if (!completionDate) continue;

      const inspectionYears = new Set(
        Array.isArray(road.annualInspectionYears)
          ? road.annualInspectionYears.filter((year): year is number => Number.isInteger(year))
          : []
      );
      const validationEntries = Array.isArray(road.annualValidationEntries)
        ? [...road.annualValidationEntries]
        : [];
      let roadChanged = false;

      for (let year = completionDate.getUTCFullYear() + 1; year <= currentYear + 1; year += 1) {
        const anniversaryDate = getAnniversaryDate(completionDate, year);
        const dueDate = new Date(anniversaryDate);
        dueDate.setUTCDate(dueDate.getUTCDate() - 30);
        const dueDateText = formatDateOnly(dueDate);
        if (dueDateText > todayText) continue;

        if (!inspectionYears.has(year)) {
          const inspectionId = `annual-follow-up-${row.id}-${year}`;
          const inspection = {
            id: inspectionId,
            localRoadId: row.id,
            localRoadName: String(road.name || road.projectName || road.roadName || ''),
            projectName: String(road.projectName || road.name || ''),
            projectCategory: String(road.projectCategory || road.type || ''),
            location: String(road.location || ''),
            date: dueDateText,
            conditionRating: 0,
            conditionRatings: {
              Concrete: 'N/A',
              Asphalt: 'N/A',
              Gravel: 'N/A',
              Earth: 'N/A',
              Shoulder: 'N/A',
              'Side Drain': 'N/A',
              Sidewalk: 'N/A',
            },
            remarks: '',
            inspector: '',
            inspectionType: 'Acceptance Inspection',
            validationStatus: 'Pending Validation',
            isAnnualFollowUp: true,
            isScheduledAnnualFollowUp: true,
            annualFollowUpYear: year,
          };
          insertInspection.run(inspectionId, row.id, JSON.stringify(inspection));
          inspectionYears.add(year);
          roadChanged = true;
        }

        if (!validationEntries.some((entry) => entry.year === year)) {
          validationEntries.push({
            year,
            dueDate: dueDateText,
            result: 'Pending',
            remarks: '',
          });
          roadChanged = true;
        }
      }

      if (roadChanged) {
        road.annualInspectionYears = [...inspectionYears].sort((a, b) => a - b);
        road.annualValidationEntries = validationEntries.sort((a, b) => a.year - b.year);
        updateRoad.run(JSON.stringify(road), row.id);
      }
    }
  });
  sync();
}

export function deleteRoad(id: string): boolean {
  return getDatabase().prepare('UPDATE roads SET archived_at = datetime(\'now\') WHERE id = ? AND archived_at IS NULL').run(id).changes > 0;
}

export function listArchivedRoads(): StoredRecord[] {
  const rows = getDatabase().prepare(`
    SELECT data FROM roads
    WHERE archived_at IS NOT NULL
    ORDER BY archived_at DESC, rowid DESC
  `).all() as Array<{ data: string }>;
  return rows.map((row) => JSON.parse(row.data) as StoredRecord);
}

export function restoreRoad(id: string): boolean {
  return getDatabase().prepare('UPDATE roads SET archived_at = NULL WHERE id = ? AND archived_at IS NOT NULL').run(id).changes > 0;
}

export function permanentlyDeleteRoad(id: string): boolean {
  return getDatabase().prepare('DELETE FROM roads WHERE id = ? AND archived_at IS NOT NULL').run(id).changes > 0;
}

export interface ActivityLogRecord {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  details: string;
}

export function addActivityLog(input: Omit<ActivityLogRecord, 'id' | 'timestamp'>): ActivityLogRecord {
  const log = { ...input, id: randomUUID(), timestamp: new Date().toISOString() };
  getDatabase().prepare(`
    INSERT INTO activity_logs (id, user, action, timestamp, details)
    VALUES (?, ?, ?, ?, ?)
  `).run(log.id, log.user, log.action, log.timestamp, log.details);
  return log;
}

export function listActivityLogs(): ActivityLogRecord[] {
  return getDatabase().prepare(`
    SELECT id, user, action, timestamp, details
    FROM activity_logs ORDER BY timestamp DESC
  `).all() as ActivityLogRecord[];
}

export function listInspections(): StoredRecord[] {
  return readRecords('inspections');
}

export function saveInspection(record: StoredRecord, roadId: string): void {
  saveRecord('inspections', record, roadId);
}

export function deleteInspection(id: string): boolean {
  return getDatabase().prepare('UPDATE inspections SET archived_at = datetime(\'now\') WHERE id = ? AND archived_at IS NULL').run(id).changes > 0;
}

export function listArchivedInspections(): StoredRecord[] {
  const rows = getDatabase().prepare('SELECT data FROM inspections WHERE archived_at IS NOT NULL ORDER BY archived_at DESC').all() as Array<{ data: string }>;
  return rows.map((row) => JSON.parse(row.data) as StoredRecord);
}

export function restoreInspection(id: string): boolean {
  return getDatabase().prepare('UPDATE inspections SET archived_at = NULL WHERE id = ? AND archived_at IS NOT NULL').run(id).changes > 0;
}

export function permanentlyDeleteInspection(id: string): boolean {
  return getDatabase().prepare('DELETE FROM inspections WHERE id = ? AND archived_at IS NOT NULL').run(id).changes > 0;
}

export function listMaintenanceRecords(): StoredRecord[] {
  return readRecords('maintenance_records');
}

export function saveMaintenanceRecord(record: StoredRecord, roadId: string): void {
  saveRecord('maintenance_records', record, roadId);
}

export function deleteMaintenanceRecord(id: string): boolean {
  return getDatabase().prepare('UPDATE maintenance_records SET archived_at = datetime(\'now\') WHERE id = ? AND archived_at IS NULL').run(id).changes > 0;
}

export function listArchivedMaintenanceRecords(): StoredRecord[] {
  const rows = getDatabase().prepare('SELECT data FROM maintenance_records WHERE archived_at IS NOT NULL ORDER BY archived_at DESC').all() as Array<{ data: string }>;
  return rows.map((row) => JSON.parse(row.data) as StoredRecord);
}

export function restoreMaintenanceRecord(id: string): boolean {
  return getDatabase().prepare('UPDATE maintenance_records SET archived_at = NULL WHERE id = ? AND archived_at IS NOT NULL').run(id).changes > 0;
}

export function permanentlyDeleteMaintenanceRecord(id: string): boolean {
  return getDatabase().prepare('DELETE FROM maintenance_records WHERE id = ? AND archived_at IS NOT NULL').run(id).changes > 0;
}

export function findLocalUser(identifier: string): (LocalUser & { passwordHash: string }) | undefined {
  const normalized = identifier.trim().toLowerCase();
  const row = getDatabase().prepare(`
    SELECT id, name, email, username, role, status, password_hash AS passwordHash, created_at AS createdAt
    FROM users
    WHERE archived_at IS NULL AND (lower(username) = ? OR lower(email) = ?)
  `).get(normalized, normalized) as
    | (Omit<DemoUser, 'password' | 'userId'> & { id: string; passwordHash: string; status: string; createdAt: string })
    | undefined;
  if (!row) return undefined;
  return {
    userId: row.id,
    name: row.name,
    email: row.email,
    username: row.username,
    role: row.role as DemoUser['role'],
    status: row.status === 'Inactive' ? 'Inactive' : 'Active',
    createdDate: row.createdAt.slice(0, 10),
    passwordHash: row.passwordHash,
  };
}

export function authenticateLocalUser(
  identifier: string,
  password: string
): LocalUser | undefined {
  const user = findLocalUser(identifier);
  if (!user || !verifyPassword(password, user.passwordHash)) return undefined;
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

export function createPasswordResetCode(email: string): { code: string; user: LocalUser } | undefined {
  const user = findLocalUser(email);
  if (!user) return undefined;
  const code = String(randomInt(100000, 1000000));
  getDatabase().prepare(`
    INSERT INTO password_reset_codes (email, code_hash, expires_at, attempts)
    VALUES (?, ?, ?, 0)
    ON CONFLICT(email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0
  `).run(email.trim().toLowerCase(), createHash('sha256').update(code).digest('hex'), Date.now() + 10 * 60 * 1000);
  return { code, user };
}

export function resetLocalUserPassword(email: string, code: string, password: string): 'success' | 'invalid' | 'expired' {
  const normalizedEmail = email.trim().toLowerCase();
  const row = getDatabase().prepare('SELECT code_hash, expires_at, attempts FROM password_reset_codes WHERE email = ?').get(normalizedEmail) as
    | { code_hash: string; expires_at: number; attempts: number }
    | undefined;
  if (!row || row.attempts >= 5) return 'invalid';
  if (row.expires_at < Date.now()) return 'expired';
  const valid = timingSafeEqual(Buffer.from(row.code_hash, 'hex'), createHash('sha256').update(code).digest());
  if (!valid) {
    getDatabase().prepare('UPDATE password_reset_codes SET attempts = attempts + 1 WHERE email = ?').run(normalizedEmail);
    return 'invalid';
  }

  getDatabase().prepare('UPDATE users SET password_hash = ? WHERE lower(email) = ?').run(hashPassword(password), normalizedEmail);
  getDatabase().prepare('DELETE FROM password_reset_codes WHERE email = ?').run(normalizedEmail);
  return 'success';
}

export function createPasswordResetToken(email: string): { token: string; user: LocalUser } | undefined {
  const user = findLocalUser(email);
  if (!user) return undefined;
  const token = randomBytes(32).toString('hex');
  getDatabase().prepare(`
    INSERT INTO password_reset_tokens (token_hash, email, expires_at)
    VALUES (?, ?, ?)
  `).run(createHash('sha256').update(token).digest('hex'), email.trim().toLowerCase(), Date.now() + 10 * 60 * 1000);
  return { token, user };
}

export function resetLocalUserPasswordByToken(token: string, password: string): 'success' | 'invalid' | 'expired' {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const row = getDatabase().prepare('SELECT email, expires_at FROM password_reset_tokens WHERE token_hash = ?').get(tokenHash) as
    | { email: string; expires_at: number }
    | undefined;
  if (!row) return 'invalid';
  if (row.expires_at < Date.now()) {
    getDatabase().prepare('DELETE FROM password_reset_tokens WHERE token_hash = ?').run(tokenHash);
    return 'expired';
  }
  getDatabase().prepare('UPDATE users SET password_hash = ? WHERE lower(email) = ?').run(hashPassword(password), row.email);
  getDatabase().prepare('DELETE FROM password_reset_tokens WHERE token_hash = ?').run(tokenHash);
  return 'success';
}

function mapLocalUserRow(row: {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  status: string;
  createdAt: string;
  archivedAt: string | null;
}): LocalUser {
  return {
    userId: row.id,
    name: row.name,
    email: row.email,
    username: row.username,
    role: row.role as DemoUser['role'],
    status: row.status === 'Inactive' ? 'Inactive' : 'Active',
    createdDate: row.createdAt.slice(0, 10),
    ...(row.archivedAt ? { archivedAt: row.archivedAt } : {}),
  };
}

export function listLocalUsers(): LocalUser[] {
  const rows = getDatabase().prepare(`
    SELECT id, name, email, username, role, status, created_at AS createdAt, archived_at AS archivedAt
    FROM users
    WHERE archived_at IS NULL
    ORDER BY created_at, rowid
  `).all() as Array<{
    id: string;
    name: string;
    email: string;
    username: string;
    role: string;
    status: string;
    createdAt: string;
    archivedAt: null;
  }>;
  return rows.map(mapLocalUserRow);
}

export function listArchivedLocalUsers(): LocalUser[] {
  const rows = getDatabase().prepare(`
    SELECT id, name, email, username, role, status, created_at AS createdAt, archived_at AS archivedAt
    FROM users
    WHERE archived_at IS NOT NULL
    ORDER BY archived_at DESC, rowid DESC
  `).all() as Array<{
    id: string;
    name: string;
    email: string;
    username: string;
    role: string;
    status: string;
    createdAt: string;
    archivedAt: string;
  }>;
  return rows.map(mapLocalUserRow);
}

export function archiveLocalUser(id: string): boolean {
  return getDatabase()
    .prepare('UPDATE users SET archived_at = datetime(\'now\') WHERE id = ? AND archived_at IS NULL')
    .run(id).changes > 0;
}

export function restoreLocalUser(id: string): boolean {
  return getDatabase()
    .prepare('UPDATE users SET archived_at = NULL WHERE id = ? AND archived_at IS NOT NULL')
    .run(id).changes > 0;
}

export function permanentlyDeleteLocalUser(id: string): boolean {
  return getDatabase()
    .prepare('DELETE FROM users WHERE id = ? AND archived_at IS NOT NULL')
    .run(id).changes > 0;
}

export function updateLocalUser(id: string, input: {
  name: string;
  email: string;
  username: string;
  role: string;
  status: 'Active' | 'Inactive';
}): boolean {
  return getDatabase().prepare(`
    UPDATE users SET name = ?, email = ?, username = ?, role = ?, status = ?
    WHERE id = ? AND archived_at IS NULL
  `).run(
    input.name.trim(),
    input.email.trim().toLowerCase(),
    input.username.trim().toLowerCase(),
    input.role,
    input.status,
    id
  ).changes > 0;
}

export function updateLocalUserStatus(email: string, status: 'Active' | 'Inactive'): boolean {
  return getDatabase()
    .prepare('UPDATE users SET status = ? WHERE lower(email) = ? AND archived_at IS NULL')
    .run(status, email.trim().toLowerCase()).changes > 0;
}

export function createLocalUser(input: {
  name: string;
  email: string;
  username: string;
  password: string;
  role: string;
  status: 'Active' | 'Inactive';
}): LocalUser {
  const db = getDatabase();
  const userId = randomUUID();
  db.prepare(`
    INSERT INTO users (id, name, email, username, password_hash, role, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    input.name.trim(),
    input.email.trim().toLowerCase(),
    input.username.trim().toLowerCase(),
    hashPassword(input.password),
    input.role,
    input.status
  );
  return {
    userId,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    username: input.username.trim().toLowerCase(),
    role: input.role as DemoUser['role'],
    status: input.status,
  };
}
