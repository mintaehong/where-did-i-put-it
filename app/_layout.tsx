import { Stack, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import BottomNavigation, { TabIcon } from '../src/BottomNavigation';
import { tabSlideSide } from '../src/TabSlide';
import { colors } from '../src/theme';

export default function RootLayout() {
  const router = useRouter();

  return (
    <View style={styles.layout}>
      <Stack
        screenOptions={({ route }) => ({
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          animation: tabSlideSide((route.params as { tabSlide?: string } | undefined)?.tabSlide)
            ? 'none'
            : 'default',
        })}
      >
        <Stack.Screen name="index" options={{ title: '어디 뒀지?', headerShown: false }} />
        <Stack.Screen name="storage" options={{ title: '보관함' }} />
        <Stack.Screen name="ask" options={{
          title: '엄마에게 물어보기',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: '#242422',
          headerShadowVisible: true,
          headerBackVisible: false,
          headerLeft: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="홈으로 돌아가기"
              onPress={() => router.dismissTo('/')}
              style={({ pressed }) => [styles.homeButton, pressed && styles.homeButtonPressed]}
            >
              <TabIcon path="/" color={colors.text} />
              <Text style={styles.homeLabel}>홈</Text>
            </Pressable>
          ),
        }} />
        <Stack.Screen name="folder/[id]" dangerouslySingular options={{ title: '보관 장소' }} />
        <Stack.Screen name="item/new" options={{ title: '물건 추가' }} />
        <Stack.Screen name="item/[id]" options={{ title: '물건 상세' }} />
      </Stack>
      <BottomNavigation />
    </View>
  );
}

const styles = StyleSheet.create({
  layout: { flex: 1, backgroundColor: colors.background },
  homeButton: {
    minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4,
  },
  homeButtonPressed: { opacity: 0.65 },
  homeLabel: { color: colors.text, fontSize: 15, fontWeight: '600' },
});
