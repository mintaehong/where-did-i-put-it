import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import FolderScreen from '../app/folder/[id]';
import HomeScreen from '../app/index';
import StorageScreen from '../app/storage';
import { listRootFolders } from '../src/db/folders';

jest.mock('../src/db/folders', () => ({
  listRootFolders: jest.fn(),
  listChildFolders: async (id: string) => id === 'home' ? [{ id: 'bedroom', name: '안방' }] : [],
  getFolder: async (id: string) => id === 'bedroom' ? { id, name: '안방' } : null,
}));

test('보관함에서 우리 집을 거치지 않고 안방을 연다', async () => {
  jest.mocked(listRootFolders).mockResolvedValue([{ id: 'home', name: '우리 집' }]);
  await renderRouter({ index: HomeScreen, storage: StorageScreen, 'folder/[id]': FolderScreen });

  expect(screen.getByText(/엄마가 기억해 줄게/)).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('link', { name: '보관함 열기' }));

  expect(screen).toHavePathname('/storage');
  await fireEvent.press(await screen.findByRole('link', { name: '안방' }));
  expect(screen).toHavePathname('/folder/bedroom');
  expect(await screen.findByRole('header', { name: '안방' })).toBeOnTheScreen();

  await act(() => router.back());
  expect(screen).toHavePathname('/storage');
});

test('최상위 장소가 여러 개면 보관함 안에서 전환한다', async () => {
  jest.mocked(listRootFolders).mockResolvedValue([
    { id: 'home', name: '우리 집' },
    { id: 'office', name: '회사' },
  ]);
  await renderRouter({ storage: StorageScreen }, { initialUrl: '/storage' });

  expect(await screen.findByRole('link', { name: '안방' })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: '회사' }));

  expect(screen).toHavePathname('/storage');
  expect(screen.getByRole('header', { name: '회사' })).toBeOnTheScreen();
  expect(screen.queryByRole('link', { name: '안방' })).toBeNull();
  expect(await screen.findByText('아직 이곳에 등록된 보관 장소가 없어요.')).toBeOnTheScreen();
});
