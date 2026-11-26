import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Button, Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { listItems } from './db/items';
import { itemPhotoUri } from './itemPhotoFiles';
import { colors, screenStyles } from './theme';

const viewOptions = [{ value: 'grid', label: '카드' }, { value: 'list', label: '목록' }] as const;
const cardsPerPage = 4;

export default function FolderItems({ folderId }: { folderId: string }) {
  const router = useRouter();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [items, setItems] = useState<Awaited<ReturnType<typeof listItems>>>();
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);

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
        <Text accessibilityRole="header" style={styles.heading}>보관 중인 물건</Text>
        {!loadError && !!items?.length && (
          <View style={styles.viewToggle}>
            {viewOptions.map(({ value, label }) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityLabel={label + ' 보기'}
                accessibilityState={{ selected: view === value }}
                onPress={() => setView(value)}
                style={[styles.viewOption, view === value && styles.activeView]}
              >
                <Text style={[styles.viewLabel, view === value && styles.activeViewLabel]}>{label}</Text>
              </Pressable>
            ))}
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
              <Text style={screenStyles.body}>아직 등록된 물건이 없어요.</Text>
            </View>
          ) : (
            <ItemCollection items={items} isList={view === 'list'} />
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

  function renderItem(item: typeof items[number]) {
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
        <Text style={[styles.placeholderIcon, isList && styles.listIcon]}>📦</Text>
      </View>
    );

    return (
      <Link key={item.id} href={{ pathname: '/item/[id]', params: { id: item.id } }} asChild>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={item.name}
          style={({ pressed }) => [styles.itemCard, pressed && styles.cardPressed]}
        >
          {isList ? (
            <View style={styles.listRow}>
              <Text numberOfLines={1} style={styles.cardName}>{item.name}</Text>
              {media}
              <Text style={styles.chevron}>›</Text>
            </View>
          ) : (
            <>
              {media}
              <View style={styles.cardCaption}>
                <Text numberOfLines={2} style={styles.cardName}>{item.name}</Text>
                <Text style={styles.chevron}>›</Text>
              </View>
            </>
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

  if (isList) return <View style={styles.itemList}>{items.map((item) => renderItem(item))}</View>;
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
  addButton: {
    minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14,
    backgroundColor: '#FFEBAA', paddingHorizontal: 16, paddingVertical: 10,
  },
  addButtonPressed: { backgroundColor: '#F6DB86' },
  addLabel: { color: colors.text, fontSize: 15, fontWeight: '700' },
  heading: { color: colors.text, fontSize: 18, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  viewToggle: { flexDirection: 'row', backgroundColor: '#EAF1EA', borderRadius: 12, padding: 3 },
  viewOption: { minWidth: 48, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, borderRadius: 9 },
  activeView: { backgroundColor: colors.surface },
  viewLabel: { color: colors.muted, fontSize: 13 },
  activeViewLabel: { color: '#2D6654', fontWeight: '700' },
  empty: {
    borderRadius: 14,
    backgroundColor: '#F1F3EA',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  itemGrid: { gap: 12 },
  cardRow: { flexDirection: 'row', gap: 10 },
  cardColumn: { flex: 1, minWidth: 0 },
  singleCardColumn: { maxWidth: '48%' },
  cardPages: { gap: 6 },
  pageHint: { color: colors.muted, fontSize: 13, textAlign: 'right' },
  itemList: { gap: 8 },
  itemCard: {
    backgroundColor: colors.surface,
    borderColor: '#E0E7DE',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardPressed: { opacity: 0.78 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 10 },
  cardMedia: { width: '100%', height: 76, backgroundColor: '#E8EFE8' },
  listMedia: { width: 30, height: 30, borderRadius: 6, backgroundColor: '#E8EFE8' },
  cardPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderIcon: { fontSize: 24, opacity: 0.8 },
  listIcon: { fontSize: 15 },
  cardCaption: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 38, paddingHorizontal: 8, paddingVertical: 4 },
  cardName: { color: colors.text, flex: 1, fontSize: 15, fontWeight: '700' },
  chevron: { color: '#5B7567', fontSize: 18 },
});
