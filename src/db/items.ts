import { randomUUID } from 'expo-crypto';

import { getStorage } from './folders';

export async function listItems(folderId: string) {
  const db = await getStorage();
  return db.getAllAsync<{ id: string; name: string }>(
    'SELECT id, name FROM items WHERE folder_id = ? ORDER BY created_at, id',
    folderId,
  );
}

export async function createItem(folderId: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('물건 이름을 입력해 주세요.');

  const item = { id: randomUUID(), name: trimmed };
  const now = new Date().toISOString();
  const db = await getStorage();
  await db.runAsync(
    'INSERT INTO items (id, folder_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    item.id,
    folderId,
    item.name,
    now,
    now,
  );
  return item;
}
