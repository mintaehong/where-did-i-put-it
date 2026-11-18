import { ScrollView, Text } from 'react-native';

import { screenStyles } from '../src/theme';

export default function StorageScreen() {
  return (
    <ScrollView contentContainerStyle={screenStyles.content}>
      <Text accessibilityRole="header" style={screenStyles.heading}>
        보관 장소
      </Text>
      <Text style={screenStyles.body}>아직 등록된 보관 장소가 없어요.</Text>
    </ScrollView>
  );
}
