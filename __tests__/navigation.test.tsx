import { launchCameraAsync, launchImageLibraryAsync, PermissionStatus, requestCameraPermissionsAsync } from 'expo-image-picker';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, within } from 'expo-router/testing-library';
import { Platform } from 'react-native';

import RootLayout from '../app/_layout';
import AskScreen from '../app/ask';
import FolderScreen from '../app/folder/[id]';
import HomeScreen from '../app/index';
import ItemScreen from '../app/item/[id]';
import NewItemScreen from '../app/item/new';
import StorageScreen from '../app/storage';
import { createChildFolder, createRootFolder, deleteChildFolder, listChildFolders, listRootChildFolders, listRootFolders, renameFolder, updateChildFolderCover } from '../src/db/folders';
import { askForItems, attachItemPhoto, createItem, deleteItem, getItemDetails, listItems, listRecentItemsByLocation, moveItem, removeItemPhoto, renameItem, replaceItemPhoto, saveItemNote, searchItems } from '../src/db/items';

jest.mock('react-native-keyboard-controller', () => jest.requireActual('react-native-keyboard-controller/jest'));
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
  saveItemNote: jest.fn(),
  listItems: jest.fn(async () => []),
  listRecentItemsByLocation: jest.fn(async () => []),
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

test('카메라 권한을 요청하고 촬영한 사진과 메모를 함께 저장한다', async () => {
  jest.mocked(listRootFolders).mockResolvedValue([{ id: 'home', name: '우리 집' }]);
  const asset = { uri: 'file:///cache/camera.jpg', width: 100, height: 100 };
  jest.mocked(requestCameraPermissionsAsync)
    .mockResolvedValueOnce({ granted: false, status: PermissionStatus.DENIED, canAskAgain: true, expires: 'never' })
    .mockResolvedValueOnce({ granted: true, status: PermissionStatus.GRANTED, canAskAgain: true, expires: 'never' });
  jest.mocked(launchCameraAsync).mockResolvedValue({ canceled: false, assets: [asset] });
  jest.mocked(createItem).mockResolvedValue({ id: 'camera-item', name: '시계', photoPath: 'images/camera.jpg' });
  await renderRouter({ storage: StorageScreen, 'item/new': NewItemScreen }, { initialUrl: '/storage' });

  await fireEvent.press(await screen.findByRole('button', { name: '물건 추가' }));
  expect(screen).toHavePathname('/item/new');
  await fireEvent.changeText(await screen.findByLabelText('물건 이름'), '시계');
  await fireEvent.changeText(screen.getByLabelText('물건 메모'), '검은 파우치 안');
  await fireEvent.press(screen.getByRole('button', { name: '사진 찍기' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/카메라 권한/);
  expect(launchCameraAsync).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: '사진 찍기' }));
  expect(await screen.findByLabelText('선택한 사진')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: '보관 위치 바꾸기' }));
  expect(await screen.findByRole('button', { name: '우리 집, 현재 보관 위치' })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: '안방 하위 위치 펼치기' }));
  expect(screen.getByRole('button', { name: '옷장' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: '이 위치 선택' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: '안방' }));
  expect(screen.getByRole('button', { name: '안방', selected: true })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: '옷장' })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: '이 위치 선택' }));
  expect(screen.getByText('우리 집 › 안방')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: '물건 저장' }));
  expect(createItem).toHaveBeenCalledWith('bedroom', '시계', { photo: asset, note: '검은 파우치 안' });
  expect(moveItem).not.toHaveBeenCalled();
  expect(screen).toHavePathname('/storage');
});

let mockBedroomName = '안방';

beforeEach(() => {
  mockBedroomName = '안방';
});

jest.mock('../src/db/folders', () => ({
  listRootFolders: jest.fn(),
  listFolderTree: jest.fn(async () => [
    { id: 'home', name: '우리 집', parentId: null },
    { id: 'bedroom', name: mockBedroomName, parentId: 'home' },
    { id: 'closet', name: '옷장', parentId: 'bedroom' },
    { id: 'office', name: '회사', parentId: null },
  ]),
  listRootChildFolders: jest.fn(async () => []),
  createChildFolder: jest.fn(),
  updateChildFolderCover: jest.fn(),
  createRootFolder: jest.fn(),
  deleteChildFolder: jest.fn(),
  renameFolder: jest.fn(async (_id: string, name: string) => { mockBedroomName = name; }),
  listChildFolders: jest.fn(async (id: string) => id === 'home' ? [{ id: 'bedroom', name: mockBedroomName }] : []),
  getFolderPath: async (id: string) => {
    const path = [
      { id: 'home', name: '우리 집' },
      { id: 'bedroom', name: mockBedroomName },
      { id: 'closet', name: '옷장', coverPath: 'place-covers/closet.jpg' },
    ];
    if (id === 'warehouse') return [{ id, name: '창고' }];
    return path.slice(0, path.findIndex((folder) => folder.id === id) + 1);
  },
}));

