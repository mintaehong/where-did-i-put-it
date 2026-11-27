import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Button, Image, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { TabIcon } from './BottomNavigation';
import { listItems } from './db/items';
import { itemPhotoUri } from './itemPhotoFiles';
import ParcelMark from './ParcelMark';
import { colors, screenStyles } from './theme';

const viewOptions = [{ value: 'grid', label: '카드' }, { value: 'list', label: '목록' }] as const;
const cardsPerPage = 4;
const sortOptions = [
  { id: 'newest', label: '최근 등록순' },
  { id: 'oldest', label: '오래된 등록순' },
  { id: 'name', label: '이름순' },
] as const;
type ItemSort = typeof sortOptions[number]['id'];
const itemCollator = new Intl.Collator('ko-KR', { numeric: true, sensitivity: 'base' });

export default function FolderItems({ folderId }: { folderId: string }) {
  const router = useRouter();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [sort, setSort] = useState<ItemSort>('newest');
  const [sorting, setSorting] = useState(false);
  const [items, setItems] = useState<Awaited<ReturnType<typeof listItems>>>();
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const currentSort = sortOptions.find((option) => option.id === sort);
  const sortedItems = useMemo(() => {
    if (sort === 'newest') return items?.slice().reverse();
    if (sort === 'name') return items?.slice().sort((first, second) => itemCollator.compare(first.name, second.name));
    return items;
  }, [items, sort]);

  useFocusEffect(useCallback(() => {
    let active = true;
    listItems(folderId).then(
      (rows) => {
        if (active) {
          setItems(rows);
          setLoadError(false);
        }
      },
      () => { if (active) setLoadError(true); },
    );
    return () => { active = false; };
  }, [folderId, attempt]));

  return (
    <>
      <View style={styles.sectionHeader}>
        <Text accessibilityRole="header" style={styles.heading}>여기에 둔 물건</Text>
        {!loadError && !!items?.length && (
          <View style={styles.sectionControls}>
            <View style={styles.viewToggle}>
              <View pointerEvents="none" style={styles.viewTrack} />
              {viewOptions.map(({ value, label }) => (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityLabel={label + ' 보기'}
                  accessibilityState={{ selected: view === value }}
                  onPress={() => setView(value)}
                  style={styles.viewOption}
                >
                  <View style={[styles.viewPill, view === value && styles.activeView]}>
                    <Text style={[styles.viewLabel, view === value && styles.activeViewLabel]}>{label}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
            {items.length > 1 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`물건 정렬, ${currentSort?.label}`}
                accessibilityState={{ expanded: sorting }}
                onPress={() => setSorting(true)}
                style={styles.sortTrigger}
              >
                <View style={styles.sortIcon} importantForAccessibility="no-hide-descendants">
                  <View style={styles.sortLines}>
                    <View style={[styles.sortLine, { width: 10 }]} />
                    <View style={[styles.sortLine, { width: 7 }]} />
                    <View style={[styles.sortLine, { width: 4 }]} />
                  </View>
                  <View style={styles.sortArrow}>
                    <View style={styles.sortArrowTip} />
                  </View>
                </View>
              </Pressable>
            )}
          </View>
        )}
      </View>
      {loadError ? (
        <>
          <Text accessibilityRole="alert">물건을 불러오지 못했어요.</Text>
          <Button title="물건 다시 불러오기" onPress={() => {
            setLoadError(false);
            setAttempt((previous) => previous + 1);
          }} />
        </>
      ) : !items ? (
        <ActivityIndicator accessibilityLabel="물건 불러오는 중" />
      ) : (
        <>
          {items.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <TabIcon path="/storage" color={colors.text} />
              </View>
              <Text style={[screenStyles.body, styles.emptyMessage]}>여기에 둔 물건이 아직 없어요.</Text>
            </View>
          ) : (
            <ItemCollection key={sort} items={sortedItems ?? items} isList={view === 'list'} />
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="물건 추가"
            onPress={() => router.push({ pathname: '/item/new', params: { folderId } })}
            style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
          >
            <Text style={styles.addLabel}>＋ 물건 추가</Text>
          </Pressable>
        </>
      )}
      <Modal visible={sorting} transparent animationType="fade" onRequestClose={() => setSorting(false)}>
        <View style={styles.sortOverlay}>
          <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={() => setSorting(false)} />
          <View style={styles.sortMenu} accessibilityViewIsModal>
            <Text accessibilityRole="header" style={styles.sortTitle}>물건 정렬</Text>
            {sortOptions.map(({ id, label }) => (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ selected: sort === id }}
                onPress={() => {
                  setSort(id);
                  setSorting(false);
                }}
                style={[styles.sortOption, sort === id && styles.sortSelected]}
              >
                <Text style={styles.sortLabel}>{label}</Text>
                {sort === id && <Text style={styles.sortLabel}>✓</Text>}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}

function ItemCollection({ items, isList }: {
  items: Awaited<ReturnType<typeof listItems>>;
  isList: boolean;
}) {
  const { width } = useWindowDimensions();
  const [layoutWidth, setLayoutWidth] = useState<number>();
  const pageWidth = layoutWidth ?? Math.max(1, width - 48);

  function renderItem(item: typeof items[number], separated = false) {
    const mediaStyle = isList ? styles.listMedia : styles.cardMedia;
    const media = item.photoPath ? (
      <Image
        accessibilityLabel={`${item.name} 사진`}
        accessible
        source={{ uri: itemPhotoUri(item.photoPath) }}
        resizeMode="cover"
        style={mediaStyle}
      />
    ) : (
      <View style={[mediaStyle, styles.cardPlaceholder]} accessible={false}>
        <ParcelMark small={isList} />
      </View>
    );

    return (
      <Link key={item.id} href={{ pathname: '/item/[id]', params: { id: item.id } }} asChild>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={item.name}
          style={({ pressed }) => pressed && styles.cardPressed}
        >
          {isList ? (
            <View style={[styles.listRow, separated && styles.listDivider]}>
              <Text numberOfLines={1} style={styles.cardName}>{item.name}</Text>
              {media}
              <Text accessible={false} style={styles.cardChevron}>›</Text>
            </View>
          ) : (
            <View style={styles.itemCard}>
              {media}
              <View style={styles.cardCaption}>
                <Text numberOfLines={1} style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardChevron}>›</Text>
              </View>
            </View>
          )}
        </Pressable>
      </Link>
    );
  }

  function renderCardRows(pageItems: typeof items) {
    return Array.from({ length: Math.ceil(pageItems.length / 2) }, (_, index) => {
      const row = pageItems.slice(index * 2, index * 2 + 2);
      return (
        <View key={row[0].id} style={styles.cardRow} testID="item-card-row">
          {row.map((item) => (
            <View key={item.id} style={[styles.cardColumn, row.length === 1 && styles.singleCardColumn]}>
              {renderItem(item)}
            </View>
          ))}
        </View>
      );
    });
  }

  if (isList) return <View style={styles.itemList}>{items.map((item, index) => renderItem(item, index > 0))}</View>;
  if (items.length <= cardsPerPage) return <View style={styles.itemGrid}>{renderCardRows(items)}</View>;

  return (
    <View onLayout={(event) => setLayoutWidth(event.nativeEvent.layout.width)} style={styles.cardPages}>
      <ScrollView horizontal pagingEnabled keyboardShouldPersistTaps="handled">
        {Array.from({ length: Math.ceil(items.length / cardsPerPage) }, (_, page) => {
          const start = page * cardsPerPage;
          return (
            <View key={page} style={[styles.itemGrid, { width: pageWidth }]}>
              {renderCardRows(items.slice(start, start + cardsPerPage))}
            </View>
          );
        })}
      </ScrollView>
      <Text style={styles.pageHint}>옆으로 넘겨 더 보기 ›</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sortTrigger: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  sortIcon: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  sortLines: { gap: 3 },
  sortLine: { height: 1.5, borderRadius: 1, backgroundColor: colors.text },
  sortArrow: { width: 1.5, height: 12, backgroundColor: colors.text },
  sortArrowTip: {
    position: 'absolute', left: -2.4, bottom: 0, width: 6, height: 6,
    borderRightWidth: 1.5, borderBottomWidth: 1.5, borderColor: colors.text, transform: [{ rotate: '45deg' }],
  },
  sortLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  sortOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#241A165C' },
  sortMenu: { width: '100%', maxWidth: 320, borderRadius: 18, backgroundColor: colors.surface, padding: 12, gap: 4 },
  sortTitle: { color: colors.text, fontSize: 16, fontWeight: '700', paddingHorizontal: 10, paddingVertical: 8 },
  sortOption: {
    minHeight: 44, borderRadius: 10, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 8, paddingHorizontal: 10,
  },
  sortSelected: { backgroundColor: colors.primarySoft },
  addButton: {
    minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14,
    backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10,
  },
  addButtonPressed: { backgroundColor: '#F6DB86' },
  addLabel: { color: colors.text, fontSize: 15, fontWeight: '700' },
  heading: { color: colors.text, fontSize: 18, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sectionControls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginLeft: 'auto' },
  viewToggle: {
    flexDirection: 'row', paddingHorizontal: 3,
  },
  viewTrack: {
    position: 'absolute', top: 5, bottom: 5, left: 0, right: 0,
    backgroundColor: '#F2EDE5', borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  viewOption: { minWidth: 44, minHeight: 44, alignItems: 'stretch', justifyContent: 'center' },
  viewPill: { minHeight: 28, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 14 },
  activeView: { backgroundColor: colors.primary },
  viewLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  activeViewLabel: { color: colors.text, fontWeight: '700' },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  emptyIcon: {
    width: 38, height: 38, alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, backgroundColor: colors.primarySoft,
  },
  emptyMessage: { flex: 1 },
  itemGrid: { gap: 12 },
  cardRow: { flexDirection: 'row', gap: 10 },
  cardColumn: { flex: 1, minWidth: 0 },
  singleCardColumn: { maxWidth: '48%' },
  cardPages: { gap: 6 },
  pageHint: { color: colors.muted, fontSize: 13, textAlign: 'right' },
  itemList: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    overflow: 'hidden',
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  cardPressed: { opacity: 0.78 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50, paddingHorizontal: 12, paddingVertical: 7 },
  listDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  cardMedia: { width: '100%', aspectRatio: 4 / 3, backgroundColor: colors.primarySoft },
  listMedia: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.primarySoft },
  cardPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardCaption: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 42, paddingHorizontal: 10, paddingVertical: 6 },
  cardName: { color: colors.text, flex: 1, fontSize: 15, fontWeight: '700' },
  cardChevron: { color: colors.muted, fontSize: 18 },
});
