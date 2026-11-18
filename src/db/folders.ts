import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { migrateDatabase } from './migrate';

let database: Promise<SQLiteDatabase> | undefined;

async function openStorage() {
  const db = await openDatabaseAsync('where-did-i-put-it.db');
  try {
    await migrateDatabase(db);
    return db;
  } catch (error) {
    await db.closeAsync();
    throw error;
  }
}

export async function listRootFolders() {
  database ??= openStorage().catch((error: unknown) => {
    database = undefined;
    throw error;
  });
  const db = await database;
  return db.getAllAsync<{ id: string; name: string }>(
    'SELECT id, name FROM folders WHERE parent_id IS NULL ORDER BY created_at, id',
  );
}
