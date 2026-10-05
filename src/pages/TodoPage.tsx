import { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { CheckboxList, CheckboxListItem } from '@astryxdesign/core/CheckboxList';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { HStack } from '@astryxdesign/core/HStack';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { DateNav } from '../components/DateNav';
import { toDateKey } from '../lib/date';
import { store, useAppData } from '../store';

export function TodoPage() {
  const { todos } = useAppData();
  const [date, setDate] = useState(() => toDateKey(new Date()));
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  const day = todos.filter((t) => t.date === date);
  const doneIds = day.filter((t) => t.done).map((t) => t.id);

  function submit() {
    try {
      store.addTodo(title, date);
      setTitle('');
      setError('');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function onChecked(values: string[]) {
    for (const t of day) if (values.includes(t.id) !== t.done) store.toggleTodo(t.id);
  }

  return (
    <VStack gap={4}>
      <DateNav date={date} onChange={setDate} />
      <Text type="supporting">
        {day.length === 0 ? '할 일이 없어요' : `${doneIds.length} / ${day.length} 완료`}
      </Text>
      <HStack gap={2} align="start">
        <StackItem size="fill">
          <TextInput
            label="할 일"
            isLabelHidden
            placeholder="할 일을 적어 보아요"
            value={title}
            onChange={(v) => setTitle(v)}
            onEnter={submit}
            status={error ? { type: 'error', message: error } : undefined}
          />
        </StackItem>
        <Button label="추가" variant="primary" onClick={submit} />
      </HStack>
      {day.length === 0 ? (
        <EmptyState title="아직 할 일이 없어요" isCompact />
      ) : (
        <CheckboxList label="할 일 목록" isLabelHidden hasDividers value={doneIds} onChange={onChecked}>
          {day.map((t) => (
            <CheckboxListItem
              key={t.id}
              value={t.id}
              aria-label={t.title}
              label={<Text hasStrikethrough={t.done} color={t.done ? 'secondary' : 'primary'}>{t.title}</Text>}
              endContent={
                <IconButton label={`${t.title} 삭제`} icon={<Icon icon="close" />} variant="ghost" size="sm" onClick={() => store.deleteTodo(t.id)} />
              }
            />
          ))}
        </CheckboxList>
      )}
    </VStack>
  );
}
