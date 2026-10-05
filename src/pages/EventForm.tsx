import { useState } from 'react';
import { Button } from '@astryxdesign/core/Button';
import { Dialog } from '@astryxdesign/core/Dialog';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { TextInput } from '@astryxdesign/core/TextInput';
import { TimeInput } from '@astryxdesign/core/TimeInput';
import { Token } from '@astryxdesign/core/Token';
import { VStack } from '@astryxdesign/core/VStack';
import type { ISOTimeString } from '@astryxdesign/core/TimeInput';
import { store } from '../store';
import type { DateKey } from '../types';

export interface EventDraft {
  id?: string;
  title: string;
  start: string;
  end: string;
}

interface Props {
  date: DateKey;
  draft: EventDraft | null;
  onClose: () => void;
}

export function EventForm({ date, draft, onClose }: Props) {
  return (
    <Dialog isOpen={draft !== null} onOpenChange={(open) => !open && onClose()} purpose="form">
      {draft && <EventFormBody key={draft.id ?? draft.start} date={date} draft={draft} onClose={onClose} />}
    </Dialog>
  );
}

function EventFormBody({ date, draft, onClose }: { date: DateKey; draft: EventDraft; onClose: () => void }) {
  const [title, setTitle] = useState(draft.title);
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
      <TextInput label="제목" placeholder="무슨 일정이에요?" hasAutoFocus value={title} onChange={(v) => setTitle(v)} onEnter={submit} />
      <HStack gap={2}>
        <TimeInput label="시작" value={start as ISOTimeString} onChange={(v) => setStart(v ?? '')} />
        <TimeInput label="끝" value={end as ISOTimeString} onChange={(v) => setEnd(v ?? '')} />
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
