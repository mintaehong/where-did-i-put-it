import { Link } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import ItemSearch from '../src/ItemSearch';

export default function HomeScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={styles.heading}>
        {'어디에 뒀더라? 👋\n엄마가 기억해 줄게.'}
      </Text>
      <Text style={styles.description}>소중한 물건들, 여기 차곡차곡 모아두자.</Text>
      <ItemSearch />
      <View style={styles.memo}>
        <View style={styles.memoCopy}>
          <Text style={styles.memoLabel}>엄마의 보관 노트</Text>
          <Text style={styles.memoTitle}>물건을 어디에 뒀는지 적어 두자~</Text>
        </View>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.illustration}>
          <Text style={styles.box}>📦</Text>
        </View>
      </View>
      <View style={styles.places}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>보관 장소</Text>
        <Link href="/storage" style={styles.link}>
          보관함 열기
        </Link>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#FAF8F3',
  },
  content: {
    paddingHorizontal: 23,
    paddingTop: 20,
    paddingBottom: 32,
  },
  heading: {
    color: '#263B36',
    fontSize: 28,
    lineHeight: 38,
    fontWeight: '900',
    letterSpacing: -1,
  },
  description: {
    color: '#556C62',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 9,
    marginBottom: 24,
  },
  memo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#D9EDE1',
    borderRadius: 20,
    minHeight: 116,
    padding: 20,
  },
  memoCopy: {
    flex: 1,
  },
  memoLabel: {
    color: '#416754',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  memoTitle: {
    color: '#263B36',
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '800',
  },
  illustration: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F3EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    fontSize: 35,
  },
  places: {
    marginTop: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 12,
  },
  sectionTitle: {
    color: '#263B36',
    fontSize: 16,
    fontWeight: '800',
  },
  link: {
    color: '#2D6654',
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: 14,
  },
});
