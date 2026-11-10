<!-- Wortmarke aus dem Startbildschirm des Spiels -->
<p align="center">
  <img src="docs/marke/wortmarke.png" width="520" alt="Have You Tried Turning It Off and On Again?" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-prototyp-ff9aa2?style=for-the-badge" alt="Status: Prototyp" />
  <img src="https://img.shields.io/badge/sprache-deutsch-ffd166?style=for-the-badge" alt="Sprache: Deutsch" />
  <img src="https://img.shields.io/badge/PWA-offline%20spielbar-9be3c1?style=for-the-badge" alt="PWA, offline spielbar" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-a0c4ff?style=for-the-badge" alt="Lizenz: AGPL-3.0" /></a>
</p>

<p align="center">
  Incremental-Game für alle, die schon mal im IT-Support saßen: Du übernimmst den Helpdesk deines Vorgängers,
  tippst <b>Tickets</b> weg, bis Praktikanten, Skripte und Server die Arbeit machen – und der Pager trotzdem piept.
</p>

## ✨ Features

- 🖥️ **Schreibtisch statt Menü** – Röhrenmonitor mit Desktop und Apps, Tastatur, Telefon, Pager, Kaffeetasse und Gummiente. Upgrades tauchen sichtbar am Tisch auf: neue Tastatur, Mauspad, Headset, Kaffeemaschine.
- ⌨️ **Tippen, das Sinn ergibt** – jede Taste ist richtig, aber was im Fenster erscheint, ist eine echte Antwort auf das Anliegen am Telefon, im passenden Werkzeug: Mail, Ticketsystem, Terminal, Chat, Videocall, Fernwartung oder KI-Assistent.
- 💡 **Einschalten wie im echten Büro** – Netzschalter, Bewegungsmelder, flackernde Leuchtstoffröhren und ein Röhrenmonitor, der sich mit „Bwoing“ entmagnetisiert. Nach zehn Minuten ohne Eingabe geht das Licht aus, die Infrastruktur arbeitet weiter.
- 🚨 **Incidents als Minispiele** – RAID retten, Spam sortieren, Dienste neu starten, Logs durchsuchen, Netzwerk von unten nach oben prüfen, Patchkabel stecken.
- 📟 **Pager, VIP-Mails und der Chef** – Entscheidungen mit Folgen, Mails von oben, die sofort erledigt werden wollen, Aufgaben mit Frist und eine Mail mit „ein paar Fragen“, wenn du länger weg warst.
- 🏢 **Karriere** – kündigen und mit Berufserfahrung neu anfangen: 26 Firmen mit eigenen Eigenheiten (Faxpflicht, Blockchain, Kirchengemeinde) und eigenem Hintergrundbild, dazu Achievements und Sammelbilder.
- 🔊 **Klang aus dem Browser** – sechs mechanische Tastatur-Switches zum Probehören, Röhrenmonitor, Leuchtstoffröhren und leise Büro-Geräusche von nebenan. Keine einzige Audiodatei.
- 📝 **Übergabe vom Vorgänger** – kurze Post-its erklären Neues genau dann, wenn es zum ersten Mal wichtig wird; solange eins hängt, steht das Spiel.
- 📱 **Fürs Handy gemacht** – Hochformat, große Tippflächen, Vibration, als App installierbar und offline spielbar. Der Spielstand bleibt im Browser.
- 🤓 **Insider-Humor** – BOFH, IT Crowd, xkcd, Dilbert, Stromberg und Silicon Valley als Anspielung, nicht als Zitat.

## 📱 Bildschirmfotos

|                                 Start                                  |                         Zettel vom Vorgänger                          |                                 Schreibtisch                                  |
| :--------------------------------------------------------------------: | :-------------------------------------------------------------------: | :---------------------------------------------------------------------------: |
| <img src="docs/bilder/start.jpg" alt="Startbildschirm mit Netzschalter" width="220" /> | <img src="docs/bilder/zettel.jpg" alt="Handschriftliche Übergabe" width="220" /> | <img src="docs/bilder/schreibtisch.jpg" alt="Schreibtisch mit Anrufer und Arbeitsfenster" width="220" /> |

