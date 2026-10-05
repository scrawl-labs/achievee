import { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Divider } from '@astryxdesign/core/Divider';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { NumberInput } from '@astryxdesign/core/NumberInput';
import { Selector } from '@astryxdesign/core/Selector';
import { StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { Token } from '@astryxdesign/core/Token';
import { VStack } from '@astryxdesign/core/VStack';
import { DateNav } from '../components/DateNav';
import { toDateKey } from '../lib/date';
import { formatWon } from '../lib/format';
import { store, useAppData } from '../store';
import { EXPENSE_CATEGORIES } from '../types';

export function ExpensePage() {
  const { expenses } = useAppData();
  const [date, setDate] = useState(() => toDateKey(new Date()));
  const [amount, setAmount] = useState<number | null>(null);
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [memo, setMemo] = useState('');
  const [error, setError] = useState('');

  const day = expenses.filter((x) => x.date === date);
  const total = day.reduce((sum, x) => sum + x.amount, 0);

  function submit() {
    try {
      store.addExpense({ amount: amount ?? NaN, category, memo, date });
      setAmount(null);
      setMemo('');
      setError('');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <VStack gap={4}>
      <DateNav date={date} onChange={setDate} />
      <Card>
        <VStack gap={1} hAlign="center">
          <Text type="supporting">이 날 쓴 돈</Text>
          <Heading level={2}>{formatWon(total)}</Heading>
        </VStack>
      </Card>
      <Card>
        <VStack gap={3}>
          <HStack gap={2} align="start">
            <StackItem size="fill">
              <NumberInput label="금액" value={amount} onChange={setAmount} />
            </StackItem>
            <StackItem size="fill">
              <Selector
                label="분류"
                options={[...EXPENSE_CATEGORIES]}
                value={category}
                onChange={(v) => setCategory(v)}
              />
            </StackItem>
          </HStack>
          <TextInput label="메모" isOptional value={memo} onChange={(v) => setMemo(v)} onEnter={submit} />
          {error && <Token color="red" label={error} />}
          <Button label="기록" variant="primary" onClick={submit} />
        </VStack>
      </Card>
      {day.length === 0 ? (
        <EmptyState title="쓴 돈이 없어요" isCompact />
      ) : (
        <VStack>
          {day.map((x, i) => (
            <VStack key={x.id}>
              {i > 0 && <Divider />}
              <HStack gap={3} align="center" paddingBlock={2}>
                <Token label={x.category} size="sm" />
                <StackItem size="fill">
                  <Text color="secondary">{x.memo}</Text>
                </StackItem>
                <Text weight="medium" hasTabularNumbers>{formatWon(x.amount)}</Text>
                <IconButton label="삭제" icon={<Icon icon="close" />} variant="ghost" size="sm" onClick={() => store.deleteExpense(x.id)} />
              </HStack>
            </VStack>
          ))}
        </VStack>
      )}
    </VStack>
  );
}
