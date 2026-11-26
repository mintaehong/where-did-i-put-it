import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, screenStyles } from './theme';

export default function DeleteConfirmation({ visible, title, message, confirmLabel, confirmText = '삭제', busy, error, onCancel, onConfirm }: {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  confirmText?: string;
  busy: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Pressable accessible={false} disabled={busy} style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={styles.dialog} accessibilityViewIsModal>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          {message && <Text style={screenStyles.body}>{message}</Text>}
          {error && <Text accessibilityRole="alert" style={screenStyles.body}>{error}</Text>}
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" disabled={busy} onPress={onCancel} style={styles.button}>
              <Text style={styles.cancelLabel}>취소</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}
              accessibilityState={{ busy }}
              disabled={busy}
              onPress={onConfirm}
              style={[styles.button, styles.deleteButton, busy && styles.dimmed]}
            >
              <Text style={styles.deleteLabel}>{busy ? '삭제 중' : confirmText}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#241A165C', padding: 24 },
  dialog: { backgroundColor: colors.surface, width: '100%', maxWidth: 380, borderRadius: 20, padding: 20, gap: 8 },
  title: { color: colors.text, fontSize: 19, fontWeight: '700' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 4 },
  button: { minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 12, paddingHorizontal: 16 },
  cancelLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  deleteButton: { backgroundColor: colors.accent },
  deleteLabel: { color: colors.surface, fontSize: 14, fontWeight: '700' },
  dimmed: { opacity: 0.5 },
});
