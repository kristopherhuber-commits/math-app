import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource-variable/nunito';
import 'katex/dist/katex.min.css';
import './ui/theme/tokens.css';
import './ui/theme/global.css';
import { App } from './ui/App';

registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
