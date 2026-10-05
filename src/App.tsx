import { useMemo, useState } from 'react';
import { BottomSheet } from '@astryxdesign/core/BottomSheet';
import { Button } from '@astryxdesign/core/Button';
import { Calendar, type ISODateString } from '@astryxdesign/core/Calendar';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Layout, LayoutContent, LayoutHeader, LayoutPanel } from '@astryxdesign/core/Layout';
import { SegmentedControl, SegmentedControlItem } from '@astryxdesign/core/SegmentedControl';
import { StackItem } from '@astryxdesign/core/Stack';
import { VStack } from '@astryxdesign/core/VStack';
import { Logo } from './components/Logo';
import { EventDialog, type EventDraft } from './components/EventDialog';
import { MonthView } from './components/MonthView';
import { SidePanel, type PanelTab } from './components/SidePanel';
import { TimeGrid } from './components/TimeGrid';
import { useIsWide } from './hooks/useIsWide';
import { addDays, parseDateKey, toDateKey } from './lib/date';
import { weekDays } from './lib/timegrid';
import { useAppData } from './store';
import type { CalEvent, DateKey } from './types';

type View = 'day' | 'week' | 'month';

function shift(date: DateKey, view: View, dir: 1 | -1): DateKey {
  if (view === 'day') return addDays(date, dir);
  if (view === 'week') return addDays(date, 7 * dir);
  const d = parseDateKey(date);
  return toDateKey(new Date(d.getFullYear(), d.getMonth() + dir, 1));
}

function titleOf(date: DateKey, view: View): string {
  const d = parseDateKey(date);
  const base = `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
  return view === 'day' ? `${base} ${d.getDate()}일` : base;
}

export default function App() {
  const wide = useIsWide();
  const { events } = useAppData();
  const today = toDateKey(new Date());
  const [view, setView] = useState<View>(() => window.matchMedia('(min-width: 900px)').matches ? 'week' : 'day');
  const [date, setDate] = useState<DateKey>(today);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>('todo');
  const [draft, setDraft] = useState<EventDraft | null>(null);

  const days = useMemo(() => (view === 'week' ? weekDays(date) : [date]), [view, date]);
  const openEvent = (e: CalEvent) => setDraft({ id: e.id, title: e.title, date: e.date, start: e.start, end: e.end });
  const goDay = (d: DateKey) => {
    setDate(d);
    setView('day');
  };

  const panel = <SidePanel date={date} tab={panelTab} onTab={setPanelTab} />;

  return (
    <>
      <Layout
        height="fill"
        header={
          <LayoutHeader hasDivider>
            <HStack gap={2} align="center" wrap="wrap" paddingInline={3} paddingBlock={2}>
              {wide && <Logo />}
              <Button label="오늘" variant="secondary" onClick={() => setDate(today)} />
              <IconButton label="이전" icon={<Icon icon="chevronLeft" />} variant="ghost" onClick={() => setDate(shift(date, view, -1))} />
              <IconButton label="다음" icon={<Icon icon="chevronRight" />} variant="ghost" onClick={() => setDate(shift(date, view, 1))} />
              <Heading level={2}>{titleOf(date, view)}</Heading>
              <StackItem size="fill">
                <span />
              </StackItem>
              <SegmentedControl label="보기" value={view} onChange={(v) => setView(v as View)}>
                <SegmentedControlItem value="day" label="일" />
                <SegmentedControlItem value="week" label="주" />
                <SegmentedControlItem value="month" label="월" />
              </SegmentedControl>
              <IconButton
                label="할 일·가계부"
                icon={<Icon icon="check" />}
                variant={panelOpen ? 'primary' : 'secondary'}
                onClick={() => setPanelOpen((o) => !o)}
              />
            </HStack>
          </LayoutHeader>
        }
        start={
          wide && (
            <LayoutPanel width={264} hasDivider padding={3}>
              <VStack gap={4}>
                <Calendar
                  mode="single"
                  value={date as ISODateString}
                  onChange={(v) => typeof v === 'string' && setDate(v)}
                />
              </VStack>
            </LayoutPanel>
          )
        }
        content={
          <LayoutContent padding={0}>
            {view === 'month' ? (
              <MonthView date={date} today={today} events={events} onSelectDay={goDay} onOpen={openEvent} />
            ) : (
              <TimeGrid
                key={view}
                days={days}
                today={today}
                events={events}
                onCreate={(d, start, end) => setDraft({ title: '', date: d, start, end })}
                onOpen={openEvent}
                onDayClick={goDay}
              />
            )}
          </LayoutContent>
        }
        end={
          wide && panelOpen && (
            <LayoutPanel width={340} hasDivider padding={4}>
              {panel}
            </LayoutPanel>
          )
        }
      />
      {!wide && (
        <>
          <BottomSheet isOpen={panelOpen} onOpenChange={setPanelOpen} label="할 일·가계부" height="tall">
            <VStack padding={4}>{panel}</VStack>
          </BottomSheet>
        </>
      )}
      <EventDialog draft={draft} onClose={() => setDraft(null)} />
    </>
  );
}
