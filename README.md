# Have You Tried Turning It Off and On Again?

Incremental-/Clicker-Game für Sysadmins. Mobile first, Terminal-Look, Vanilla TypeScript + Vite.

```sh
npm install
npm run dev          # http://localhost:5173 (auch im LAN erreichbar)
npm test             # Unit-Tests (vitest)
npm run test:e2e     # Playwright-Smoke, 360px-Viewport
npm run vorschau     # Build + nginx-Container auf http://192.168.178.17:8081
```

- Balancing: `src/config.ts`
- Texte/Humor: `src/content/`
- Spiellogik (ohne DOM): `src/core/`
- UI: `src/ui/`, Theme-Variablen in `src/styles/main.css`
