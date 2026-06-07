import { mkdirSync } from "node:fs";
import { Database } from "bun:sqlite";

mkdirSync("./data", { recursive: true });
const db = new Database("./data/mydb.sqlite", { create: true });

if (!db.query("SELECT * FROM sqlite_master WHERE type='table'").get()) {
  db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  authentik_uid TEXT NOT NULL UNIQUE,
  email TEXT,
  username TEXT,
  name TEXT,
  groups_json TEXT NOT NULL DEFAULT '[]',
  entitlements_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS file_names (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  output_file_name TEXT NOT NULL,
  status TEXT DEFAULT 'not started',
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);
CREATE TABLE IF NOT EXISTS jobs (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	user_id INTEGER NOT NULL,
	date_created TEXT NOT NULL,
  status TEXT DEFAULT 'not started',
  num_files INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
PRAGMA user_version = 2;`);
}

const dbVersion = (db.query("PRAGMA user_version").get() as { user_version?: number }).user_version;
if (dbVersion !== 2) {
  throw new Error(
    "ConvertX authentik auth requires a fresh schema (user_version=2). Back up data/mydb.sqlite, then start with a fresh database as described in plan.md.",
  );
}

// enable WAL mode
db.exec("PRAGMA journal_mode = WAL;");

export default db;
