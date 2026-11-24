import { Link } from 'expo-router';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from './theme';

export default function ItemResult({ item }: {
  item: { id: string; name: string; path: { name: string }[] };
}) {
  return (
    <Link href={{ pathname: '/item/[id]', params: { id: item.id } }} asChild>
      <Pressable accessibilityRole="link" onPress={Keyboard.dismiss} style={({ pressed }) => [styles.result, pressed && styles.pressed]}>
        <View style={styles.resultText}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.path}>
            {item.path.length ? item.path.map((folder) => folder.name).join(' › ') : '보관 위치를 찾을 수 없어요.'}
          </Text>
        </View>
        <Text importantForAccessibility="no" style={styles.chevron}>›</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  result: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: '#EAF2EA' },
  resultText: { flex: 1, gap: 4 },
  name: { color: colors.text, fontSize: 16, fontWeight: '700' },
  path: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  chevron: { color: '#2D6654', fontSize: 22 },
  pressed: { opacity: 0.7 },
});
