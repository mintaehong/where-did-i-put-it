import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Button, ScrollView, Text } from 'react-native';

import ChildFolders from '../src/ChildFolders';
import FolderItems from '../src/FolderItems';
import ItemSearch from '../src/ItemSearch';
import { listRootFolders } from '../src/db/folders';
import { screenStyles } from '../src/theme';

type FolderList =
  | { status: 'loading' | 'error' }
  | { status: 'ready'; folders: Awaited<ReturnType<typeof listRootFolders>> };

export default function StorageScreen() {
  const [result, setResult] = useState<FolderList>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const { locationId: selectedId } = useLocalSearchParams<{ locationId?: string }>();
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
      <ItemSearch mode="search" />
      <Text accessibilityRole="header" style={screenStyles.heading}>{selected?.name ?? '보관 장소'}</Text>
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
