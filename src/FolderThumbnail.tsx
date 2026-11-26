import { Image, StyleSheet, View } from 'react-native';

import { itemPhotoUri } from './itemPhotoFiles';
import { storageIconForCover } from './placeCovers';
import StorageIconView from './StorageIconView';

export default function FolderThumbnail({ name, coverPath }: { name: string; coverPath?: string | null }) {
  if (coverPath?.startsWith('place-covers/')) {
    return (
      <Image
        accessible={false}
        accessibilityLabel={`${name} 사진`}
        source={{ uri: itemPhotoUri(coverPath) }}
        resizeMode="cover"
        style={styles.thumbnail}
      />
    );
  }
  return (
    <View style={styles.thumbnail}>
      <StorageIconView icon={storageIconForCover(coverPath)} />
    </View>
  );
}

const styles = StyleSheet.create({
  thumbnail: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: '#FFF5D7',
    alignItems: 'center', justifyContent: 'center',
  },
});
