import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, TextInput } from 'react-native';

import { createItem, listItems } from './db/items';
import { colors, screenStyles } from './theme';

export default function FolderItems({ folderId }: { folderId: string }) {
  const [items, setItems] = useState<Awaited<ReturnType<typeof listItems>>>();
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const pending = useRef(false);

  useEffect(() => {
    let active = true;
    listItems(folderId).then(
      (rows) => { if (active) setItems(rows); },
      () => { if (active) setLoadError(true); },
    );
    return () => { active = false; };
  }, [folderId, attempt]);

  async function save() {
    const name = draft?.trim();
    if (!name || pending.current) return;
    pending.current = true;
    setSaving(true);
    setSaveError(false);
    try {
      const item = await createItem(folderId, name);
      setItems((previous) => [...(previous ?? []), item]);
      setDraft(undefined);
    } catch {
      setSaveError(true);
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  return (
    <>
      <Text accessibilityRole="header" style={styles.heading}>보관 중인 물건</Text>
      {loadError ? (
        <>
          <Text accessibilityRole="alert">물건을 불러오지 못했어요.</Text>
          <Button title="물건 다시 불러오기" onPress={() => {
            setLoadError(false);
            setAttempt((previous) => previous + 1);
          }} />
        </>
      ) : !items ? (
        <ActivityIndicator accessibilityLabel="물건 불러오는 중" />
      ) : (
        <>
          {items.length === 0 && <Text style={screenStyles.body}>아직 등록된 물건이 없어요.</Text>}
          {items.map((item) => <Text key={item.id} style={styles.item}>{item.name}</Text>)}
          {draft === undefined ? (
            <Button title="물건 추가" onPress={() => setDraft('')} />
          ) : (
            <>
              <TextInput
                accessibilityLabel="물건 이름"
                placeholder="예: 여권"
                autoFocus
                value={draft}
                editable={!saving}
                onChangeText={setDraft}
                onSubmitEditing={save}
                returnKeyType="done"
                style={styles.item}
              />
              {saveError && <Text accessibilityRole="alert">물건을 저장하지 못했어요. 다시 시도해 주세요.</Text>}
              <Button title="물건 저장" onPress={save} disabled={saving || !draft.trim()} />
              <Button title="물건 추가 취소" disabled={saving} onPress={() => {
                setDraft(undefined);
                setSaveError(false);
              }} />
            </>
          )}
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  heading: { color: colors.text, fontSize: 18, fontWeight: '700' },
  item: { backgroundColor: colors.surface, borderRadius: 12, color: colors.text, fontSize: 16, padding: 12 },
});
