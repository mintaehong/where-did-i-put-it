import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { deleteItem, getItemDetails, renameItem } from '../../src/db/items';
import EditableName from '../../src/EditableName';
import ItemLocation from '../../src/ItemLocation';
import ItemNote from '../../src/ItemNote';
import ItemPhoto from '../../src/ItemPhoto';
import { colors, screenStyles } from '../../src/theme';

export default function ItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ItemDetails key={id} id={id} />;
}

function ItemDetails({ id }: { id: string }) {
  const [item, setItem] = useState<Awaited<ReturnType<typeof getItemDetails>>>();
  const [loadError, setLoadError] = useState(false);
  const router = useRouter();
  const navigation = useNavigation();

  useEffect(() => {
    let active = true;
    getItemDetails(id).then(
      (details) => { if (active) setItem(details); },
      () => { if (active) setLoadError(true); },
    );
    return () => { active = false; };
  }, [id]);

  return (
    <ScrollView contentContainerStyle={screenStyles.content} keyboardShouldPersistTaps="handled">
      {loadError ? (
        <Text accessibilityRole="alert" style={screenStyles.body}>물건을 불러오지 못했어요.</Text>
      ) : item === undefined ? (
        <ActivityIndicator accessibilityLabel="물건 불러오는 중" />
      ) : item === null ? (
        <Text style={screenStyles.body}>물건을 찾을 수 없어요.</Text>
      ) : (
        <>
          <EditableName
            id={item.id}
            name={item.name}
            inputLabel="새 물건 이름"
            persistName={renameItem}
            onSaved={(name) => setItem((previous) => previous ? { ...previous, name } : previous)}
          />
          <ItemPhoto
            itemId={item.id}
            itemName={item.name}
            previousPath={item.photoPath}
            onSaved={(photoPath) => {
              setItem((previous) => previous ? { ...previous, photoPath } : previous);
            }}
          />
          <ItemLocation itemId={item.id} folderId={item.folderId} path={item.path} onMoved={(folder, path) => {
            setItem((previous) => previous ? { ...previous, folderId: folder.id, path } : previous);
          }} />
          <ItemNote itemId={item.id} note={item.note} onSaved={(note) => {
            setItem((previous) => previous ? { ...previous, note } : previous);
          }} />
          <DeleteItem itemId={item.id} itemName={item.name} onDeleted={() => {
            setItem(null);
            if (!navigation.isFocused()) return;
            const root = item.path[0];
            if (router.canGoBack()) router.back();
            else router.replace({ pathname: '/storage', params: root ? { locationId: root.id } : {} });
          }} />
        </>
      )}
    </ScrollView>
  );
}

function DeleteItem({ itemId, itemName, onDeleted }: {
  itemId: string;
  itemName: string;
  onDeleted: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const pending = useRef(false);

  async function confirm() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(false);
    try {
      await deleteItem(itemId);
    } catch {
      setError(true);
      setBusy(false);
      pending.current = false;
      return;
    }
    onDeleted();
  }

  if (!confirming) {
    return (
      <Pressable accessibilityRole="button" onPress={() => setConfirming(true)} style={styles.changePhoto}>
        <Text style={styles.deleteLabel}>물건 삭제</Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.placeholder, styles.deletePanel]}>
      <Text style={styles.label}>{itemName}을(를) 삭제할까요?</Text>
      <Text style={screenStyles.body}>첨부 사진도 함께 삭제돼요.</Text>
      {error && <Text accessibilityRole="alert" style={screenStyles.body}>물건을 삭제하지 못했어요. 다시 시도해 주세요.</Text>}
      <View style={styles.photoActions}>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => {
          setConfirming(false);
          setError(false);
        }} style={styles.changePhoto}>
          <Text style={styles.choiceLabel}>취소</Text>
        </Pressable>
        <Pressable accessibilityRole="button" disabled={busy} onPress={confirm} style={styles.changePhoto}>
          <Text style={styles.deleteLabel}>{busy ? '삭제 중' : '물건 삭제 확인'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { padding: 20, borderRadius: 16, backgroundColor: colors.surface },
  changePhoto: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 },
  photoActions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 4 },
  deletePanel: { gap: 4 },
  deleteLabel: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  choiceLabel: { color: '#2D6654', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  label: { color: colors.text, fontSize: 16, fontWeight: '700' },
});
