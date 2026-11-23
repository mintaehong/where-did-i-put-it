import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text } from 'react-native';

import ChildFolders from '../../src/ChildFolders';
import { getFolder } from '../../src/db/folders';
import { screenStyles } from '../../src/theme';

export default function FolderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [result, setResult] = useState<{
    id: string;
    name?: string;
    error?: boolean;
  }>();

  useEffect(() => {
    let active = true;
    getFolder(id).then(
      (folder) => {
        if (active) setResult({ id, name: folder?.name });
      },
      () => {
        if (active) setResult({ id, error: true });
      },
    );
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <ScrollView contentContainerStyle={screenStyles.content} keyboardShouldPersistTaps="handled">
      {!result || result.id !== id ? (
        <ActivityIndicator accessibilityLabel="보관 장소 불러오는 중" />
      ) : result.name ? (
        <>
          <Text accessibilityRole="header" style={screenStyles.heading}>{result.name}</Text>
          <ChildFolders key={id} parentId={id} />
        </>
      ) : (
        <Text style={screenStyles.body}>
          {result.error ? '보관 장소를 불러오지 못했어요.' : '보관 장소를 찾을 수 없어요.'}
        </Text>
      )}
    </ScrollView>
  );
}
