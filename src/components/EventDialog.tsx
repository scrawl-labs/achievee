import { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import type { ISODateString } from '@astryxdesign/core/Calendar';
import { DateInput } from '@astryxdesign/core/DateInput';
import { Dialog } from '@astryxdesign/core/Dialog';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { StackItem } from '@astryxdesign/core/Stack';
import { TextInput } from '@astryxdesign/core/TextInput';
import { TimeInput, type ISOTimeString } from '@astryxdesign/core/TimeInput';
import { Token } from '@astryxdesign/core/Token';
import { VStack } from '@astryxdesign/core/VStack';
import { store } from '../store';
import type { DateKey } from '../types';

export interface EventDraft {
  id?: string;
  title: string;
  date: DateKey;
  start: string;
  end: string;
}

interface Props {
  draft: EventDraft | null;
  onClose: () => void;
}

export function EventDialog({ draft, onClose }: Props) {
  return (
    <Dialog isOpen={draft !== null} onOpenChange={(open) => !open && onClose()} purpose="form">
      {draft && <Body key={draft.id ?? `${draft.date}${draft.start}`} draft={draft} onClose={onClose} />}
    </Dialog>
  );
}

function Body({ draft, onClose }: { draft: EventDraft; onClose: () => void }) {
  const [title, setTitle] = useState(draft.title);
  const [date, setDate] = useState(draft.date);
  const [start, setStart] = useState(draft.start);
  const [end, setEnd] = useState(draft.end);
  const [error, setError] = useState('');

  function submit() {
    try {
      const input = { title, date, start, end };
      if (draft.id) store.updateEvent(draft.id, input);
      else store.addEvent(input);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <VStack gap={4}>
      <Heading level={3}>{draft.id ? '일정 수정' : '새 일정'}</Heading>
      <TextInput label="제목" placeholder="제목 추가" hasAutoFocus value={title} onChange={(v) => setTitle(v)} onEnter={submit} />
      <DateInput
        label="날짜"
        value={date as ISODateString}
        onChange={(v) => v && setDate(v)}
      />
      <HStack gap={2}>
        <StackItem size="fill">
          <TimeInput label="시작" value={start as ISOTimeString} onChange={(v) => setStart(v ?? '')} />
        </StackItem>
        <StackItem size="fill">
          <TimeInput label="끝" value={end as ISOTimeString} onChange={(v) => setEnd(v ?? '')} />
        </StackItem>
      </HStack>
      {error && <Token color="red" label={error} />}
      <HStack gap={2} justify="end">
        {draft.id && (
          <Button
            label="삭제"
            variant="destructive"
            onClick={() => {
              store.deleteEvent(draft.id!);
              onClose();
            }}
          />
        )}
        <Button label="취소" variant="ghost" onClick={onClose} />
        <Button label="저장" variant="primary" onClick={submit} />
      </HStack>
    </VStack>
  );
}
