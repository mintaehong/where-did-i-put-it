import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { listChildFolders, listRootFolders } from './db/folders';
import { moveItem } from './db/items';
import { colors, screenStyles } from './theme';

type Location = { id: string; name: string };

function pathLabel(path: Location[]) {
  return path.map((folder) => folder.name).join(' › ');
}

export default function ItemLocation({ itemId, folderId, path, onMoved }: {
  itemId: string;
  folderId: string;
  path: Location[];
  onMoved: (folder: Location, path: Location[]) => void;
}) {
  const [destination, setDestination] = useState<Location[]>();

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="보관 위치 바꾸기"
        accessibilityState={{ expanded: destination !== undefined }}
        onPress={() => setDestination((current) => current ? undefined : path.slice(0, -1))}
        disabled={destination !== undefined}
        style={styles.titleRow}
      >
        <View style={styles.titleText}>
          <Text style={styles.label}>보관 위치</Text>
          <Text style={screenStyles.body}>{pathLabel(path) || '보관 위치를 찾을 수 없어요.'}</Text>
        </View>
        {destination === undefined && <Text style={styles.action}>바꾸기 ›</Text>}
      </Pressable>
      {destination && (
        <LocationPicker
          itemId={itemId}
          folderId={folderId}
          path={destination}
          onBrowse={setDestination}
          onCancel={() => setDestination(undefined)}
          onSaved={(folder) => {
            onMoved(folder, destination);
            setDestination(undefined);
          }}
        />
      )}
    </View>
  );
}

function LocationPicker({ itemId, folderId, path, onBrowse, onCancel, onSaved }: {
  itemId: string;
  folderId: string;
  path: Location[];
  onBrowse: (path: Location[]) => void;
  onCancel: () => void;
  onSaved: (folder: Location) => void;
}) {
  const current = path.at(-1);
  const currentId = current?.id;
  const [result, setResult] = useState<{ parentId: string | undefined; folders: Location[] | null }>();
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const pending = useRef(false);
  const listing = result?.parentId === currentId ? result : undefined;

  useEffect(() => {
    let active = true;
    const folders = currentId ? listChildFolders(currentId) : listRootFolders();
    folders.then(
      (rows) => { if (active) setResult({ parentId: currentId, folders: rows }); },
      () => { if (active) setResult({ parentId: currentId, folders: null }); },
    );
    return () => { active = false; };
  }, [currentId, attempt]);

  async function save() {
    if (!current || current.id === folderId || pending.current) return;
    pending.current = true;
    setSaving(true);
    setSaveError(false);
    try {
      await moveItem(itemId, current.id);
      onSaved(current);
    } catch {
      setSaveError(true);
      setSaving(false);
      pending.current = false;
    }
  }

  function browse(next: Location[]) {
    setSaveError(false);
    onBrowse(next);
  }

  return (
    <View style={styles.picker}>
      <Text style={styles.label}>{pathLabel(path) || '보관 장소 선택'}</Text>
      {current && (
        <Pressable accessibilityRole="button" disabled={saving} onPress={() => browse(path.slice(0, -1))} style={styles.row}>
          <Text style={styles.action}>‹ 상위 위치</Text>
        </Pressable>
      )}
      {!listing ? (
        <ActivityIndicator accessibilityLabel="보관 위치 불러오는 중" />
      ) : listing.folders === null ? (
        <Pressable accessibilityRole="button" onPress={() => {
          setResult(undefined);
          setAttempt((value) => value + 1);
        }} style={styles.row}>
          <Text style={styles.action}>보관 위치 다시 불러오기</Text>
        </Pressable>
      ) : listing.folders.map((folder) => (
        <Pressable key={folder.id} accessibilityRole="button" disabled={saving} onPress={() => browse([...path, folder])} style={styles.row}>
          <Text style={screenStyles.body}>{folder.name}</Text>
        </Pressable>
      ))}
      {saveError && <Text accessibilityRole="alert" style={screenStyles.body}>물건을 옮기지 못했어요. 다시 시도해 주세요.</Text>}
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" disabled={saving} onPress={onCancel} style={styles.row}>
          <Text style={styles.action}>이동 취소</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={saving || !current || current.id === folderId}
          onPress={save}
          style={[styles.row, styles.save, (saving || !current || current.id === folderId) && styles.dimmed]}
        >
          <Text style={styles.saveText}>여기로 옮기기</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#DFEDE3', borderRadius: 16, padding: 16, gap: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  titleText: { flex: 1, gap: 6 },
  label: { color: colors.text, fontSize: 16, fontWeight: '700' },
  action: { color: '#2D6654', fontSize: 14, fontWeight: '700' },
  picker: { gap: 6, backgroundColor: '#F2F7F2', borderRadius: 12, padding: 12 },
  row: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
  save: { backgroundColor: '#2D6654', borderRadius: 10 },
  saveText: { color: '#FFFFFF', fontWeight: '700' },
  dimmed: { opacity: 0.5 },
});
