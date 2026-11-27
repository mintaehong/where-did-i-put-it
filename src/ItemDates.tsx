import { StyleSheet, Text, View } from 'react-native';

import { colors } from './theme';

const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric', month: 'numeric', day: 'numeric',
});

function formatDate(value?: string) {
  if (!value) return;
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return dateFormatter.format(date);
}

export default function ItemDates({ createdAt, updatedAt }: { createdAt?: string; updatedAt?: string }) {
  const created = formatDate(createdAt);
  const updated = updatedAt !== createdAt ? formatDate(updatedAt) : undefined;
  if (!created && !updated) return null;
  return (
    <View style={styles.dates}>
      {created && <Text style={styles.text}>등록일 {created}</Text>}
      {updated && <Text style={styles.text}>수정일 {updated}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  dates: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 2 },
  text: { color: colors.muted, fontSize: 12, lineHeight: 17 },
});
