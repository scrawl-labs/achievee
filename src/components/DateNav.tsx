import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { addDays, parseDateKey, toDateKey } from '../lib/date';
import type { DateKey } from '../types';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function dateLabel(date: DateKey): string {
  const d = parseDateKey(date);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

export function DateNav({ date, onChange }: { date: DateKey; onChange: (d: DateKey) => void }) {
  return (
    <HStack justify="between" align="center">
      <IconButton label="전날" icon={<Icon icon="chevronLeft" />} variant="ghost" onClick={() => onChange(addDays(date, -1))} />
      <Button label={dateLabel(date)} variant="ghost" onClick={() => onChange(toDateKey(new Date()))} />
      <IconButton label="다음날" icon={<Icon icon="chevronRight" />} variant="ghost" onClick={() => onChange(addDays(date, 1))} />
    </HStack>
  );
}
