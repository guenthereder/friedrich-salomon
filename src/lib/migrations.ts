import { getDb } from "./db";

const MIGRATIONS = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS node (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        parent_id     INTEGER REFERENCES node(id) ON DELETE CASCADE,
        type          TEXT    NOT NULL CHECK (type IN ('collection','image')),
        slug          TEXT    NOT NULL,
        position      INTEGER NOT NULL DEFAULT 0,
        cover_image_id INTEGER REFERENCES node(id) ON DELETE SET NULL,
        layout        TEXT    NOT NULL DEFAULT 'below'
                      CHECK (layout IN ('split-left','split-right','below','image-only')),
        source_path   TEXT,
        hidden        INTEGER NOT NULL DEFAULT 0,
        created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
        updated_at    TEXT    NOT NULL DEFAULT (datetime('now')),
        UNIQUE (parent_id, slug)
      );

      CREATE INDEX IF NOT EXISTS idx_node_parent ON node(parent_id);
      CREATE INDEX IF NOT EXISTS idx_node_type   ON node(type);

      CREATE TABLE IF NOT EXISTS node_translation (
        node_id        INTEGER NOT NULL REFERENCES node(id) ON DELETE CASCADE,
        locale         TEXT    NOT NULL,
        title          TEXT    NOT NULL DEFAULT '',
        body_markdown  TEXT    NOT NULL DEFAULT '',
        updated_at     TEXT    NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (node_id, locale)
      );

      CREATE TABLE IF NOT EXISTS settings (
        key    TEXT PRIMARY KEY,
        value  TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS otp_code (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        code        TEXT    NOT NULL UNIQUE,
        created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
        expires_at  TEXT    NOT NULL,
        revoked     INTEGER NOT NULL DEFAULT 0
      );
    `,
  },
];

export function migrate(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const applied = new Set(
    db.prepare("SELECT version FROM schema_migrations").all().map((r: any) => r.version as number),
  );

  for (const m of MIGRATIONS) {
    if (applied.has(m.version)) continue;
    const tx = db.transaction(() => {
      db.exec(m.sql);
      db.prepare("INSERT INTO schema_migrations (version) VALUES (?)").run(m.version);
    });
    tx();
  }
}

export function ensureSchema(): void {
  migrate();
}