test('선택한 장소에 하위 폴더를 사진과 함께 저장하고 목록에 표시한다', async () => {
  jest.mocked(listRootFolders).mockResolvedValue([{ id: 'home', name: '우리 집' }]);
  const photo = { uri: 'file:///cache/closet.jpg', width: 100, height: 100 };
  jest.mocked(launchImageLibraryAsync).mockResolvedValueOnce({ canceled: false, assets: [photo] });
  const closet = { id: 'closet', name: '옷장', coverPath: 'place-covers/closet.jpg' };
  jest.mocked(createChildFolder).mockResolvedValue(closet);
  await renderRouter({ storage: StorageScreen }, { initialUrl: '/storage' });

  await fireEvent.press(await screen.findByRole('button', { name: '보관 위치 추가' }));
  expect(screen).toHavePathname('/storage');
  expect(screen.getByRole('header', { name: '보관 위치 추가' })).toBeOnTheScreen();
  const input = await screen.findByLabelText('보관 위치 이름');
  expect(screen.getByRole('button', { name: '보관 위치 저장' })).toBeDisabled();
  await fireEvent.changeText(input, '  옷장  ');
  expect(screen.getByRole('button', { name: '보관 위치 저장' })).toBeDisabled();
  expect(screen.getByRole('button', { name: '책상' })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: '앨범에서 선택' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: '사진을 대표 이미지로 사용' }));
  expect(screen.getByRole('button', { name: '사진 찍기' })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: '사진을 대표 이미지로 사용' }));
  expect(screen.queryByRole('button', { name: '앨범에서 선택' })).toBeNull();
  expect(screen.getByLabelText('보관 위치 이름')).toHaveProp('value', '  옷장  ');
  await fireEvent.press(screen.getByRole('button', { name: '사진을 대표 이미지로 사용' }));
  await fireEvent.press(screen.getByRole('button', { name: '앨범에서 선택' }));
  expect(await screen.findByLabelText('선택한 사진')).toBeOnTheScreen();
  jest.mocked(listChildFolders).mockResolvedValueOnce([
    { ...closet, firstChildName: '서랍', secondChildName: '선반', childCount: 4,
      firstItemName: '모자', secondItemName: '장갑', itemCount: 3 },
  ]);
  await fireEvent.press(screen.getByRole('button', { name: '보관 위치 저장' }));

  expect(createChildFolder).toHaveBeenCalledTimes(1);
  expect(createChildFolder).toHaveBeenCalledWith('home', '옷장', { photo });
  expect(screen).toHavePathname('/storage');
  expect(screen.queryByRole('header', { name: '보관 위치 추가' })).toBeNull();
  const closetRow = await screen.findByRole('link', { name: '옷장' });
  expect(within(closetRow).getByLabelText('옷장 사진')).toHaveProp('source', { uri: 'file:///documents/place-covers/closet.jpg' });
  expect(within(closetRow).getByText('서랍 · 선반')).toBeOnTheScreen();
  expect(within(closetRow).getByText('외 2곳')).toBeOnTheScreen();
  expect(within(closetRow).getByText('모자 · 장갑')).toBeOnTheScreen();
  expect(within(closetRow).getByText('외 1개')).toBeOnTheScreen();
});

