import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NameInput } from './EditableName';
import FormSaveButton from './FormSaveButton';
import ItemPhoto from './ItemPhoto';
import { createChildFolder, getFolderPath } from './db/folders';
import type { SelectedPhoto } from './itemPhotoFiles';
import { colors, screenStyles } from './theme';

type FolderPath = Awaited<ReturnType<typeof getFolderPath>>;

export default function NewFolderSheet({ parentId, onClose, onSaved }: {
  parentId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [path, setPath] = useState<FolderPath | null>();
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState<SelectedPhoto>();
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const pending = useRef(false);
  const pickingPhoto = useRef(false);
  const parent = path?.at(-1);

  useEffect(() => {
    let active = true;
    getFolderPath(parentId).then(
      (folders) => { if (active) setPath(folders); },
      () => { if (active) setPath(null); },
    );
    return () => { active = false; };
  }, [parentId]);

  async function save() {
    const trimmed = name.trim();
    if (!trimmed || !parent || pending.current || pickingPhoto.current) return;
    pending.current = true;
    setSaving(true);
    setSaveError(false);
    try {
      if (photo) await createChildFolder(parent.id, trimmed, photo);
      else await createChildFolder(parent.id, trimmed);
    } catch {
      pending.current = false;
      setSaving(false);
      setSaveError(true);
      return;
    }

    Keyboard.dismiss();
    onSaved();
  }

  function close() {
    if (pending.current || pickingPhoto.current) return;
    Keyboard.dismiss();
    onClose();
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable accessible={false} disabled={saving || picking} style={StyleSheet.absoluteFill} onPress={close} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
          style={styles.sheetPosition}
        >
          <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.sheet} accessibilityViewIsModal>
            <View style={styles.header}>
              <Text accessibilityRole="header" style={styles.title}>보관 위치 추가</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="보관 위치 추가 닫기" disabled={saving || picking} onPress={close} style={styles.close}>
                <Text style={styles.closeIcon}>×</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.body} contentContainerStyle={styles.fields} keyboardShouldPersistTaps="handled">
              {path === undefined ? (
                <ActivityIndicator accessibilityLabel="상위 위치 불러오는 중" />
              ) : !path?.length ? (
                <Text accessibilityRole="alert" style={screenStyles.body}>
                  {path === null ? '상위 위치를 불러오지 못했어요.' : '상위 위치를 찾을 수 없어요.'}
                </Text>
              ) : (
                <>
                  <Text style={styles.parent}>{path.map((folder) => folder.name).join(' › ')} 아래에 추가</Text>
                  <NameInput
                    accessibilityLabel="보관 위치 이름"
                    placeholder="보관 위치 이름"
                    placeholderTextColor={colors.muted}
                    value={name}
                    editable={!saving}
                    onChangeText={setName}
                    onSubmitEditing={save}
                    returnKeyType="done"
                    style={styles.nameInput}
                  />
                  {showPhotoOptions ? (
                    <ItemPhoto
                      photo={photo}
                      onChange={setPhoto}
                      onCancel={() => setShowPhotoOptions(false)}
                      disabled={saving}
                      onPickingChange={(active) => {
                        pickingPhoto.current = active;
                        setPicking(active);
                      }}
                    />
                  ) : (
                    <Pressable accessibilityRole="button" accessibilityLabel="사진 추가" onPress={() => {
                      Keyboard.dismiss();
                      setShowPhotoOptions(true);
                    }} style={styles.addPhoto}>
                      <Text style={styles.addPhotoLabel}>＋ 사진 추가</Text>
                    </Pressable>
                  )}
                  {saveError && <Text accessibilityRole="alert" style={screenStyles.body}>보관 위치를 저장하지 못했어요. 다시 시도해 주세요.</Text>}
                </>
              )}
            </ScrollView>
            {parent && (
              <FormSaveButton label="보관 위치 저장" saving={saving} disabled={picking || saving || !name.trim()} onPress={save} />
            )}
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#241A165C' },
  sheetPosition: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '84%', backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, gap: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { color: colors.text, fontSize: 19, fontWeight: '700', flexShrink: 1 },
  close: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  closeIcon: { color: colors.muted, fontSize: 24 },
  body: { flexGrow: 0, flexShrink: 1 },
  fields: { gap: 8 },
  parent: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  nameInput: { fontSize: 17, fontWeight: '600', borderBottomColor: '#D9CBB8' },
  addPhoto: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  addPhotoLabel: { color: '#69511B', fontSize: 14, fontWeight: '700' },
});
