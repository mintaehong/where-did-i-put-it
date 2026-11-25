import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EditableName from '../src/EditableName';
import { createRootFolder, listRootChildFolders, listRootFolders, renameFolder } from '../src/db/folders';
import { listRecentItemsByLocation } from '../src/db/items';
import { itemPhotoUri } from '../src/itemPhotoFiles';
import { pickItemPhoto } from '../src/pickItemPhoto';
import { placeCoverImage, placeCovers, type PlaceCover } from '../src/placeCovers';
import { colors, screenStyles } from '../src/theme';

const placeCoverSize = 68;
const placeMainGap = 9;

export default function HomeScreen() {
  const { width, fontScale } = useWindowDimensions();
  const showButtonLabel = width >= 370 && fontScale <= 1.2;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.wordmark}>
          <Image source={require('../assets/app-logo-header.png')} resizeMode="contain" style={styles.logo} />
          <Text accessibilityRole="header" style={styles.heading}>어디 뒀지?</Text>
        </View>
        <Link href="/ask" asChild>
          <Pressable accessibilityRole="link" accessibilityLabel="엄마에게 물어보기" style={styles.askEntry}>
            <View style={styles.askLayout}>
              <Image source={require('../assets/mom-banner.png')} resizeMode="contain" style={styles.momImage} />
              <View style={styles.askCopy}>
                <Text style={styles.askMessage}>{'뭐 찾니?\n엄마가 찾아줄게.'}</Text>
              </View>
              <View style={styles.askButton}>
                {showButtonLabel && <Text style={styles.askLabel}>엄마에게 물어보기</Text>}
                <Text importantForAccessibility="no" style={styles.askArrow}>→</Text>
              </View>
            </View>
          </Pressable>
        </Link>
        <HomePlaces />
      </ScrollView>
    </SafeAreaView>
  );
}