test('보관함에서 우리 집을 거치지 않고 안방을 연다', async () => {
  jest.mocked(listRootFolders).mockResolvedValue([{ id: 'home', name: '우리 집' }]);
  await renderRouter({
    _layout: RootLayout, index: HomeScreen, storage: StorageScreen, ask: AskScreen,
    'folder/[id]': FolderScreen, 'item/[id]': ItemScreen, 'item/new': NewItemScreen,
  });

  expect(screen.getByText(/엄마가 찾아줄게/)).toBeOnTheScreen();
  await fireEvent.press(await screen.findByRole('link', { name: '우리 집' }));

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

  const closet = { id: 'closet', name: '옷장', coverPath: 'icon:wardrobe' };
  jest.mocked(createChildFolder).mockResolvedValue(closet);
  await fireEvent.press(await screen.findByRole('button', { name: '보관 위치 추가' }));
  const locationName = await screen.findByLabelText('보관 위치 이름');
  expect(screen.getByRole('button', { name: '보관 위치 저장' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: '책상' }));
  expect(locationName).toHaveProp('value', '책상');
  await fireEvent.changeText(locationName, '내 옷장');
  await fireEvent.press(screen.getByRole('button', { name: '옷장' }));
  expect(screen.getByRole('button', { name: '옷장', selected: true })).toBeOnTheScreen();
  expect(locationName).toHaveProp('value', '내 옷장');
  await fireEvent.changeText(locationName, '옷장');
  jest.mocked(listChildFolders).mockResolvedValueOnce([closet]);
  await fireEvent.press(screen.getByRole('button', { name: '보관 위치 저장' }));
  expect(createChildFolder).toHaveBeenCalledWith('bedroom', '옷장', { icon: 'wardrobe' });
  expect(screen).toHavePathname('/folder/bedroom');

  await fireEvent.press(await screen.findByRole('link', { name: '옷장' }));
  expect(screen).toHavePathname('/folder/closet');
  expect(await screen.findByRole('button', { name: '옷장 이름 변경' })).toBeOnTheScreen();
  expect(screen.getByLabelText('옷장 사진')).toHaveProp('source', { uri: 'file:///documents/place-covers/closet.jpg' });
  await fireEvent.press(screen.getByRole('button', { name: '대표 이미지 변경' }));
  expect(screen.getByRole('button', { name: '대표 이미지 저장' })).toBeDisabled();
  await fireEvent.press(screen.getByRole('button', { name: '선반' }));
  await fireEvent.press(screen.getByRole('button', { name: '대표 이미지 변경 닫기' }));
  expect(screen.getByLabelText('옷장 사진')).toBeOnTheScreen();
  expect(updateChildFolderCover).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: '대표 이미지 변경' }));
  await fireEvent.press(screen.getByRole('button', { name: '선반' }));
  jest.mocked(updateChildFolderCover).mockResolvedValueOnce('icon:shelf');
  await fireEvent.press(screen.getByRole('button', { name: '대표 이미지 저장' }));
  expect(updateChildFolderCover).toHaveBeenCalledWith('closet', { icon: 'shelf' });
  expect(screen.queryByLabelText('옷장 사진')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: '대표 이미지 변경' }));
  expect(screen.getByRole('button', { name: '선반', selected: true })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: '대표 이미지 변경 닫기' }));
  expect(screen.getByRole('link', { name: '우리 집' })).toBeOnTheScreen();

  const passport = { id: 'passport', name: '여권', photoPath: null };
  jest.mocked(createItem).mockResolvedValue(passport);
  await fireEvent.press(await screen.findByRole('button', { name: '물건 추가' }));
  expect(screen).toHavePathname('/item/new');
  expect(await screen.findByText('우리 집 › 침실 › 옷장')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: '물건 저장' })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText('물건 이름'), ' 여권 ');
  jest.mocked(listItems).mockResolvedValueOnce([passport]);
  await fireEvent.press(screen.getByRole('button', { name: '물건 저장' }));
  expect(screen).toHavePathname('/folder/closet');
  expect(listItems).toHaveBeenCalledWith('closet');
  expect(createItem).toHaveBeenCalledWith('closet', '여권', { note: '' });
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
  const watch = { id: 'watch', name: '시계', photoPath: 'images/watch.jpg' };
  jest.mocked(createItem).mockResolvedValue(watch);
  await renderRouter({ storage: StorageScreen, 'item/new': NewItemScreen }, { initialUrl: '/storage' });

  await fireEvent.press(await screen.findByRole('button', { name: '물건 추가' }));
  await fireEvent.changeText(await screen.findByLabelText('물건 이름'), '시계');
  await fireEvent.press(screen.getByRole('button', { name: /앨범에서 사진 추가/ }));
  expect(await screen.findByLabelText('선택한 사진')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: '사진 제거' }));
  expect(screen.queryByLabelText('선택한 사진')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: /앨범에서 사진 추가/ }));
  jest.mocked(listItems).mockResolvedValueOnce([watch]);
  await fireEvent.press(screen.getByRole('button', { name: '물건 저장' }));

  expect(createItem).toHaveBeenCalledWith('home', '시계', { photo: asset, note: '' });
  expect(await screen.findByLabelText('시계 사진')).toHaveProp('source', { uri: 'file:///documents/images/watch.jpg' });
});

test('사진 없는 물건의 상세에서 사진을 추가한다', async () => {
  const asset = { uri: 'file:///cache/passport.jpg', width: 100, height: 100 };
  jest.mocked(getItemDetails).mockResolvedValueOnce({
    id: 'passport', name: '여권', folderId: 'home', photoPath: null, path: [], note: null,
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
    id: 'watch', name: '시계', photoPath: 'images/old.jpg', folderId: 'home', path: [], note: null,
  });
  jest.mocked(launchImageLibraryAsync).mockResolvedValue({ canceled: false, assets: [asset] });
  jest.mocked(replaceItemPhoto).mockResolvedValueOnce('images/new.jpg');
  await renderRouter({ 'item/[id]': ItemScreen }, { initialUrl: '/item/watch' });

  const chooseReplacement = async () => {
    await fireEvent.press(await screen.findByRole('button', { name: '사진 바꾸기' }));
    expect(screen.getByRole('header', { name: '사진 바꾸기' })).toBeOnTheScreen();
    expect(screen).toHavePathname('/item/watch');
    expect(screen.getByLabelText('시계 사진')).toHaveProp('source', { uri: 'file:///documents/images/old.jpg' });
    const onDismiss = screen.getByTestId('photo-replacement-sheet').props.onDismiss;
    await fireEvent.press(screen.getByRole('button', { name: '앨범에서 사진 추가' }));
    if (Platform.OS === 'ios') await act(onDismiss);
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
    id: 'watch', name: '시계', photoPath: 'images/watch.jpg', folderId: 'home', note: null,
    path: [{ id: 'home', name: '우리 집' }],
  });
  jest.mocked(removeItemPhoto).mockResolvedValueOnce(undefined);
  await renderRouter({ 'item/[id]': ItemScreen }, { initialUrl: '/item/watch' });

  await fireEvent.press(await screen.findByRole('button', { name: '사진 삭제' }));
  expect(screen.getByRole('header', { name: '사진을 삭제할까요?' })).toBeOnTheScreen();
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
    ...item, folderId: 'home', path: [{ id: 'home', name: '우리 집' }], note: null,
  });
  jest.mocked(deleteItem).mockResolvedValueOnce(undefined);
  await renderRouter({ storage: StorageScreen, 'item/[id]': ItemScreen }, { initialUrl: '/storage' });

  await fireEvent.press(await screen.findByRole('link', { name: '시계' }));
  await fireEvent.press(await screen.findByRole('button', { name: '물건 삭제' }));
  expect(screen.getByRole('header', { name: '시계 삭제할까요?' })).toBeOnTheScreen();
  expect(screen.getByText('첨부 사진도 함께 삭제돼요.')).toBeOnTheScreen();
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
  jest.mocked(getItemDetails).mockResolvedValueOnce({ ...item, folderId: home.id, path: [home], note: null });
  jest.mocked(moveItem).mockResolvedValueOnce(undefined);
  await renderRouter({ index: HomeScreen, storage: StorageScreen, 'item/[id]': ItemScreen });

  await fireEvent.press(await screen.findByRole('link', { name: '우리 집' }));
  await fireEvent.press(await screen.findByRole('link', { name: '시계' }));
  await fireEvent.press(await screen.findByRole('button', { name: '보관 위치 바꾸기' }));
  expect(screen.getByRole('button', { name: '여기로 옮기기' })).toBeDisabled();
  expect(await screen.findByRole('button', { name: '안방' })).toBeOnTheScreen();
  await fireEvent.press(await screen.findByRole('button', { name: '회사' }));
  await fireEvent.press(screen.getByRole('button', { name: '여기로 옮기기' }));

  expect(moveItem).toHaveBeenCalledWith('watch', 'office');
  expect(await screen.findByText('회사')).toBeOnTheScreen();
  expect(screen.getByLabelText('시계 사진')).toBeOnTheScreen();
  await act(() => router.back());
  expect(await screen.findByText('아직 등록된 물건이 없어요.')).toBeOnTheScreen();
  await act(() => router.back());
  jest.mocked(listItems).mockResolvedValueOnce([item]);
  await fireEvent.press(await screen.findByRole('link', { name: '회사' }));
  expect(await screen.findByRole('link', { name: '시계' })).toBeOnTheScreen();
  expect(listItems).toHaveBeenLastCalledWith('office');
});

