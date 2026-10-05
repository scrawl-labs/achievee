import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Theme } from '@astryxdesign/core/theme';
import App from './App';
import { neutralTheme } from './theme/neutralTheme';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Theme theme={neutralTheme}>
      <App />
    </Theme>
  </StrictMode>,
);
