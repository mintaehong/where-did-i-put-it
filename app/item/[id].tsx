import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getItemDetails } from '../../src/db/items';
import { itemPhotoUri } from '../../src/itemPhotoFiles';
import { colors, screenStyles } from '../../src/theme';

export default function ItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ItemDetails key={id} id={id} />;
}

function ItemDetails({ id }: { id: string }) {
  const [item, setItem] = useState<Awaited<ReturnType<typeof getItemDetails>>>();
  const [loadError, setLoadError] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  useEffect(() => {
    let active = true;
    getItemDetails(id).then(
      (details) => { if (active) setItem(details); },
      () => { if (active) setLoadError(true); },
    );
    return () => { active = false; };
  }, [id]);

  return (
    <ScrollView contentContainerStyle={screenStyles.content}>
      {loadError ? (
        <Text accessibilityRole="alert" style={screenStyles.body}>물건을 불러오지 못했어요.</Text>
      ) : item === undefined ? (
        <ActivityIndicator accessibilityLabel="물건 불러오는 중" />
      ) : item === null ? (
        <Text style={screenStyles.body}>물건을 찾을 수 없어요.</Text>
      ) : (
        <>
          <Text accessibilityRole="header" style={screenStyles.heading}>{item.name}</Text>
          {item.photoPath && !photoError ? (
            <Image
              accessibilityLabel={`${item.name} 사진`}
              accessible
              source={{ uri: itemPhotoUri(item.photoPath) }}
              style={styles.photo}
              resizeMode="contain"
              onError={() => setPhotoError(true)}
            />
          ) : (
            <View style={styles.placeholder}>
              <Text style={screenStyles.body}>{photoError ? '사진을 불러오지 못했어요.' : '첨부된 사진이 없어요.'}</Text>
            </View>
          )}
          <View style={styles.location}>
            <Text accessibilityRole="header" style={styles.label}>보관 위치</Text>
            <Text style={screenStyles.body}>
              {item.path.length ? item.path.map((folder) => folder.name).join(' › ') : '보관 위치를 찾을 수 없어요.'}
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: 16, backgroundColor: colors.surface },
  placeholder: { padding: 20, borderRadius: 16, backgroundColor: colors.surface },
  location: { gap: 6, backgroundColor: '#DFEDE3', borderRadius: 16, padding: 16 },
  label: { color: colors.text, fontSize: 16, fontWeight: '700' },
});
