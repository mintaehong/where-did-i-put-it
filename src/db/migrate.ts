import type { SQLiteDatabase } from 'expo-sqlite';

export async function migrateDatabase(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA foreign_keys = ON');
  await db.withTransactionAsync(async () => {
    const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    if (version?.user_version === 4) return;
    if (version?.user_version !== 0 && version?.user_version !== 1 && version?.user_version !== 2 && version?.user_version !== 3) {
      throw new Error('지원하지 않는 보관함 데이터베이스 버전입니다.');
    }

    if (version.user_version === 0) await createFolders(db);
    if (version.user_version < 2) await createItems(db);
    if (version.user_version < 3) await db.execAsync(`
      CREATE TABLE item_images (
        id TEXT PRIMARY KEY NOT NULL,
        item_id TEXT NOT NULL UNIQUE REFERENCES items(id) ON DELETE CASCADE,
        relative_path TEXT NOT NULL,
        mime_type TEXT,
        byte_size INTEGER NOT NULL CHECK (byte_size > 0),
        created_at TEXT NOT NULL
      );
    `);
    await db.execAsync('ALTER TABLE folders ADD COLUMN cover_path TEXT; PRAGMA user_version = 4;');
  });
}

async function createItems(db: SQLiteDatabase) {
  await db.execAsync(`
      CREATE TABLE items (
        id TEXT PRIMARY KEY NOT NULL,
        folder_id TEXT NOT NULL REFERENCES folders(id) ON DELETE RESTRICT,
        name TEXT NOT NULL CHECK (length(trim(name)) > 0),
        note TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX idx_items_folder_id ON items(folder_id);
  `);
}

async function createFolders(db: SQLiteDatabase) {
  await db.execAsync(`
      CREATE TABLE folders (
        id TEXT PRIMARY KEY NOT NULL,
        parent_id TEXT REFERENCES folders(id) ON DELETE RESTRICT,
        name TEXT NOT NULL CHECK (length(trim(name)) > 0),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX idx_folders_parent_id ON folders(parent_id);
    `);

  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO folders (id, parent_id, name, created_at, updated_at) VALUES (?, NULL, ?, ?, ?)',
    '7a86e378-2fc3-44d1-abbc-ebd474135339',
    '우리 집',
    now,
    now,
  );
}
