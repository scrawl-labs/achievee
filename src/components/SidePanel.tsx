import { Heading } from '@astryxdesign/core/Heading';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { VStack } from '@astryxdesign/core/VStack';
import { formatDateLabel } from '../lib/format';
import { ExpensePage } from '../pages/ExpensePage';
import { TodoPage } from '../pages/TodoPage';
import type { DateKey } from '../types';

export type PanelTab = 'todo' | 'expense';

interface Props {
  date: DateKey;
  tab: PanelTab;
  onTab: (tab: PanelTab) => void;
}

/** 오른쪽 패널(좁은 화면에서는 하단 시트) 내용: 선택한 날짜의 할 일 / 가계부. */
export function SidePanel({ date, tab, onTab }: Props) {
  return (
    <VStack gap={3}>
      <Heading level={3}>{formatDateLabel(date)}</Heading>
      <TabList value={tab} onChange={(v) => onTab(v as PanelTab)} hasDivider layout="fill">
        <Tab value="todo" label="할 일" />
        <Tab value="expense" label="가계부" />
      </TabList>
      {tab === 'todo' ? <TodoPage date={date} /> : <ExpensePage date={date} />}
    </VStack>
  );
}
