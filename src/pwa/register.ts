/**
 * Service Worker nur im Produktions-Build: Entwicklung (vite dev) soll nie aus dem Cache kommen.
 * sw.js entsteht beim Build (vite.config.ts) aus src/pwa/sw.template.js.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  // Kein HTTPS (z. B. Vorschau per IP): Browser lehnt ab, Spiel läuft trotzdem.
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
