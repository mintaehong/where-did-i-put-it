import { launchCameraAsync, launchImageLibraryAsync, PermissionStatus, requestCameraPermissionsAsync } from 'expo-image-picker';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import RootLayout from '../app/_layout';
import FolderScreen from '../app/folder/[id]';
import HomeScreen from '../app/index';
import ItemScreen from '../app/item/[id]';
import StorageScreen from '../app/storage';
import { createChildFolder, listRootFolders, renameFolder } from '../src/db/folders';
import { askForItems, attachItemPhoto, createItem, deleteItem, getItemDetails, listItems, moveItem, removeItemPhoto, renameItem, replaceItemPhoto, searchItems } from '../src/db/items';

jest.mock('../src/db/items', () => ({
  createItem: jest.fn(),
  attachItemPhoto: jest.fn(),
  replaceItemPhoto: jest.fn(),
  removeItemPhoto: jest.fn(),
  deleteItem: jest.fn(),
  moveItem: jest.fn(),
  getItemDetails: jest.fn(),
  searchItems: jest.fn(),
  askForItems: jest.fn(),
  renameItem: jest.fn(),
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
  await renderRouter({
    _layout: RootLayout, index: HomeScreen, storage: StorageScreen,
    'folder/[id]': FolderScreen, 'item/[id]': ItemScreen,
  });

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

test('사진 없는 물건의 상세에서 사진을 추가한다', async () => {
  const asset = { uri: 'file:///cache/passport.jpg', width: 100, height: 100 };
  jest.mocked(getItemDetails).mockResolvedValueOnce({
    id: 'passport', name: '여권', folderId: 'home', photoPath: null, path: [],
  });
  jest.mocked(launchImageLibraryAsync).mockResolvedValueOnce({ canceled: false, assets: [asset] });
  jest.mocked(attachItemPhoto).mockResolvedValueOnce('images/passport.jpg');
  await renderRouter({ 'item/[id]': ItemScreen }, { initialUrl: '/item/passport' });

  await fireEvent.press(await screen.findByRole('button', { name: '앨범에서 사진 추가' }));
  expect(await screen.findByLabelText('선택한 사진')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: '사진 저장' }));
  expect(attachItemPhoto).toHaveBeenCalledWith('passport', asset);
  expect(await screen.findByLabelText('여권 사진')).toHaveProp('source', { uri: 'file:///documents/images/passport.jpg' });
  expect(screen.queryByRole('button', { name: '사진 저장' })).toBeNull();
});

test('상세에서 사진 교체를 취소하거나 저장한다', async () => {
  const asset = { uri: 'file:///cache/new.jpg', width: 100, height: 100 };
  jest.mocked(getItemDetails).mockResolvedValueOnce({
    id: 'watch', name: '시계', photoPath: 'images/old.jpg', folderId: 'home', path: [],
  });
  jest.mocked(launchImageLibraryAsync).mockResolvedValue({ canceled: false, assets: [asset] });
  jest.mocked(replaceItemPhoto).mockResolvedValueOnce('images/new.jpg');
  await renderRouter({ 'item/[id]': ItemScreen }, { initialUrl: '/item/watch' });

  const chooseReplacement = async () => {
    await fireEvent.press(await screen.findByRole('button', { name: '사진 바꾸기' }));
    expect(screen).toHavePathname('/item/watch');
    expect(screen.getByLabelText('시계 사진')).toHaveProp('source', { uri: 'file:///documents/images/old.jpg' });
    await fireEvent.press(screen.getByRole('button', { name: '앨범에서 사진 추가' }));
    expect(await screen.findByLabelText('선택한 사진')).toBeOnTheScreen();
  };
  await chooseReplacement();
  await fireEvent.press(screen.getByRole('button', { name: '사진 선택 취소' }));
  expect(replaceItemPhoto).not.toHaveBeenCalled();
  expect(screen.getByLabelText('시계 사진')).toHaveProp('source', { uri: 'file:///documents/images/old.jpg' });

  await chooseReplacement();
  await fireEvent.press(screen.getByRole('button', { name: '사진 저장' }));
  expect(replaceItemPhoto).toHaveBeenCalledWith('watch', 'images/old.jpg', asset);
  expect(await screen.findByLabelText('시계 사진')).toHaveProp('source', { uri: 'file:///documents/images/new.jpg' });
});

test('상세에서 확인한 뒤 첨부 사진만 삭제한다', async () => {
  jest.mocked(getItemDetails).mockResolvedValueOnce({
    id: 'watch', name: '시계', photoPath: 'images/watch.jpg', folderId: 'home',
    path: [{ id: 'home', name: '우리 집' }],
  });
  jest.mocked(removeItemPhoto).mockResolvedValueOnce(undefined);
  await renderRouter({ 'item/[id]': ItemScreen }, { initialUrl: '/item/watch' });

  await fireEvent.press(await screen.findByRole('button', { name: '사진 삭제' }));
  await fireEvent.press(screen.getByRole('button', { name: '취소' }));
  expect(removeItemPhoto).not.toHaveBeenCalled();
  expect(screen.getByLabelText('시계 사진')).toBeOnTheScreen();

  await fireEvent.press(screen.getByRole('button', { name: '사진 삭제' }));
  await fireEvent.press(screen.getByRole('button', { name: '사진 삭제 확인' }));
  expect(removeItemPhoto).toHaveBeenCalledWith('watch', 'images/watch.jpg');
  expect(await screen.findByRole('button', { name: '사진 찍기' })).toBeOnTheScreen();
  expect(screen.queryByLabelText('시계 사진')).toBeNull();
  expect(screen.getByRole('button', { name: '시계 이름 변경' })).toBeOnTheScreen();
  expect(screen.getByText('우리 집')).toBeOnTheScreen();
});

test('물건 삭제를 확인하면 보관함 목록에서 사라진다', async () => {
  const item = { id: 'watch', name: '시계', photoPath: 'images/watch.jpg' };
  jest.mocked(listRootFolders).mockResolvedValue([{ id: 'home', name: '우리 집' }]);
  jest.mocked(listItems).mockResolvedValueOnce([item]);
  jest.mocked(getItemDetails).mockResolvedValueOnce({
    ...item, folderId: 'home', path: [{ id: 'home', name: '우리 집' }],
  });
  jest.mocked(deleteItem).mockResolvedValueOnce(undefined);
  await renderRouter({ storage: StorageScreen, 'item/[id]': ItemScreen }, { initialUrl: '/storage' });

  await fireEvent.press(await screen.findByRole('link', { name: '시계' }));
  await fireEvent.press(await screen.findByRole('button', { name: '물건 삭제' }));
  await fireEvent.press(screen.getByRole('button', { name: '취소' }));
  expect(deleteItem).not.toHaveBeenCalled();
  expect(screen).toHavePathname('/item/watch');

  await fireEvent.press(screen.getByRole('button', { name: '물건 삭제' }));
  await fireEvent.press(screen.getByRole('button', { name: '물건 삭제 확인' }));
  expect(deleteItem).toHaveBeenCalledWith('watch');
  expect(await screen.findByText('아직 등록된 물건이 없어요.')).toBeOnTheScreen();
  expect(screen).toHavePathname('/storage');
  expect(screen.queryByRole('link', { name: '시계' })).toBeNull();
});

test('물건을 다른 보관 위치로 옮기면 경로와 양쪽 목록이 갱신된다', async () => {
  const home = { id: 'home', name: '우리 집' };
  const office = { id: 'office', name: '회사' };
  const item = { id: 'watch', name: '시계', photoPath: 'images/watch.jpg' };
  jest.mocked(listRootFolders).mockResolvedValue([home, office]);
  jest.mocked(listItems).mockResolvedValueOnce([item]);
  jest.mocked(getItemDetails).mockResolvedValueOnce({ ...item, folderId: home.id, path: [home] });
  jest.mocked(moveItem).mockResolvedValueOnce(undefined);
  await renderRouter({ storage: StorageScreen, 'item/[id]': ItemScreen }, { initialUrl: '/storage' });

  await fireEvent.press(await screen.findByRole('link', { name: '시계' }));
  await fireEvent.press(await screen.findByRole('button', { name: '보관 위치 바꾸기' }));
  expect(screen.getByRole('button', { name: '여기로 옮기기' })).toBeDisabled();
  await fireEvent.press(await screen.findByRole('button', { name: '회사' }));
  await fireEvent.press(screen.getByRole('button', { name: '여기로 옮기기' }));

  expect(moveItem).toHaveBeenCalledWith('watch', 'office');
  expect(await screen.findByText('회사')).toBeOnTheScreen();
  expect(screen.getByLabelText('시계 사진')).toBeOnTheScreen();
  await act(() => router.back());
  expect(await screen.findByText('아직 등록된 물건이 없어요.')).toBeOnTheScreen();
  jest.mocked(listItems).mockResolvedValueOnce([item]);
  await fireEvent.press(screen.getByRole('button', { name: '회사' }));
  expect(await screen.findByRole('link', { name: '시계' })).toBeOnTheScreen();
  expect(listItems).toHaveBeenLastCalledWith('office');
});

test('보관함에서 물건 이름 일부를 입력하면 바로 결과가 나오고 상세를 열 수 있다', async () => {
  const item = {
    id: 'sticker', name: '스티커', photoPath: null, folderId: 'closet',
    path: [{ id: 'home', name: '우리 집' }, { id: 'closet', name: '옷장' }],
  };
  jest.mocked(searchItems).mockResolvedValueOnce([]).mockResolvedValueOnce([item]);
  jest.mocked(getItemDetails).mockResolvedValueOnce(item);
  jest.mocked(listRootFolders).mockResolvedValue([{ id: 'home', name: '우리 집' }]);
  await renderRouter({ storage: StorageScreen, 'item/[id]': ItemScreen }, { initialUrl: '/storage' });

  const input = screen.getByLabelText('물건 이름 검색');
  expect(screen.queryByRole('button', { name: '물어보기' })).toBeNull();
  await fireEvent.changeText(input, '없는 물건');
  expect(await screen.findByText(/해당하는 물건이 없어요/)).toBeOnTheScreen();

  await fireEvent.changeText(input, ' 스티 ');
  expect(await screen.findByText('우리 집 › 옷장')).toBeOnTheScreen();
  expect(searchItems).toHaveBeenLastCalledWith('스티');
  await fireEvent.press(screen.getByRole('link', { name: /스티커/ }));
  expect(screen).toHavePathname('/item/sticker');
  expect(await screen.findByRole('button', { name: '스티커 이름 변경' })).toBeOnTheScreen();
});

test('말하듯 물으면 실제 위치를 답하고 물건 이름이 없으면 다시 묻는다', async () => {
  const item = {
    id: 'sticker', name: '스티커', photoPath: null, folderId: 'closet',
    path: [{ id: 'home', name: '우리 집' }, { id: 'closet', name: '옷장' }],
  };
  jest.mocked(searchItems).mockClear();
  jest.mocked(askForItems).mockClear();
  jest.mocked(askForItems).mockResolvedValueOnce([item]).mockResolvedValueOnce([]);
  await renderRouter({ index: HomeScreen });

  const input = screen.getByLabelText('엄마에게 물어보기');
  expect(screen.queryByLabelText('물건 이름 검색')).toBeNull();
  await fireEvent.changeText(input, '야 스티커 어딨냐');
  expect(askForItems).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: '물어보기' }));
  expect(await screen.findByText('‘스티커’, 옷장에 있어~')).toBeOnTheScreen();
  expect(screen.getByText('우리 집 › 옷장')).toBeOnTheScreen();
  expect(askForItems).toHaveBeenLastCalledWith('야 스티커 어딨냐');
  expect(searchItems).not.toHaveBeenCalled();

  await fireEvent.changeText(input, '아까 쓰던 그거 어딨냐');
  await fireEvent.press(screen.getByRole('button', { name: '물어보기' }));
  expect(await screen.findByText(/이름을 넣어서 다시 물어봐/)).toBeOnTheScreen();
  expect(screen.queryByText('우리 집 › 옷장')).toBeNull();
});

