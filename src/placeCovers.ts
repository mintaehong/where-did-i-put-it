import { itemPhotoUri, type SelectedPhoto } from './itemPhotoFiles';

const defaultPlaceCover = require('../assets/place-storage.jpg');

export const placeCovers = [
  { id: 'home', name: '집', image: require('../assets/place-home.jpg') },
  { id: 'office', name: '사무실', image: require('../assets/place-office.jpg') },
  { id: 'storage', name: '보관 상자', image: defaultPlaceCover },
] as const;

export type PlaceCover = { preset: typeof placeCovers[number]['id'] } | { photo: SelectedPhoto };

export const storageIcons = [
  { id: 'desk', name: '책상' },
  { id: 'drawer', name: '서랍' },
  { id: 'room', name: '방' },
  { id: 'wardrobe', name: '옷장' },
  { id: 'shelf', name: '선반' },
  { id: 'cabinet', name: '수납장' },
] as const;

export type StorageIcon = typeof storageIcons[number]['id'];
export type FolderCover = { icon: StorageIcon } | { photo: SelectedPhoto };

export function storageIconForCover(path?: string | null): StorageIcon {
  return storageIcons.find(({ id }) => path === `icon:${id}`)?.id ?? 'drawer';
}

export function placeCoverImage(path?: string | null) {
  if (path?.startsWith('place-covers/')) return { uri: itemPhotoUri(path) };
  return placeCovers.find((cover) => `preset:${cover.id}` === path)?.image ?? defaultPlaceCover;
}
