import { randomUUID } from 'expo-crypto';

import { copyItemPhoto, discardItemPhoto, discardStoredItemPhoto, type SelectedPhoto } from '../itemPhotoFiles';
import { getFolderPath, getStorage } from './folders';

type Item = { id: string; name: string; photoPath: string | null };

const itemColumns = 'items.id, items.name, item_images.relative_path AS photoPath';
const itemTables = 'FROM items LEFT JOIN item_images ON item_images.item_id = items.id';
const insertImage = 'INSERT INTO item_images (id, item_id, relative_path, mime_type, byte_size, created_at) VALUES (?, ?, ?, ?, ?, ?)';

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

export async function searchItems(name: string) {
  const query = name.trim();
  if (!query) return [];

  const db = await getStorage();
  const items = await db.getAllAsync<Item & { folderId: string }>(
    `SELECT ${itemColumns}, items.folder_id AS folderId ${itemTables}
     WHERE instr(lower(items.name), lower(?)) > 0 ORDER BY items.name, items.id`,
    query,
  );
  const paths = new Map<string, ReturnType<typeof getFolderPath>>();
  return Promise.all(items.map(async (item) => {
    const path = paths.get(item.folderId) ?? getFolderPath(item.folderId);
    paths.set(item.folderId, path);
    return { ...item, path: await path };
  }));
}

export async function renameItem(id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('물건 이름을 입력해 주세요.');

  const db = await getStorage();
  const result = await db.runAsync(
    'UPDATE items SET name = ?, updated_at = ? WHERE id = ?',
    trimmed,
    new Date().toISOString(),
    id,
  );
  if (!result.changes) throw new Error('물건을 찾을 수 없어요.');
}

export async function moveItem(itemId: string, folderId: string) {
  const db = await getStorage();
  const result = await db.runAsync(
    `UPDATE items SET folder_id = ?, updated_at = ?
     WHERE id = ? AND EXISTS (SELECT 1 FROM folders WHERE id = ?)`,
    folderId, new Date().toISOString(), itemId, folderId,
  );
  if (!result.changes) throw new Error('물건이나 보관 위치를 찾을 수 없어요.');
}

export async function attachItemPhoto(itemId: string, photo: SelectedPhoto) {
  const db = await getStorage();
  const imageId = randomUUID();
  const saved = await copyItemPhoto(photo, imageId);
  try {
    await db.runAsync(
      insertImage,
      imageId, itemId, saved.relativePath, photo.mimeType ?? null, saved.size, new Date().toISOString(),
    );
    return saved.relativePath;
  } catch (error) {
    discardItemPhoto(saved.file);
    throw error;
  }
}

export async function replaceItemPhoto(itemId: string, previousPath: string, photo: SelectedPhoto) {
  const db = await getStorage();
  const saved = await copyItemPhoto(photo, randomUUID());
  try {
    const result = await db.runAsync(
      `UPDATE item_images SET relative_path = ?, mime_type = ?, byte_size = ?, created_at = ?
       WHERE item_id = ? AND relative_path = ?`,
      saved.relativePath, photo.mimeType ?? null, saved.size, new Date().toISOString(), itemId, previousPath,
    );
    if (!result.changes) throw new Error('교체할 사진을 찾을 수 없어요.');
  } catch (error) {
    discardItemPhoto(saved.file);
    throw error;
  }

  discardStoredItemPhoto(previousPath);
  return saved.relativePath;
}

export async function removeItemPhoto(itemId: string, photoPath: string) {
  const db = await getStorage();
  const result = await db.runAsync(
    'DELETE FROM item_images WHERE item_id = ? AND relative_path = ?',
    itemId,
    photoPath,
  );
  if (!result.changes) throw new Error('삭제할 사진을 찾을 수 없어요.');
  discardStoredItemPhoto(photoPath);
}

export async function deleteItem(itemId: string) {
  const db = await getStorage();
  let photoPath: string | undefined;
  await db.withExclusiveTransactionAsync(async (transaction) => {
    const image = await transaction.getFirstAsync<{ relative_path: string }>(
      'DELETE FROM item_images WHERE item_id = ? RETURNING relative_path',
      itemId,
    );
    const result = await transaction.runAsync('DELETE FROM items WHERE id = ?', itemId);
    if (!result.changes) throw new Error('삭제할 물건을 찾을 수 없어요.');
    photoPath = image?.relative_path;
  });

  if (photoPath) discardStoredItemPhoto(photoPath);
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
        insertImage,
        imageId, item.id, saved.relativePath, photo.mimeType ?? null, saved.size, now,
      );
    });
    return { ...item, photoPath: saved.relativePath };
  } catch (error) {
    discardItemPhoto(saved.file);
    throw error;
  }
}
