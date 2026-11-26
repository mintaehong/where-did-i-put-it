import { usePathname, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from './theme';

const tabs = [
  { path: '/', label: '홈' },
  { path: '/ask', label: '물어보기' },
  { path: '/storage', label: '보관함' },
] as const;

type TabPath = typeof tabs[number]['path'];

export default function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const currentTab = tabs.find((tab) => tab.path === pathname)?.path;
  const knownTab = currentTab ?? (pathname.startsWith('/folder/') ? '/storage' : undefined);
  const previousTab = useRef<TabPath>('/storage');
  const transitionId = useRef(0);
  const selected = knownTab ?? previousTab.current;
  const selectedIndex = tabs.findIndex((tab) => tab.path === selected);

  useEffect(() => {
    if (knownTab) previousTab.current = knownTab;
  }, [knownTab]);

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.bar}>
      <View accessibilityRole="tablist" style={styles.tabs}>
        {tabs.map(({ path, label }, index) => {
          const active = selected === path;
          const color = active ? '#242422' : '#595752';
          return (
            <Pressable
              key={path}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: active }}
              onPress={() => {
                if (pathname === path) return;
                if (index === selectedIndex) {
                  router.navigate(path);
                  return;
                }
                const side = index < selectedIndex ? 'left' : 'right';
                transitionId.current += 1;
                router.navigate({ pathname: path, params: { tabSlide: `${side}:${transitionId.current}` } });
              }}
              style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
            >
              <View style={[styles.tabContent, active && styles.selected]}>
                <TabIcon path={path} color={color} />
                <Text style={[styles.label, { color }, active && styles.selectedLabel]}>{label}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

export function TabIcon({ path, color }: { path: TabPath; color: string }) {
  const line = { borderColor: color };
  return (
    <View style={styles.icon} importantForAccessibility="no-hide-descendants">
      {path === '/' ? (
        <>
          <View style={[styles.roof, line]} />
          <View style={[styles.house, line]} />
        </>
      ) : path === '/ask' ? (
        <>
          <View style={[styles.bubble, line]} />
          <View style={[styles.tail, line]} />
        </>
      ) : (
        <>
          <View style={[styles.box, line]} />
          <View style={[styles.boxLid, line]} />
          <View style={[styles.boxHandle, { backgroundColor: color }]} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: '#FFFFFF', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E3DE' },
  tabs: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 5, paddingBottom: 4 },
  tab: { flex: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center' },
  tabContent: {
    alignItems: 'center', justifyContent: 'center', gap: 4, minWidth: 62, minHeight: 48,
    paddingHorizontal: 9, paddingVertical: 3, borderRadius: 24,
  },
  selected: { backgroundColor: colors.primary },
  label: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  selectedLabel: { fontWeight: '800' },
  pressed: { opacity: 0.65 },
  icon: { width: 24, height: 24 },
  roof: { position: 'absolute', top: 5, left: 5, width: 14, height: 14, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 2, transform: [{ rotate: '45deg' }] },
  house: { position: 'absolute', top: 12, left: 5, width: 14, height: 10, borderWidth: 2, borderTopWidth: 0, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  bubble: { position: 'absolute', top: 3, left: 2, width: 20, height: 16, borderWidth: 2, borderRadius: 8 },
  tail: { position: 'absolute', top: 16, left: 5, height: 6, borderLeftWidth: 2, transform: [{ rotate: '35deg' }] },
  box: { position: 'absolute', top: 7, left: 3, width: 18, height: 14, borderWidth: 2, borderRadius: 4 },
  boxLid: { position: 'absolute', top: 3, left: 2, width: 20, height: 7, borderWidth: 2, borderRadius: 3 },
  boxHandle: { position: 'absolute', top: 12, left: 9, width: 6, height: 2, borderRadius: 1 },
});