function HomePlaces() {
  const [places, setPlaces] = useState<Awaited<ReturnType<typeof listRootFolders>> | null>();
  const [recentItems, setRecentItems] = useState<Awaited<ReturnType<typeof listRecentItemsByLocation>>>([]);
  const [childFolders, setChildFolders] = useState<Awaited<ReturnType<typeof listRootChildFolders>>>([]);
  const [attempt, setAttempt] = useState(0);
  const [newLocation, setNewLocation] = useState<string>();
  const [cover, setCover] = useState<PlaceCover>();
  const [picking, setPicking] = useState(false);
  const [coverError, setCoverError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const pending = useRef(false);
  const [editingId, setEditingId] = useState<string>();
  const editingPlace = places?.find((place) => place.id === editingId);

  useFocusEffect(useCallback(() => {
    let active = true;
    listRootFolders().then(
      (folders) => { if (active) setPlaces(folders); },
      () => { if (active) setPlaces(null); },
    );
    listRecentItemsByLocation().then(
      (rows) => { if (active) setRecentItems(rows); },
      () => { if (active) setRecentItems([]); },
    );
    listRootChildFolders().then(
      (rows) => { if (active) setChildFolders(rows); },
      () => { if (active) setChildFolders([]); },
    );
    return () => { active = false; };
  }, [attempt]));

  async function chooseCover(source: 'camera' | 'album') {
    if (pending.current) return;
    pending.current = true;
    setPicking(true);
    setCoverError(undefined);
    try {
      const photo = await pickItemPhoto(source);
      if (photo) setCover({ photo });
    } catch (error) {
      setCoverError(error instanceof Error ? error.message : '사진을 열지 못했어요.');
    } finally {
      pending.current = false;
      setPicking(false);
    }
  }

  function resetPlaceForm() {
    setNewLocation(undefined);
    setCover(undefined);
    setCoverError(undefined);
    setSaveError(false);
  }

  async function saveLocation() {
    const name = newLocation?.trim();
    if (!name || pending.current) return;
    pending.current = true;
    setSaving(true);
    setSaveError(false);
    try {
      const folder = cover ? await createRootFolder(name, cover) : await createRootFolder(name);
      setPlaces((previous) => [...(previous ?? []), folder]);
      resetPlaceForm();
    } catch {
      setSaveError(true);
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  return (
    <View style={styles.places}>
      <View style={styles.placeHeader}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>보관 장소</Text>
        {Array.isArray(places) && newLocation === undefined && !editingPlace && (
          <Pressable accessibilityRole="button" accessibilityLabel="장소 추가" onPress={() => setNewLocation('')} style={styles.action}>
            <Text style={styles.addLabel}>+ 장소 추가</Text>
          </Pressable>
        )}
      </View>
      {newLocation !== undefined && (
        <View style={styles.form}>
          <Text style={styles.addLabel}>새 보관 장소</Text>
          <TextInput
            accessibilityLabel="장소 이름"
            placeholder="예: 회사"
            autoFocus
            editable={!saving}
            value={newLocation}
            onChangeText={setNewLocation}
            onSubmitEditing={saveLocation}
            returnKeyType="done"
            style={styles.input}
          />
          <Text style={styles.addLabel}>장소 커버 · 선택</Text>
          <View style={styles.coverChoices}>
            {placeCovers.map((preset) => {
              const selected = cover && 'preset' in cover && cover.preset === preset.id;
              return (
                <Pressable
                  key={preset.id}
                  accessibilityRole="button"
                  accessibilityLabel={preset.name + ' 커버'}
                  accessibilityState={{ selected: Boolean(selected) }}
                  disabled={picking || saving}
                  onPress={() => {
                    setCover({ preset: preset.id });
                    setCoverError(undefined);
                  }}
                  style={[styles.coverChoice, selected && styles.selectedCoverChoice]}
                >
                  <Image source={preset.image} style={styles.coverChoiceImage} resizeMode="cover" />
                  <Text style={styles.coverChoiceLabel}>{preset.name}</Text>
                </Pressable>
              );
            })}
          </View>
          {cover && 'photo' in cover && (
            <Image accessible accessibilityLabel="선택한 장소 사진" source={{ uri: cover.photo.uri }} style={styles.coverChoiceImage} />
          )}
          <View style={styles.coverChoices}>
            <Pressable accessibilityRole="button" disabled={picking || saving} onPress={() => chooseCover('camera')} style={styles.action}>
              <Text style={styles.addLabel}>사진 찍기</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={picking || saving} onPress={() => chooseCover('album')} style={styles.action}>
              <Text style={styles.addLabel}>앨범에서 선택</Text>
            </Pressable>
            {cover && (
              <Pressable accessibilityRole="button" disabled={picking || saving} onPress={() => {
                setCover(undefined);
                setCoverError(undefined);
              }} style={styles.action}>
                <Text style={styles.addLabel}>커버 제거</Text>
              </Pressable>
            )}
          </View>
          {coverError && <Text accessibilityRole="alert" style={screenStyles.body}>{coverError}</Text>}
          {saveError && <Text accessibilityRole="alert" style={screenStyles.body}>장소를 저장하지 못했어요. 다시 시도해 주세요.</Text>}
          <View style={styles.formActions}>
            <Pressable accessibilityRole="button" disabled={picking || saving} onPress={resetPlaceForm} style={styles.action}>
              <Text style={styles.addLabel}>취소</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={picking || saving || !newLocation.trim()}
              onPress={saveLocation}
              style={[styles.action, styles.save, (picking || saving || !newLocation.trim()) && styles.disabled]}
            >
              <Text style={styles.saveLabel}>장소 저장</Text>
            </Pressable>
          </View>
        </View>
      )}
      {places === undefined ? (
        <ActivityIndicator accessibilityLabel="보관 장소 불러오는 중" />
      ) : places === null ? (
        <Pressable accessibilityRole="button" onPress={() => {
          setPlaces(undefined);
          setAttempt((previous) => previous + 1);
        }}>
          <Text style={styles.link}>보관 장소 다시 불러오기</Text>
        </Pressable>
      ) : places.length === 0 ? (
        <Text style={screenStyles.body}>아직 등록된 보관 장소가 없어요.</Text>
      ) : (
        <View style={styles.placeList}>
          {places.map((place) => {
            const folders = childFolders.filter((folder) => folder.locationId === place.id);
            const previews = recentItems.filter((item) => item.locationId === place.id);
            const itemCount = previews[0]?.itemCount ?? 0;
            const coverImage = placeCoverImage(place.coverPath);
            return (
              <View key={place.id} style={styles.placeRow} testID="home-place-row">
                {editingId === place.id ? (
                  <View style={styles.placeEditor}>
                    <EditableName
                      id={place.id}
                      name={place.name}
                      inputLabel="새 장소 이름"
                      inputStyle={styles.placeName}
                      persistName={renameFolder}
                      startEditing
                      onCancel={() => setEditingId(undefined)}
                      onSaved={(name) => {
                        setPlaces((previous) => previous && previous.map((entry) =>
                          entry.id === place.id ? { ...entry, name } : entry));
                        setEditingId(undefined);
                      }}
                    />
                  </View>
                ) : (
                  <>
                    <View style={styles.placeMain}>
                      <View style={styles.placeCover} importantForAccessibility="no-hide-descendants">
                        <Image source={coverImage} resizeMode="cover" style={styles.coverImage} />
                      </View>
                      <View style={styles.placeContent}>
                      <View style={previews.length ? styles.placeDetailsWithPreviews : styles.placeDetails}>
                          <Link href={{ pathname: '/storage', params: { locationId: place.id } }} style={styles.placeName} numberOfLines={2}>
                            {place.name}
                          </Link>
                          {itemCount > 0 && <Text style={styles.placeCount}>물건 {itemCount}개</Text>}
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={place.name + ' 이름 변경'}
                            disabled={newLocation !== undefined || Boolean(editingPlace)}
                            onPress={() => setEditingId(place.id)}
                            style={styles.editPlace}
                          >
                            <Text style={styles.editIcon}>✎</Text>
                          </Pressable>
                        </View>
                        <RecentPreviews items={previews} />
                        <Link href={{ pathname: '/storage', params: { locationId: place.id } }} asChild>
                          <Pressable accessibilityRole="link" accessibilityLabel={place.name + ' 열기'} style={styles.arrowButton}>
                            <Text style={styles.placeArrow}>›</Text>
                          </Pressable>
                        </Link>
                      </View>
                    </View>
                    {folders.length > 0 && (
                      <View style={styles.folderSummary}>
                        <Text numberOfLines={1} style={styles.folderNames}>
                          {folders.slice(0, 3).map((folder) => folder.name).join('  ·  ')}
                          {folders.length > 3 ? `  +${folders.length - 3}` : ''}
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function RecentPreviews({ items }: { items: Awaited<ReturnType<typeof listRecentItemsByLocation>> }) {
  if (items.length === 0) return null;
  const extra = items[0].itemCount - items.length;
  return (
    <View style={styles.previews}>
      {items.map((item, index) => (
        <View key={item.id} style={styles.previewSlot}>
          <Link href={{ pathname: '/item/[id]', params: { id: item.id } }} asChild>
            <Pressable accessibilityRole="link" accessibilityLabel={item.name} style={styles.previewItem}>
              <View style={styles.previewMedia}>
                {item.photoPath ? (
                  <Image source={{ uri: itemPhotoUri(item.photoPath) }} resizeMode="cover" style={styles.previewPhoto} />
                ) : (
                  <Text importantForAccessibility="no">📦</Text>
                )}
                {extra > 0 && index === items.length - 1 && (
                  <View style={styles.extraPreview}>
                    <Text numberOfLines={1} style={styles.extraLabel}>+{extra}</Text>
                  </View>
                )}
              </View>
              <Text numberOfLines={1} style={styles.previewName}>{item.name}</Text>
            </Pressable>
          </Link>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 23,
    paddingTop: 14,
    paddingBottom: 32,
  },
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, marginBottom: 16 },
  heading: { color: '#242422', fontSize: 24, fontWeight: '800', letterSpacing: -0.6 },
  logo: { width: 34, height: 36 },
  askEntry: { backgroundColor: '#FFEBAA', borderRadius: 22, overflow: 'hidden' },
  askLayout: { minHeight: 104, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10 },
  momImage: { width: 72, height: 94, alignSelf: 'flex-end' },
  askCopy: { flex: 1, minWidth: 0, paddingVertical: 12 },
  askMessage: { color: '#242422', fontSize: 15, lineHeight: 21, fontWeight: '800', letterSpacing: -0.4 },
  askButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, minHeight: 36, minWidth: 36, paddingHorizontal: 8, borderRadius: 20, backgroundColor: '#262522' },
  askLabel: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', letterSpacing: -0.2 },
  askArrow: { color: '#FFFFFF', fontSize: 16, lineHeight: 20 },
  places: {
    marginTop: 24,
    gap: 12,
  },
  placeList: { gap: 10 },
  placeRow: {
    minHeight: 74,
    gap: 7,
    padding: 10,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#DEE7DE',
  },
  placeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  placeMain: { flexDirection: 'row', alignItems: 'center', gap: placeMainGap },
  placeCover: {
    width: placeCoverSize, height: placeCoverSize, flexShrink: 0, borderRadius: 12,
    backgroundColor: '#E4EDE2', overflow: 'hidden',
  },
  coverImage: { width: '100%', height: '100%' },
  placeContent: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 },
  placeDetails: { flex: 1, minWidth: 0 },
  placeDetailsWithPreviews: { width: 60, flexShrink: 1, minWidth: 40 },
  placeCount: { color: colors.muted, fontSize: 10, marginTop: 2 },
  editPlace: { alignSelf: 'flex-start', minWidth: 36, minHeight: 28, justifyContent: 'center' },
  editIcon: { color: '#698276', fontSize: 15 },
  placeEditor: { minWidth: 0, paddingHorizontal: 3 },
  placeName: {
    color: '#263B36',
    fontSize: 15,
    fontWeight: '700',
  },
  placeArrow: { color: '#2D6654', fontSize: 20 },
  arrowButton: { width: 24, flexShrink: 0, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  previews: { flex: 1, minWidth: 0, flexDirection: 'row', justifyContent: 'flex-end', gap: 4 },
  previewSlot: { flex: 1, minWidth: 0, maxWidth: 44, overflow: 'hidden' },
  previewItem: { gap: 4 },
  previewMedia: { height: 38, borderRadius: 7, backgroundColor: '#EAF2EA', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  previewPhoto: { width: '100%', height: '100%' },
  previewName: { width: '100%', textAlign: 'center', color: colors.muted, fontSize: 11 },
  extraPreview: { position: 'absolute', right: 2, bottom: 2, maxWidth: '95%', paddingHorizontal: 3, borderRadius: 5, backgroundColor: '#35483E' },
  extraLabel: { color: colors.surface, fontSize: 10, fontWeight: '700' },
  folderSummary: { marginLeft: placeCoverSize + placeMainGap, borderRadius: 7, backgroundColor: '#EEF3EB', paddingHorizontal: 8, paddingVertical: 5 },
  folderNames: { color: '#486454', fontSize: 11 },
  sectionTitle: {
    color: '#263B36',
    fontSize: 16,
    fontWeight: '800',
  },
  link: {
    color: '#2D6654',
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: 14,
  },
  addLabel: { color: '#2D6654', fontSize: 14, fontWeight: '700' },
  form: { gap: 8, padding: 14, backgroundColor: '#EAF2EA', borderRadius: 14 },
  coverChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  coverChoice: { alignItems: 'center', gap: 4, padding: 5, borderWidth: 1, borderColor: 'transparent', borderRadius: 10 },
  selectedCoverChoice: { backgroundColor: colors.surface, borderColor: '#2D6654' },
  coverChoiceImage: { width: 48, height: 48, borderRadius: 8 },
  coverChoiceLabel: { color: colors.muted, fontSize: 11 },
  input: { minHeight: 44, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.surface, color: colors.text, fontSize: 16 },
  formActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 10 },
  save: { backgroundColor: '#2D6654' },
  disabled: { opacity: 0.5 },
  saveLabel: { color: colors.surface, fontWeight: '700' },
});
