import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import HomeScreen from '../app/index';
import StorageScreen from '../app/storage';

jest.mock('../src/db/folders', () => ({
  listRootFolders: async () => [{ id: 'test-folder', name: '우리 집' }],
}));

test('홈에서 보관함을 열 수 있다', async () => {
  await renderRouter({ index: HomeScreen, storage: StorageScreen });

  expect(screen.getByText(/엄마가 기억해 줄게/)).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('link', { name: '보관함 열기' }));

  expect(screen).toHavePathname('/storage');
  expect(await screen.findByText('우리 집')).toBeOnTheScreen();
});
