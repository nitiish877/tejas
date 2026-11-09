import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

async function removeLegacyOfflineCache() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const hadController = Boolean(navigator.serviceWorker.controller);
    await Promise.all(registrations.map((registration) => registration.unregister()));
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => /workbox|vite-pwa/i.test(name)).map((name) => caches.delete(name)));
    }
    // Existing tabs may still be controlled until their next navigation. Reload once
    // after unregistering so the document itself is fetched from the network.
    if (hadController && !sessionStorage.getItem('tejas_legacy_sw_removed_v1')) {
      sessionStorage.setItem('tejas_legacy_sw_removed_v1', '1');
      window.location.reload();
      return;
    }
    sessionStorage.removeItem('tejas_legacy_sw_removed_v1');
  } catch (error) {
    console.warn('Could not remove the previous offline app cache:', error);
  }
}

void removeLegacyOfflineCache().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
