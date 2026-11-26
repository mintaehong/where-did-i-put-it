import { Link, useFocusEffect, useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Keyboard, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import ChildFolders from '../../src/ChildFolders';
import DeleteConfirmation from '../../src/DeleteConfirmation';
import FolderItems from '../../src/FolderItems';
import FolderCoverSheet from '../../src/FolderCoverSheet';
import FolderThumbnail from '../../src/FolderThumbnail';
import EditableName from '../../src/EditableName';
import { deleteChildFolder, getFolderPath, renameFolder, type FolderContents } from '../../src/db/folders';
import { colors, screenStyles } from '../../src/theme';

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
          <LocationTitle key={`title-${id}`} id={id} name={current.name} coverPath={current.coverPath} onCoverSaved={parent ? (coverPath) => {
            setResult((previous) => previous?.id === id && previous.path
              ? { id, path: previous.path.map((folder) => folder.id === id ? { ...folder, coverPath } : folder) }
              : previous);
          } : undefined} onDeleted={parent ? () => {
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

function LocationTitle({ id, name, coverPath, children, onCoverSaved, onDeleted }: {
  id: string;
  name: string;
  coverPath?: string | null;
  children: ReactNode;
  onCoverSaved?: (coverPath: string) => void;
  onDeleted?: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [editingCover, setEditingCover] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [contents, setContents] = useState<FolderContents>();
  const pending = useRef(false);
  const included = contents && [
    contents.folderCount > 0 && `하위 위치 ${contents.folderCount}곳`,
    contents.itemCount > 0 && `물건 ${contents.itemCount}개`,
  ].filter(Boolean).join(', ');

  async function confirm() {
    if (!onDeleted || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(false);
    try {
      const outcome = contents ? await deleteChildFolder(id, contents) : await deleteChildFolder(id);
      if (outcome.status === 'deleted') {
        setConfirming(false);
        onDeleted();
        return;
      }
      if (outcome.status === 'confirm') setContents(outcome.contents);
      else setError(true);
    } catch {
      setError(true);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  function closeConfirmation() {
    if (pending.current) return;
    setConfirming(false);
    setError(false);
    setContents(undefined);
  }

  return (
    <View style={styles.titleSection}>
      <View style={styles.titleRow}>
        {onCoverSaved ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="대표 이미지 변경"
            onPress={() => setEditingCover(true)}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <FolderThumbnail name={name} coverPath={coverPath} />
            <View style={styles.editBadge} accessible={false} importantForAccessibility="no-hide-descendants">
              <Text style={styles.editSymbol}>↻</Text>
            </View>
          </Pressable>
        ) : <FolderThumbnail name={name} coverPath={coverPath} />}
        <View style={styles.title}>{children}</View>
        {onDeleted && (
          <Pressable accessibilityRole="button" onPress={() => {
            Keyboard.dismiss();
            setConfirming(true);
          }} style={styles.action}>
            <Text style={styles.deleteLabel}>위치 삭제</Text>
          </Pressable>
        )}
      </View>
      {editingCover && onCoverSaved && (
        <FolderCoverSheet
          folderId={id}
          coverPath={coverPath}
          onClose={() => setEditingCover(false)}
          onSaved={(nextPath) => {
            onCoverSaved(nextPath);
            setEditingCover(false);
          }}
        />
      )}
      {onDeleted && (
        <DeleteConfirmation
          visible={confirming}
          title={contents ? `${name} 안의 내용까지 삭제할까요?` : `${name} 위치를 삭제할까요?`}
          message={included
            ? `${included} 및 관련 사진이 함께 삭제돼요. 되돌릴 수 없어요.`
            : coverPath?.startsWith('place-covers/') ? '이 위치의 대표 사진도 함께 삭제돼요.' : undefined}
          confirmLabel={contents ? '모두 삭제' : error ? '다시 시도' : '위치 삭제 확인'}
          confirmText={contents ? '모두 삭제' : error ? '다시 시도' : undefined}
          busy={busy}
          error={error ? '위치를 삭제하지 못했어요. 다시 시도해 주세요.' : undefined}
          onCancel={closeConfirmation}
          onConfirm={confirm}
        />
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
  pressed: { opacity: 0.65 },
  editBadge: {
    position: 'absolute', right: -3, bottom: -3, width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: '#E7E0D6',
  },
  editSymbol: { color: '#69511B', fontSize: 14, fontWeight: '700' },
  action: { justifyContent: 'center', minHeight: 44, paddingHorizontal: 10 },
  deleteLabel: { color: colors.accent, fontSize: 14, fontWeight: '700' },
});
