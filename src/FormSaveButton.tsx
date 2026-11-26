import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from './theme';

export default function FormSaveButton({ label, saving, disabled, onPress }: {
  label: string;
  saving: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.save, pressed && styles.savePressed, disabled && styles.saveDisabled]}
    >
      <Text style={[styles.saveLabel, disabled && styles.saveLabelDisabled]}>{saving ? '저장 중' : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  save: {
    minHeight: 50, borderRadius: 16, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 10,
  },
  savePressed: { backgroundColor: '#F6DB86' },
  saveDisabled: { backgroundColor: '#F0EAE1' },
  saveLabel: { color: colors.text, fontSize: 16, fontWeight: '700' },
  saveLabelDisabled: { color: '#82766C' },
});
