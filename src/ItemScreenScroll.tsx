import type { PropsWithChildren } from 'react';
import { Platform, ScrollView } from 'react-native';
import { KeyboardAwareScrollView, KeyboardProvider } from 'react-native-keyboard-controller';

import { screenStyles } from './theme';

export default function ItemScreenScroll({ children }: PropsWithChildren) {
  if (Platform.OS === 'ios') {
    return (
      <KeyboardProvider preload={false}>
        <KeyboardAwareScrollView bottomOffset={32} contentContainerStyle={screenStyles.content} keyboardShouldPersistTaps="handled">
          {children}
        </KeyboardAwareScrollView>
      </KeyboardProvider>
    );
  }

  return (
    <ScrollView contentContainerStyle={screenStyles.content} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}
