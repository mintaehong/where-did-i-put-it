import { useHeaderHeight } from 'expo-router/react-navigation';
import { useRef, useState, type ComponentRef, type PropsWithChildren } from 'react';
import { ActivityIndicator, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { KeyboardProvider, KeyboardStickyView } from 'react-native-keyboard-controller';

import { askForItems } from '../src/db/items';
import ItemResult from '../src/ItemResult';
import TabSlide from '../src/TabSlide';
import { colors } from '../src/theme';

type Matches = Awaited<ReturnType<typeof askForItems>>;
type Turn = { question: string; results?: Matches | null };

export default function AskScreen() {
  if (Platform.OS === 'ios') {
    return (
      <KeyboardProvider preload={false}>
        <Conversation />
      </KeyboardProvider>
    );
  }
  return <Conversation />;
}

function Conversation() {
  const headerHeight = useHeaderHeight();
  const { height: windowHeight } = useWindowDimensions();
  const screen = useRef<ComponentRef<typeof View>>(null);
  const [bottomInset, setBottomInset] = useState(0);
  const [composerHeight, setComposerHeight] = useState(0);
  const [draft, setDraft] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const writing = useRef(false);
  const conversation = useRef<ComponentRef<typeof ScrollView>>(null);
  const pending = turns.length > 0 && turns.at(-1)?.results === undefined;
  const canSend = !pending && Boolean(draft.trim());
  const isIOS = Platform.OS === 'ios';
  const Composer = isIOS ? KeyboardStickyView : View;

  function measureBottomInset() {
    screen.current?.measureInWindow((_x, y, _width, height) => {
      // The bottom tab bar sits outside the chat screen.
      setBottomInset(Math.max(0, windowHeight - y - height));
    });
  }

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
      <View
        ref={screen}
        collapsable={false}
        onLayout={isIOS ? measureBottomInset : undefined}
        style={styles.screen}
      >
        <KeyboardAvoidingView
          style={styles.conversation}
          behavior={isIOS ? 'padding' : undefined}
          keyboardVerticalOffset={isIOS ? headerHeight + composerHeight : 0}
        >
          <ScrollView
            ref={conversation}
            contentContainerStyle={styles.history}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => {
              if (turns.length > 0) conversation.current?.scrollToEnd({ animated: true });
            }}
          >
            <MomReply>
              <Text style={styles.answerText}>뭐 찾고 있어?</Text>
            </MomReply>
            {turns.map(({ question, results }, index) => (
              <View key={index} style={styles.turn}>
                <View style={styles.question}>
                  <Text style={styles.questionText}>{question}</Text>
                </View>
                <MomReply results={results}>
                  {results === undefined ? (
                    <ActivityIndicator accessibilityLabel="물건 찾는 중" style={styles.pending} />
                  ) : (
                    <Text accessibilityLiveRegion="polite" style={styles.answerText}>{answerFor(results)}</Text>
                  )}
                </MomReply>
              </View>
            ))}
          </ScrollView>
        </KeyboardAvoidingView>
        <Composer
          style={styles.composer}
          {...(isIOS ? { offset: { opened: bottomInset } } : {})}
          onLayout={isIOS ? (event) => setComposerHeight(event.nativeEvent.layout.height) : undefined}
        >
          <TextInput
            accessibilityLabel="질문 입력"
            placeholder="예: 여권 어디 있어?"
            placeholderTextColor="#6D6A65"
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={send}
            returnKeyType="send"
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="물어보기"
            disabled={!canSend}
            onPress={send}
            style={({ pressed }) => [styles.send, (!canSend || pressed) && styles.dimmed]}
          >
            <Text style={styles.sendText}>↑</Text>
          </Pressable>
        </Composer>
      </View>
    </TabSlide>
  );
}

function MomReply({ children, results }: PropsWithChildren<{ results?: Matches | null }>) {
  return (
    <View style={styles.replyRow}>
      <View style={styles.avatar}>
        <Image
          accessible
          accessibilityLabel="엄마"
          source={require('../assets/mom-banner.png')}
          resizeMode="contain"
          style={styles.avatarImage}
        />
      </View>
      <View style={styles.replyContent}>
        <View style={styles.answer}>{children}</View>
        {results?.map((item) => <ItemResult key={item.id} item={item} variant="conversation" />)}
      </View>
    </View>
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
  screen: { flex: 1, backgroundColor: colors.surface },
  conversation: { flex: 1 },
  history: { padding: 16, gap: 16 },
  turn: { gap: 14 },
  question: {
    alignSelf: 'flex-end', maxWidth: '85%', paddingVertical: 11, paddingHorizontal: 15,
    borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#E4E0DA',
  },
  questionText: { color: '#242422', fontSize: 16, lineHeight: 22 },
  replyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFF6E1', borderWidth: 1, borderColor: '#EADFC5', overflow: 'hidden' },
  avatarImage: { width: 40, height: 53, marginTop: 1 },
  replyContent: { flex: 1, minWidth: 0, gap: 7 },
  answer: { alignSelf: 'flex-start', maxWidth: '100%', paddingVertical: 11, paddingHorizontal: 14, borderRadius: 18, backgroundColor: '#FFEBAA' },
  answerText: { color: '#242422', fontSize: 16, lineHeight: 22 },
  pending: { alignSelf: 'flex-start' },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E3DE', backgroundColor: colors.surface },
  input: { flex: 1, minWidth: 0, minHeight: 46, paddingHorizontal: 14, borderRadius: 24, borderWidth: 1, borderColor: '#D9D6D1', fontSize: 16, color: '#242422' },
  send: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: '#262522', borderRadius: 22 },
  sendText: { color: colors.surface, fontSize: 23, fontWeight: '600', lineHeight: 27 },
  dimmed: { opacity: 0.45 },
});
