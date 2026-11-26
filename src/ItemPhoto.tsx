import { useRef, useState } from 'react';
import { Animated, Easing, Image, Modal, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { attachItemPhoto, removeItemPhoto, replaceItemPhoto } from './db/items';
import DeleteConfirmation from './DeleteConfirmation';
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
  onCancel?: () => void;
  disabled: boolean;
};
type PhotoSource = 'camera' | 'album';

export default function ItemPhoto(props: PhotoProps) {
  const { height: windowHeight } = useWindowDimensions();
  const [sheetOffset] = useState(() => new Animated.Value(windowHeight));
  const sheetHeight = useRef(0);
  const [preview, setPreview] = useState<SelectedPhoto>();
  const [showSources, setShowSources] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [failedUri, setFailedUri] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const pending = useRef(false);
  const replacementSource = useRef<PhotoSource | undefined>(undefined);
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

  function choose(source: PhotoSource) {
    return runPhotoAction(async () => setPhoto(await pickItemPhoto(source)));
  }

  function selectReplacement(source: PhotoSource) {
    if (replacementSource.current || pending.current) return;
    setShowSources(false);
    if (Platform.OS === 'ios') {
      // Present the picker once the sheet's native dismissal finishes.
      replacementSource.current = source;
    } else {
      return choose(source);
    }
  }

  function openSelectedSource() {
    const source = replacementSource.current;
    replacementSource.current = undefined;
    if (source) return choose(source);
  }

  function animateSheetIn() {
    sheetOffset.setValue(sheetHeight.current || windowHeight);
    Animated.timing(sheetOffset, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }

  function cancelDelete() {
    if (pending.current) return;
    setConfirmDelete(false);
    setError(undefined);
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
    <View style={styles.photoPanel}>
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
      ) : !previousPath ? (
        <>
          <View style={styles.photoHeader}>
            <Text accessibilityRole="header" style={styles.label}>사진 추가</Text>
            {draft?.onCancel && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="사진 추가 취소"
                disabled={disabled}
                onPress={draft.onCancel}
                style={({ pressed }) => [styles.closePhoto, (disabled || pressed) && styles.dimmed]}
              >
                <Text style={styles.cancelIcon}>×</Text>
              </Pressable>
            )}
          </View>
          <PhotoChoices disabled={disabled} onChoose={choose} />
        </>
      ) : (
        <View style={styles.photoActions}>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => {
            if (replacementSource.current) return;
            setError(undefined);
            sheetOffset.setValue(windowHeight);
            setShowSources(true);
          }} style={styles.changePhoto}>
            <Text style={styles.choiceLabel}>사진 바꾸기</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => {
            if (replacementSource.current) return;
            setError(undefined);
            setConfirmDelete(true);
          }} style={styles.changePhoto}>
            <Text style={styles.deleteLabel}>사진 삭제</Text>
          </Pressable>
        </View>
      )}
      {error && !confirmDelete && <Text accessibilityRole="alert" style={screenStyles.body}>{error}</Text>}
      {previousPath && (
        <>
          <Modal
            testID="photo-replacement-sheet"
            visible={showSources}
            transparent
            animationType="none"
            onShow={animateSheetIn}
            onRequestClose={() => setShowSources(false)}
            onDismiss={openSelectedSource}
          >
            <View style={styles.sheetOverlay}>
              <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={() => setShowSources(false)} />
              <Animated.View
                onLayout={(event) => { sheetHeight.current = event.nativeEvent.layout.height; }}
                style={{ transform: [{ translateY: sheetOffset }] }}
              >
                <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.sheet} accessibilityViewIsModal>
                  <View style={styles.sheetContent}>
                    <Text accessibilityRole="header" style={styles.dialogTitle}>사진 바꾸기</Text>
                    <PhotoChoices disabled={!showSources || busy} onChoose={selectReplacement} />
                    <Pressable accessibilityRole="button" onPress={() => setShowSources(false)} style={styles.dialogButton}>
                      <Text style={styles.sourceLabel}>취소</Text>
                    </Pressable>
                  </View>
                </SafeAreaView>
              </Animated.View>
            </View>
          </Modal>
          <DeleteConfirmation
            visible={confirmDelete}
            title="사진을 삭제할까요?"
            message="첨부 사진만 삭제돼요."
            confirmLabel="사진 삭제 확인"
            busy={busy}
            error={error}
            onCancel={cancelDelete}
            onConfirm={deletePhoto}
          />
        </>
      )}
    </View>
  );
}

