import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { searchItems } from './db/items';
import { colors } from './theme';

export default function ItemSearch() {
  const [input, setInput] = useState('');
  const name = input.trim();
  const [attempt, setAttempt] = useState(0);
  const [response, setResponse] = useState<{
    name: string;
    items: Awaited<ReturnType<typeof searchItems>> | null;
  }>();
  const result = response?.name === name ? response : undefined;

  useFocusEffect(useCallback(() => {
    if (!name) return;
    let active = true;
    const timer = setTimeout(() => {
      searchItems(name).then(
        (items) => { if (active) setResponse({ name, items }); },
        () => { if (active) setResponse({ name, items: null }); },
      );
    }, 180);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [name, attempt]));

  return (
    <View style={styles.section}>
      <View style={styles.searchBar}>
        <TextInput
          accessibilityLabel="물건 이름 검색"
          placeholder="물건 이름으로 찾아봐"
          placeholderTextColor={colors.muted}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={Keyboard.dismiss}
          returnKeyType="search"
          style={styles.input}
        />
        {input !== '' && (
          <Pressable accessibilityRole="button" accessibilityLabel="검색어 지우기" onPress={() => {
            setInput('');
            setResponse(undefined);
          }} style={styles.clearButton}>
            <Text style={styles.clearIcon}>×</Text>
          </Pressable>
        )}
      </View>
      {name !== '' && (
        <View style={styles.results}>
          {!result ? (
            <ActivityIndicator accessibilityLabel="물건 찾는 중" />
          ) : result.items === null ? (
            <Pressable accessibilityRole="button" onPress={() => {
              setResponse(undefined);
              setAttempt((value) => value + 1);
            }} style={styles.result}>
              <Text style={styles.message}>검색하지 못했어요. 다시 시도</Text>
            </Pressable>
          ) : result.items.length === 0 ? (
            <Text style={styles.message}>‘{name}’에 해당하는 물건이 없어요.</Text>
          ) : result.items.map((item) => (
            <Link key={item.id} href={{ pathname: '/item/[id]', params: { id: item.id } }} asChild>
              <Pressable accessibilityRole="link" onPress={Keyboard.dismiss} style={({ pressed }) => [styles.result, pressed && styles.pressed]}>
                <View style={styles.resultText}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.message}>
                    {item.path.length ? item.path.map((folder) => folder.name).join(' › ') : '보관 위치를 찾을 수 없어요.'}
                  </Text>
                </View>
                <Text importantForAccessibility="no" style={styles.chevron}>›</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12, marginBottom: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 4, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#DEE7DE' },
  input: { flex: 1, minWidth: 0, minHeight: 44, paddingHorizontal: 10, fontSize: 16, color: colors.text },
  clearButton: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  clearIcon: { color: '#2D6654', fontSize: 22 },
  results: { gap: 8 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: '#EAF2EA' },
  resultText: { flex: 1, gap: 4 },
  name: { color: colors.text, fontSize: 16, fontWeight: '700' },
  message: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  chevron: { color: '#2D6654', fontSize: 22 },
  pressed: { opacity: 0.7 },
});
