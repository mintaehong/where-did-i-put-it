import { launchCameraAsync, launchImageLibraryAsync, requestCameraPermissionsAsync } from 'expo-image-picker';

export async function pickItemPhoto(source: 'camera' | 'album') {
  if (source === 'camera') {
    const permission = await requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new Error(permission.canAskAgain
        ? '사진을 찍으려면 카메라 권한을 허용해 주세요.'
        : '휴대폰 설정에서 카메라 권한을 허용해 주세요.');
    }
  }

  try {
    const pick = source === 'camera' ? launchCameraAsync : launchImageLibraryAsync;
    const result = await pick({ mediaTypes: ['images'], exif: false });
    return result.canceled ? undefined : result.assets[0];
  } catch {
    throw new Error(source === 'camera'
      ? '카메라를 열지 못했어요. 다시 시도해 주세요.'
      : '앨범을 열지 못했어요. 다시 시도해 주세요.');
  }
}
