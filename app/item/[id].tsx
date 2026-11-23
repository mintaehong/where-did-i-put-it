import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { attachItemPhoto, getItemDetails, renameItem } from '../../src/db/items';
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
  const [photoError, setPhotoError] = useState(false);

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
          {!item.photoPath ? (
            <AddPhoto itemId={item.id} onSaved={(photoPath) => {
              setItem((previous) => previous ? { ...previous, photoPath } : previous);
            }} />
          ) : !photoError ? (
            <Image
              accessibilityLabel={`${item.name} 사진`}
              accessible
              source={{ uri: itemPhotoUri(item.photoPath) }}
              style={styles.photo}
              resizeMode="contain"
              onError={() => setPhotoError(true)}
            />
          ) : (
            <View style={styles.placeholder}>
              <Text style={screenStyles.body}>사진을 불러오지 못했어요.</Text>
            </View>
          )}
          <View style={styles.location}>
            <Text accessibilityRole="header" style={styles.label}>보관 위치</Text>
            <Text style={screenStyles.body}>
              {item.path.length ? item.path.map((folder) => folder.name).join(' › ') : '보관 위치를 찾을 수 없어요.'}
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

function AddPhoto({ itemId, onSaved }: { itemId: string; onSaved: (path: string) => void }) {
  const [photo, setPhoto] = useState<SelectedPhoto>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const pending = useRef(false);

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

  return (
    <View style={[styles.photoPanel, !photo && styles.emptyPhoto]}>
      {photo ? (
        <>
          <View style={styles.previewBar}>
            <Text style={[styles.label, styles.previewLabel]}>미리보기</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="사진 저장"
              disabled={busy}
              onPress={() => runPhotoAction(async () => {
                onSaved(await attachItemPhoto(itemId, photo));
              }, '사진을 저장하지 못했어요. 다시 시도해 주세요.')}
              style={({ pressed }) => [styles.iconButton, styles.saveButton, (busy || pressed) && styles.dimmed]}
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
              }}
              style={({ pressed }) => [styles.iconButton, styles.cancelButton, (busy || pressed) && styles.dimmed]}
            >
              <Text style={styles.cancelIcon}>×</Text>
            </Pressable>
          </View>
          <Image accessible accessibilityLabel="선택한 사진" source={{ uri: photo.uri }} style={styles.photo} resizeMode="contain" />
        </>
      ) : (
        <>
          <Text style={styles.label}>사진 추가</Text>
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
        </>
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