test('보관함에서 물건 이름 일부를 입력하면 바로 결과가 나오고 상세를 열 수 있다', async () => {
  const item = {
    id: 'sticker', name: '스티커', photoPath: null, folderId: 'closet',
    path: [{ id: 'home', name: '우리 집' }, { id: 'closet', name: '옷장' }],
  };
  const officeItem = {
    id: 'office-sticker', name: '스티커 봉투', photoPath: null, folderId: 'office',
    path: [{ id: 'office', name: '회사' }],
  };
  jest.mocked(searchItems)
    .mockResolvedValueOnce([]).mockResolvedValueOnce([item])
    .mockResolvedValueOnce([officeItem]).mockResolvedValueOnce([item]);
  jest.mocked(getItemDetails).mockResolvedValueOnce({ ...item, note: null });
  jest.mocked(listRootFolders).mockResolvedValue([{ id: 'home', name: '우리 집' }, { id: 'office', name: '회사' }]);
  await renderRouter({ storage: StorageScreen, 'item/[id]': ItemScreen }, { initialUrl: '/storage' });

  const input = await screen.findByLabelText('물건 이름 검색');
  expect(screen.queryByRole('button', { name: '물어보기' })).toBeNull();
  await fireEvent.changeText(input, '없는 물건');
  expect(await screen.findByText(/해당하는 물건이 없어요/)).toBeOnTheScreen();

  await fireEvent.changeText(input, ' 스티 ');
  expect(await screen.findByText('우리 집 › 옷장')).toBeOnTheScreen();
  expect(searchItems).toHaveBeenLastCalledWith('스티', 'home');
  await fireEvent.press(screen.getByRole('button', { name: '우리 집 장소 바꾸기' }));
  await fireEvent.press(screen.getByRole('button', { name: '회사' }));
  expect(screen.queryByText('우리 집 › 옷장')).toBeNull();
  expect(await screen.findByRole('link', { name: /스티커 봉투/ })).toBeOnTheScreen();
  expect(searchItems).toHaveBeenLastCalledWith('스티', 'office');
  await fireEvent.press(screen.getByRole('button', { name: '회사 장소 바꾸기' }));
  await fireEvent.press(screen.getByRole('button', { name: '우리 집' }));
  expect(await screen.findByText('우리 집 › 옷장')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('link', { name: /스티커/ }));
  expect(screen).toHavePathname('/item/sticker');
  expect(await screen.findByRole('button', { name: '스티커 이름 변경' })).toBeOnTheScreen();
});

