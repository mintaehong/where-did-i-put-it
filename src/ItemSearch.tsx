import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { askForItems, searchItems } from './db/items';
import { colors } from './theme';

export default function ItemSearch({ mode }: { mode: 'question' | 'search' }) {
  const [input, setInput] = useState('');
  const text = input.trim();
  const isQuestion = mode === 'question';
  const [question, setQuestion] = useState('');
  const query = isQuestion ? question : text;
  const [attempt, setAttempt] = useState(0);
  const [response, setResponse] = useState<{
    query: string;
    items: Awaited<ReturnType<typeof searchItems>> | null;
  }>();
  const result = response?.query === query ? response : undefined;

  useFocusEffect(useCallback(() => {
    if (!query) return;
    let active = true;
    const timer = setTimeout(() => {
      const find = isQuestion ? askForItems : searchItems;
      find(query).then(
        (items) => { if (active) setResponse({ query, items }); },
        () => { if (active) setResponse({ query, items: null }); },
      );
    }, isQuestion ? 0 : 180);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, isQuestion, attempt]));

  function ask() {
    if (!text) return;
    setResponse(undefined);
    setQuestion(text);
    setAttempt((value) => value + 1);
    Keyboard.dismiss();
  }

  return (
    <View style={styles.section}>
      <View style={styles.searchBar}>
        <TextInput
          accessibilityLabel={isQuestion ? '엄마에게 물어보기' : '물건 이름 검색'}
          placeholder={isQuestion ? '예: 스티커 어딨어?' : '물건 이름 검색'}
          placeholderTextColor={colors.muted}
          value={input}
          onChangeText={(text) => {
            setInput(text);
            setQuestion('');
          }}
          onSubmitEditing={isQuestion ? ask : Keyboard.dismiss}
          returnKeyType={isQuestion ? 'send' : 'search'}
          style={styles.input}
        />
        {input !== '' && (
          <Pressable accessibilityRole="button" accessibilityLabel={isQuestion ? '질문 지우기' : '검색어 지우기'} onPress={() => {
            setInput('');
            setResponse(undefined);
            setQuestion('');
          }} style={styles.clearButton}>
            <Text style={styles.clearIcon}>×</Text>
          </Pressable>
        )}
        {isQuestion && (
          <Pressable accessibilityRole="button" disabled={!text} onPress={ask} style={[styles.askButton, !text && styles.disabled]}>
            <Text style={styles.askLabel}>물어보기</Text>
          </Pressable>
        )}
      </View>
      {query !== '' && (
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
          ) : (
            <>
              {isQuestion ? (
                <View style={styles.answer}>
                  <Text style={styles.name}>엄마</Text>
                  <Text style={styles.message}>{answerFor(result.items)}</Text>
                </View>
              ) : result.items.length === 0 && (
                <Text style={styles.message}>‘{query}’에 해당하는 물건이 없어요.</Text>
              )}
              {result.items.map((item) => (
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
            </>
          )}
        </View>
      )}
    </View>
  );
}

function answerFor(items: Awaited<ReturnType<typeof askForItems>>) {
  if (items.length === 0) return '등록한 물건 중에는 못 찾겠네~ 이름을 넣어서 다시 물어봐 줄래?';
  if (items.length > 1) return '찾은 물건이 몇 개 있네~ 아래에서 이름이랑 위치를 확인해 봐.';
  const item = items[0];
  const folder = item.path.at(-1);
  return folder
    ? `‘${item.name}’, ${folder.name}에 있어~`
    : `‘${item.name}’ 기록은 있는데 보관 위치는 확인할 수 없네.`;
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 4, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#DEE7DE' },
  input: { flex: 1, minWidth: 0, minHeight: 44, paddingHorizontal: 10, fontSize: 16, color: colors.text },
  clearButton: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  clearIcon: { color: '#2D6654', fontSize: 22 },
  askButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#2D6654' },
  askLabel: { color: colors.surface, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  answer: { gap: 4, borderRadius: 14, padding: 14, backgroundColor: '#D9EDE1' },
  results: { gap: 8 },
  result: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: '#EAF2EA' },
  resultText: { flex: 1, gap: 4 },
  name: { color: colors.text, fontSize: 16, fontWeight: '700' },
  message: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  chevron: { color: '#2D6654', fontSize: 22 },
  pressed: { opacity: 0.7 },
});
