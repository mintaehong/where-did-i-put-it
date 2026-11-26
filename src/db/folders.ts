import { randomUUID } from 'expo-crypto';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { copyItemPhoto, discardItemPhoto } from '../itemPhotoFiles';
import type { FolderCover, PlaceCover } from '../placeCovers';
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
  return db.getAllAsync<{
    id: string; name: string; coverPath?: string | null;
    firstChildName?: string | null; secondChildName?: string | null; childCount?: number;
    firstItemName?: string | null; secondItemName?: string | null; itemCount?: number;
  }>(
    `WITH locations AS (
       SELECT id, name, cover_path, created_at FROM folders WHERE parent_id = ?
     ), ranked_children AS (
       SELECT child.parent_id, child.name,
              ROW_NUMBER() OVER (PARTITION BY child.parent_id ORDER BY child.created_at, child.id) AS position
       FROM folders AS child JOIN locations ON locations.id = child.parent_id
     ), child_summaries AS (
       SELECT parent_id, COUNT(*) AS childCount,
              MAX(CASE WHEN position = 1 THEN name END) AS firstChildName,
              MAX(CASE WHEN position = 2 THEN name END) AS secondChildName
       FROM ranked_children GROUP BY parent_id
     ), ranked_items AS (
       SELECT item.folder_id, item.name,
              ROW_NUMBER() OVER (PARTITION BY item.folder_id ORDER BY item.created_at DESC, item.id) AS position
       FROM items AS item JOIN locations ON locations.id = item.folder_id
     ), item_summaries AS (
       SELECT folder_id, COUNT(*) AS itemCount,
              MAX(CASE WHEN position = 1 THEN name END) AS firstItemName,
              MAX(CASE WHEN position = 2 THEN name END) AS secondItemName
       FROM ranked_items GROUP BY folder_id
     )
     SELECT locations.id, locations.name, locations.cover_path AS coverPath,
            child_summaries.firstChildName, child_summaries.secondChildName,
            COALESCE(child_summaries.childCount, 0) AS childCount,
            item_summaries.firstItemName, item_summaries.secondItemName,
            COALESCE(item_summaries.itemCount, 0) AS itemCount
     FROM locations
     LEFT JOIN child_summaries ON child_summaries.parent_id = locations.id
     LEFT JOIN item_summaries ON item_summaries.folder_id = locations.id
     ORDER BY locations.created_at, locations.id`,
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

export function createChildFolder(parentId: string, name: string, cover: FolderCover) {
  return createFolder(parentId, name, cover);
}

export function createRootFolder(name: string, cover?: PlaceCover) {
  return createFolder(null, name, cover);
}

async function createFolder(parentId: string | null, name: string, cover?: PlaceCover | FolderCover) {
  const folder = { id: randomUUID(), name: name.trim() };
  if (!folder.name) throw new Error('폴더 이름을 입력해 주세요.');

  const db = await getStorage();
  const now = new Date().toISOString();
  const saved = cover && 'photo' in cover ? await copyItemPhoto(cover.photo, folder.id, 'place-covers') : undefined;
  const coverPath = cover && 'icon' in cover ? `icon:${cover.icon}`
    : cover && 'preset' in cover ? `preset:${cover.preset}`
      : saved?.relativePath ?? null;
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
  const deleted = await db.getFirstAsync<{ coverPath: string | null }>(
    `DELETE FROM folders
     WHERE id = ? AND parent_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM folders AS child WHERE child.parent_id = folders.id)
       AND NOT EXISTS (SELECT 1 FROM items WHERE items.folder_id = folders.id)
     RETURNING cover_path AS coverPath`,
    id,
  );
  if (deleted) {
    if (deleted.coverPath && /^place-covers\/[a-f0-9-]+(?:\.[a-z0-9]{1,8})?$/i.test(deleted.coverPath)) {
      discardItemPhoto(deleted.coverPath);
    }
    return 'deleted';
  }

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
