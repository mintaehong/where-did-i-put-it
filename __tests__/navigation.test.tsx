import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import RootLayout from '../app/_layout';
import FolderScreen from '../app/folder/[id]';
import HomeScreen from '../app/index';
import StorageScreen from '../app/storage';
import { createChildFolder, listRootFolders, renameFolder } from '../src/db/folders';
import { createItem, listItems } from '../src/db/items';

jest.mock('../src/db/items', () => ({
  createItem: jest.fn(),
  listItems: jest.fn(async () => []),
}));

let mockBedroomName = '안방';

beforeEach(() => {
  mockBedroomName = '안방';
});

jest.mock('../src/db/folders', () => ({
  listRootFolders: jest.fn(),
  createChildFolder: jest.fn(),
  renameFolder: jest.fn(async (_id: string, name: string) => { mockBedroomName = name; }),
  listChildFolders: async (id: string) => id === 'home' ? [{ id: 'bedroom', name: mockBedroomName }] : [],
  getFolderPath: async (id: string) => {
    const path = [
      { id: 'home', name: '우리 집' },
      { id: 'bedroom', name: mockBedroomName },
      { id: 'closet', name: '옷장' },
    ];
    return path.slice(0, path.findIndex((folder) => folder.id === id) + 1);
  },
}));

test('선택한 장소에 하위 폴더를 저장하고 목록에 표시한다', async () => {
  jest.mocked(listRootFolders).mockResolvedValue([{ id: 'home', name: '우리 집' }]);
  jest.mocked(createChildFolder).mockResolvedValue({ id: 'closet', name: '옷장' });
  await renderRouter({ storage: StorageScreen }, { initialUrl: '/storage' });

  await fireEvent.press(await screen.findByRole('button', { name: '보관 위치 추가' }));
  const input = screen.getByLabelText('보관 위치 이름');
  expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
  await fireEvent.changeText(input, '  옷장  ');
  await fireEvent.press(screen.getByRole('button', { name: '저장' }));

  expect(createChildFolder).toHaveBeenCalledTimes(1);
  expect(createChildFolder).toHaveBeenCalledWith('home', '옷장');
  expect(await screen.findByRole('link', { name: '옷장' })).toBeOnTheScreen();
});

test('보관함에서 우리 집을 거치지 않고 안방을 연다', async () => {
  jest.mocked(listRootFolders).mockResolvedValue([{ id: 'home', name: '우리 집' }]);
  await renderRouter({ _layout: RootLayout, index: HomeScreen, storage: StorageScreen, 'folder/[id]': FolderScreen });

  expect(screen.getByText(/엄마가 기억해 줄게/)).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('link', { name: '보관함 열기' }));

  expect(screen).toHavePathname('/storage');
  await fireEvent.press(await screen.findByRole('link', { name: '안방' }));
  expect(screen).toHavePathname('/folder/bedroom');
  const title = await screen.findByRole('button', { name: '안방 이름 변경' });
  expect(screen.queryByLabelText('새 폴더 이름')).toBeNull();
  expect(screen.queryByRole('button', { name: '이름 저장' })).toBeNull();
  expect(screen.queryByRole('button', { name: '취소' })).toBeNull();
  await fireEvent.press(title);
  await fireEvent.press(screen.getByRole('button', { name: '취소' }));
  expect(screen.queryByLabelText('새 폴더 이름')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: '안방 이름 변경' }));
  await fireEvent.changeText(screen.getByLabelText('새 폴더 이름'), ' 침실 ');
  await fireEvent.press(screen.getByRole('button', { name: '이름 저장' }));
  expect(renameFolder).toHaveBeenCalledWith('bedroom', '침실');
  expect(await screen.findByRole('button', { name: '침실 이름 변경' })).toBeOnTheScreen();

  jest.mocked(createChildFolder).mockResolvedValue({ id: 'closet', name: '옷장' });
  await fireEvent.press(await screen.findByRole('button', { name: '보관 위치 추가' }));
  await fireEvent.changeText(screen.getByLabelText('보관 위치 이름'), '옷장');
  await fireEvent.press(screen.getByRole('button', { name: '저장' }));
  expect(createChildFolder).toHaveBeenCalledWith('bedroom', '옷장');

  await fireEvent.press(await screen.findByRole('link', { name: '옷장' }));
  expect(screen).toHavePathname('/folder/closet');
  expect(await screen.findByRole('button', { name: '옷장 이름 변경' })).toBeOnTheScreen();
  expect(screen.getByRole('link', { name: '우리 집' })).toBeOnTheScreen();

  jest.mocked(createItem).mockResolvedValue({ id: 'passport', name: '여권' });
  await fireEvent.press(await screen.findByRole('button', { name: '물건 추가' }));
  expect(screen.getByRole('button', { name: '물건 저장' })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText('물건 이름'), ' 여권 ');
  await fireEvent.press(screen.getByRole('button', { name: '물건 저장' }));
  expect(listItems).toHaveBeenCalledWith('closet');
  expect(createItem).toHaveBeenCalledWith('closet', '여권');
  expect(await screen.findByText('여권')).toBeOnTheScreen();

  await fireEvent.press(screen.getByRole('link', { name: '침실' }));
  expect(screen).toHavePathname('/folder/bedroom');
  await act(() => router.back());
  expect(screen).toHavePathname('/storage');
  expect(await screen.findByRole('link', { name: '침실' })).toBeOnTheScreen();
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
  expect(screen.getByRole('button', { name: '회사 이름 변경' })).toBeOnTheScreen();
  expect(screen.queryByRole('link', { name: '안방' })).toBeNull();
  expect(await screen.findByText('아직 이곳에 등록된 보관 장소가 없어요.')).toBeOnTheScreen();
});
