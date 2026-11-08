/**
 * PWA-Vorbereitung. Phase 1: bewusst ohne Service Worker, damit Entwicklung
 * und Vorschau nie alte Builds aus dem Cache liefern.
 *
 * Später: public/sw.js anlegen (Cache-first für Assets) und hier aktivieren:
 *   if ('serviceWorker' in navigator && import.meta.env.PROD) {
 *     navigator.serviceWorker.register('./sw.js');
 *   }
 */
export function registerServiceWorker(): void {
  /* noch nicht aktiv */
}
