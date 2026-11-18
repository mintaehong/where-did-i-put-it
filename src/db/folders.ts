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

function getStorage() {
  database ??= openStorage().catch((error: unknown) => {
    database = undefined;
    throw error;
  });
  return database;
}

export async function listRootFolders() {
  const db = await getStorage();
  return db.getAllAsync<{ id: string; name: string }>(
    'SELECT id, name FROM folders WHERE parent_id IS NULL ORDER BY created_at, id',
  );
}

export async function getFolder(id: string) {
  const db = await getStorage();
  return db.getFirstAsync<{ id: string; name: string }>(
    'SELECT id, name FROM folders WHERE id = ?',
    id,
  );
}

export async function listChildFolders(parentId: string) {
  const db = await getStorage();
  return db.getAllAsync<{ id: string; name: string }>(
    'SELECT id, name FROM folders WHERE parent_id = ? ORDER BY created_at, id',
    parentId,
  );
}
