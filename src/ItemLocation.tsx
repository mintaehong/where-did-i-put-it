import { Link } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { listChildFolders, listRootFolders } from './db/folders';
import { moveItem } from './db/items';
import { colors, screenStyles } from './theme';

type Location = { id: string; name: string };

function pathLabel(path: Location[]) {
  return path.map((folder) => folder.name).join(' › ');
}

export default function ItemLocation({ itemId, folderId, path, onMoved, disabled }: {
  itemId?: string;
  folderId: string;
  path: Location[];
  onMoved: (folder: Location, path: Location[]) => void;
  disabled?: boolean;
}) {
  const [destination, setDestination] = useState<Location[]>();
  const locationHref = !itemId || path.length === 0 ? null : path.length === 1
    ? { pathname: '/storage' as const, params: { locationId: folderId } }
    : { pathname: '/folder/[id]' as const, params: { id: folderId } };

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.label}>보관 위치</Text>
        <Text style={screenStyles.body}>{pathLabel(path) || '보관 위치를 찾을 수 없어요.'}</Text>
      </View>
      {destination === undefined && (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="보관 위치 바꾸기"
            disabled={disabled}
            onPress={() => setDestination(path.slice(0, -1))}
            style={styles.row}
          >
            <Text style={styles.action}>바꾸기</Text>
          </Pressable>
          {locationHref && (
            <Link href={locationHref} asChild>
              <Pressable accessibilityRole="link" style={styles.openLocation}>
                <Text style={styles.action}>위치 열기 ›</Text>
              </Pressable>
            </Link>
          )}
        </View>
      )}
      {destination && (
        <LocationPicker
          itemId={itemId}
          disabled={disabled}
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

function LocationPicker({ itemId, folderId, path, onBrowse, onCancel, onSaved, disabled }: {
  itemId?: string;
  folderId: string;
  path: Location[];
  onBrowse: (path: Location[]) => void;
  onCancel: () => void;
  onSaved: (folder: Location) => void;
  disabled?: boolean;
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
    if (disabled || !current || current.id === folderId || pending.current) return;
    if (!itemId) {
      onSaved(current);
      return;
    }
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

  const busy = saving || disabled;
  const cannotSelect = busy || !current || current.id === folderId;

  return (
    <View style={styles.picker}>
      <Text style={styles.label}>{pathLabel(path) || '보관 장소 선택'}</Text>
      {current && (
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => browse(path.slice(0, -1))} style={styles.row}>
          <Text style={styles.action}>‹ 상위 위치</Text>
        </Pressable>
      )}
      {!listing ? (
        <ActivityIndicator accessibilityLabel="보관 위치 불러오는 중" />
      ) : listing.folders === null ? (
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => {
          setResult(undefined);
          setAttempt((value) => value + 1);
        }} style={styles.row}>
          <Text style={styles.action}>보관 위치 다시 불러오기</Text>
        </Pressable>
      ) : listing.folders.map((folder) => (
        <Pressable key={folder.id} accessibilityRole="button" disabled={busy} onPress={() => browse([...path, folder])} style={styles.row}>
          <Text style={screenStyles.body}>{folder.name}</Text>
        </Pressable>
      ))}
      {saveError && <Text accessibilityRole="alert" style={screenStyles.body}>물건을 옮기지 못했어요. 다시 시도해 주세요.</Text>}
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" disabled={busy} onPress={onCancel} style={styles.row}>
          <Text style={styles.action}>{itemId ? '이동 취소' : '선택 취소'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={cannotSelect}
          onPress={save}
          style={[styles.row, styles.save, cannotSelect && styles.dimmed]}
        >
          <Text style={styles.saveText}>{itemId ? '여기로 옮기기' : '이 위치 선택'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#DFEDE3', borderRadius: 16, padding: 16, gap: 12 },
  titleRow: { gap: 6, minHeight: 44 },
  label: { color: colors.text, fontSize: 16, fontWeight: '700' },
  action: { color: '#2D6654', fontSize: 14, fontWeight: '700' },
  picker: { gap: 6, backgroundColor: '#F2F7F2', borderRadius: 12, padding: 12 },
  row: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 },
  openLocation: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, backgroundColor: '#F2F7F2', borderRadius: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
  save: { backgroundColor: '#2D6654', borderRadius: 10 },
  saveText: { color: '#FFFFFF', fontWeight: '700' },
  dimmed: { opacity: 0.5 },
});
