import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Button, Pressable, StyleSheet, Text, View } from 'react-native';

import { listChildFolders } from './db/folders';
import NewFolderSheet from './NewFolderSheet';
import { colors, screenStyles } from './theme';

type FolderList =
  | { status: 'loading' | 'error' }
  | { status: 'ready'; folders: Awaited<ReturnType<typeof listChildFolders>> };

export default function ChildFolders({ parentId }: { parentId: string }) {
  const [result, setResult] = useState<FolderList>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [adding, setAdding] = useState(false);

  useFocusEffect(useCallback(() => {
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
  }, [parentId, attempt]));

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
  const folders = result.status === 'ready' ? result.folders : [];
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text accessibilityRole="header" style={styles.heading}>하위 보관 위치</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="보관 위치 추가"
          onPress={() => setAdding(true)}
          style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
        >
          <Text style={styles.addLabel}>+ 보관 위치 추가</Text>
        </Pressable>
      </View>
      {folders.length === 0 && (
        <Text style={screenStyles.body}>아직 이곳에 등록된 보관 장소가 없어요.</Text>
      )}
      {folders.map((folder) => (
        <Link
          key={folder.id}
          href={{ pathname: '/folder/[id]', params: { id: folder.id } }}
          push
          style={styles.folder}
        >
          {folder.name}
        </Link>
      ))}
      {adding && (
        <NewFolderSheet
          parentId={parentId}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            setAttempt((previous) => previous + 1);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D5DFD8',
    paddingTop: 12,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    columnGap: 8,
  },
  heading: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: '700',
  },
  addButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  addButtonPressed: {
    backgroundColor: '#DFEDE3',
  },
  addLabel: {
    color: '#2D6654',
    fontSize: 14,
    fontWeight: '700',
  },
  folder: {
    backgroundColor: '#E8EFE8',
    borderRadius: 12,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    padding: 12,
  },
});
