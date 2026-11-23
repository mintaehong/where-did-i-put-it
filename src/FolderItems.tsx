import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Button, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { createItem, listItems } from './db/items';
import { itemPhotoUri, type SelectedPhoto } from './itemPhotoFiles';
import { pickItemPhoto } from './pickItemPhoto';
import { colors, screenStyles } from './theme';

const viewOptions = [{ value: 'grid', label: '카드' }, { value: 'list', label: '목록' }] as const;
const cardsPerPage = 4;

export default function FolderItems({ folderId }: { folderId: string }) {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [items, setItems] = useState<Awaited<ReturnType<typeof listItems>>>();
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState<string>();
  const [note, setNote] = useState('');
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
      const item = await createItem(folderId, name, { photo, note });
      setItems((previous) => [...(previous ?? []), item]);
      setDraft(undefined);
      setNote('');
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
      <View style={styles.sectionHeader}>
        <Text accessibilityRole="header" style={styles.heading}>보관 중인 물건</Text>
        {!loadError && !!items?.length && (
          <View style={styles.viewToggle}>
            {viewOptions.map(({ value, label }) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityLabel={label + ' 보기'}
                accessibilityState={{ selected: view === value }}
                onPress={() => setView(value)}
                style={[styles.viewOption, view === value && styles.activeView]}
              >
                <Text style={[styles.viewLabel, view === value && styles.activeViewLabel]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
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
            <ItemCollection items={items} isList={view === 'list'} />
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
              <View style={styles.field}>
                <View style={styles.row}>
                  <Text style={styles.label}>메모</Text>
                  <Text style={styles.optional}>선택</Text>
                </View>
                <TextInput
                  accessibilityLabel="물건 메모"
                  placeholder="예: 검은 파우치 안에 넣어 둠"
                  placeholderTextColor={colors.muted}
                  multiline
                  value={note}
                  editable={!saving}
                  onChangeText={setNote}
                  style={[styles.nameInput, styles.noteInput]}
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
                setNote('');
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

export function ItemCollection({ items, isList }: {
  items: Awaited<ReturnType<typeof listItems>>;
  isList: boolean;
}) {
  const { width } = useWindowDimensions();
  const [layoutWidth, setLayoutWidth] = useState<number>();
  const pageWidth = layoutWidth ?? Math.max(1, width - 48);

  function renderItem(item: typeof items[number]) {
    const mediaStyle = isList ? styles.listMedia : styles.cardMedia;
    const media = item.photoPath ? (
      <Image
        accessibilityLabel={`${item.name} 사진`}
        accessible
        source={{ uri: itemPhotoUri(item.photoPath) }}
        resizeMode="cover"
        style={mediaStyle}
      />
    ) : (
      <View style={[mediaStyle, styles.cardPlaceholder]} accessible={false}>
        <Text style={[styles.placeholderIcon, isList && styles.listIcon]}>📦</Text>
      </View>
    );

    return (
      <Link key={item.id} href={{ pathname: '/item/[id]', params: { id: item.id } }} asChild>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={item.name}
          style={({ pressed }) => [styles.itemCard, pressed && styles.cardPressed]}
        >
          {isList ? (
            <View style={styles.listRow}>
              <Text numberOfLines={1} style={styles.cardName}>{item.name}</Text>
              {media}
              <Text style={styles.chevron}>›</Text>
            </View>
          ) : (
            <>
              {media}
              <View style={styles.cardCaption}>
                <Text numberOfLines={2} style={styles.cardName}>{item.name}</Text>
                <Text style={styles.chevron}>›</Text>
              </View>
            </>
          )}
        </Pressable>
      </Link>
    );
  }

  function renderCardRows(pageItems: typeof items) {
    return Array.from({ length: Math.ceil(pageItems.length / 2) }, (_, index) => {
      const row = pageItems.slice(index * 2, index * 2 + 2);
      return (
        <View key={row[0].id} style={styles.cardRow} testID="item-card-row">
          {row.map((item) => (
            <View key={item.id} style={[styles.cardColumn, row.length === 1 && styles.singleCardColumn]}>
              {renderItem(item)}
            </View>
          ))}
        </View>
      );
    });
  }

  if (isList) return <View style={styles.itemList}>{items.map((item) => renderItem(item))}</View>;
  if (items.length <= cardsPerPage) return <View style={styles.itemGrid}>{renderCardRows(items)}</View>;

  return (
    <View onLayout={(event) => setLayoutWidth(event.nativeEvent.layout.width)} style={styles.cardPages}>
      <ScrollView horizontal pagingEnabled keyboardShouldPersistTaps="handled">
        {Array.from({ length: Math.ceil(items.length / cardsPerPage) }, (_, page) => {
          const start = page * cardsPerPage;
          return (
            <View key={page} style={[styles.itemGrid, { width: pageWidth }]}>
              {renderCardRows(items.slice(start, start + cardsPerPage))}
            </View>
          );
        })}
      </ScrollView>
      <Text style={styles.pageHint}>옆으로 넘겨 더 보기 ›</Text>
    </View>
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
  noteInput: { minHeight: 64, textAlignVertical: 'top' },
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
  sectionHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  viewToggle: { flexDirection: 'row', backgroundColor: '#EAF1EA', borderRadius: 12, padding: 3 },
  viewOption: { minWidth: 48, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, borderRadius: 9 },
  activeView: { backgroundColor: colors.surface },
  viewLabel: { color: colors.muted, fontSize: 13 },
  activeViewLabel: { color: '#2D6654', fontWeight: '700' },
  empty: {
    borderRadius: 14,
    backgroundColor: '#F1F3EA',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  itemGrid: { gap: 12 },
  cardRow: { flexDirection: 'row', gap: 10 },
  cardColumn: { flex: 1, minWidth: 0 },
  singleCardColumn: { maxWidth: '48%' },
  cardPages: { gap: 6 },
  pageHint: { color: colors.muted, fontSize: 13, textAlign: 'right' },
  itemList: { gap: 8 },
  itemCard: {
    backgroundColor: colors.surface,
    borderColor: '#E0E7DE',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardPressed: { opacity: 0.78 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 10 },
  cardMedia: { width: '100%', height: 76, backgroundColor: '#E8EFE8' },
  listMedia: { width: 30, height: 30, borderRadius: 6, backgroundColor: '#E8EFE8' },
  cardPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderIcon: { fontSize: 24, opacity: 0.8 },
  listIcon: { fontSize: 15 },
  cardCaption: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 38, paddingHorizontal: 8, paddingVertical: 4 },
  cardName: { color: colors.text, flex: 1, fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemName: { color: colors.text, fontSize: 16, flexShrink: 1 },
  chevron: { color: '#5B7567', fontSize: 18 },
  preview: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#E8EFE8' },
  removePhoto: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