test('홈에서 대화 화면을 열고 여러 질문을 보낸 뒤 물건 상세를 연다', async () => {
  const item = {
    id: 'sticker', name: '스티커', photoPath: null, folderId: 'closet',
    path: [{ id: 'home', name: '우리 집' }, { id: 'closet', name: '옷장' }],
  };
  jest.mocked(searchItems).mockClear();
  jest.mocked(askForItems).mockClear();
  jest.mocked(askForItems).mockResolvedValueOnce([item]).mockResolvedValueOnce([]);
  jest.mocked(getItemDetails).mockResolvedValueOnce({ ...item, note: null });
  await renderRouter({
    _layout: RootLayout, index: HomeScreen, ask: AskScreen, storage: StorageScreen,
    'folder/[id]': FolderScreen, 'item/[id]': ItemScreen, 'item/new': NewItemScreen,
  });

  expect(screen.queryByLabelText('질문 입력')).toBeNull();
  expect(screen.getByRole('tab', { name: '홈', selected: true })).toBeOnTheScreen();
  expect(screen.queryByRole('tab', { name: '내 정보' })).toBeNull();
  await fireEvent.press(screen.getByRole('link', { name: /엄마에게 물어보기/ }));
  expect(screen).toHavePathname('/ask');
  expect(screen.getByRole('tab', { name: '물어보기', selected: true })).toBeOnTheScreen();
  const input = screen.getByLabelText('질문 입력');
  expect(screen.queryByLabelText('물건 이름 검색')).toBeNull();
  await fireEvent.changeText(input, '야 스티커 어딨냐');
  expect(askForItems).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: '물어보기' }));
  expect(await screen.findByText('스티커 찾았다! 옷장에 있어.')).toBeOnTheScreen();
  expect(screen.getByText('야 스티커 어딨냐')).toBeOnTheScreen();
  expect(screen.getByText('우리 집 › 옷장')).toBeOnTheScreen();
  expect(askForItems).toHaveBeenLastCalledWith('야 스티커 어딨냐');
  expect(searchItems).not.toHaveBeenCalled();

  await fireEvent.changeText(input, '아까 쓰던 그거 어딨냐');
  await fireEvent.press(screen.getByRole('button', { name: '물어보기' }));
  expect(await screen.findByText(/이름을 조금 다르게 말해 볼래/)).toBeOnTheScreen();
  expect(screen.getByText('뭐 찾고 있어?')).toBeOnTheScreen();
  expect(screen.getByText('아까 쓰던 그거 어딨냐')).toBeOnTheScreen();
  expect(screen.getByText('우리 집 › 옷장')).toBeOnTheScreen();

  await fireEvent.press(screen.getByRole('link', { name: /스티커/ }));
  expect(screen).toHavePathname('/item/sticker');
  expect(await screen.findByRole('button', { name: '스티커 이름 변경' })).toBeOnTheScreen();
  expect(screen.getByRole('tab', { name: '물어보기', selected: true })).toBeOnTheScreen();
  expect(screen.getAllByRole('tab')).toHaveLength(3);
  await act(() => router.back());
  expect(screen.getByText('야 스티커 어딨냐')).toBeOnTheScreen();
  jest.mocked(listRootFolders).mockResolvedValue([{ id: 'home', name: '우리 집' }, { id: 'office', name: '회사' }]);
  await fireEvent.press(screen.getByRole('tab', { name: '보관함' }));
  expect(screen).toHavePathname('/storage');
  expect(screen).toHaveSearchParams({ tabSlide: 'right:1' });
  expect(screen.getByRole('tab', { name: '보관함', selected: true })).toBeOnTheScreen();
  await fireEvent.press(await screen.findByRole('button', { name: '우리 집 장소 바꾸기' }));
  expect(screen.getByRole('button', { name: '우리 집', selected: true })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: '회사' }));
  await fireEvent.press(await screen.findByRole('button', { name: '회사 장소 바꾸기' }));
  expect(screen.getByRole('button', { name: '회사', selected: true })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: '장소 목록 닫기' }));
  await fireEvent.press(screen.getByRole('tab', { name: '물어보기' }));
  expect(screen).toHavePathname('/ask');
  expect(screen).toHaveSearchParams({ tabSlide: 'left:2' });
  await fireEvent.press(screen.getByRole('tab', { name: '홈' }));
  expect(screen).toHavePathname('/');
  expect(screen).toHaveSearchParams({ tabSlide: 'left:3' });

  await fireEvent.press(screen.getByRole('tab', { name: '보관함' }));
  await fireEvent.press(screen.getByRole('tab', { name: '물어보기' }));
  await fireEvent.press(screen.getByRole('button', { name: '홈으로 돌아가기' }));
  expect(await screen.findByRole('tab', { name: '홈', selected: true })).toBeOnTheScreen();
  expect(screen).toHavePathname('/');
});

test.each([
  { folderId: 'home', path: [{ id: 'home', name: '우리 집' }], route: '/storage', name: '우리 집' },
  { folderId: 'closet', path: [{ id: 'home', name: '우리 집' }, { id: 'closet', name: '옷장' }], route: '/folder/closet', name: '옷장' },
])('물건 상세에서 보관 위치를 바로 연다 ($name)', async ({ folderId, path, route, name }) => {
  jest.mocked(listRootFolders).mockResolvedValue([{ id: 'home', name: '우리 집' }]);
  jest.mocked(getItemDetails).mockResolvedValueOnce({
    id: 'watch', name: '시계', photoPath: null, note: null, folderId, path,
  });
  await renderRouter({
    storage: StorageScreen, 'folder/[id]': FolderScreen, 'item/[id]': ItemScreen,
  }, { initialUrl: '/item/watch' });

  await fireEvent.press(await screen.findByRole('link', { name: /위치 열기/ }));
  expect(screen).toHavePathname(route);
  if (folderId === 'home') {
    expect(await screen.findByRole('header', { name })).toBeOnTheScreen();
  } else {
    expect(await screen.findByRole('button', { name: name + ' 이름 변경' })).toBeOnTheScreen();
  }
});

