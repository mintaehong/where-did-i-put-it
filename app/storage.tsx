import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { HeaderHeightContext } from 'expo-router/react-navigation';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Button, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import ChildFolders from '../src/ChildFolders';
import FolderItems from '../src/FolderItems';
import ItemSearch, { ItemSearchResults } from '../src/ItemSearch';
import { listRootFolders } from '../src/db/folders';
import TabSlide from '../src/TabSlide';
import { colors, screenStyles } from '../src/theme';

type FolderList =
  | { status: 'loading' | 'error' }
  | { status: 'ready'; folders: Awaited<ReturnType<typeof listRootFolders>> };

export default function StorageScreen() {
  const [result, setResult] = useState<FolderList>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [searchBottom, setSearchBottom] = useState(0);
  const [searchScrollTop, setSearchScrollTop] = useState(0);
  const [menuTop, setMenuTop] = useState<number | null>(null);
  const triggerBottom = useRef(screenStyles.content.padding + 44);
  const scrollTop = useRef(0);
  const router = useRouter();
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  const { locationId: selectedId } = useLocalSearchParams<{ locationId?: string }>();
  const roots = result.status === 'ready' ? result.folders : [];
  const selected = roots.find((folder) => folder.id === selectedId) ?? roots[0];
  const showLocations = menuTop !== null && roots.length > 1;
  const query = searchInput.trim();

  const closeLocations = useCallback(() => setMenuTop(null), []);

  useEffect(() => {
    if (!showLocations) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      closeLocations();
      return true;
    });
    return () => subscription.remove();
  }, [closeLocations, showLocations]);

  useFocusEffect(useCallback(() => {
    let active = true;
    listRootFolders().then(
      (folders) => {
        if (active) setResult({ status: 'ready', folders });
      },
      () => {
        if (active) setResult({ status: 'error' });
      },
    );
    return () => {
      active = false;
      closeLocations();
    };
  }, [attempt, closeLocations]));

  return (
    <TabSlide>
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={screenStyles.content}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!query}
          accessibilityElementsHidden={showLocations}
          importantForAccessibility={showLocations ? 'no-hide-descendants' : 'auto'}
          onScroll={(event) => {
            scrollTop.current = event.nativeEvent.contentOffset.y;
            if (query) setSearchScrollTop(scrollTop.current);
          }}
          scrollEventThrottle={16}
        >
          {selected && roots.length > 1 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${selected.name} 장소 바꾸기`}
              accessibilityState={{ expanded: showLocations }}
              onPress={() => {
                Keyboard.dismiss();
                setMenuTop(Math.max(4, triggerBottom.current - scrollTop.current + 6));
              }}
              onLayout={({ nativeEvent: { layout } }) => { triggerBottom.current = layout.y + layout.height; }}
              style={({ pressed }) => [styles.locationTrigger, pressed && styles.pressed]}
            >
              <Text style={[screenStyles.heading, styles.triggerName]}>{selected.name}</Text>
              <View style={styles.triggerIcon} importantForAccessibility="no-hide-descendants">
                <View style={styles.chevron} />
              </View>
            </Pressable>
          ) : (
            <Text accessibilityRole="header" style={screenStyles.heading}>{selected?.name ?? '보관 장소'}</Text>
          )}
          {selected && (
            <ItemSearch
              locationName={selected.name}
              input={searchInput}
              onChangeInput={(value) => {
                setSearchScrollTop(scrollTop.current);
                setSearchInput(value);
              }}
              onLayout={({ nativeEvent: { layout } }) => setSearchBottom(layout.y + layout.height)}
            />
          )}
          {result.status === 'loading' && <ActivityIndicator accessibilityLabel="보관함 불러오는 중" />}
          {result.status === 'error' && (
            <>
              <Text style={screenStyles.body}>보관함을 불러오지 못했어요.</Text>
              <Button title="다시 시도" onPress={() => {
                setResult({ status: 'loading' });
                setAttempt((previous) => previous + 1);
              }} />
            </>
          )}
          {result.status === 'ready' && !selected && (
            <Text style={screenStyles.body}>아직 등록된 보관 장소가 없어요.</Text>
          )}
          {selected && (
            <View style={[styles.collections, query !== '' && styles.dimmedCollections]}>
              <FolderItems key={`items-${selected.id}`} folderId={selected.id} />
              <ChildFolders key={selected.id} parentId={selected.id} />
            </View>
          )}
        </ScrollView>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={headerHeight}
          pointerEvents="box-none"
          style={StyleSheet.absoluteFill}
        >
          <View pointerEvents="box-none" style={styles.screen}>
            {selected && query !== '' && !showLocations && (
              <View pointerEvents="box-none" style={[styles.searchOverlay, { top: Math.max(0, searchBottom - searchScrollTop + 4) }]}>
                <ItemSearchResults locationId={selected.id} query={query} />
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
        {showLocations && (
          <View style={StyleSheet.absoluteFill} accessibilityViewIsModal onAccessibilityEscape={closeLocations}>
            <Pressable accessibilityRole="button" accessibilityLabel="장소 목록 닫기" style={StyleSheet.absoluteFill} onPress={closeLocations} />
            <View pointerEvents="box-none" style={[styles.menuPosition, { top: menuTop }]}>
              <View style={styles.menu}>
                <ScrollView style={styles.locationList}>
                  {roots.map((folder) => {
                    const active = folder.id === selected?.id;
                    return (
                      <Pressable
                        key={folder.id}
                        accessibilityRole="button"
                        accessibilityLabel={folder.name}
                        accessibilityState={{ selected: active }}
                        onPress={() => {
                          closeLocations();
                          if (!active) router.setParams({ locationId: folder.id });
                        }}
                        style={({ pressed }) => [styles.location, active && styles.selectedLocation, pressed && styles.pressed]}
                      >
                        <Text style={[styles.locationName, active && styles.selectedName]}>{folder.name}</Text>
                        {active && <Text style={styles.check}>✓</Text>}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </View>
        )}
      </View>
    </TabSlide>
  );
}

const styles = StyleSheet.create({
  collections: { gap: screenStyles.content.gap },
  dimmedCollections: { opacity: 0.69 },
  screen: { flex: 1 },
  searchOverlay: {
    position: 'absolute', left: screenStyles.content.padding, right: screenStyles.content.padding, bottom: 8,
  },
  locationTrigger: { alignSelf: 'flex-start', maxWidth: '100%', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  triggerName: { flexShrink: 1 },
  triggerIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  chevron: {
    width: 8, height: 8, marginTop: -3, borderRightWidth: 2, borderBottomWidth: 2,
    borderColor: colors.text, transform: [{ rotate: '45deg' }],
  },
  menuPosition: { position: 'absolute', left: screenStyles.content.padding, right: screenStyles.content.padding, bottom: 12 },
  menu: {
    flexShrink: 1, maxHeight: 320, backgroundColor: colors.surface, borderRadius: 14, padding: 4,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, elevation: 5,
    shadowColor: '#2E211C', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 5 },
  },
  locationList: { flexGrow: 0, flexShrink: 1 },
  location: {
    minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
  },
  selectedLocation: { backgroundColor: colors.primarySoft },
  locationName: { flex: 1, color: colors.text, fontSize: 16 },
  selectedName: { fontWeight: '700' },
  check: { color: '#69511B', fontSize: 17, fontWeight: '700' },
  pressed: { opacity: 0.65 },
});
