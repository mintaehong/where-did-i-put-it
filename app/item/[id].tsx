import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { attachItemPhoto, deleteItem, getItemDetails, removeItemPhoto, renameItem, replaceItemPhoto } from '../../src/db/items';
import EditableName from '../../src/EditableName';
import { itemPhotoUri, type SelectedPhoto } from '../../src/itemPhotoFiles';
import { pickItemPhoto } from '../../src/pickItemPhoto';
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
          <View style={styles.location}>
            <Text accessibilityRole="header" style={styles.label}>보관 위치</Text>
            <Text style={screenStyles.body}>
              {item.path.length ? item.path.map((folder) => folder.name).join(' › ') : '보관 위치를 찾을 수 없어요.'}
            </Text>
          </View>
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

function ItemPhoto({ itemId, itemName, previousPath, onSaved }: {
  itemId: string;
  itemName: string;
  previousPath: string | null;
  onSaved: (path: string | null) => void;
}) {
  const [photo, setPhoto] = useState<SelectedPhoto>();
  const [showSources, setShowSources] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [failedUri, setFailedUri] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const pending = useRef(false);
  const existingUri = previousPath ? itemPhotoUri(previousPath) : undefined;
  const displayedUri = photo?.uri ?? existingUri;

  async function runPhotoAction(action: () => Promise<void>, errorMessage?: string) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(undefined);
    try {
      await action();
    } catch (failure) {
      setError(errorMessage ?? (failure instanceof Error ? failure.message : '사진을 열지 못했어요.'));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  function choose(source: 'camera' | 'album') {
    return runPhotoAction(async () => setPhoto(await pickItemPhoto(source)));
  }

  function deletePhoto() {
    if (!previousPath) return;
    return runPhotoAction(async () => {
      await removeItemPhoto(itemId, previousPath);
      setConfirmDelete(false);
      onSaved(null);
    }, '사진을 삭제하지 못했어요. 다시 시도해 주세요.');
  }

  return (
    <View style={[styles.photoPanel, !displayedUri && styles.emptyPhoto]}>
      {displayedUri && (
        displayedUri === failedUri ? (
          <View style={styles.placeholder}>
            <Text style={screenStyles.body}>사진을 불러오지 못했어요.</Text>
          </View>
        ) : (
          <Image
            key={displayedUri}
            accessible
            accessibilityLabel={photo ? '선택한 사진' : `${itemName} 사진`}
            source={{ uri: displayedUri }}
            style={styles.photo}
            resizeMode="contain"
            onError={() => setFailedUri(displayedUri)}
          />
        )
      )}
      {photo ? (
          <View style={styles.previewBar}>
            <Text style={[styles.label, styles.previewLabel]}>미리보기</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="사진 저장"
              disabled={busy || displayedUri === failedUri}
              onPress={() => runPhotoAction(async () => {
                const path = previousPath
                  ? await replaceItemPhoto(itemId, previousPath, photo)
                  : await attachItemPhoto(itemId, photo);
                onSaved(path);
                setPhoto(undefined);
                setShowSources(false);
              }, '사진을 저장하지 못했어요. 다시 시도해 주세요.')}
              style={({ pressed }) => [
                styles.iconButton, styles.saveButton, (busy || pressed || displayedUri === failedUri) && styles.dimmed,
              ]}
            >
              <Text style={styles.saveIcon}>✓</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="사진 선택 취소"
              disabled={busy}
              onPress={() => {
                setPhoto(undefined);
                setError(undefined);
                setShowSources(false);
              }}
              style={({ pressed }) => [styles.iconButton, styles.cancelButton, (busy || pressed) && styles.dimmed]}
            >
              <Text style={styles.cancelIcon}>×</Text>
            </Pressable>
          </View>
      ) : !previousPath || showSources ? (
        <>
          {!previousPath && <Text style={styles.label}>사진 추가</Text>}
          <View style={styles.photoChoices}>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => choose('camera')}
              style={({ pressed }) => [styles.choice, (busy || pressed) && styles.dimmed]}
            >
              <Text style={styles.choiceLabel}>사진 찍기</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="앨범에서 사진 추가"
              disabled={busy}
              onPress={() => choose('album')}
              style={({ pressed }) => [styles.choice, (busy || pressed) && styles.dimmed]}
            >
              <Text style={styles.choiceLabel}>앨범에서 선택</Text>
            </Pressable>
          </View>
          {previousPath && (
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => {
              setShowSources(false);
              setError(undefined);
            }} style={styles.changePhoto}>
              <Text style={styles.choiceLabel}>교체 취소</Text>
            </Pressable>
          )}
        </>
      ) : confirmDelete ? (
        <View style={styles.deletePanel}>
          <Text style={screenStyles.body}>첨부 사진을 삭제할까요? 물건은 그대로 남아요.</Text>
          <View style={styles.photoActions}>
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => {
              setConfirmDelete(false);
              setError(undefined);
            }} style={styles.changePhoto}>
              <Text style={styles.choiceLabel}>취소</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={busy} onPress={deletePhoto} style={styles.changePhoto}>
              <Text style={styles.deleteLabel}>사진 삭제 확인</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.photoActions}>
          <Pressable accessibilityRole="button" onPress={() => setShowSources(true)} style={styles.changePhoto}>
            <Text style={styles.choiceLabel}>사진 바꾸기</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setConfirmDelete(true)} style={styles.changePhoto}>
            <Text style={styles.deleteLabel}>사진 삭제</Text>
          </Pressable>
        </View>
      )}
      {error && <Text accessibilityRole="alert" style={screenStyles.body}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: 16, backgroundColor: colors.surface },
  placeholder: { padding: 20, borderRadius: 16, backgroundColor: colors.surface },
  photoPanel: { gap: 12, padding: 14, borderRadius: 16, backgroundColor: '#EDF4ED' },
  emptyPhoto: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#A9BEAE', alignItems: 'center' },
  photoChoices: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  choice: {
    backgroundColor: colors.surface,
    borderColor: '#D4E2D6',
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  choiceLabel: { color: '#2D6654', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  changePhoto: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 },
  photoActions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 4 },
  deletePanel: { gap: 4 },
  deleteLabel: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  previewBar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewLabel: { flex: 1 },
  iconButton: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveButton: { backgroundColor: '#2D6654' },
  cancelButton: { backgroundColor: colors.surface },
  saveIcon: { color: '#FFFFFF', fontSize: 23, fontWeight: '700' },
  cancelIcon: { color: colors.text, fontSize: 25 },
  dimmed: { opacity: 0.5 },
  location: { gap: 6, backgroundColor: '#DFEDE3', borderRadius: 16, padding: 16 },
  label: { color: colors.text, fontSize: 16, fontWeight: '700' },
});