test('목록에서 물건 상세를 열어 사진과 전체 보관 위치를 확인한다', async () => {
  const item = { id: 'watch', name: '시계', photoPath: 'images/watch.jpg' };
  jest.mocked(listRootFolders).mockResolvedValue([{ id: 'home', name: '우리 집' }]);
  jest.mocked(listItems).mockResolvedValueOnce([item]);
  jest.mocked(getItemDetails).mockResolvedValueOnce({
    ...item,
    note: null,
    folderId: 'closet',
    path: [{ id: 'home', name: '우리 집' }, { id: 'bedroom', name: '안방' }, { id: 'closet', name: '옷장' }],
  });
  await renderRouter({ 'folder/[id]': FolderScreen, 'item/[id]': ItemScreen }, { initialUrl: '/folder/closet' });

  expect(await screen.findByRole('button', { name: '카드 보기', selected: true })).toBeOnTheScreen();
  expect(screen.getByText('시계')).toHaveProp('numberOfLines', 1);
  await fireEvent.press(screen.getByRole('button', { name: '목록 보기' }));
  expect(screen.getByRole('button', { name: '목록 보기', selected: true })).toBeOnTheScreen();
  expect(screen.getByText('시계')).toHaveProp('numberOfLines', 1);
  await fireEvent.press(screen.getByRole('button', { name: '카드 보기' }));
  expect(screen.getByRole('button', { name: '카드 보기', selected: true })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: '목록 보기' }));
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

test('카드는 물건 수만큼 표시하고 목록은 이름 오른쪽에 사진을 표시한다', async () => {
  jest.mocked(listRootFolders).mockResolvedValue([{ id: 'home', name: '우리 집' }]);
  jest.mocked(listItems).mockResolvedValueOnce([
    { id: 'watch', name: '시계', photoPath: 'images/watch.jpg' },
    { id: 'passport', name: '여권', photoPath: null },
  ]);
  await renderRouter({ storage: StorageScreen }, { initialUrl: '/storage' });

  const rows = await screen.findAllByTestId('item-card-row');
  expect(rows).toHaveLength(1);
  expect(within(rows[0]).getByRole('link', { name: '시계' })).toBeOnTheScreen();
  expect(within(rows[0]).getByRole('link', { name: '여권' })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: '목록 보기' }));
  const name = screen.getByText('시계');
  const photo = screen.getByLabelText('시계 사진');
  expect(name.parent).toBe(photo.parent);
  expect(name.parent?.children.indexOf(name)).toBeLessThan(name.parent?.children.indexOf(photo) ?? -1);
});

test('물건이 네 개를 넘으면 카드 보기에서 옆으로 넘길 수 있다', async () => {
  jest.mocked(listRootFolders).mockResolvedValue([{ id: 'home', name: '우리 집' }]);
  jest.mocked(listItems).mockResolvedValueOnce(Array.from({ length: 5 }, (_, index) => ({
    id: `item-${index}`, name: `물건 ${index + 1}`, photoPath: null,
  })));
  await renderRouter({ storage: StorageScreen }, { initialUrl: '/storage' });

  expect(await screen.findByText(/옆으로 넘겨 더 보기/)).toBeOnTheScreen();
  expect(screen.getByRole('link', { name: '물건 5' })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: '목록 보기' }));
  expect(screen.queryByText(/옆으로 넘겨 더 보기/)).toBeNull();
  expect(screen.getAllByRole('link', { name: /^물건 \d/ })).toHaveLength(5);
});

test('내용이 남은 위치는 취소할 수 있고 두 번째 확인 뒤 함께 삭제된다', async () => {
  jest.mocked(listRootFolders).mockResolvedValue([{ id: 'home', name: '우리 집' }]);
  const contents = { folderCount: 2, itemCount: 5 };
  jest.mocked(deleteChildFolder)
    .mockResolvedValueOnce({ status: 'confirm', contents })
    .mockResolvedValueOnce({ status: 'confirm', contents })
    .mockResolvedValueOnce({ status: 'deleted' });
  await renderRouter({
    _layout: RootLayout, index: HomeScreen, storage: StorageScreen, ask: AskScreen,
    'folder/[id]': FolderScreen, 'item/[id]': ItemScreen, 'item/new': NewItemScreen,
  }, { initialUrl: '/storage' });

  await fireEvent.press(await screen.findByRole('link', { name: '안방' }));
  await fireEvent.press(await screen.findByRole('button', { name: '위치 삭제' }));
  expect(screen.getByRole('header', { name: '안방 위치를 삭제할까요?' })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: '위치 삭제 확인' }));
  expect(await screen.findByText(/하위 위치 2곳, 물건 5개 및 관련 사진이 함께 삭제돼요/)).toBeOnTheScreen();
  expect(screen.getByRole('header', { name: '안방 안의 내용까지 삭제할까요?' })).toBeOnTheScreen();
  expect(screen).toHavePathname('/folder/bedroom');
  expect(screen.queryByRole('button', { name: '위치 삭제 확인' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: '취소' }));
  expect(screen.queryByRole('button', { name: '모두 삭제' })).toBeNull();
  expect(deleteChildFolder).toHaveBeenCalledTimes(1);

  jest.mocked(listChildFolders).mockResolvedValueOnce([]);
  await fireEvent.press(screen.getByRole('button', { name: '위치 삭제' }));
  await fireEvent.press(screen.getByRole('button', { name: '위치 삭제 확인' }));
  expect(deleteChildFolder).toHaveBeenLastCalledWith('bedroom');
  await fireEvent.press(await screen.findByRole('button', { name: '모두 삭제' }));
  expect(deleteChildFolder).toHaveBeenLastCalledWith('bedroom', contents);
  expect(screen).toHavePathname('/storage');
  expect(await screen.findByText('아직 이곳에 등록된 보관 장소가 없어요.')).toBeOnTheScreen();
  expect(screen.queryByRole('link', { name: '안방' })).toBeNull();
});

