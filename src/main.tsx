import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import './styles/calendar.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { InternationalizationProvider } from '@astryxdesign/core/i18n';
import koKR from '@astryxdesign/core/locales/ko-KR.generated.js';
import { Theme } from '@astryxdesign/core/theme';
import App from './App';
import { neutralTheme } from './theme/neutralTheme';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <InternationalizationProvider locale="ko-KR" messages={{ 'ko-KR': koKR }}>
      <Theme theme={neutralTheme}>
        <App />
      </Theme>
    </InternationalizationProvider>
  </StrictMode>,
);
