import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Button, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import ChildFolders from '../src/ChildFolders';
import FolderItems from '../src/FolderItems';
import ItemSearch from '../src/ItemSearch';
import { listRootFolders } from '../src/db/folders';
import { colors, screenStyles } from '../src/theme';

type FolderList =
  | { status: 'loading' | 'error' }
  | { status: 'ready'; folders: Awaited<ReturnType<typeof listRootFolders>> };

export default function StorageScreen() {
  const [result, setResult] = useState<FolderList>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const router = useRouter();
  const { locationId: selectedId } = useLocalSearchParams<{ locationId?: string }>();
  const roots = result.status === 'ready' ? result.folders : [];
  const selected = roots.find((folder) => folder.id === selectedId) ?? roots[0];

  useFocusEffect(useCallback(() => {
    let active = true;
    listRootFolders().then(
      (folders) => {
        if (active) setResult({ status: 'ready', folders });
      },
      () => {
        if (active) setResult({ status: 'error' });
      },
    );
    return () => {
      active = false;
    };
  }, [attempt]));

  return (
    <ScrollView contentContainerStyle={screenStyles.content} keyboardShouldPersistTaps="handled">
      {roots.length > 1 && (
        <View style={styles.locations}>
          {roots.map((folder) => {
            const active = folder.id === selected?.id;
            return (
              <Pressable
                key={folder.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => router.setParams({ locationId: folder.id })}
                style={[styles.location, active && styles.selectedLocation]}
              >
                <Text style={[styles.locationName, active && styles.selectedName]}>{folder.name}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      <Text accessibilityRole="header" style={screenStyles.heading}>{selected?.name ?? '보관 장소'}</Text>
      {selected && <ItemSearch locationId={selected.id} />}
      {result.status === 'loading' && <ActivityIndicator accessibilityLabel="보관함 불러오는 중" />}
      {result.status === 'error' && (
        <>
          <Text style={screenStyles.body}>보관함을 불러오지 못했어요.</Text>
          <Button title="다시 시도" onPress={() => {
            setResult({ status: 'loading' });
            setAttempt((previous) => previous + 1);
          }} />
        </>
      )}
      {result.status === 'ready' && !selected && (
        <Text style={screenStyles.body}>아직 등록된 보관 장소가 없어요.</Text>
      )}
      {selected && (
        <>
          <FolderItems key={`items-${selected.id}`} folderId={selected.id} />
          <ChildFolders key={selected.id} parentId={selected.id} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  locations: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  location: {
    minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1, borderColor: '#DEE7DE', backgroundColor: colors.surface,
  },
  selectedLocation: { backgroundColor: '#DFEDE3', borderColor: '#BCD6C5' },
  locationName: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  selectedName: { color: '#235941', fontWeight: '700' },
});
