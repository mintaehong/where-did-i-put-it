import { launchCameraAsync, launchImageLibraryAsync, PermissionStatus, requestCameraPermissionsAsync } from 'expo-image-picker';
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
jest.mock('expo-image-picker', () => ({
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  requestCameraPermissionsAsync: jest.fn(),
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied' },
}));
jest.mock('../src/itemPhotoFiles', () => ({
  itemPhotoUri: (path: string) => `file:///documents/${path}`,
}));

test('카메라 권한을 요청하고 촬영한 사진을 저장한다', async () => {
  jest.mocked(listRootFolders).mockResolvedValue([{ id: 'home', name: '우리 집' }]);
  const asset = { uri: 'file:///cache/camera.jpg', width: 100, height: 100 };
  jest.mocked(requestCameraPermissionsAsync)
    .mockResolvedValueOnce({ granted: false, status: PermissionStatus.DENIED, canAskAgain: true, expires: 'never' })
    .mockResolvedValueOnce({ granted: true, status: PermissionStatus.GRANTED, canAskAgain: true, expires: 'never' });
  jest.mocked(launchCameraAsync).mockResolvedValue({ canceled: false, assets: [asset] });
  jest.mocked(createItem).mockResolvedValue({ id: 'camera-item', name: '시계', photoPath: 'images/camera.jpg' });
  await renderRouter({ storage: StorageScreen }, { initialUrl: '/storage' });

  await fireEvent.press(await screen.findByRole('button', { name: '물건 추가' }));
  await fireEvent.changeText(screen.getByLabelText('물건 이름'), '시계');
  await fireEvent.press(screen.getByRole('button', { name: '사진 찍기' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/카메라 권한/);
  expect(launchCameraAsync).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: '사진 찍기' }));
  expect(await screen.findByLabelText('선택한 사진')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: '물건 저장' }));
  expect(createItem).toHaveBeenCalledWith('home', '시계', asset);
});

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

  jest.mocked(createItem).mockResolvedValue({ id: 'passport', name: '여권', photoPath: null });
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

test('앨범 사진을 미리 보고 물건과 함께 저장한다', async () => {
  jest.mocked(listRootFolders).mockResolvedValue([{ id: 'home', name: '우리 집' }]);
  const asset = { uri: 'file:///cache/photo.jpg', width: 100, height: 100, mimeType: 'image/jpeg' };
  jest.mocked(launchImageLibraryAsync).mockResolvedValue({ canceled: false, assets: [asset] });
  jest.mocked(createItem).mockResolvedValue({ id: 'watch', name: '시계', photoPath: 'images/watch.jpg' });
  await renderRouter({ storage: StorageScreen }, { initialUrl: '/storage' });

  await fireEvent.press(await screen.findByRole('button', { name: '물건 추가' }));
  await fireEvent.changeText(screen.getByLabelText('물건 이름'), '시계');
  await fireEvent.press(screen.getByRole('button', { name: /앨범에서 사진 추가/ }));
  expect(await screen.findByLabelText('선택한 사진')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: '사진 제거' }));
  expect(screen.queryByLabelText('선택한 사진')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: /앨범에서 사진 추가/ }));
  await fireEvent.press(screen.getByRole('button', { name: '물건 저장' }));

  expect(createItem).toHaveBeenCalledWith('home', '시계', asset);
  expect(await screen.findByLabelText('시계 사진')).toHaveProp('source', { uri: 'file:///documents/images/watch.jpg' });
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