test('홈에서 최근 물건이 장소별로 보이고 상세에서 돌아오면 갱신된다', async () => {
  const home = { id: 'home', name: '우리 집' };
  const item = { id: 'watch', name: '시계', photoPath: 'images/watch.jpg', locationId: 'home', itemCount: 2 };
  const pen = { id: 'pen', name: '볼펜', photoPath: null, locationId: 'office', itemCount: 1 };
  jest.mocked(listRootFolders).mockResolvedValue([home, { id: 'office', name: '회사' }, { id: 'warehouse', name: '창고' }]);
  jest.mocked(listRootChildFolders).mockResolvedValueOnce([{ id: 'bedroom', name: '안방', locationId: 'home' }]);
  jest.mocked(listRecentItemsByLocation)
    .mockResolvedValueOnce([item, pen])
    .mockResolvedValueOnce([
      { id: 'passport', name: '여권', photoPath: null, locationId: 'home', itemCount: 2 },
      { ...item, itemCount: 2 },
      pen,
    ]);
  jest.mocked(getItemDetails).mockResolvedValueOnce({ ...item, folderId: home.id, path: [home], note: null });
  await renderRouter({ index: HomeScreen, storage: StorageScreen, 'item/[id]': ItemScreen, 'item/new': NewItemScreen });

  const [homeRow, officeRow, emptyRow] = await screen.findAllByTestId('home-place-row');
  const watch = await within(homeRow).findByRole('link', { name: '시계' });
  expect(within(homeRow).getByText('안방')).toBeOnTheScreen();
  expect(within(homeRow).getByText('+1')).toBeOnTheScreen();
  expect(within(officeRow).getByRole('link', { name: '볼펜' })).toBeOnTheScreen();
  expect(within(officeRow).queryByRole('link', { name: '시계' })).toBeNull();
  expect(within(emptyRow).getByText('아직 보관한 물건이 없어요.')).toBeOnTheScreen();
  expect(within(emptyRow).getByRole('link', { name: '창고에 물건 추가' })).toBeOnTheScreen();
  await fireEvent.press(watch);
  expect(screen).toHavePathname('/item/watch');
  expect(await screen.findByLabelText('시계 사진')).toBeOnTheScreen();
  await act(() => router.back());
  expect(await screen.findByRole('link', { name: '여권' })).toBeOnTheScreen();

  await fireEvent.press(screen.getByRole('link', { name: '창고에 물건 추가' }));
  expect(screen).toHavePathname('/item/new');
  expect(await screen.findByText('창고')).toBeOnTheScreen();
  expect(await screen.findByLabelText('물건 이름')).toBeOnTheScreen();
  await act(() => router.back());
  expect(screen).toHavePathname('/');
});

test('물건 상세에서 메모를 추가하고 편집하거나 비울 수 있다', async () => {
  jest.mocked(getItemDetails).mockResolvedValueOnce({
    id: 'passport', name: '여권', folderId: 'home', photoPath: null, path: [], note: null,
  });
  jest.mocked(saveItemNote)
    .mockResolvedValueOnce('검은 파우치 안')
    .mockResolvedValueOnce('파우치 앞주머니')
    .mockResolvedValueOnce(null);
  await renderRouter({ 'item/[id]': ItemScreen }, { initialUrl: '/item/passport' });

  await fireEvent.press(await screen.findByRole('button', { name: /메모 추가/ }));
  await fireEvent.changeText(screen.getByLabelText('메모 내용'), '검은 파우치 안');
  await fireEvent.press(screen.getByRole('button', { name: '메모 저장' }));
  expect(saveItemNote).toHaveBeenLastCalledWith('passport', '검은 파우치 안');
  expect(await screen.findByText('검은 파우치 안')).toBeOnTheScreen();

  await fireEvent.press(screen.getByRole('button', { name: '메모 수정' }));
  expect(screen.getByLabelText('메모 내용')).toHaveProp('value', '검은 파우치 안');
  await fireEvent.changeText(screen.getByLabelText('메모 내용'), '파우치 앞주머니');
  await fireEvent.press(screen.getByRole('button', { name: '메모 저장' }));
  expect(await screen.findByText('파우치 앞주머니')).toBeOnTheScreen();

  await fireEvent.press(screen.getByRole('button', { name: '메모 수정' }));
  await fireEvent.changeText(screen.getByLabelText('메모 내용'), '');
  await fireEvent.press(screen.getByRole('button', { name: '메모 저장' }));
  expect(saveItemNote).toHaveBeenLastCalledWith('passport', '');
  expect(await screen.findByRole('button', { name: /메모 추가/ })).toBeOnTheScreen();
  expect(screen.queryByText('파우치 앞주머니')).toBeNull();
});

