import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { listChildFolders, listRootFolders } from '../src/db/folders';
import { colors, screenStyles } from '../src/theme';

type FolderList =
  | { status: 'loading' | 'error' }
  | { status: 'ready'; folders: Awaited<ReturnType<typeof listRootFolders>> };

export default function StorageScreen() {
  const [result, setResult] = useState<FolderList>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState<string>();
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
    <ScrollView contentContainerStyle={screenStyles.content}>
      <Text accessibilityRole="header" style={screenStyles.heading}>
        {selected?.name ?? '보관 장소'}
      </Text>
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
              onPress={() => setSelectedId(folder.id)}
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
      {selected && <ChildFolders key={selected.id} parentId={selected.id} />}
    </ScrollView>
  );
}

function ChildFolders({ parentId }: { parentId: string }) {
  const [result, setResult] = useState<FolderList>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    listChildFolders(parentId).then(
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
  }, [parentId, attempt]);

  if (result.status === 'loading') {
    return <ActivityIndicator accessibilityLabel="보관 장소 불러오는 중" />;
  }
  if (result.status === 'error') {
    return (
      <>
        <Text style={screenStyles.body}>보관 장소를 불러오지 못했어요.</Text>
        <Button title="다시 시도" onPress={() => {
          setResult({ status: 'loading' });
          setAttempt((previous) => previous + 1);
        }} />
      </>
    );
  }
  if (result.status === 'ready' && result.folders.length > 0) {
    return result.folders.map((folder) => (
      <Link
        key={folder.id}
        href={{ pathname: '/folder/[id]', params: { id: folder.id } }}
        style={styles.folder}
      >
        {folder.name}
      </Link>
    ));
  }
  return <Text style={screenStyles.body}>아직 이곳에 등록된 보관 장소가 없어요.</Text>;
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
  folder: {
    backgroundColor: '#DFEDE3',
    borderRadius: 20,
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    padding: 20,
  },
});
