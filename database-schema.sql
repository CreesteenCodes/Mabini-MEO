-- Local Road creates these tables automatically in data/local-road.sqlite.
-- This file documents the SQLite schema used by src/lib/local-database.ts.

CREATE TABLE roads (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE inspections (
  id TEXT PRIMARY KEY,
  road_id TEXT NOT NULL REFERENCES roads(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE maintenance_records (
  id TEXT PRIMARY KEY,
  road_id TEXT NOT NULL REFERENCES roads(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  archived_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE users (
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
