import { usePathname, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const selected = knownTab ?? previousTab.current;

  useEffect(() => {
    if (knownTab) previousTab.current = knownTab;
  }, [knownTab]);

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.bar}>
      <View accessibilityRole="tablist" style={styles.tabs}>
        {tabs.map(({ path, label }) => {
          const active = selected === path;
          const color = active ? '#235941' : '#514C43';
          return (
            <Pressable
              key={path}
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: active }}
              onPress={() => {
                if (pathname !== path) router.navigate(path);
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

function TabIcon({ path, color }: { path: TabPath; color: string }) {
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
          <View style={[styles.boxLid, { backgroundColor: color }]} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: '#FAF7F0', borderTopWidth: 1, borderTopColor: '#E8E1D6', borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  tabs: { flexDirection: 'row', paddingHorizontal: 8, paddingTop: 4, paddingBottom: 3 },
  tab: { flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  tabContent: { alignItems: 'center', justifyContent: 'center', gap: 3, minWidth: 70, minHeight: 48, paddingHorizontal: 8, borderRadius: 18 },
  selected: { backgroundColor: '#DDEBDD' },
  label: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  selectedLabel: { fontWeight: '800' },
  pressed: { opacity: 0.65 },
  icon: { width: 22, height: 22 },
  roof: { position: 'absolute', top: 4, left: 5, width: 12, height: 12, borderTopWidth: 1.6, borderLeftWidth: 1.6, borderTopLeftRadius: 2, transform: [{ rotate: '45deg' }] },
  house: { position: 'absolute', top: 10, left: 4, width: 14, height: 10, borderWidth: 1.6, borderTopWidth: 0, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  bubble: { position: 'absolute', top: 3, left: 2, width: 18, height: 14, borderWidth: 1.6, borderRadius: 7 },
  tail: { position: 'absolute', top: 14, left: 5, height: 5, borderLeftWidth: 1.6, transform: [{ rotate: '35deg' }] },
  box: { position: 'absolute', top: 4, left: 3, width: 16, height: 15, borderWidth: 1.6, borderRadius: 3 },
  boxLid: { position: 'absolute', top: 9, left: 4, width: 14, height: 1.6 },
});
