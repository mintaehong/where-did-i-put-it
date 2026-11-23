import { Link, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, TextInput, View } from 'react-native';

import { createChildFolder, listChildFolders } from './db/folders';
import { colors, screenStyles } from './theme';

type FolderList =
  | { status: 'loading' | 'error' }
  | { status: 'ready'; folders: Awaited<ReturnType<typeof listChildFolders>> };

export default function ChildFolders({ parentId }: { parentId: string }) {
  const [result, setResult] = useState<FolderList>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [name, setName] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const savingRef = useRef(false);

  async function saveFolder() {
    const trimmedName = name?.trim();
    if (!trimmedName || savingRef.current) return;

    savingRef.current = true;
    setSaving(true);
    setSaveError(false);
    try {
      const folder = await createChildFolder(parentId, trimmedName);
      setResult((current) => current.status === 'ready'
        ? { status: 'ready', folders: [...current.folders, folder] }
        : current);
      setName(undefined);
    } catch {
      setSaveError(true);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  useFocusEffect(useCallback(() => {
    let active = true;
    listChildFolders(parentId).then(
      (folders) => {
        if (active) setResult({ status: 'ready', folders });
      },
      () => {
        if (active) setResult({ status: 'error' });
      },
    );
    return () => {
      active = false;
    };
  }, [parentId, attempt]));

  if (result.status === 'loading') {
    return <ActivityIndicator accessibilityLabel="보관 장소 불러오는 중" />;
  }
  if (result.status === 'error') {
    return (
      <>
        <Text style={screenStyles.body}>보관 장소를 불러오지 못했어요.</Text>
        <Button title="다시 시도" onPress={() => {
          setResult({ status: 'loading' });
          setAttempt((previous) => previous + 1);
        }} />
      </>
    );
  }
  const folders = result.status === 'ready' ? result.folders : [];
  return (
    <>
      {folders.length === 0 && (
        <Text style={screenStyles.body}>아직 이곳에 등록된 보관 장소가 없어요.</Text>
      )}
      {folders.map((folder) => (
        <Link
          key={folder.id}
          href={{ pathname: '/folder/[id]', params: { id: folder.id } }}
          push
          style={styles.folder}
        >
          {folder.name}
        </Link>
      ))}
      {name === undefined ? (
        <Button title="폴더 추가" onPress={() => setName('')} />
      ) : (
        <View style={styles.form}>
          <TextInput
            accessibilityLabel="폴더 이름"
            placeholder="예: 안방"
            value={name}
            onChangeText={setName}
            onSubmitEditing={saveFolder}
            editable={!saving}
            autoFocus
            returnKeyType="done"
            style={styles.input}
          />
          {saveError && (
            <Text accessibilityRole="alert" style={screenStyles.body}>폴더를 저장하지 못했어요. 다시 시도해 주세요.</Text>
          )}
          <Button title={saving ? '저장 중' : '저장'} onPress={saveFolder} disabled={saving || !name.trim()} />
          <Button title="취소" onPress={() => {
            setName(undefined);
            setSaveError(false);
          }} disabled={saving} />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#B7C9BF',
    borderRadius: 12,
    backgroundColor: colors.surface,
    color: colors.text,
    fontSize: 16,
    padding: 12,
  },
  folder: {
    backgroundColor: '#DFEDE3',
    borderRadius: 20,
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
    padding: 20,
  },
});
