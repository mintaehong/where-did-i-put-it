import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NameInput } from './EditableName';
import FormSaveButton from './FormSaveButton';
import { pickItemPhoto } from './pickItemPhoto';
import { createChildFolder, getFolderPath, updateChildFolderCover } from './db/folders';
import { itemPhotoUri } from './itemPhotoFiles';
import { storageIconForCover, storageIcons, type FolderCover } from './placeCovers';
import StorageIconView from './StorageIconView';
import { colors, screenStyles } from './theme';

type FolderPath = Awaited<ReturnType<typeof getFolderPath>>;

type SheetProps = {
  onClose: () => void;
} & (
  | { parentId: string; onSaved: () => void }
  | { folderId: string; coverPath?: string | null; onSaved: (coverPath: string) => void }
);

export default function FolderCoverSheet(props: SheetProps) {
  const { onClose } = props;
  const parentId = 'parentId' in props ? props.parentId : undefined;
  const editing = 'folderId' in props;
  const initialPath = editing ? props.coverPath : undefined;
  const [path, setPath] = useState<FolderPath | null>();
  const [name, setName] = useState('');
  const [cover, setCover] = useState<FolderCover>();
  const [showPhotoSources, setShowPhotoSources] = useState(false);
  const [photoError, setPhotoError] = useState<string>();
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const pending = useRef(false);
  const pickingPhoto = useRef(false);
  const parent = path?.at(-1);
  const initialPhoto = initialPath?.startsWith('place-covers/') ? itemPhotoUri(initialPath) : undefined;
  const initialIcon = editing && !initialPhoto ? storageIconForCover(initialPath) : undefined;
  const selectedIcon = cover ? ('icon' in cover ? cover.icon : undefined) : initialIcon;
  const photoUri = cover ? ('photo' in cover ? cover.photo.uri : undefined) : initialPhoto;
  const unchangedIcon = cover && 'icon' in cover && initialPath === `icon:${cover.icon}`;
  const saveDisabled = picking || saving || !cover || Boolean(unchangedIcon) || (!editing && (!parent || !name.trim()));
  const title = editing ? '대표 이미지 변경' : '공간 추가';

  useEffect(() => {
    if (!parentId) return;
    let active = true;
    getFolderPath(parentId).then(
      (folders) => { if (active) setPath(folders); },
      () => { if (active) setPath(null); },
    );
    return () => { active = false; };
  }, [parentId]);

  async function save() {
    const trimmed = name.trim();
    if (saveDisabled || !cover || pending.current || pickingPhoto.current) return;
    pending.current = true;
    setSaving(true);
    setSaveError(false);
    let coverPath: string | undefined;
    try {
      if ('folderId' in props) coverPath = await updateChildFolderCover(props.folderId, cover);
      else if (parent) await createChildFolder(parent.id, trimmed, cover);
    } catch {
      pending.current = false;
      setSaving(false);
      setSaveError(true);
      return;
    }

    Keyboard.dismiss();
    if ('folderId' in props && coverPath) props.onSaved(coverPath);
    else if ('parentId' in props) props.onSaved();
  }

  function close() {
    if (pending.current || pickingPhoto.current) return;
    Keyboard.dismiss();
    onClose();
  }

  async function choosePhoto(source: 'camera' | 'album') {
    if (pending.current || pickingPhoto.current) return;
    setShowPhotoSources(false);
    setPhotoError(undefined);
    pickingPhoto.current = true;
    setPicking(true);
    try {
      const selected = await pickItemPhoto(source);
      if (selected) setCover({ photo: selected });
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : '사진을 열지 못했어요.');
    } finally {
      pickingPhoto.current = false;
      setPicking(false);
    }
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={showPhotoSources ? () => setShowPhotoSources(false) : close}>
      <View style={styles.overlay}>
        <Pressable accessible={false} disabled={saving || picking} style={StyleSheet.absoluteFill} onPress={close} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
          style={styles.sheetPosition}
        >
          <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.sheet} accessibilityViewIsModal>
            <View style={styles.header}>
              <Text accessibilityRole="header" style={styles.title}>{title}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`${title} 닫기`} disabled={saving || picking} onPress={close} style={styles.close}>
                <Text style={styles.closeIcon}>×</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.body} contentContainerStyle={styles.fields} keyboardShouldPersistTaps="handled">
              {!editing && path === undefined ? (
                <ActivityIndicator accessibilityLabel="상위 위치 불러오는 중" />
              ) : !editing && !path?.length ? (
                <Text accessibilityRole="alert" style={screenStyles.body}>
                  {path === null ? '상위 위치를 불러오지 못했어요.' : '상위 위치를 찾을 수 없어요.'}
                </Text>
              ) : (
                <>
                  {!editing && <View style={styles.nameField}>
                    <Text style={styles.coverLabel}>공간 이름</Text>
                    <NameInput
                      accessibilityLabel="공간 이름"
                      placeholder="예: 책상 서랍"
                      placeholderTextColor={colors.muted}
                      value={name}
                      editable={!saving}
                      onChangeText={setName}
                      onSubmitEditing={save}
                      returnKeyType="done"
                      style={styles.nameInput}
                    />
                  </View>}
                  <View style={styles.coverHeading}>
                    <Text accessibilityRole="header" style={styles.coverLabel}>대표 이미지</Text>
                    {!editing && <Text style={styles.required}>필수</Text>}
                  </View>
                  <View style={styles.coverChoices}>
                    <View style={styles.icons}>
                      {storageIcons.map(({ id, name: iconName }) => (
                        <Pressable
                          key={id}
                          accessibilityRole="button"
                          accessibilityLabel={iconName}
                          accessibilityState={{ selected: selectedIcon === id }}
                          disabled={saving || picking}
                          onPress={() => {
                            setCover({ icon: id });
                            if (!editing) setName((current) => current.trim() ? current : iconName);
                            setShowPhotoSources(false);
                            setPhotoError(undefined);
                          }}
                          style={[styles.iconOption, selectedIcon === id && styles.selectedIcon]}
                        >
                          <StorageIconView icon={id} />
                          <Text style={styles.iconName}>{iconName}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <View style={[styles.photoRow, photoUri && styles.selectedPhotoRow]}>
                      {photoUri && (
                        <View style={styles.photoSelection}>
                          <Image
                            accessible
                            accessibilityLabel="선택한 사진"
                            source={{ uri: photoUri }}
                            style={styles.photoPreview}
                          />
                          <Text style={styles.photoLabel}>대표 사진</Text>
                        </View>
                      )}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={photoUri ? '대표 사진 바꾸기' : '사진을 대표 이미지로 사용'}
                        accessibilityState={{ expanded: showPhotoSources }}
                        disabled={saving || picking}
                        onPress={() => {
                          Keyboard.dismiss();
                          setShowPhotoSources((open) => !open);
                        }}
                        style={[styles.photoAction, !photoUri && styles.choosePhotoAction]}
                      >
                        <Text style={styles.photoActionLabel}>{photoUri ? '바꾸기' : '＋  사진을 대표 이미지로 사용'}</Text>
                      </Pressable>
                    </View>
                    {showPhotoSources && (
                      <View style={styles.photoMenu}>
                        <Pressable accessibilityRole="button" style={styles.photoOption} onPress={() => choosePhoto('camera')}>
                          <Text style={styles.photoLabel}>사진 찍기</Text>
                        </Pressable>
                        <Pressable accessibilityRole="button" style={styles.photoOption} onPress={() => choosePhoto('album')}>
                          <Text style={styles.photoLabel}>앨범에서 선택</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                  {photoError && <Text accessibilityRole="alert" style={screenStyles.body}>{photoError}</Text>}
                  {saveError && <Text accessibilityRole="alert" style={screenStyles.body}>
                    {editing ? '대표 이미지를 저장하지 못했어요.' : '보관 위치를 저장하지 못했어요.'} 다시 시도해 주세요.
                  </Text>}
                </>
              )}
            </ScrollView>
            {(editing || parent) && (
              <FormSaveButton label={editing ? '대표 이미지 저장' : '공간 저장'} saving={saving} disabled={saveDisabled} onPress={save} />
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
  nameField: { gap: 6, marginTop: 2 },
  nameInput: {
    minHeight: 46, borderRadius: 12, backgroundColor: '#FBF8F2',
    borderWidth: 1, borderColor: colors.border, borderBottomColor: colors.border,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, fontWeight: '500',
  },
  coverHeading: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  coverLabel: { color: colors.text, fontSize: 15, fontWeight: '700' },
  required: { color: colors.muted, fontSize: 12 },
  coverChoices: { gap: 8 },
  photoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 46,
    borderRadius: 12, borderWidth: 1, borderColor: '#EDE1C8', backgroundColor: '#FFF9ED',
  },
  selectedPhotoRow: { backgroundColor: colors.primarySoft, borderColor: '#A17A22' },
  photoSelection: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 8 },
  photoPreview: { width: 36, height: 36, borderRadius: 8, backgroundColor: colors.primarySoft },
  photoLabel: { color: colors.text, fontSize: 14, flexShrink: 1 },
  photoAction: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  choosePhotoAction: { flex: 1 },
  photoActionLabel: { color: '#69511B', fontSize: 14, fontWeight: '700' },
  photoMenu: {
    position: 'absolute', right: 0, bottom: 46, zIndex: 1, minWidth: 160, maxWidth: '100%', padding: 4,
    borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    elevation: 5, shadowColor: colors.text, shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  photoOption: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 6 },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconOption: {
    flexBasis: '30%', flexGrow: 1, minHeight: 60, alignItems: 'center', justifyContent: 'center',
    padding: 5, gap: 3, backgroundColor: '#FFF9ED', borderRadius: 12, borderWidth: 1, borderColor: '#EDE1C8',
  },
  selectedIcon: { backgroundColor: colors.primary, borderColor: '#A17A22' },
  iconName: { color: colors.text, fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
