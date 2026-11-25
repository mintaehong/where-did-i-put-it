import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import BottomNavigation from '../src/BottomNavigation';
import { tabSlideSide } from '../src/TabSlide';
import { colors } from '../src/theme';

export default function RootLayout() {
  return (
    <View style={styles.layout}>
      <Stack
        screenOptions={({ route }) => ({
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
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
        }} />
        <Stack.Screen name="folder/[id]" dangerouslySingular options={{ title: '보관 장소' }} />
        <Stack.Screen name="item/[id]" options={{ title: '물건 상세' }} />
      </Stack>
      <BottomNavigation />
    </View>
  );
}

const styles = StyleSheet.create({
  layout: { flex: 1, backgroundColor: colors.background },
});
