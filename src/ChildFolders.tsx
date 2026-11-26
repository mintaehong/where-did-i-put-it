import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Button, Pressable, StyleSheet, Text, View } from 'react-native';

import { listChildFolders } from './db/folders';
import FolderThumbnail from './FolderThumbnail';
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
      {folders.length > 0 && <View style={styles.folderList}>{folders.map((folder, index) => {
        const preview = [folder.firstChildName, folder.secondChildName].filter(Boolean).join(' · ');
        const extraCount = (folder.childCount ?? 0) - 2;
        const items = [folder.firstItemName, folder.secondItemName].filter(Boolean).join(' · ');
        const extraItems = (folder.itemCount ?? 0) - 2;
        const hint = [
          preview && `하위 위치: ${preview}${extraCount > 0 ? ` 외 ${extraCount}곳` : ''}`,
          items && `보관 물건: ${items}${extraItems > 0 ? ` 외 ${extraItems}개` : ''}`,
        ].filter(Boolean).join('. ');
        return (
          <Link
            key={folder.id}
            href={{ pathname: '/folder/[id]', params: { id: folder.id } }}
            push
            asChild
          >
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={folder.name}
              accessibilityHint={hint || undefined}
            >
              <View style={[styles.folder, index > 0 && styles.rowBorder]}>
                <FolderThumbnail name={folder.name} coverPath={folder.coverPath} />
                <View style={styles.folderText}>
                  <Text style={styles.folderName}>{folder.name}</Text>
                  {preview !== '' && (
                    <View style={styles.preview}>
                      <Text style={styles.previewLabel}>하위 위치</Text>
                      <Text numberOfLines={1} style={[styles.previewText, styles.previewNames]}>{preview}</Text>
                      {extraCount > 0 && <Text style={styles.previewText}>외 {extraCount}곳</Text>}
                    </View>
                  )}
                  {items !== '' && (
                    <View style={styles.preview}>
                      <Text style={styles.previewLabel}>보관 물건</Text>
                      <Text numberOfLines={1} style={[styles.previewText, styles.previewNames]}>{items}</Text>
                      {extraItems > 0 && <Text style={styles.previewText}>외 {extraItems}개</Text>}
                    </View>
                  )}
                </View>
                <Text accessible={false} style={styles.chevron}>›</Text>
              </View>
            </Pressable>
          </Link>
        );
      })}</View>}
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
    borderTopColor: '#E7E0D6',
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
    color: colors.text,
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
    backgroundColor: '#FFF5D7',
  },
  addLabel: {
    color: '#69511B',
    fontSize: 14,
    fontWeight: '700',
  },
  folderList: {
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E7E0D6',
    backgroundColor: colors.surface, overflow: 'hidden',
  },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E7E0D6' },
  folder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 76,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  folderText: { flex: 1, minWidth: 0, gap: 3 },
  folderName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  preview: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  previewNames: { flexShrink: 1 },
  previewText: { color: colors.muted, fontSize: 12 },
  previewLabel: { color: '#69511B', fontSize: 12, fontWeight: '600' },
  chevron: { color: colors.muted, fontSize: 20 },
});
