import { Link } from 'expo-router';
import { Image, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';

import { itemPhotoUri } from './itemPhotoFiles';
import ParcelMark from './ParcelMark';
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
        <View style={[styles.result, variant === 'conversation' ? styles.conversation : styles.searchCard]}>
          {(variant === 'conversation' || Boolean(item.photoPath)) && (
            <View style={[styles.thumbnail, !item.photoPath && styles.thumbnailPlaceholder]} importantForAccessibility="no-hide-descendants">
              {item.photoPath ? (
                <Image
                  accessible={false}
                  accessibilityLabel={`${item.name} 사진`}
                  source={{ uri: itemPhotoUri(item.photoPath) }}
                  style={styles.photo}
                  resizeMode="cover"
                />
              ) : (
                <ParcelMark small />
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
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  conversation: { gap: 9, padding: 9, borderRadius: 12, borderWidth: 1, borderColor: '#E4E0DA', backgroundColor: colors.surface },
  searchCard: { borderWidth: 0, borderRadius: 0 },
  resultText: { flex: 1, gap: 4 },
  name: { color: colors.text, fontSize: 16, fontWeight: '700' },
  highlight: { backgroundColor: colors.primary },
  path: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  chevron: { color: colors.muted, fontSize: 22 },
  conversationArrow: { color: '#242422' },
  thumbnail: { width: 42, height: 42, borderRadius: 9, backgroundColor: '#F2F0ED', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  thumbnailPlaceholder: { backgroundColor: colors.primarySoft },
  pressed: { opacity: 0.7 },
});
