import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { saveItemNote } from './db/items';
import { colors, screenStyles } from './theme';

export default function ItemNote({ itemId, note, onSaved }: {
  itemId: string;
  note: string | null;
  onSaved: (note: string | null) => void;
}) {
  const [draft, setDraft] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const pending = useRef(false);
  const changed = draft !== undefined && draft.trim() !== (note ?? '');

  async function save() {
    if (draft === undefined || !changed || pending.current) return;
    pending.current = true;
    setSaving(true);
    setFailed(false);
    try {
      onSaved(await saveItemNote(itemId, draft));
      setDraft(undefined);
    } catch {
      setFailed(true);
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.label}>메모</Text>
        {draft === undefined ? (
          <Pressable accessibilityRole="button" onPress={() => setDraft(note ?? '')} style={styles.action}>
            <Text style={styles.actionText}>{note ? '메모 수정' : '+ 메모 추가'}</Text>
          </Pressable>
        ) : (
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" accessibilityLabel="메모 저장" disabled={saving || !changed} onPress={save}
              style={[styles.icon, styles.save, (saving || !changed) && styles.disabled]}>
              <Text style={styles.saveIcon}>✓</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="메모 편집 취소" disabled={saving} onPress={() => {
              setDraft(undefined);
              setFailed(false);
            }} style={[styles.icon, styles.cancel]}>
              <Text style={styles.cancelIcon}>×</Text>
            </Pressable>
          </View>
        )}
      </View>
      {draft === undefined ? (
        note && <Text style={screenStyles.body}>{note}</Text>
      ) : (
        <TextInput
          accessibilityLabel="메모 내용"
          placeholder="예: 검은 파우치 안에 넣어 둠"
          placeholderTextColor={colors.muted}
          autoFocus
          multiline
          editable={!saving}
          value={draft}
          onChangeText={setDraft}
          style={styles.input}
        />
      )}
      {failed && <Text accessibilityRole="alert" style={screenStyles.body}>메모를 저장하지 못했어요. 다시 시도해 주세요.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, gap: 6 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  label: { color: colors.text, fontSize: 16, fontWeight: '700' },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 },
  actionText: { color: '#2D6654', fontSize: 14, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 6 },
  icon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  save: { backgroundColor: '#2D6654' },
  saveIcon: { color: colors.surface, fontSize: 22, fontWeight: '700' },
  cancel: { backgroundColor: '#EEEAE4' },
  cancelIcon: { color: colors.text, fontSize: 24 },
  disabled: { opacity: 0.5 },
  input: { minHeight: 86, backgroundColor: '#F7F9F5', borderRadius: 10, padding: 10, textAlignVertical: 'top', color: colors.text, fontSize: 16 },
});
