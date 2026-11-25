import { useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { attachItemPhoto, removeItemPhoto, replaceItemPhoto } from './db/items';
import { itemPhotoUri, type SelectedPhoto } from './itemPhotoFiles';
import { pickItemPhoto } from './pickItemPhoto';
import { colors, screenStyles } from './theme';

type PhotoProps = {
  itemId: string;
  itemName: string;
  previousPath: string | null;
  onSaved: (path: string | null) => void;
} | {
  photo?: SelectedPhoto;
  onChange: (photo?: SelectedPhoto) => void;
  onPickingChange: (picking: boolean) => void;
  disabled: boolean;
};

export default function ItemPhoto(props: PhotoProps) {
  const [preview, setPreview] = useState<SelectedPhoto>();
  const [showSources, setShowSources] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [failedUri, setFailedUri] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const pending = useRef(false);
  const detail = 'itemId' in props ? props : undefined;
  const draft = 'onChange' in props ? props : undefined;
  const photo = detail ? preview : draft?.photo;
  const setPhoto = draft?.onChange ?? setPreview;
  const previousPath = detail?.previousPath;
  const disabled = busy || draft?.disabled;
  const existingUri = previousPath ? itemPhotoUri(previousPath) : undefined;
  const displayedUri = photo?.uri ?? existingUri;

  async function runPhotoAction(action: () => Promise<void>, errorMessage?: string) {
    if (pending.current || draft?.disabled) return;
    pending.current = true;
    setBusy(true);
    draft?.onPickingChange(true);
    setError(undefined);
    try {
      await action();
    } catch (failure) {
      setError(errorMessage ?? (failure instanceof Error ? failure.message : '사진을 열지 못했어요.'));
    } finally {
      pending.current = false;
      setBusy(false);
      draft?.onPickingChange(false);
    }
  }

  function choose(source: 'camera' | 'album') {
    return runPhotoAction(async () => setPhoto(await pickItemPhoto(source)));
  }

  function deletePhoto() {
    if (!detail || !previousPath) return;
    return runPhotoAction(async () => {
      await removeItemPhoto(detail.itemId, previousPath);
      setConfirmDelete(false);
      detail.onSaved(null);
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
            accessibilityLabel={photo ? '선택한 사진' : `${detail?.itemName} 사진`}
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
            {detail && <Pressable
              accessibilityRole="button"
              accessibilityLabel="사진 저장"
              disabled={busy || displayedUri === failedUri}
              onPress={() => runPhotoAction(async () => {
                const path = previousPath
                  ? await replaceItemPhoto(detail.itemId, previousPath, photo)
                  : await attachItemPhoto(detail.itemId, photo);
                detail.onSaved(path);
                setPhoto(undefined);
                setShowSources(false);
              }, '사진을 저장하지 못했어요. 다시 시도해 주세요.')}
              style={({ pressed }) => [
                styles.iconButton, styles.saveButton, (busy || pressed || displayedUri === failedUri) && styles.dimmed,
              ]}
            >
              <Text style={styles.saveIcon}>✓</Text>
            </Pressable>}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={detail ? '사진 선택 취소' : '사진 제거'}
              disabled={disabled}
              onPress={() => {
                setPhoto(undefined);
                setError(undefined);
                setShowSources(false);
              }}
              style={({ pressed }) => [styles.iconButton, styles.cancelButton, (disabled || pressed) && styles.dimmed]}
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
              disabled={disabled}
              onPress={() => choose('camera')}
              style={({ pressed }) => [styles.choice, (disabled || pressed) && styles.dimmed]}
            >
              <Text style={styles.choiceLabel}>사진 찍기</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="앨범에서 사진 추가"
              disabled={disabled}
              onPress={() => choose('album')}
              style={({ pressed }) => [styles.choice, (disabled || pressed) && styles.dimmed]}
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
  label: { color: colors.text, fontSize: 16, fontWeight: '700' },
});
