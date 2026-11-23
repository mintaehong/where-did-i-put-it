import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import ChildFolders from '../../src/ChildFolders';
import { getFolderPath } from '../../src/db/folders';
import { screenStyles } from '../../src/theme';

export default function FolderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [result, setResult] = useState<{
    id: string;
    path: Awaited<ReturnType<typeof getFolderPath>> | null;
  }>();

  useEffect(() => {
    let active = true;
    getFolderPath(id).then(
      (path) => {
        if (active) setResult({ id, path });
      },
      () => {
        if (active) setResult({ id, path: null });
      },
    );
    return () => {
      active = false;
    };
  }, [id]);

  const current = result?.path?.at(-1);

  return (
    <ScrollView contentContainerStyle={screenStyles.content} keyboardShouldPersistTaps="handled">
      {!result || result.id !== id ? (
        <ActivityIndicator accessibilityLabel="보관 장소 불러오는 중" />
      ) : current && result.path ? (
        <>
          <View style={styles.path}>
            {result.path.slice(0, -1).map((folder, index) => (
              <View key={folder.id} style={styles.segment}>
                <Link
                  dismissTo
                  href={index === 0
                    ? { pathname: '/storage', params: { locationId: folder.id } }
                    : { pathname: '/folder/[id]', params: { id: folder.id } }}
                  style={styles.ancestor}
                >
                  {folder.name}
                </Link>
                <Text accessible={false} importantForAccessibility="no" style={screenStyles.body}>›</Text>
              </View>
            ))}
            <Text style={screenStyles.body}>{current.name}</Text>
          </View>
          <Text accessibilityRole="header" style={screenStyles.heading}>{current.name}</Text>
          <ChildFolders key={id} parentId={id} />
        </>
      ) : (
        <Text style={screenStyles.body}>
          {result.path === null ? '보관 장소를 불러오지 못했어요.' : '보관 장소를 찾을 수 없어요.'}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  path: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8 },
  segment: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '100%' },
  ancestor: { color: '#2D6654', flexShrink: 1, fontSize: 16, paddingVertical: 10, textDecorationLine: 'underline' },
});
