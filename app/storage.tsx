import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, ScrollView, StyleSheet, Text } from 'react-native';

import { listRootFolders } from '../src/db/folders';
import { colors, screenStyles } from '../src/theme';

type FolderList =
  | { status: 'loading' | 'error' }
  | { status: 'ready'; folders: Awaited<ReturnType<typeof listRootFolders>> };

export default function StorageScreen() {
  const [result, setResult] = useState<FolderList>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

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
        보관 장소
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
      {result.status === 'ready' && (
        result.folders.length === 0
          ? <Text style={screenStyles.body}>아직 등록된 보관 장소가 없어요.</Text>
          : result.folders.map((folder) => (
            <Text key={folder.id} style={styles.folder}>{folder.name}</Text>
          ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  folder: {
    backgroundColor: '#DFEDE3',
    borderRadius: 20,
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    padding: 20,
  },
});
