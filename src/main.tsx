import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Naya build deploy hote hi service worker turant activate ho aur page reload ho jaye,
// taaki purani cached JS kabhi na chale (jaise login/refresh wala bug).
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true); // naya SW turant activate karo
  },
  onRegisterError(error) {
    console.error('Service worker registration failed', error);
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);