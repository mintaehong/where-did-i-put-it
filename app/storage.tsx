import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import ChildFolders from '../src/ChildFolders';
import FolderItems from '../src/FolderItems';
import RenameFolder from '../src/RenameFolder';
import { listRootFolders } from '../src/db/folders';
import { colors, screenStyles } from '../src/theme';

type FolderList =
  | { status: 'loading' | 'error' }
  | { status: 'ready'; folders: Awaited<ReturnType<typeof listRootFolders>> };

export default function StorageScreen() {
  const [result, setResult] = useState<FolderList>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const { locationId: selectedId } = useLocalSearchParams<{ locationId?: string }>();
  const router = useRouter();
  const roots = result.status === 'ready' ? result.folders : [];
  const selected = roots.find((folder) => folder.id === selectedId) ?? roots[0];

  useEffect(() => {
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
  }, [attempt]);

  return (
    <ScrollView contentContainerStyle={screenStyles.content} keyboardShouldPersistTaps="handled">
      {selected ? (
        <RenameFolder key={`rename-${selected.id}`} id={selected.id} name={selected.name} onSaved={(name) => {
          setResult((previous) => previous.status === 'ready'
            ? { status: 'ready', folders: previous.folders.map((folder) => (
              folder.id === selected.id ? { ...folder, name } : folder
            )) }
            : previous);
        }} />
      ) : (
        <Text accessibilityRole="header" style={screenStyles.heading}>보관 장소</Text>
      )}
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
      {roots.length > 1 && (
        <View style={styles.locations}>
          {roots.map((folder) => (
            <Pressable
              key={folder.id}
              accessibilityRole="button"
              accessibilityState={{ selected: folder.id === selected?.id }}
              onPress={() => router.setParams({ locationId: folder.id })}
              style={[styles.location, folder.id === selected?.id && styles.selectedLocation]}
            >
              <Text style={screenStyles.body}>{folder.name}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {result.status === 'ready' && !selected && (
        <Text style={screenStyles.body}>아직 등록된 보관 장소가 없어요.</Text>
      )}
      {selected && (
        <>
          <ChildFolders key={selected.id} parentId={selected.id} />
          <FolderItems key={`items-${selected.id}`} folderId={selected.id} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  locations: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  location: {
    borderRadius: 16,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  selectedLocation: {
    backgroundColor: '#DFEDE3',
  },
});
