import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import EditableName from '../src/EditableName';
import { createRootFolder, listRootFolders, renameFolder } from '../src/db/folders';
import { listRecentItems } from '../src/db/items';
import { ItemCollection } from '../src/FolderItems';
import ItemSearch from '../src/ItemSearch';
import { colors, screenStyles } from '../src/theme';

export default function HomeScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={styles.heading}>
        {'어디에 뒀더라? 👋\n엄마가 기억해 줄게.'}
      </Text>
      <Text style={styles.description}>소중한 물건들, 여기 차곡차곡 모아두자.</Text>
      <ItemSearch mode="question" />
      <HomePlaces />
      <RecentItems />
    </ScrollView>
  );
}

function RecentItems() {
  const [items, setItems] = useState<Awaited<ReturnType<typeof listRecentItems>> | null>();
  const [attempt, setAttempt] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    listRecentItems().then(
      (rows) => { if (active) setItems(rows); },
      () => { if (active) setItems(null); },
    );
    return () => { active = false; };
  }, [attempt]));

  if (items === undefined || items?.length === 0) return null;

  return (
    <View style={styles.places}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>최근 추가한 물건</Text>
      {items === null ? (
        <Pressable accessibilityRole="button" onPress={() => setAttempt((value) => value + 1)}>
          <Text style={styles.link}>최근 물건 다시 불러오기</Text>
        </Pressable>
      ) : (
        <ItemCollection items={items} isList={false} />
      )}
    </View>
  );
}

function HomePlaces() {
  const [places, setPlaces] = useState<Awaited<ReturnType<typeof listRootFolders>> | null>();
  const [attempt, setAttempt] = useState(0);
  const [newLocation, setNewLocation] = useState<string>();
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
    return () => { active = false; };
  }, [attempt]));

  async function saveLocation() {
    const name = newLocation?.trim();
    if (!name || pending.current) return;
    pending.current = true;
    setSaving(true);
    setSaveError(false);
    try {
      const folder = await createRootFolder(name);
      setPlaces((previous) => [...(previous ?? []), folder]);
      setNewLocation(undefined);
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
          {saveError && <Text accessibilityRole="alert" style={screenStyles.body}>장소를 저장하지 못했어요. 다시 시도해 주세요.</Text>}
          <View style={styles.formActions}>
            <Pressable accessibilityRole="button" disabled={saving} onPress={() => {
              setNewLocation(undefined);
              setSaveError(false);
            }} style={styles.action}>
              <Text style={styles.addLabel}>취소</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={saving || !newLocation.trim()}
              onPress={saveLocation}
              style={[styles.action, styles.save, (saving || !newLocation.trim()) && styles.disabled]}
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
          {places.map((place) => (
            <View key={place.id} style={styles.placeRow}>
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
                  <Link href={{ pathname: '/storage', params: { locationId: place.id } }} asChild>
                    <Pressable
                      accessibilityRole="link"
                      accessibilityLabel={place.name}
                      style={({ pressed }) => [styles.placeLink, pressed && styles.placePressed]}
                    >
                      <Text numberOfLines={1} style={[styles.placeName, styles.centeredPlaceName]}>{place.name}</Text>
                      <Text importantForAccessibility="no" style={styles.placeArrow}>›</Text>
                    </Pressable>
                  </Link>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={place.name + ' 이름 변경'}
                    disabled={newLocation !== undefined || Boolean(editingPlace)}
                    onPress={() => setEditingId(place.id)}
                    style={({ pressed }) => [styles.editPlace, pressed && styles.placePressed]}
                  >
                    <Text style={styles.editIcon}>✎</Text>
                  </Pressable>
                </>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#FAF8F3',
  },
  content: {
    paddingHorizontal: 23,
    paddingTop: 20,
    paddingBottom: 32,
  },
  heading: {
    color: '#263B36',
    fontSize: 28,
    lineHeight: 38,
    fontWeight: '900',
    letterSpacing: -1,
  },
  description: {
    color: '#556C62',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 9,
    marginBottom: 24,
  },
  places: {
    marginTop: 24,
    gap: 12,
  },
  placeList: { gap: 8 },
  placeRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#DEE7DE',
  },
  placeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  placeLink: { flex: 1, minWidth: 0, justifyContent: 'center', minHeight: 54, paddingLeft: 70, paddingRight: 26 },
  editPlace: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#EAF0EA' },
  editIcon: { color: '#486B5A', fontSize: 19 },
  placeEditor: { flex: 1, minWidth: 0, paddingHorizontal: 10, paddingVertical: 5 },
  placePressed: { backgroundColor: '#EDF4ED' },
  placeName: {
    flex: 1,
    color: '#263B36',
    fontSize: 16,
    fontWeight: '700',
  },
  centeredPlaceName: { flex: 0, textAlign: 'center' },
  placeArrow: { position: 'absolute', right: 12, color: '#2D6654', fontSize: 20 },
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
  input: { minHeight: 44, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.surface, color: colors.text, fontSize: 16 },
  formActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8 },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 10 },
  save: { backgroundColor: '#2D6654' },
  disabled: { opacity: 0.5 },
  saveLabel: { color: colors.surface, fontWeight: '700' },
});
