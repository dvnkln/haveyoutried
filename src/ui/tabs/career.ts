import { PRESTIGE } from '../../config';
import { fresh } from '../../core/deck';
import { ACHIEVEMENTS } from '../../content/achievements';
import { companyOf, FAREWELLS } from '../../content/companies';
import { describeQuirk, quirkEffects } from '../../core/quirks';
import { achievementCount, achievementMultiplier, ACH_SEEN_FLAG, isUnread, markAllRead, markRead } from '../../core/achievements';
import { incidentRunning } from '../../core/incidents';
import { canQuit, experienceBonus, prestigeGain, prestigeMultiplier, quitJob, quitWorth, ticketsForNextPoint } from '../../core/prestige';
import type { AppContext, Tab } from '../app';
import { h, setDisabled, setText } from '../dom';
import { formatNumber } from '../format';
import { showModal } from '../modal';

const pct = (x: number) => `${Math.round(x * 100)} %`;

type AchFilter = 'done' | 'open';
const FILTER_LABEL: Record<AchFilter, string> = { done: 'Geschafft', open: 'Offen' };
/** so lange muss ein neues Achievement sichtbar sein, bis es als gelesen gilt */
const READ_AFTER_MS = 1_000;

/** Prestige („Kündigen“) und Achievements. */
export function careerTab(): Tab {
  let ctx: AppContext;
  let filter: AchFilter = 'open';

  const company = h('dd');
  const quirkEl = h('dd');
  const jobs = h('dd');
  const exp = h('dd');
  const gain = h('dd');
  const next = h('dd');
  const quitBtn = h('button', { class: 'btn btn-danger quit-btn', type: 'button', text: 'Kündigen' });
  const quitHint = h('p', { class: 'hint' });

  const achTitle = h('div', { class: 'section-title', text: '# Achievements' });
  const achSummary = h('div', { class: 'ach-summary' });
  const achFill = h('span', { class: 'ach-progress-fill' });
  const achProgress = h('div', { class: 'ach-progress', 'aria-hidden': 'true' }, [achFill]);
  const chips = (['done', 'open'] as const).map((f) => {
    const count = h('span', { class: 'chip-count' });
    const el = h('button', { class: `ach-chip chip-${f}`, type: 'button', 'aria-pressed': 'false' }, [FILTER_LABEL[f], count]);
    el.addEventListener('click', () => {
      filter = f;
      ctx.sfx.tick();
      rebuildAchievements();
    });
    return { f, el, count };
  });
  const achFilter = h('div', { class: 'ach-filter', role: 'group', 'aria-label': 'Achievements filtern' }, chips.map((c) => c.el));
  const newCount = h('span', { class: 'ach-newcount' });
  const readAll = h('button', { class: 'btn btn-compact ach-readall', type: 'button', text: 'Alle gelesen' });
  const achNews = h('div', { class: 'ach-news', hidden: '' }, [newCount, readAll]);
  readAll.addEventListener('click', () => {
    markAllRead(ctx.state);
    shownNew.clear();
    ctx.sfx.tick();
    for (const li of achList.querySelectorAll('.ach.new')) li.classList.add('read');
    updateNews();
  });
  const readNow = (li: HTMLElement) => {
    readTimers.delete(li);
    watcher?.unobserve(li);
    // Fenster inzwischen zu: nicht als gelesen zählen
    if (!li.isConnected || !li.getClientRects().length) return;
    const id = li.dataset.ach;
    if (!id || !isUnread(ctx.state, id)) return;
    // nur im Spielstand: die Hervorhebung bleibt, solange das Fenster offen ist
    markRead(ctx.state, id);
  };
  /** neue Achievements: ~1 s im Blick = gelesen. Sichtbar wird das erst beim nächsten Öffnen. */
  const readTimers = new Map<Element, number>();
  const watcher =
    typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(
          (entries) => {
            for (const e of entries) {
              const li = e.target as HTMLElement;
              if (e.isIntersecting) {
                if (readTimers.has(li)) continue;
                readTimers.set(
                  li,
                  window.setTimeout(() => readNow(li), READ_AFTER_MS),
                );
              } else {
                clearTimeout(readTimers.get(li));
                readTimers.delete(li);
              }
            }
          },
          { threshold: 0.6 },
        )
      : null;
  /** in diesem Öffnen als neu hervorgehoben (bleibt bis zum Schließen, auch wenn intern schon gelesen) */
  const shownNew = new Set<string>();
  /** Zeile „2 neu · Alle gelesen“ */
  const updateNews = () => {
    const unread = shownNew.size;
    achNews.hidden = unread === 0;
    setText(newCount, unread === 1 ? '1 neues Achievement' : `${unread} neue Achievements`);
  };
  const achEmpty = h('p', { class: 'hint ach-empty', hidden: '' });
  const achList = h('ul', { class: 'achievements' });
  let achShown = -1;

  const confirmQuit = () => {
    const s = ctx.state;
    const g = prestigeGain(s);
    showModal({
      title: 'kill -9 $(pgrep job)',
      body: [
        `Du kündigst bei ${companyOf(s.prestige.company).name}.`,
        h('p', {}, [
          'Dafür bekommst du ',
          h('strong', { class: 'hl', text: `+${g} Berufserfahrung` }),
          ` (dann ${pct(experienceBonus(s.prestige.experience + g))} schneller tippen und mehr Produktion).`,
        ]),
        'Weg sind: Tickets, Infrastruktur, Upgrades, laufende Boosts.',
        'Bleiben: Berufserfahrung, Achievements, Statistik, Einstellungen.',
      ],
      actions: [
        {
          label: 'Kündigen. Ernsthaft.',
          danger: true,
          onClick: () => {
            // alter Job: Name merken, bevor die Kündigung die Firma wechselt
            const oldName = companyOf(ctx.state.prestige.company).name;
            const gained = quitJob(ctx.state);
            if (!gained) return;
            ctx.saver.saveNow(); // sonst macht Schließen vor dem Autosave die Kündigung rückgängig
            ctx.sfx.quit();
            ctx.haptic('milestone');
            const c = companyOf(ctx.state.prestige.company);
            if (c.quirk) ctx.log.write('warn', `hr[42]: Neue Firma, neue Sitten: „${c.quirk.title}“ (${describeQuirk(c.quirk.mods)}).`);
            // zwei getrennte Teile: was vom alten Job bleibt, was im neuen anders ist
            showModal({
              title: 'Jobwechsel',
              body: [
                h('section', { class: 'job-block job-old' }, [
                  h('div', { class: 'job-head' }, [h('span', { class: 'job-kicker', text: 'Tschüss' }), h('b', { text: oldName })]),
                  h('p', { text: fresh('FAREWELLS', FAREWELLS) }),
                  h('p', { class: 'job-result' }, [
                    'Mitgenommen: ',
                    h('strong', { class: 'hl', text: `+${gained} Berufserfahrung` }),
                    ` · jetzt +${pct(prestigeMultiplier(ctx.state) - 1)} auf alles`,
                  ]),
                ]),
                h('div', { class: 'job-arrow', 'aria-hidden': 'true', text: '↓' }),
                h('section', { class: 'job-block job-new' }, [
                  h('div', { class: 'job-head' }, [h('span', { class: 'job-kicker', text: 'Erster Tag' }), h('b', { text: c.name })]),
                  h('p', { text: c.welcome }),
                  c.quirk
                    ? h('div', { class: 'quirk-line' }, [
                        h('strong', { text: `Hier üblich: ${c.quirk.title}` }),
                        h('p', { text: c.quirk.flavor }),
                        h(
                          'span',
                          { class: 'quirk-pills' },
                          quirkEffects(c.quirk.mods).map((e) => h('span', { class: `quirk-pill ${e.tone}`, text: e.text })),
                        ),
                      ])
                    : h('p', { class: 'hint', text: 'Keine Eigenheiten. Sagt jedenfalls das Onboarding-Wiki. Letzte Änderung: vor drei Admins.' }),
                ]),
              ],
              actions: [{ label: 'Na dann.', primary: true }],
            });
          },
        },
        { label: 'Doch bleiben', primary: true },
      ],
      armDelayMs: 600,
    });
  };

  const rebuildAchievements = () => {
    const s = ctx.state;
    const n = achievementCount(s);
    const counts = { done: n, open: ACHIEVEMENTS.length - n };

    setText(achSummary, `${n} von ${ACHIEVEMENTS.length} geschafft · +${pct(achievementMultiplier(s) - 1)} auf alles`);
    achFill.style.width = `${(n / ACHIEVEMENTS.length) * 100}%`;
    for (const c of chips) {
      setText(c.count, String(counts[c.f]));
      c.el.classList.toggle('active', c.f === filter);
      c.el.setAttribute('aria-pressed', String(c.f === filter));
    }
    achEmpty.hidden = counts[filter] > 0;
    setText(achEmpty, filter === 'open' ? 'Alles geschafft. Zeit für Urlaub. (Abgelehnt.)' : 'Noch nichts. Weiter tippen.');

    for (const t of readTimers.values()) clearTimeout(t);
    readTimers.clear();
    watcher?.disconnect();
    // dazugekommene neue (auch während das Fenster offen ist)
    for (const a of ACHIEVEMENTS) if (isUnread(s, a.id)) shownNew.add(a.id);
    // neue zuerst (unter „Geschafft“), sonst Reihenfolge wie in der Liste
    const order = [...ACHIEVEMENTS].sort((a, b) => Number(shownNew.has(b.id)) - Number(shownNew.has(a.id)));
    achList.replaceChildren(
      ...order.map((a) => {
        const at = s.achievements[a.id];
        const done = !!at;
        const fresh = shownNew.has(a.id);
        const secret = a.hidden && !done;
        const show = filter === 'done' ? done : !done;
        const li = h('li', { class: `ach${done ? ' done' : ''}${secret ? ' secret' : ''}${fresh ? ' new' : ''}`, 'data-ach': a.id, hidden: show ? undefined : '' }, [
          h('span', { class: 'ach-mark', 'aria-hidden': 'true', text: done ? '★' : secret ? '?' : '○' }),
          // Status für Screenreader (das Symbol ist nur Deko)
          h('span', { class: 'sr-only', text: done ? (fresh ? 'Neu geschafft:' : 'Geschafft:') : secret ? 'Geheim, offen:' : 'Offen:' }),
          h('span', { class: 'ach-body' }, [
            h('span', { class: 'ach-name', text: secret ? '??? (geheim)' : a.name }),
            h('span', { class: 'ach-desc', text: secret ? 'Wird verraten, wenn es passiert.' : a.desc }),
            done ? h('span', { class: 'ach-date', text: `am ${new Date(at).toLocaleDateString('de-DE')}` }) : '',
          ]),
          fresh ? h('span', { class: 'ach-new', text: 'NEU' }) : '',
        ]);
        if (fresh && show && isUnread(s, a.id)) {
          // ohne IntersectionObserver (alte WebViews): gilt nach kurzer Zeit im offenen Fenster als gelesen
          if (watcher) watcher.observe(li);
          else readTimers.set(li, window.setTimeout(() => readNow(li), READ_AFTER_MS));
        }
        return li;
      }),
    );
    updateNews();
  };

  return {
    id: 'career',
    label: 'Karriere',
    icon: '[★]',
    mount(c) {
      ctx = c;
      // Ältere Spielstände: alles bisher Freigeschaltete gilt als gesehen
      c.state.flags[ACH_SEEN_FLAG] ??= Date.now();
      quitBtn.addEventListener('click', confirmQuit);
      return h('div', { class: 'system career' }, [
        h('div', { class: 'section-title', text: '# Lebenslauf' }),
        h('dl', { class: 'stats' }, [
          h('dt', { text: 'Arbeitgeber' }),
          company,
          h('dt', { text: 'Hier üblich' }),
          quirkEl,
          h('dt', { text: 'Jobs bisher' }),
          jobs,
          h('dt', { text: 'Berufserfahrung' }),
          exp,
          h('dt', { text: 'Bei Kündigung' }),
          gain,
          h('dt', { text: 'Nächster Punkt ab' }),
          next,
        ]),
        quitBtn,
        quitHint,
        achTitle,
        achSummary,
        achProgress,
        achFilter,
        achNews,
        achEmpty,
        achList,
      ]);
    },
    render() {
      const s = ctx.state;
      const g = prestigeGain(s);
      const c = companyOf(s.prestige.company);
      setText(company, c.name);
      setText(quirkEl, c.quirk ? `${c.quirk.title}: ${describeQuirk(c.quirk.mods)}` : 'nichts Besonderes (zum Glück)');
      setText(jobs, String(s.prestige.jobs + 1));
      setText(exp, `${s.prestige.experience} (+${pct(prestigeMultiplier(s) - 1)})`);
      setText(gain, `+${g}`);
      setText(next, `${formatNumber(ticketsForNextPoint(s))} Tickets gesamt`);
      setDisabled(quitBtn, !canQuit(s));
      setText(
        quitHint,
        g >= 1 && incidentRunning()
          ? 'Erst den Incident lösen. Mitten im Brand kündigt man nicht (zumindest nicht schriftlich).'
          : g >= 1
            ? 'Arbeitszeugnis: „stets bemüht“. Reicht für den nächsten Job.'
            : s.prestige.experience > 0
              ? `Gerade erst angefangen. Noch ${formatNumber(Math.max(0, ticketsForNextPoint(s) - s.ticketsAllTime))} Tickets bis zur nächsten Berufserfahrung.`
              : `Noch zu wenig Erfahrung für ein gutes Arbeitszeugnis. Erster Punkt ab ${formatNumber(PRESTIGE.ticketsPerPoint)} Tickets.`,
      );
      const n = achievementCount(s);
      if (n !== achShown) {
        achShown = n;
        rebuildAchievements();
      }
    },
    onShow() {
      // gibt es neue, zeigt die Liste „Geschafft“ mit den neuen oben
      const s = ctx.state;
      shownNew.clear();
      filter = ACHIEVEMENTS.some((a) => isUnread(s, a.id)) ? 'done' : 'open';
      achShown = -1;
    },
    /** Punkt nur fürs Kündigen (Achievements melden sich selbst per Meldung) */
    badge() {
      return quitWorth(ctx.state);
    },
  };
}
