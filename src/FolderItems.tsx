import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Button, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { createItem, listItems } from './db/items';
import { itemPhotoUri, type SelectedPhoto } from './itemPhotoFiles';
import { pickItemPhoto } from './pickItemPhoto';
import { colors, screenStyles } from './theme';

export default function FolderItems({ folderId }: { folderId: string }) {
  const [items, setItems] = useState<Awaited<ReturnType<typeof listItems>>>();
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [photo, setPhoto] = useState<SelectedPhoto>();
  const [picking, setPicking] = useState(false);
  const [photoError, setPhotoError] = useState<string>();
  const pending = useRef(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    listItems(folderId).then(
      (rows) => {
        if (active) {
          setItems(rows);
          setLoadError(false);
        }
      },
      () => { if (active) setLoadError(true); },
    );
    return () => { active = false; };
  }, [folderId, attempt]));

  async function choosePhoto(source: 'camera' | 'album') {
    if (pending.current) return;
    pending.current = true;
    setPicking(true);
    setPhotoError(undefined);
    try {
      setPhoto(await pickItemPhoto(source));
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : source === 'camera'
        ? '카메라를 열지 못했어요. 다시 시도해 주세요.'
        : '앨범을 열지 못했어요. 다시 시도해 주세요.');
    } finally {
      pending.current = false;
      setPicking(false);
    }
  }

  async function save() {
    const name = draft?.trim();
    if (!name || pending.current) return;
    pending.current = true;
    setSaving(true);
    setSaveError(false);
    try {
      const item = photo ? await createItem(folderId, name, photo) : await createItem(folderId, name);
      setItems((previous) => [...(previous ?? []), item]);
      setDraft(undefined);
      setPhoto(undefined);
      setPhotoError(undefined);
    } catch {
      setSaveError(true);
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  return (
    <>
      <Text accessibilityRole="header" style={styles.heading}>보관 중인 물건</Text>
      {loadError ? (
        <>
          <Text accessibilityRole="alert">물건을 불러오지 못했어요.</Text>
          <Button title="물건 다시 불러오기" onPress={() => {
            setLoadError(false);
            setAttempt((previous) => previous + 1);
          }} />
        </>
      ) : !items ? (
        <ActivityIndicator accessibilityLabel="물건 불러오는 중" />
      ) : (
        <>
          {items.length === 0 ? (
            <View style={styles.empty}>
              <Text style={screenStyles.body}>아직 등록된 물건이 없어요.</Text>
            </View>
          ) : (
            <View style={styles.itemGrid}>
              {items.map((item) => (
                <Link key={item.id} href={{ pathname: '/item/[id]', params: { id: item.id } }} asChild>
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={item.name}
                    style={({ pressed }) => [styles.itemCard, pressed && styles.cardPressed]}
                  >
                    {item.photoPath ? (
                      <Image
                        accessibilityLabel={`${item.name} 사진`}
                        accessible
                        source={{ uri: itemPhotoUri(item.photoPath) }}
                        resizeMode="cover"
                        style={styles.cardMedia}
                      />
                    ) : (
                      <View style={[styles.cardMedia, styles.cardPlaceholder]} accessible={false}>
                        <Text style={styles.placeholderIcon}>📦</Text>
                      </View>
                    )}
                    <View style={styles.cardCaption}>
                      <Text numberOfLines={2} style={styles.cardName}>{item.name}</Text>
                      <Text style={styles.chevron}>›</Text>
                    </View>
                  </Pressable>
                </Link>
              ))}
            </View>
          )}
          {draft === undefined ? (
            <Button title="물건 추가" onPress={() => setDraft('')} />
          ) : (
            <View style={styles.form}>
              <View style={styles.field}>
                <Text style={styles.label}>물건 이름</Text>
                <TextInput
                  accessibilityLabel="물건 이름"
                  placeholder="예: 여권"
                  autoFocus
                  value={draft}
                  editable={!saving}
                  onChangeText={setDraft}
                  onSubmitEditing={save}
                  returnKeyType="done"
                  style={styles.nameInput}
                />
              </View>
              <View style={[styles.field, styles.photoSection]}>
                <View style={styles.row}>
                  <Text style={styles.label}>사진 첨부</Text>
                  <Text style={styles.optional}>선택</Text>
                </View>
                {photo ? (
                  <View style={[styles.row, styles.photoArea]}>
                    <Image accessibilityLabel="선택한 사진" accessible source={{ uri: photo.uri }} style={styles.preview} />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="사진 제거"
                      disabled={saving}
                      onPress={() => setPhoto(undefined)}
                      style={styles.removePhoto}
                    >
                      <Text style={styles.itemName}>×</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.photoChoices}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => choosePhoto('camera')}
                      disabled={picking || saving}
                      style={({ pressed }) => [styles.photoArea, styles.photoTarget, pressed && styles.photoPressed]}
                    >
                      <Text style={styles.photoAction}>사진 찍기</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => choosePhoto('album')}
                      disabled={picking || saving}
                      style={({ pressed }) => [styles.photoArea, styles.photoTarget, pressed && styles.photoPressed]}
                    >
                      <Text style={styles.photoAction}>앨범에서 사진 추가</Text>
                    </Pressable>
                  </View>
                )}
                {photoError && <Text accessibilityRole="alert">{photoError}</Text>}
              </View>
              {saveError && <Text accessibilityRole="alert">물건을 저장하지 못했어요. 다시 시도해 주세요.</Text>}
              <Button title="물건 저장" onPress={save} disabled={picking || saving || !draft.trim()} />
              <Button title="물건 추가 취소" disabled={picking || saving} onPress={() => {
                setDraft(undefined);
                setSaveError(false);
                setPhoto(undefined);
                setPhotoError(undefined);
              }} />
            </View>
          )}
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 16,
    padding: 16,
    backgroundColor: colors.surface,
    borderColor: '#DFE6DE',
    borderWidth: 1,
    borderRadius: 18,
  },
  field: { gap: 8 },
  photoSection: {
    backgroundColor: '#EDF4ED',
    borderRadius: 14,
    padding: 12,
  },
  label: { color: colors.text, fontSize: 14, fontWeight: '700' },
  optional: { color: colors.muted, fontSize: 13 },
  nameInput: {
    backgroundColor: colors.surface,
    borderColor: '#C9D3CA',
    borderWidth: 1,
    borderRadius: 12,
    color: colors.text,
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  photoArea: {
    backgroundColor: '#FAFCF9',
    borderColor: '#9DB3A5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  photoChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoTarget: { flexGrow: 1, flexBasis: 112, alignItems: 'center', justifyContent: 'center', minHeight: 54 },
  photoPressed: { backgroundColor: '#DFEDE3' },
  photoAction: { color: '#2D6654', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  heading: { color: colors.text, fontSize: 18, fontWeight: '700' },
  empty: {
    borderRadius: 14,
    backgroundColor: '#F1F3EA',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  itemGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  itemCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderColor: '#E0E7DE',
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardPressed: { opacity: 0.78 },
  cardMedia: { width: '100%', aspectRatio: 4 / 3, backgroundColor: '#E8EFE8' },
  cardPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderIcon: { fontSize: 30, opacity: 0.8 },
  cardCaption: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 46, padding: 10 },
  cardName: { color: colors.text, flex: 1, fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemName: { color: colors.text, fontSize: 16, flexShrink: 1 },
  chevron: { color: '#5B7567', fontSize: 18 },
  preview: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#E8EFE8' },
  removePhoto: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