function PhotoChoices({ disabled, onChoose }: {
  disabled?: boolean;
  onChoose: (source: PhotoSource) => void;
}) {
  return (
    <View style={styles.photoChoices}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={() => onChoose('camera')}
        style={({ pressed }) => [styles.choice, (disabled || pressed) && styles.dimmed]}
      >
        <PhotoSourceIcon source="camera" />
        <Text style={styles.sourceLabel}>사진 찍기</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="앨범에서 사진 추가"
        disabled={disabled}
        onPress={() => onChoose('album')}
        style={({ pressed }) => [styles.choice, (disabled || pressed) && styles.dimmed]}
      >
        <PhotoSourceIcon source="album" />
        <Text style={styles.sourceLabel}>앨범에서 선택</Text>
      </Pressable>
    </View>
  );
}

function PhotoSourceIcon({ source }: { source: PhotoSource }) {
  return (
    <View style={styles.iconBadge} importantForAccessibility="no-hide-descendants">
      <View style={styles.sourceIcon}>
        {source === 'camera' ? (
          <>
            <View style={styles.cameraTop} />
            <View style={styles.cameraBody}>
              <View style={styles.cameraLens} />
            </View>
          </>
        ) : (
          <View style={styles.albumFrame}>
            <View style={styles.albumSun} />
            <View style={styles.albumMountain} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: 16, backgroundColor: colors.surface },
  placeholder: { padding: 20, borderRadius: 16, backgroundColor: colors.surface },
  photoPanel: { gap: 10, padding: 14, borderRadius: 16, backgroundColor: '#FFF8E9' },
  photoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  closePhoto: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  photoChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    flexGrow: 1,
    flexBasis: 108,
    backgroundColor: '#FFFCF5',
    borderColor: '#EDE1C8',
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  sourceLabel: { color: colors.text, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  iconBadge: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFEBAA', alignItems: 'center', justifyContent: 'center' },
  sourceIcon: { width: 22, height: 22 },
  cameraTop: { position: 'absolute', top: 2, left: 7, width: 8, height: 5, borderWidth: 1.5, borderColor: colors.text, borderRadius: 2 },
  cameraBody: {
    position: 'absolute', top: 5, left: 1, width: 20, height: 15, borderWidth: 1.5,
    borderColor: colors.text, borderRadius: 4, backgroundColor: '#FFEBAA', alignItems: 'center', justifyContent: 'center',
  },
  cameraLens: { width: 7, height: 7, borderRadius: 4, borderWidth: 1.5, borderColor: colors.text },
  albumFrame: {
    position: 'absolute', top: 3, left: 1, width: 20, height: 16,
    borderWidth: 1.5, borderColor: colors.text, borderRadius: 3, overflow: 'hidden',
  },
  albumSun: { position: 'absolute', top: 2, right: 2, width: 3, height: 3, borderRadius: 2, backgroundColor: colors.text },
  albumMountain: {
    position: 'absolute', top: 7, left: 2, width: 11, height: 11, borderTopWidth: 1.5,
    borderLeftWidth: 1.5, borderColor: colors.text, transform: [{ rotate: '45deg' }],
  },
  choiceLabel: { color: '#2D6654', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  changePhoto: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 },
  photoActions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 4 },
  sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#241A165C' },
  sheet: { backgroundColor: '#FFF8E9', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetContent: { width: '100%', maxWidth: 480, alignSelf: 'center', padding: 20, gap: 12 },
  dialogTitle: { color: colors.text, fontSize: 19, fontWeight: '700' },
  dialogButton: { minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 12, paddingHorizontal: 16 },
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