test('목록에서 물건 상세를 열어 사진과 전체 보관 위치를 확인한다', async () => {
  const item = { id: 'watch', name: '시계', photoPath: 'images/watch.jpg' };
  jest.mocked(listRootFolders).mockResolvedValue([{ id: 'home', name: '우리 집' }]);
  jest.mocked(listItems).mockResolvedValueOnce([item]);
  jest.mocked(getItemDetails).mockResolvedValueOnce({
    ...item,
    folderId: 'closet',
    path: [{ id: 'home', name: '우리 집' }, { id: 'bedroom', name: '안방' }, { id: 'closet', name: '옷장' }],
  });
  await renderRouter({ 'folder/[id]': FolderScreen, 'item/[id]': ItemScreen }, { initialUrl: '/folder/closet' });

  await fireEvent.press(await screen.findByRole('link', { name: '시계' }));
  expect(screen).toHavePathname('/item/watch');
  expect(await screen.findByRole('button', { name: '시계 이름 변경' })).toBeOnTheScreen();
  expect(screen.getByText('우리 집 › 안방 › 옷장')).toBeOnTheScreen();
  expect(screen.getByLabelText('시계 사진')).toHaveProp('source', { uri: 'file:///documents/images/watch.jpg' });

  await fireEvent.press(screen.getByRole('button', { name: '시계 이름 변경' }));
  await fireEvent.changeText(screen.getByLabelText('새 물건 이름'), ' 손목시계 ');
  await fireEvent.press(screen.getByRole('button', { name: '이름 저장' }));
  expect(renameItem).toHaveBeenCalledWith('watch', '손목시계');
  expect(await screen.findByRole('button', { name: '손목시계 이름 변경' })).toBeOnTheScreen();
  expect(screen.getByLabelText('손목시계 사진')).toHaveProp('source', { uri: 'file:///documents/images/watch.jpg' });

  jest.mocked(listItems).mockResolvedValueOnce([{ ...item, name: '손목시계' }]);
  await act(() => router.back());
  expect(await screen.findByRole('link', { name: '손목시계' })).toBeOnTheScreen();
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
