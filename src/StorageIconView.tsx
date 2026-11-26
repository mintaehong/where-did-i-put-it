import { StyleSheet, View } from 'react-native';

import type { StorageIcon } from './placeCovers';

type Shape = readonly [left: number, top: number, width: number, height: number, outline?: true];

const shapes: Record<StorageIcon, readonly Shape[]> = {
  desk: [[3, 9, 26, 3], [6, 12, 2, 14], [24, 12, 2, 14], [16, 12, 8, 8, true], [18, 15, 4, 1.5]],
  drawer: [[4, 5, 24, 22, true], [5, 15, 22, 1.5], [13, 10, 6, 2], [13, 20, 6, 2]],
  room: [[7, 3, 18, 25, true], [11, 7, 10, 20, true], [17, 17, 2, 2], [5, 27, 22, 2]],
  wardrobe: [[4, 3, 24, 25, true], [15, 4, 2, 22], [11, 14, 2, 5], [19, 14, 2, 5]],
  shelf: [[5, 4, 2, 24], [25, 4, 2, 24], [5, 5, 22, 2], [5, 15, 22, 2], [5, 25, 22, 2], [10, 9, 5, 6, true], [17, 19, 6, 6, true]],
  cabinet: [[4, 8, 24, 18, true], [15, 9, 2, 16], [11, 15, 2, 4], [19, 15, 2, 4], [7, 25, 2, 4], [23, 25, 2, 4]],
};

export default function StorageIconView({ icon }: { icon: StorageIcon }) {
  return (
    <View style={styles.canvas} accessible={false} importantForAccessibility="no-hide-descendants">
      {shapes[icon].map(([left, top, width, height, outline], index) => (
        <View key={index} style={[styles.shape, outline ? styles.outline : styles.fill, { left, top, width, height }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { width: 32, height: 32 },
  shape: { position: 'absolute' },
  outline: { borderWidth: 1.5, borderColor: '#69511B', borderRadius: 2 },
  fill: { backgroundColor: '#69511B', borderRadius: 1 },
});
