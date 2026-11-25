import { Link } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { listFolderTree } from './db/folders';
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const locationHref = !itemId || path.length === 0 ? null : path.length === 1
    ? { pathname: '/storage' as const, params: { locationId: folderId } }
    : { pathname: '/folder/[id]' as const, params: { id: folderId } };

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <Text style={styles.label}>보관 위치</Text>
        <Text style={screenStyles.body}>{pathLabel(path) || '보관 위치를 찾을 수 없어요.'}</Text>
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="보관 위치 바꾸기"
          disabled={disabled}
          onPress={() => {
            Keyboard.dismiss();
            setPickerOpen(true);
          }}
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
      {pickerOpen && (
        <LocationPicker
          itemId={itemId}
          disabled={disabled}
          folderId={folderId}
          path={path}
          onCancel={() => setPickerOpen(false)}
          onSaved={(folder, nextPath) => {
            onMoved(folder, nextPath);
            setPickerOpen(false);
          }}
        />
      )}
    </View>
  );
}

type FolderTree = Awaited<ReturnType<typeof listFolderTree>>;
type LocationRow = { folder: Location; parents: Location[]; hasChildren: boolean };

function LocationPicker({ itemId, folderId, path, onCancel, onSaved, disabled }: {
  itemId?: string;
  folderId: string;
  path: Location[];
  onCancel: () => void;
  onSaved: (folder: Location, path: Location[]) => void;
  disabled?: boolean;
}) {
  const [folders, setFolders] = useState<FolderTree | null>();
  const [expanded, setExpanded] = useState(() => new Set(path.map((folder) => folder.id)));
  const [selection, setSelection] = useState(path);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const pending = useRef(false);
  const selected = selection.at(-1);
  const busy = saving || disabled;
  const cannotSelect = busy || !selected || selected.id === folderId;

  useEffect(() => {
    let active = true;
    listFolderTree().then(
      (rows) => { if (active) setFolders(rows); },
      () => { if (active) setFolders(null); },
    );
    return () => { active = false; };
  }, [attempt]);

  const childrenByParent = useMemo(() => {
    const children = new Map<string | null, Location[]>();
    for (const { id, name, parentId } of folders ?? []) {
      const siblings = children.get(parentId);
      if (siblings) siblings.push({ id, name });
      else children.set(parentId, [{ id, name }]);
    }
    return children;
  }, [folders]);

  const rows: LocationRow[] = [];
  function appendRows(parentId: string | null, parents: Location[]) {
    for (const folder of childrenByParent.get(parentId) ?? []) {
      const hasChildren = childrenByParent.has(folder.id);
      rows.push({ folder, parents, hasChildren });
      if (hasChildren && expanded.has(folder.id)) appendRows(folder.id, [...parents, folder]);
    }
  }
  appendRows(null, []);

  function toggle(folder: Location) {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(folder.id)) next.delete(folder.id);
      else next.add(folder.id);
      return next;
    });
  }

  async function save() {
    if (cannotSelect || !selected || pending.current) return;
    if (!itemId) {
      onSaved(selected, selection);
      return;
    }
    pending.current = true;
    setSaving(true);
    setSaveError(false);
    try {
      await moveItem(itemId, selected.id);
    } catch {
      setSaveError(true);
      setSaving(false);
      pending.current = false;
      return;
    }
    onSaved(selected, selection);
  }

  function close() {
    if (!pending.current) onCancel();
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={close} />
        <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.sheet} accessibilityViewIsModal>
          <Text accessibilityRole="header" style={styles.sheetTitle}>{itemId ? '옮길 위치 선택' : '보관 위치 선택'}</Text>
          <ScrollView style={styles.locationList}>
            {folders === undefined ? (
              <ActivityIndicator accessibilityLabel="보관 위치 불러오는 중" style={styles.listStatus} />
            ) : folders === null ? (
              <Pressable accessibilityRole="button" onPress={() => {
                setFolders(undefined);
                setAttempt((value) => value + 1);
              }} style={styles.row}>
                <Text style={styles.action}>보관 위치 다시 불러오기</Text>
              </Pressable>
            ) : rows.length === 0 ? (
              <Text style={[styles.listStatus, screenStyles.body]}>보관 장소가 없어요.</Text>
            ) : rows.map(({ folder, parents, hasChildren }) => {
              const isExpanded = expanded.has(folder.id);
              const isCurrent = folder.id === folderId;
              const isSelected = folder.id === selected?.id && !isCurrent;
              return (
                <View key={folder.id} style={[styles.treeRow, isSelected && styles.selectedRow, { paddingLeft: Math.min(parents.length, 5) * 14 }]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={isCurrent ? folder.name + ', 현재 보관 위치' : folder.name}
                    accessibilityState={{ selected: isSelected }}
                    disabled={busy}
                    onPress={() => {
                      setSelection([...parents, folder]);
                      setSaveError(false);
                    }}
                    style={styles.selectLocation}
                  >
                    <Text style={[styles.folderName, parents.length === 0 && styles.rootName]}>{folder.name}</Text>
                    {isCurrent && <Text style={styles.currentBadge}>현재</Text>}
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </Pressable>
                  {hasChildren ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={folder.name + (isExpanded ? ' 하위 위치 접기' : ' 하위 위치 펼치기')}
                      accessibilityState={{ expanded: isExpanded }}
                      disabled={busy}
                      onPress={() => toggle(folder)}
                      style={styles.expandButton}
                    >
                      <Text style={[styles.chevron, isExpanded && styles.expandedChevron]}>›</Text>
                    </Pressable>
                  ) : <View style={styles.expandSpacer} />}
                </View>
              );
            })}
          </ScrollView>
          <View style={styles.sheetFooter}>
            {selected && (
              <View style={styles.destination}>
                <Text style={styles.destinationLabel}>{selected.id === folderId ? '현재 위치' : '선택한 위치'}</Text>
                <Text style={styles.destinationPath}>{pathLabel(selection)}</Text>
              </View>
            )}
            {saveError && <Text accessibilityRole="alert" style={screenStyles.body}>물건을 옮기지 못했어요. 다시 시도해 주세요.</Text>}
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" disabled={busy} onPress={close} style={styles.row}>
                <Text style={styles.action}>{itemId ? '이동 취소' : '선택 취소'}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={cannotSelect}
                onPress={save}
                style={[styles.row, styles.save, cannotSelect && styles.dimmed]}
              >
                <Text style={styles.saveText}>{saving ? '옮기는 중' : itemId ? '여기로 옮기기' : '이 위치 선택'}</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#DFEDE3', borderRadius: 16, padding: 16, gap: 12 },
  titleRow: { gap: 6, minHeight: 44 },
  label: { color: colors.text, fontSize: 16, fontWeight: '700' },
  action: { color: '#2D6654', fontSize: 14, fontWeight: '700' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#241A165C' },
  sheet: {
    maxHeight: '78%', backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, gap: 12,
  },
  sheetTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
  locationList: { flexGrow: 0, flexShrink: 1 },
  listStatus: { paddingVertical: 12 },
  treeRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#EAE5DD' },
  selectedRow: { backgroundColor: '#FFF5D7' },
  selectLocation: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingVertical: 8, paddingLeft: 8 },
  folderName: { color: colors.text, fontSize: 16, flexShrink: 1 },
  rootName: { fontWeight: '700' },
  currentBadge: { color: colors.muted, fontSize: 12, backgroundColor: '#F1EEE9', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  checkmark: { color: '#6A500E', fontSize: 16, fontWeight: '700' },
  expandButton: { width: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  expandSpacer: { width: 44 },
  chevron: { color: colors.muted, fontSize: 22 },
  expandedChevron: { transform: [{ rotate: '90deg' }] },
  sheetFooter: { gap: 8 },
  destination: { gap: 3, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F8F5EF' },
  destinationLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  destinationPath: { color: colors.text, fontSize: 14, fontWeight: '600' },
  row: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 },
  openLocation: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, backgroundColor: '#F2F7F2', borderRadius: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
  save: { backgroundColor: '#2D6654', borderRadius: 10 },
  saveText: { color: '#FFFFFF', fontWeight: '700' },
  dimmed: { opacity: 0.5 },
});
