import { randomUUID } from 'expo-crypto';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { copyItemPhoto, discardItemPhoto } from '../itemPhotoFiles';
import type { PlaceCover } from '../placeCovers';
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

export function getStorage() {
  database ??= openStorage().catch((error: unknown) => {
    database = undefined;
    throw error;
  });
  return database;
}

export async function listRootFolders() {
  const db = await getStorage();
  return db.getAllAsync<{ id: string; name: string; coverPath?: string | null }>(
    'SELECT id, name, cover_path AS coverPath FROM folders WHERE parent_id IS NULL ORDER BY created_at, id',
  );
}

export async function getFolderPath(id: string) {
  const db = await getStorage();
  const ancestors = await db.getAllAsync<{ id: string; name: string; parent_id: string | null }>(
    `WITH RECURSIVE ancestors AS (
       SELECT id, name, parent_id FROM folders WHERE id = ?
       UNION
       SELECT folders.id, folders.name, folders.parent_id
       FROM folders JOIN ancestors ON folders.id = ancestors.parent_id
     )
     SELECT id, name, parent_id FROM ancestors`,
    id,
  );
  const byId = new Map(ancestors.map((folder) => [folder.id, folder]));
  const path: { id: string; name: string }[] = [];
  let nextId: string | null = id;
  while (nextId !== null) {
    const folder = byId.get(nextId);
    if (!folder) return [];
    path.push({ id: folder.id, name: folder.name });
    byId.delete(nextId);
    nextId = folder.parent_id;
  }
  return path.reverse();
}

export async function listChildFolders(parentId: string) {
  const db = await getStorage();
  return db.getAllAsync<{ id: string; name: string }>(
    'SELECT id, name FROM folders WHERE parent_id = ? ORDER BY created_at, id',
    parentId,
  );
}

export async function listFolderTree() {
  const db = await getStorage();
  return db.getAllAsync<{ id: string; name: string; parentId: string | null }>(
    'SELECT id, name, parent_id AS parentId FROM folders ORDER BY created_at, id',
  );
}

export async function listRootChildFolders() {
  const db = await getStorage();
  return db.getAllAsync<{ id: string; name: string; locationId: string }>(
    `SELECT child.id, child.name, parent.id AS locationId
     FROM folders AS child JOIN folders AS parent ON child.parent_id = parent.id
     WHERE parent.parent_id IS NULL
     ORDER BY child.created_at, child.id`,
  );
}

export function createChildFolder(parentId: string, name: string): Promise<{ id: string; name: string }> {
  return createFolder(parentId, name);
}

export function createRootFolder(name: string, cover?: PlaceCover) {
  return createFolder(null, name, cover);
}

async function createFolder(parentId: string | null, name: string, cover?: PlaceCover) {
  const folder = { id: randomUUID(), name: name.trim() };
  if (!folder.name) throw new Error('폴더 이름을 입력해 주세요.');

  const db = await getStorage();
  const now = new Date().toISOString();
  const saved = cover && 'photo' in cover ? await copyItemPhoto(cover.photo, folder.id, 'place-covers') : undefined;
  const coverPath = cover && 'preset' in cover ? `preset:${cover.preset}` : saved?.relativePath ?? null;
  try {
    await db.runAsync(
      'INSERT INTO folders (id, parent_id, name, created_at, updated_at, cover_path) VALUES (?, ?, ?, ?, ?, ?)',
      folder.id, parentId, folder.name, now, now, coverPath,
    );
    return { ...folder, coverPath };
  } catch (error) {
    if (saved) discardItemPhoto(saved.file);
    throw error;
  }
}

export async function renameFolder(id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('폴더 이름을 입력해 주세요.');

  const db = await getStorage();
  const result = await db.runAsync(
    'UPDATE folders SET name = ?, updated_at = ? WHERE id = ?',
    trimmed,
    new Date().toISOString(),
    id,
  );
  if (result.changes === 0) throw new Error('보관 장소를 찾을 수 없어요.');
}

export async function deleteEmptyChildFolder(id: string) {
  const db = await getStorage();
  const result = await db.runAsync(
    `DELETE FROM folders
     WHERE id = ? AND parent_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM folders AS child WHERE child.parent_id = folders.id)
       AND NOT EXISTS (SELECT 1 FROM items WHERE items.folder_id = folders.id)`,
    id,
  );
  if (result.changes) return 'deleted';

  const contents = await db.getFirstAsync<{ hasChildren: number; hasItems: number }>(
    `SELECT EXISTS (SELECT 1 FROM folders AS child WHERE child.parent_id = folders.id) AS hasChildren,
            EXISTS (SELECT 1 FROM items WHERE items.folder_id = folders.id) AS hasItems
     FROM folders WHERE id = ? AND parent_id IS NOT NULL`,
    id,
  );
  if (contents?.hasItems && contents.hasChildren) return 'both';
  if (contents?.hasItems) return 'items';
  if (contents?.hasChildren) return 'children';
  return 'unavailable';
}
