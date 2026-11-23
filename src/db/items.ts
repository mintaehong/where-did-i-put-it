import { randomUUID } from 'expo-crypto';

import { copyItemPhoto, discardItemPhoto, type SelectedPhoto } from '../itemPhotoFiles';
import { getFolderPath, getStorage } from './folders';

type Item = { id: string; name: string; photoPath: string | null };

const itemColumns = 'items.id, items.name, item_images.relative_path AS photoPath';
const itemTables = 'FROM items LEFT JOIN item_images ON item_images.item_id = items.id';

export async function listItems(folderId: string) {
  const db = await getStorage();
  return db.getAllAsync<Item>(
    `SELECT ${itemColumns} ${itemTables} WHERE items.folder_id = ? ORDER BY items.created_at, items.id`,
    folderId,
  );
}

export async function getItemDetails(id: string) {
  const db = await getStorage();
  const item = await db.getFirstAsync<Item & { folderId: string }>(
    `SELECT ${itemColumns}, items.folder_id AS folderId ${itemTables} WHERE items.id = ?`,
    id,
  );
  if (!item) return null;

  return { ...item, path: await getFolderPath(item.folderId) };
}

export async function createItem(folderId: string, name: string, photo?: SelectedPhoto): Promise<Item> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('물건 이름을 입력해 주세요.');

  const item = { id: randomUUID(), name: trimmed, photoPath: null };
  const now = new Date().toISOString();
  const db = await getStorage();
  const insertItem = `INSERT INTO items (id, folder_id, name, created_at, updated_at)
    SELECT ?, id, ?, ?, ? FROM folders WHERE id = ?`;
  const params = [item.id, item.name, now, now, folderId];
  if (!photo) {
    const result = await db.runAsync(insertItem, params);
    if (!result.changes) throw new Error('보관 위치를 찾을 수 없어요.');
    return item;
  }

  const imageId = randomUUID();
  const saved = await copyItemPhoto(photo, imageId);
  try {
    await db.withExclusiveTransactionAsync(async (transaction) => {
      const result = await transaction.runAsync(insertItem, params);
      if (!result.changes) throw new Error('보관 위치를 찾을 수 없어요.');
      await transaction.runAsync(
        'INSERT INTO item_images (id, item_id, relative_path, mime_type, byte_size, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        imageId, item.id, saved.relativePath, photo.mimeType ?? null, saved.size, now,
      );
    });
    return { ...item, photoPath: saved.relativePath };
  } catch (error) {
    discardItemPhoto(saved.file);
    throw error;
  }
}
