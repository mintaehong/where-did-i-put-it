import { Link, useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import ChildFolders from '../../src/ChildFolders';
import FolderItems from '../../src/FolderItems';
import EditableName from '../../src/EditableName';
import { deleteEmptyChildFolder, getFolderPath, renameFolder } from '../../src/db/folders';
import { colors, screenStyles } from '../../src/theme';

const deleteMessages = {
  both: '물건과 하위 위치가 남아 있어요. 모두 비운 뒤 삭제할 수 있어요.',
  items: '물건이 남아 있어요. 물건을 옮기거나 삭제한 뒤 다시 시도해 주세요.',
  children: '하위 위치가 남아 있어요. 하위 위치를 비운 뒤 삭제해 주세요.',
  unavailable: '위치를 삭제하지 못했어요. 다시 시도해 주세요.',
};

export default function FolderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const [result, setResult] = useState<{
    id: string;
    path: Awaited<ReturnType<typeof getFolderPath>> | null;
  }>();

  useFocusEffect(useCallback(() => {
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
  }, [id]));

  const current = result?.path?.at(-1);
  const parent = result?.path?.at(-2);

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
          <LocationTitle key={`title-${id}`} id={id} name={current.name} onDeleted={parent ? () => {
            if (!navigation.isFocused()) return;
            router.dismissTo(result.path?.length === 2
              ? { pathname: '/storage', params: { locationId: parent.id } }
              : { pathname: '/folder/[id]', params: { id: parent.id } });
          } : undefined}>
            <EditableName id={id} name={current.name} inputLabel="새 폴더 이름" persistName={renameFolder} onSaved={(name) => {
              setResult((previous) => previous?.id === id && previous.path
                ? { id, path: previous.path.map((folder) => folder.id === id ? { ...folder, name } : folder) }
                : previous);
            }} />
          </LocationTitle>
          <FolderItems key={`items-${id}`} folderId={id} />
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

function LocationTitle({ id, name, children, onDeleted }: {
  id: string;
  name: string;
  children: ReactNode;
  onDeleted?: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<keyof typeof deleteMessages>();
  const pending = useRef(false);
  const blocked = error !== undefined && error !== 'unavailable';

  async function confirm() {
    if (!onDeleted || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const outcome = await deleteEmptyChildFolder(id);
      if (outcome === 'deleted') {
        onDeleted();
        return;
      }
      setError(outcome);
    } catch {
      setError('unavailable');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  return (
    <View style={styles.titleSection}>
      <View style={styles.titleRow}>
        <View style={styles.title}>{children}</View>
        {onDeleted && !confirming && (
          <Pressable accessibilityRole="button" onPress={() => setConfirming(true)} style={styles.action}>
            <Text style={styles.deleteLabel}>위치 삭제</Text>
          </Pressable>
        )}
      </View>
      {confirming && (
        <View style={styles.confirmation}>
          {error ? (
            <Text accessibilityRole="alert" style={screenStyles.body}>{deleteMessages[error]}</Text>
          ) : (
            <Text style={screenStyles.body}>‘{name}’ 위치를 삭제할까요?</Text>
          )}
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => {
              setConfirming(false);
              setError(undefined);
            }} style={styles.action}>
              <Text style={styles.cancelLabel}>{blocked ? '닫기' : '취소'}</Text>
            </Pressable>
            {!blocked && (
              <Pressable accessibilityRole="button" disabled={busy} onPress={confirm} style={styles.action}>
                <Text style={styles.deleteLabel}>{busy ? '삭제 중' : error ? '다시 시도' : '위치 삭제 확인'}</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  path: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8 },
  segment: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '100%' },
  ancestor: { color: '#2D6654', flexShrink: 1, fontSize: 16, paddingVertical: 10, textDecorationLine: 'underline' },
  titleSection: { gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, minWidth: 0 },
  confirmation: { gap: 8, padding: 12, backgroundColor: colors.surface, borderRadius: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
  action: { justifyContent: 'center', minHeight: 44, paddingHorizontal: 10 },
  cancelLabel: { color: '#2D6654', fontSize: 14, fontWeight: '700' },
  deleteLabel: { color: colors.accent, fontSize: 14, fontWeight: '700' },
});
