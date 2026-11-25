import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle } from 'react-native';

import { screenStyles } from './theme';

export function NameInput({ style, ...props }: TextInputProps) {
  return <TextInput {...props} style={[screenStyles.heading, styles.input, style]} />;
}

export default function EditableName({ id, name, inputLabel, inputStyle, persistName, onSaved, startEditing, onCancel }: {
  id: string;
  name: string;
  inputLabel: string;
  inputStyle?: StyleProp<TextStyle>;
  persistName: (id: string, name: string) => Promise<void>;
  onSaved: (name: string) => void;
  startEditing?: boolean;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState(startEditing ? name : undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const pending = useRef(false);
  const trimmed = draft?.trim();
  const canSave = !saving && Boolean(trimmed) && trimmed !== name;

  async function save() {
    if (!trimmed || trimmed === name || pending.current) return;
    pending.current = true;
    setSaving(true);
    setError(false);
    try {
      await persistName(id, trimmed);
      onSaved(trimmed);
      setDraft(undefined);
    } catch {
      setError(true);
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  if (draft === undefined) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={name + ' 이름 변경'}
        onPress={() => setDraft(name)}
        style={({ pressed }) => [styles.title, pressed && styles.titlePressed]}
      >
        <Text style={[screenStyles.heading, styles.titleText]}>{name}</Text>
        <Text style={styles.editHint}>✎</Text>
      </Pressable>
    );
  }

  return (
    <View>
      <View style={styles.editRow}>
        <NameInput
          accessibilityLabel={inputLabel}
          autoFocus
          editable={!saving}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={save}
          returnKeyType="done"
          style={[styles.rowInput, inputStyle]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="이름 저장"
          disabled={!canSave}
          onPress={save}
          style={({ pressed }) => [
            styles.iconButton,
            styles.saveButton,
            (!canSave || pressed) && styles.dimmed,
          ]}
        >
          <Text style={styles.saveIcon}>✓</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="취소"
          disabled={saving}
          onPress={() => {
            setDraft(undefined);
            setError(false);
            onCancel?.();
          }}
          style={({ pressed }) => [
            styles.iconButton,
            styles.cancelButton,
            (saving || pressed) && styles.dimmed,
          ]}
        >
          <Text style={styles.cancelIcon}>×</Text>
        </Pressable>
      </View>
      {error && <Text accessibilityRole="alert">이름을 저장하지 못했어요. 다시 시도해 주세요.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    minHeight: 44,
    gap: 8,
  },
  titleText: {
    flexShrink: 1,
  },
  editHint: { color: '#5B7567', fontSize: 17 },
  titlePressed: { opacity: 0.65 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  input: { minHeight: 44, borderBottomWidth: 1, borderBottomColor: '#2D6654', paddingVertical: 0 },
  rowInput: { flex: 1, minWidth: 0 },
  iconButton: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveButton: { backgroundColor: '#2D6654' },
  cancelButton: { backgroundColor: '#EEEAE4' },
  dimmed: { opacity: 0.45 },
  saveIcon: { color: '#FFFFFF', fontSize: 23, fontWeight: '700' },
  cancelIcon: { color: '#594E45', fontSize: 25, fontWeight: '600' },
});