test('홈의 장소를 누르면 해당 장소가 선택된 보관함을 연다', async () => {
  const home = { id: 'home', name: '우리 집' };
  const office = { id: 'office', name: '회사' };
  jest.mocked(listRootFolders).mockResolvedValue([home, office]);
  await renderRouter({ index: HomeScreen, storage: StorageScreen });

  expect(await screen.findByRole('link', { name: '우리 집' })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('link', { name: '회사' }));
  expect(screen).toHavePathname('/storage');
  expect(await screen.findByRole('button', { name: '회사 장소 바꾸기' })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: '장소 추가' })).toBeNull();
  expect(screen.queryByRole('button', { name: '회사 이름 변경' })).toBeNull();
  expect(screen.queryByRole('link', { name: '안방' })).toBeNull();

  jest.mocked(listRootFolders).mockResolvedValue([home, office, { id: 'warehouse', name: '창고' }]);
  await act(() => router.back());
  expect(await screen.findByRole('link', { name: '창고' })).toBeOnTheScreen();
});

test('홈에서 장소를 추가하고 새 카드로 해당 보관함을 연다', async () => {
  const home = { id: 'home', name: '우리 집' };
  const office = { id: 'office', name: '회사', coverPath: null };
  jest.mocked(listRootFolders).mockResolvedValue([home]);
  jest.mocked(createRootFolder).mockResolvedValueOnce(office);
  await renderRouter({ index: HomeScreen, storage: StorageScreen });

  await fireEvent.press(await screen.findByRole('button', { name: '장소 추가' }));
  expect(screen.getByRole('button', { name: '장소 저장' })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText('장소 이름'), ' 회사 ');
  await fireEvent.press(screen.getByRole('button', { name: '장소 저장' }));
  expect(createRootFolder).toHaveBeenCalledWith('회사');
  expect(screen).toHavePathname('/');
  const card = await screen.findByRole('link', { name: '회사' });
  jest.mocked(listRootFolders).mockResolvedValue([home, office]);
  await fireEvent.press(card);
  expect(await screen.findByRole('button', { name: '회사 장소 바꾸기' })).toBeOnTheScreen();
});

test('장소 추가에서 기본 커버를 고르고 카메라 사진으로 바꿔 저장한다', async () => {
  const asset = { uri: 'file:///cache/office.jpg', width: 100, height: 100 };
  jest.mocked(listRootFolders).mockResolvedValue([{ id: 'home', name: '우리 집', coverPath: null }]);
  jest.mocked(requestCameraPermissionsAsync).mockResolvedValueOnce({
    granted: true, status: PermissionStatus.GRANTED, canAskAgain: true, expires: 'never',
  });
  jest.mocked(launchCameraAsync).mockResolvedValueOnce({ canceled: false, assets: [asset] });
  jest.mocked(createRootFolder).mockResolvedValueOnce({ id: 'office', name: '회사', coverPath: 'place-covers/office.jpg' });
  await renderRouter({ index: HomeScreen });

  await fireEvent.press(await screen.findByRole('button', { name: '장소 추가' }));
  await fireEvent.changeText(screen.getByLabelText('장소 이름'), '회사');
  await fireEvent.press(screen.getByRole('button', { name: '사무실 커버' }));
  expect(screen.getByRole('button', { name: '사무실 커버', selected: true })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: '사진 찍기' }));
  expect(await screen.findByLabelText('선택한 장소 사진')).toHaveProp('source', { uri: asset.uri });
  await fireEvent.press(screen.getByRole('button', { name: '장소 저장' }));
  expect(createRootFolder).toHaveBeenLastCalledWith('회사', { photo: asset });
  expect(await screen.findByRole('link', { name: '회사' })).toBeOnTheScreen();
});

test('홈의 장소 행에서 기존 이름을 바로 편집한다', async () => {
  jest.mocked(listRootFolders).mockResolvedValue([{ id: 'home', name: '우리 집' }, { id: 'office', name: '회사' }]);
  jest.mocked(renameFolder).mockResolvedValueOnce(undefined);
  await renderRouter({ index: HomeScreen });

  await fireEvent.press(await screen.findByRole('button', { name: '우리 집 이름 변경' }));
  expect(screen.getByLabelText('새 장소 이름')).toHaveProp('value', '우리 집');
  expect(screen.queryByRole('link', { name: '우리 집' })).toBeNull();
  expect(screen.getByRole('link', { name: '회사' })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: '취소' }));
  expect(screen.getByRole('link', { name: '우리 집' })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: '우리 집 이름 변경' }));
  await fireEvent.changeText(screen.getByLabelText('새 장소 이름'), '본가');
  await fireEvent.press(screen.getByRole('button', { name: '이름 저장' }));
  expect(renameFolder).toHaveBeenCalledWith('home', '본가');
  expect(await screen.findByRole('link', { name: '본가' })).toBeOnTheScreen();
});