|                                 Incident                                  |                               Mail vom Chef                                |                            Firmen-Hintergrundbild                            |
| :-----------------------------------------------------------------------: | :------------------------------------------------------------------------: | :--------------------------------------------------------------------------: |
| <img src="docs/bilder/incident.jpg" alt="Netzwerk-Incident als Minispiel" width="220" /> | <img src="docs/bilder/chefmail.jpg" alt="Abwesenheitsbericht vom Chef" width="220" /> | <img src="docs/bilder/hintergrund.jpg" alt="Desktop einer anderen Firma" width="220" /> |

## 🚀 Schnellstart

```bash
npm install
npm run dev          # Entwicklungsserver, Adresse steht in der Ausgabe (auch im LAN)
```

Weitere Befehle:

```bash
npm test             # Unit-Tests (vitest): Spiellogik, Balancing, Inhalte
npm run test:e2e     # Playwright im 360-px-Hochformat, eigener Test-Build (?incident=…, ?boot)
npm run build        # Typprüfung und Produktions-Build nach dist/
```

Wo was liegt:

- ⚖️ Balancing: `src/config.ts`
- 💬 Texte und Humor: `src/content/`
- ⚙️ Spiellogik ohne DOM: `src/core/`
- 🎨 Oberfläche: `src/ui/` – Schreibtisch `desk.ts`, Arbeitsfenster `work.ts`, Licht und Monitor `power.ts`, Startablauf `boot.ts`, Klänge `audio.ts` und `ambience.ts`; Theme und Comic-Look in `src/styles/main.css`

## 🙏 Mitwirkende

Schriften: [Fredoka](https://fonts.google.com/specimen/Fredoka) (The Fredoka Project Authors) und [Patrick Hand](https://fonts.google.com/specimen/Patrick+Hand) (Patrick Wagesreiter), beide unter der SIL Open Font License 1.1 – siehe [`src/assets/fonts/OFL.txt`](src/assets/fonts/OFL.txt).

Alles andere – Schreibtisch, Requisiten, Hintergrundbilder, Symbole und sämtliche Klänge – ist im Code gezeichnet bzw. im Browser erzeugt.

## 🤖 Mit KI gebaut

Das Spiel entsteht mit starker KI-Unterstützung: Der größte Teil des Codes, der Inhalte und der Texte stammt von [Claude Code](https://claude.com/claude-code), dem Programmierassistenten von Anthropic.

Mein Teil ist die Produktseite: was das Spiel sein soll, wie es aussehen, klingen und sich anfühlen soll, welcher Humor passt und welche Richtung es nimmt. Ich spiele jeden Stand auf dem Handy, gebe Rückmeldung und entscheide, was bleibt. Die KI setzt das in Code um, prüft es mit Tests, Bildschirmfotos und Simulationen fürs Balancing und dokumentiert es.

Wenn dir ein Fehler oder etwas Seltsames im Code auffällt, freue ich mich über ein [Issue](https://github.com/dvnkln/haveyoutried/issues).

## 📜 Lizenz

Copyright (C) 2026 Devin Klein

[GNU AGPL v3](LICENSE) – du darfst das Spiel frei nutzen, verändern und weitergeben. Wer eine veränderte Fassung weitergibt oder anderen über das Netz anbietet, muss den Quellcode seiner Fassung unter derselben Lizenz offenlegen.

**Zusätzliche Bedingung nach § 7 Abs. e der AGPL:** Die Lizenz erlaubt nicht, den Namen „Have You Tried Turning It Off and On Again?“ (auch gekürzt „Have You Tried…“ oder „HYT“), die Wortmarke oder das App-Symbol für eigene Fassungen zu verwenden. Veränderte Fassungen müssen unter anderem Namen und mit anderem Symbol erscheinen und dürfen nicht den Eindruck erwecken, die offizielle Version zu sein.

Privates Projekt, ohne Gewähr und ohne Support – wenn es dir trotzdem Spaß macht, umso besser.
