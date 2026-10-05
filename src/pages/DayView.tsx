import { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { dateLabel } from '../components/DateNav';
import { hourRange } from '../lib/date';
import { formatWon } from '../lib/format';
import { useAppData } from '../store';
import type { DateKey } from '../types';
import { EventForm, type EventDraft } from './EventForm';

const HOURS = Array.from({ length: 24 }, (_, h) => h);

export function DayView({ date, onBack }: { date: DateKey; onBack: () => void }) {
  const { events, expenses, todos } = useAppData();
  const [draft, setDraft] = useState<EventDraft | null>(null);

  const dayEvents = events.filter((e) => e.date === date).sort((a, b) => a.start.localeCompare(b.start));
  const spent = expenses.filter((x) => x.date === date).reduce((s, x) => s + x.amount, 0);
  const dayTodos = todos.filter((t) => t.date === date);
  const doneCount = dayTodos.filter((t) => t.done).length;

  return (
    <VStack gap={4}>
      <HStack gap={2} align="center">
        <IconButton label="달력으로" icon={<Icon icon="chevronLeft" />} variant="ghost" onClick={onBack} />
        <Heading level={2}>{dateLabel(date)}</Heading>
      </HStack>
      <Text type="supporting">할 일 {doneCount}/{dayTodos.length} · 쓴 돈 {formatWon(spent)}</Text>
      <VStack>
        {HOURS.map((h) => {
          const range = hourRange(h);
          const here = dayEvents.filter((e) => Number(e.start.slice(0, 2)) === h);
          return (
            <VStack key={h}>
              <Divider />
              <HStack gap={3} align="start" paddingBlock={1.5}>
                <VStack width={48}>
                  <Text type="supporting" hasTabularNumbers>{String(h).padStart(2, '0')}:00</Text>
                </VStack>
                <StackItem size="fill">
                  <VStack gap={1} hAlign="start">
                  {here.map((e) => (
                    <Button
                      key={e.id}
                      label={`${e.title}  ${e.start}~${e.end}`}
                      variant="secondary"
                      size="sm"
                      onClick={() => setDraft({ id: e.id, title: e.title, start: e.start, end: e.end })}
                    />
                  ))}
                  <Button
                    label={`${range.start}에 일정 추가`}
                    variant="ghost"
                    size="sm"
                    onClick={() => setDraft({ title: '', ...range })}
                  >
                    +
                  </Button>
                  </VStack>
                </StackItem>
              </HStack>
            </VStack>
          );
        })}
      </VStack>
      <EventForm date={date} draft={draft} onClose={() => setDraft(null)} />
    </VStack>
  );
}
