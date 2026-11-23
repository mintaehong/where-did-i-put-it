import { Stack } from 'expo-router';

import { colors } from '../src/theme';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: '어디 뒀지?',
          headerStyle: { backgroundColor: '#FAF8F3' },
          headerTintColor: '#263B36',
        }}
      />
      <Stack.Screen name="storage" options={{ title: '보관함' }} />
      <Stack.Screen name="folder/[id]" dangerouslySingular options={{ title: '보관 장소' }} />
    </Stack>
  );
}
