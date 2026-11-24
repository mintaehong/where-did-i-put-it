import { itemPhotoUri, type SelectedPhoto } from './itemPhotoFiles';

const defaultPlaceCover = require('../assets/place-storage.jpg');

export const placeCovers = [
  { id: 'home', name: '집', image: require('../assets/place-home.jpg') },
  { id: 'office', name: '사무실', image: require('../assets/place-office.jpg') },
  { id: 'storage', name: '보관 상자', image: defaultPlaceCover },
] as const;

export type PlaceCover = { preset: typeof placeCovers[number]['id'] } | { photo: SelectedPhoto };

export function placeCoverImage(path?: string | null) {
  if (path?.startsWith('place-covers/')) return { uri: itemPhotoUri(path) };
  return placeCovers.find((cover) => `preset:${cover.id}` === path)?.image ?? defaultPlaceCover;
}
