import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type LayoutChangeEvent } from 'react-native';

import { searchItems } from './db/items';
import ItemResult from './ItemResult';
import { colors } from './theme';

export default function ItemSearch({ input, onChangeInput, onLayout }: {
  input: string;
  onChangeInput: (value: string) => void;
  onLayout: (event: LayoutChangeEvent) => void;
}) {
  return (
    <View onLayout={onLayout}>
      <View style={styles.searchBar}>
        <View style={styles.searchIcon} accessible={false} importantForAccessibility="no-hide-descendants">
          <View style={styles.searchLens} />
          <View style={styles.searchHandle} />
        </View>
        <TextInput
          accessibilityLabel="물건 이름 검색"
          placeholder="물건 이름 검색"
          placeholderTextColor={colors.muted}
          value={input}
          onChangeText={onChangeInput}
          onSubmitEditing={Keyboard.dismiss}
          returnKeyType="search"
          style={styles.input}
        />
        {input !== '' && (
          <Pressable accessibilityRole="button" accessibilityLabel="검색어 지우기" onPress={() => onChangeInput('')} style={styles.clearButton}>
            <Text style={styles.clearIcon}>×</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export function ItemSearchResults({ locationId, query }: { locationId: string; query: string }) {
  const [attempt, setAttempt] = useState(0);
  const [response, setResponse] = useState<{
    query: string;
    locationId: string;
    items: Awaited<ReturnType<typeof searchItems>> | null;
  }>();
  const result = response?.query === query && response.locationId === locationId ? response : undefined;

  useFocusEffect(useCallback(() => {
    let active = true;
    const timer = setTimeout(() => {
      searchItems(query, locationId).then(
        (items) => { if (active) setResponse({ query, locationId, items }); },
        () => { if (active) setResponse({ query, locationId, items: null }); },
      );
    }, 180);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, locationId, attempt]));

  return (
    <View style={styles.resultsPanel}>
      <ScrollView style={styles.resultScroll} keyboardShouldPersistTaps="handled">
        {!result ? (
          <ActivityIndicator accessibilityLabel="물건 찾는 중" style={styles.loading} />
        ) : result.items === null ? (
          <Pressable accessibilityRole="button" onPress={() => {
            setResponse(undefined);
            setAttempt((value) => value + 1);
          }} style={styles.result}>
            <Text style={styles.message}>검색하지 못했어요. 다시 시도</Text>
          </Pressable>
        ) : result.items.length === 0 ? (
          <View style={styles.empty} accessibilityLiveRegion="polite">
            <Text style={styles.emptyTitle}>찾는 물건이 없어요</Text>
            <Text style={styles.message}>다른 이름으로 검색해 보세요.</Text>
          </View>
        ) : result.items.map((item, index) => (
          <View key={item.id} style={index > 0 && styles.resultDivider}>
            <ItemResult item={item} highlight={query} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 4, paddingLeft: 8,
    borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  searchIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.primarySoft },
  searchLens: { position: 'absolute', top: 8, left: 8, width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: colors.muted },
  searchHandle: {
    position: 'absolute', top: 20, left: 18, width: 7, height: 1.5,
    borderRadius: 1, backgroundColor: colors.muted, transform: [{ rotate: '45deg' }],
  },
  input: { flex: 1, minWidth: 0, minHeight: 44, paddingHorizontal: 2, fontSize: 16, color: colors.text },
  clearButton: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  clearIcon: { color: colors.muted, fontSize: 22 },
  resultsPanel: {
    flexShrink: 1, maxHeight: 320, borderRadius: 14, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, elevation: 3,
    shadowColor: colors.text, shadowOpacity: 0.13, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  resultScroll: { flexGrow: 0, flexShrink: 1, borderRadius: 13 },
  resultDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  loading: { padding: 14 },
  empty: { gap: 4, padding: 14 },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  result: { minHeight: 44, justifyContent: 'center', padding: 14 },
  message: { color: colors.muted, fontSize: 14, lineHeight: 20 },
});
