import { Directory, File, Paths } from 'expo-file-system';

export type SelectedPhoto = { uri: string; fileName?: string | null; mimeType?: string | null };

export function itemPhotoUri(relativePath: string) {
  return new File(Paths.document, relativePath).uri;
}

export async function copyItemPhoto(photo: SelectedPhoto, id: string) {
  const source = new File(photo.uri);
  const extension = /\.[a-z0-9]{1,8}$/i.exec(source.name)?.[0]
    ?? /\.[a-z0-9]{1,8}$/i.exec(photo.fileName ?? '')?.[0] ?? '';
  const relativePath = `images/${id}${extension.toLowerCase()}`;
  new Directory(Paths.document, 'images').create({ idempotent: true, intermediates: true });
  const file = new File(Paths.document, relativePath);
  try {
    await source.copy(file);
    if (!file.size) throw new Error('사진 파일을 읽을 수 없어요.');
    return { file, relativePath, size: file.size };
  } catch (error) {
    discardItemPhoto(file);
    throw error;
  }
}

export function discardItemPhoto(file: File) {
  try {
    if (file.exists) file.delete();
  } catch (error) {
    console.warn('임시 사진을 정리하지 못했어요.', error);
  }
}
