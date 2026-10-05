import { ClickableCard } from '@astryxdesign/core/ClickableCard';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { monthGrid } from '../lib/date';
import { formatShortWon } from '../lib/format';
import type { DaySummary } from '../lib/summary';
import type { DateKey } from '../types';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

interface Props {
  year: number;
  month: number;
  today: DateKey;
  summary: Record<DateKey, DaySummary>;
  onSelect: (d: DateKey) => void;
  onShift: (delta: number) => void;
}

export function MonthView({ year, month, today, summary, onSelect, onShift }: Props) {
  const cells = monthGrid(year, month).flat();
  return (
    <VStack gap={3}>
      <HStack justify="between" align="center">
        <IconButton label="이전 달" icon={<Icon icon="chevronLeft" />} variant="ghost" onClick={() => onShift(-1)} />
        <Heading level={2}>{year}년 {month + 1}월</Heading>
        <IconButton label="다음 달" icon={<Icon icon="chevronRight" />} variant="ghost" onClick={() => onShift(1)} />
      </HStack>
      <Grid columns={7} gap={1}>
        {WEEKDAYS.map((w) => (
          <Text key={w} type="label" color="secondary" justify="center" display="block">{w}</Text>
        ))}
        {cells.map((key, i) => {
          if (!key) return <VStack key={`empty-${i}`} />;
          const s = summary[key];
          return (
            <ClickableCard
              key={key}
              label={key}
              padding={1}
              height={68}
              variant={key === today ? 'green' : 'default'}
              onClick={() => onSelect(key)}
            >
              <VStack gap={0.5} hAlign="center">
                <Text weight={key === today ? 'bold' : 'normal'}>{Number(key.slice(8))}</Text>
                {s && s.events > 0 && <Text size="xsm" color="accent" weight="medium">일정 {s.events}</Text>}
                {s && s.spent > 0 && <Text size="xsm" color="secondary">{formatShortWon(s.spent)}</Text>}
              </VStack>
            </ClickableCard>
          );
        })}
      </Grid>
    </VStack>
  );
}
