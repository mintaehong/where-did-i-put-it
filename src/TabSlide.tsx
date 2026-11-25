import { useLocalSearchParams } from 'expo-router';
import { useLayoutEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';

export function tabSlideSide(value: unknown) {
  if (typeof value !== 'string') return;
  const side = value.split(':', 1)[0];
  if (side === 'left' || side === 'right') return side;
}

export default function TabSlide({ children }: PropsWithChildren) {
  const { tabSlide } = useLocalSearchParams<{ tabSlide?: string }>();
  const { width } = useWindowDimensions();
  const side = tabSlideSide(tabSlide);
  const [offset] = useState(() => new Animated.Value(side === 'left' ? -width : side === 'right' ? width : 0));
  const lastSlide = useRef<string | undefined>(undefined);

  useLayoutEffect(() => {
    if (!side || tabSlide === lastSlide.current) return;
    lastSlide.current = tabSlide;
    offset.setValue(side === 'left' ? -width : width);
    Animated.timing(offset, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [offset, side, tabSlide, width]);

  return (
    <View style={styles.frame}>
      <Animated.View style={[styles.content, { transform: [{ translateX: offset }] }]}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, overflow: 'hidden' },
  content: { flex: 1 },
});
