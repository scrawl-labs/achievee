import { useState } from 'react';
import { Heading } from '@astryxdesign/core/Heading';
import { Layout, LayoutContent, LayoutHeader } from '@astryxdesign/core/Layout';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import { VStack } from '@astryxdesign/core/VStack';
import { CalendarPage } from './pages/CalendarPage';
import { ExpensePage } from './pages/ExpensePage';
import { TodoPage } from './pages/TodoPage';

const TABS = [
  { id: 'calendar', label: '캘린더' },
  { id: 'todo', label: '할 일' },
  { id: 'expense', label: '가계부' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export default function App() {
  const [tab, setTab] = useState<TabId>(() => {
    const id = window.location.hash.slice(1).split('/')[0];
    return TABS.some((t) => t.id === id) ? (id as TabId) : 'calendar';
  });
  const changeTab = (id: TabId) => {
    window.location.hash = id;
    setTab(id);
  };
  return (
    <Layout
      contentWidth={720}
      padding={4}
      header={
        <LayoutHeader paddingBlockEnd={2}>
          <VStack gap={3}>
            <Heading level={1}>플래너</Heading>
            <TabList value={tab} onChange={(v) => changeTab(v as TabId)} hasDivider layout="fill">
              {TABS.map((t) => (
                <Tab key={t.id} value={t.id} label={t.label} />
              ))}
            </TabList>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent isScrollable>
          <VStack paddingBlock={4}>
            {tab === 'calendar' && <CalendarPage />}
            {tab === 'todo' && <TodoPage />}
            {tab === 'expense' && <ExpensePage />}
          </VStack>
        </LayoutContent>
      }
    />
  );
}
