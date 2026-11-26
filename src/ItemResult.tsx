import { Link } from 'expo-router';
import { Image, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';

import { itemPhotoUri } from './itemPhotoFiles';
import { colors } from './theme';

export default function ItemResult({ item, variant, highlight }: {
  item: { id: string; name: string; photoPath?: string | null; path: { name: string }[] };
  variant?: 'conversation';
  highlight?: string;
}) {
  const escaped = highlight?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const nameParts = escaped ? item.name.split(new RegExp(`(${escaped})`, 'iu')) : [item.name];
  return (
    <Link href={{ pathname: '/item/[id]', params: { id: item.id } }} asChild>
      <Pressable accessibilityRole="link" onPress={Keyboard.dismiss} style={({ pressed }) => pressed && styles.pressed}>
        <View style={[styles.result, variant === 'conversation' && styles.conversation]}>
          {variant === 'conversation' && (
            <View style={styles.thumbnail} importantForAccessibility="no-hide-descendants">
              {item.photoPath ? (
                <Image source={{ uri: itemPhotoUri(item.photoPath) }} style={styles.photo} resizeMode="cover" />
              ) : (
                <View style={styles.box}><View style={styles.boxLid} /></View>
              )}
            </View>
          )}
          <View style={styles.resultText}>
            <Text style={styles.name}>
              {nameParts.map((part, index) => index % 2 === 0 ? part : (
                <Text key={index} style={styles.highlight}>{part}</Text>
              ))}
            </Text>
            <Text style={styles.path}>
              {item.path.length ? item.path.map((folder) => folder.name).join(' › ') : '보관 위치를 찾을 수 없어요.'}
            </Text>
          </View>
          <Text importantForAccessibility="no" style={[styles.chevron, variant === 'conversation' && styles.conversationArrow]}>›</Text>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  result: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: '#E7E0D6',
  },
  conversation: { gap: 9, padding: 9, borderRadius: 12, borderWidth: 1, borderColor: '#E4E0DA', backgroundColor: colors.surface },
  resultText: { flex: 1, gap: 4 },
  name: { color: colors.text, fontSize: 16, fontWeight: '700' },
  highlight: { backgroundColor: '#FFEBAA' },
  path: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  chevron: { color: colors.muted, fontSize: 22 },
  conversationArrow: { color: '#242422' },
  thumbnail: { width: 42, height: 42, borderRadius: 9, backgroundColor: '#F2F0ED', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  box: { width: 20, height: 17, borderWidth: 1.5, borderColor: '#6C6964', borderRadius: 3 },
  boxLid: { height: 5, borderBottomWidth: 1.5, borderColor: '#6C6964' },
  pressed: { opacity: 0.7 },
});
