import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { NameInput } from '../../src/EditableName';
import ItemLocation from '../../src/ItemLocation';
import ItemNote from '../../src/ItemNote';
import ItemPhoto from '../../src/ItemPhoto';
import ItemScreenScroll from '../../src/ItemScreenScroll';
import { getFolderPath } from '../../src/db/folders';
import { createItem } from '../../src/db/items';
import type { SelectedPhoto } from '../../src/itemPhotoFiles';
import { colors, screenStyles } from '../../src/theme';

type FolderPath = Awaited<ReturnType<typeof getFolderPath>>;

export default function NewItemScreen() {
  const { folderId } = useLocalSearchParams<{ folderId?: string }>();
  return <NewItem key={folderId} folderId={folderId} />;
}

function NewItem({ folderId }: { folderId?: string }) {
  const router = useRouter();
  const navigation = useNavigation();
  const [origin, setOrigin] = useState<FolderPath | null>();
  const [path, setPath] = useState<FolderPath>([]);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<SelectedPhoto>();
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const pending = useRef(false);
  const pickingPhoto = useRef(false);
  const destination = path.at(-1);
  const saveDisabled = picking || saving || !name.trim();

  useEffect(() => {
    if (!folderId) {
      setOrigin([]);
      return;
    }
    let active = true;
    getFolderPath(folderId).then(
      (folders) => {
        if (!active) return;
        setOrigin(folders);
        setPath(folders);
      },
      () => { if (active) setOrigin(null); },
    );
    return () => { active = false; };
  }, [folderId]);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed || !destination || pending.current || pickingPhoto.current) return;
    pending.current = true;
    setSaving(true);
    setSaveError(false);
    try {
      await createItem(destination.id, trimmed, { photo, note });
    } catch {
      pending.current = false;
      setSaving(false);
      setSaveError(true);
      return;
    }
    if (!navigation.isFocused()) {
      setName('');
      setNote('');
      setPhoto(undefined);
      setPath(origin ?? []);
      pending.current = false;
      setSaving(false);
      return;
    }
    if (router.canGoBack()) router.back();
    else if (origin && origin.length > 1 && folderId) {
      router.replace({ pathname: '/folder/[id]', params: { id: folderId } });
    } else {
      router.replace({ pathname: '/storage', params: folderId ? { locationId: folderId } : {} });
    }
  }

  return (
    <ItemScreenScroll>
      {origin === undefined ? (
        <ActivityIndicator accessibilityLabel="보관 위치 불러오는 중" />
      ) : !destination ? (
        <Text accessibilityRole="alert" style={screenStyles.body}>
          {origin === null ? '보관 위치를 불러오지 못했어요.' : '보관 위치를 찾을 수 없어요.'}
        </Text>
      ) : (
        <>
          <NameInput
            accessibilityLabel="물건 이름"
            placeholder="물건 이름"
            placeholderTextColor={colors.muted}
            value={name}
            editable={!saving}
            onChangeText={setName}
            returnKeyType="done"
          />
          <ItemPhoto
            photo={photo}
            onChange={setPhoto}
            disabled={saving}
            onPickingChange={(active) => {
              pickingPhoto.current = active;
              setPicking(active);
            }}
          />
          <ItemLocation folderId={destination.id} path={path} onMoved={(_folder, nextPath) => setPath(nextPath)} disabled={saving} />
          <ItemNote note={note} onChange={setNote} disabled={saving} />
          {saveError && <Text accessibilityRole="alert" style={screenStyles.body}>물건을 저장하지 못했어요. 다시 시도해 주세요.</Text>}
          <Pressable
            accessibilityRole="button"
            disabled={saveDisabled}
            onPress={save}
            style={({ pressed }) => [styles.save, pressed && styles.savePressed, saveDisabled && styles.saveDisabled]}
          >
            <Text style={[styles.saveLabel, saveDisabled && styles.saveLabelDisabled]}>{saving ? '저장 중' : '물건 저장'}</Text>
          </Pressable>
        </>
      )}
    </ItemScreenScroll>
  );
}

const styles = StyleSheet.create({
  save: {
    minHeight: 50, borderRadius: 16, backgroundColor: '#FFEBAA',
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 10,
  },
  savePressed: { backgroundColor: '#F6DB86' },
  saveDisabled: { backgroundColor: '#F0EAE1' },
  saveLabel: { color: colors.text, fontSize: 16, fontWeight: '700' },
  saveLabelDisabled: { color: '#82766C' },
});
