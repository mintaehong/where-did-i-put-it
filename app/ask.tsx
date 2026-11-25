import { useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { askForItems } from '../src/db/items';
import ItemResult from '../src/ItemResult';
import TabSlide from '../src/TabSlide';
import { colors } from '../src/theme';

type Matches = Awaited<ReturnType<typeof askForItems>>;
type Turn = { question: string; results?: Matches | null };

export default function AskScreen() {
  const [draft, setDraft] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const writing = useRef(false);
  const conversation = useRef<ComponentRef<typeof ScrollView>>(null);
  const pending = turns.length > 0 && turns.at(-1)?.results === undefined;
  const canSend = !pending && Boolean(draft.trim());

  async function send() {
    const question = draft.trim();
    if (!question || writing.current) return;

    writing.current = true;
    setTurns((previous) => [...previous, { question }]);
    setDraft('');
    Keyboard.dismiss();
    let results: Matches | null;
    try {
      results = await askForItems(question);
    } catch {
      results = null;
    } finally {
      writing.current = false;
    }
    setTurns((previous) => [...previous.slice(0, -1), { question, results }]);
  }

  return (
    <TabSlide>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={conversation}
          contentContainerStyle={styles.history}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            if (turns.length > 0) conversation.current?.scrollToEnd({ animated: true });
          }}
        >
          <View style={styles.answer}>
            <Text style={styles.sender}>엄마</Text>
            <Text style={styles.answerText}>뭐 찾고 있어?</Text>
          </View>
          {turns.map(({ question, results }, index) => (
            <View key={index} style={styles.turn}>
              <View style={styles.question}>
                <Text style={styles.questionText}>{question}</Text>
              </View>
              <View style={styles.answer}>
                <Text style={styles.sender}>엄마</Text>
                {results === undefined ? (
                  <ActivityIndicator accessibilityLabel="물건 찾는 중" style={styles.pending} />
                ) : (
                  <Text accessibilityLiveRegion="polite" style={styles.answerText}>{answerFor(results)}</Text>
                )}
              </View>
              {results?.map((item) => <ItemResult key={item.id} item={item} />)}
            </View>
          ))}
        </ScrollView>
        <View style={styles.composer}>
          <TextInput
            accessibilityLabel="질문 입력"
            placeholder="예: 스티커 어딨어?"
            placeholderTextColor={colors.muted}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={send}
            returnKeyType="send"
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            disabled={!canSend}
            onPress={send}
            style={({ pressed }) => [styles.send, (!canSend || pressed) && styles.dimmed]}
          >
            <Text style={styles.sendText}>물어보기</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </TabSlide>
  );
}

function answerFor(items: Matches | null) {
  if (items === null) return '이번에는 못 찾아봤네. 한 번만 다시 물어봐 줄래?';
  if (items.length === 0) return '등록한 물건 중에는 못 찾겠네~ 이름을 넣어서 다시 물어봐 줄래?';
  if (items.length > 1) return '찾은 물건이 몇 개 있네~ 아래에서 이름이랑 위치를 확인해 봐.';
  const item = items[0];
  const folder = item.path.at(-1);
  return folder
    ? `‘${item.name}’, ${folder.name}에 있어~`
    : `‘${item.name}’ 기록은 있는데 보관 위치는 확인할 수 없네.`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  history: { padding: 20, gap: 16 },
  turn: { gap: 8 },
  question: { alignSelf: 'flex-end', maxWidth: '88%', padding: 12, borderRadius: 16, backgroundColor: '#2D6654' },
  questionText: { color: colors.surface, fontSize: 16, lineHeight: 22 },
  answer: { alignSelf: 'flex-start', maxWidth: '88%', gap: 4, padding: 12, borderRadius: 16, backgroundColor: '#D9EDE1' },
  sender: { color: '#2D6654', fontSize: 13, fontWeight: '700' },
  answerText: { color: colors.text, fontSize: 16, lineHeight: 22 },
  pending: { alignSelf: 'flex-start' },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: '#DEE7DE' },
  input: { flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.surface, fontSize: 16, color: colors.text },
  send: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 12, backgroundColor: '#2D6654', borderRadius: 12 },
  sendText: { color: colors.surface, fontWeight: '700' },
  dimmed: { opacity: 0.55 },
});
