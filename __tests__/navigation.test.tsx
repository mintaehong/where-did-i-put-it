import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import HomeScreen from '../app/index';
import StorageScreen from '../app/storage';

test('홈에서 보관함을 열 수 있다', async () => {
  await renderRouter({ index: HomeScreen, storage: StorageScreen });

  expect(screen.getByText(/엄마가 기억해 줄게/)).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('link', { name: '보관함 열기' }));

  expect(screen).toHavePathname('/storage');
  expect(screen.getByText('아직 등록된 보관 장소가 없어요.')).toBeOnTheScreen();
});
