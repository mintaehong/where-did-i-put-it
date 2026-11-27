import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text } from 'react-native';

import { deleteItem, getItemDetails, renameItem } from '../../src/db/items';
import DeleteConfirmation from '../../src/DeleteConfirmation';
import EditableName from '../../src/EditableName';
import ItemDates from '../../src/ItemDates';
import ItemLocation from '../../src/ItemLocation';
import ItemNote from '../../src/ItemNote';
import ItemPhoto from '../../src/ItemPhoto';
import ItemScreenScroll from '../../src/ItemScreenScroll';
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

  function updateItem(changes: Partial<NonNullable<Awaited<ReturnType<typeof getItemDetails>>>>) {
    const updatedAt = new Date().toISOString();
    setItem((previous) => previous ? { ...previous, ...changes, updatedAt } : previous);
  }

  return (
    <ItemScreenScroll>
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
            onSaved={(name) => updateItem({ name })}
          />
          <ItemPhoto
            itemId={item.id}
            itemName={item.name}
            previousPath={item.photoPath}
            onSaved={(photoPath) => updateItem({ photoPath })}
          />
          <ItemLocation itemId={item.id} folderId={item.folderId} path={item.path} onMoved={(folder, path) => {
            updateItem({ folderId: folder.id, path });
          }} />
          <ItemNote itemId={item.id} note={item.note} onSaved={(note) => updateItem({ note })} />
          <ItemDates createdAt={item.createdAt} updatedAt={item.updatedAt} />
          <DeleteItem itemId={item.id} itemName={item.name} onDeleted={() => {
            setItem(null);
            if (!navigation.isFocused()) return;
            const root = item.path[0];
            if (router.canGoBack()) router.back();
            else router.replace({ pathname: '/storage', params: root ? { locationId: root.id } : {} });
          }} />
        </>
      )}
    </ItemScreenScroll>
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

  function cancel() {
    if (pending.current) return;
    setConfirming(false);
    setError(false);
  }

  return (
    <>
      <Pressable accessibilityRole="button" onPress={() => {
        Keyboard.dismiss();
        setConfirming(true);
      }} style={styles.deleteAction}>
        <Text style={styles.deleteLabel}>물건 삭제</Text>
      </Pressable>
      <DeleteConfirmation
        visible={confirming}
        title={`${itemName} 삭제할까요?`}
        message="첨부 사진도 함께 삭제돼요."
        confirmLabel="물건 삭제 확인"
        busy={busy}
        error={error ? '물건을 삭제하지 못했어요. 다시 시도해 주세요.' : undefined}
        onCancel={cancel}
        onConfirm={confirm}
      />
    </>
  );
}

const styles = StyleSheet.create({
  deleteAction: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 },
  deleteLabel: { color: colors.accent, fontSize: 14, fontWeight: '700' },
});
