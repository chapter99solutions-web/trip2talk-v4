import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles/cyberpunk.css';
import './index.css';
import { I18nProvider } from './lib/i18n';
// side-effect import: แนบ window.testGSheetSync เพื่อทดสอบ booking → Sheets จาก console
import './lib/gsheetSync';

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('New version available! Update now?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('[Trip2Talk] App ready for offline use');
  },
  onRegistered(r) {
    console.log('[Trip2Talk] SW registered:', r);
  },
  onRegisterError(error) {
    console.error('[Trip2Talk] SW registration error:', error);
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>
);
