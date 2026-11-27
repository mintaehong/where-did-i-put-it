import { StyleSheet, View } from 'react-native';

export default function ParcelMark({ small = false }: { small?: boolean }) {
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={[styles.parcel, small && styles.small]}>
      <View style={styles.lid} />
      <View style={styles.seam} />
    </View>
  );
}

const styles = StyleSheet.create({
  parcel: { width: 30, height: 25, borderWidth: 1.5, borderColor: '#817E77', borderRadius: 3 },
  lid: { position: 'absolute', top: 6, left: 0, right: 0, borderTopWidth: 1.5, borderColor: '#817E77' },
  seam: { position: 'absolute', top: 0, left: 12, height: 11, borderLeftWidth: 1.5, borderColor: '#817E77' },
  small: { transform: [{ scale: 0.72 }] },
});
