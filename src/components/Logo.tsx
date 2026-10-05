import { useState } from 'react';
import { Heading } from '@astryxdesign/core/Heading';

/** public/logo.svg 를 넣으면 로고가 나온다. 파일이 없거나 읽지 못하면 글자로 대신한다. */
export function Logo() {
  const [failed, setFailed] = useState(false);
  if (failed) return <Heading level={1} type="display-3">플래너</Heading>;
  return <img src="/logo.svg" alt="플래너" height={28} style={{ display: 'block', height: 28, width: 'auto' }} onError={() => setFailed(true)} />;
}
