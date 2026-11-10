import { PRESTIGE } from '../../config';
import { ACHIEVEMENTS } from '../../content/achievements';
import { companyOf, FAREWELLS } from '../../content/companies';
import { describeQuirk } from '../../core/quirks';
import { achievementCount, achievementMultiplier } from '../../core/achievements';
import { incidentRunning } from '../../core/incidents';
import { canQuit, experienceBonus, prestigeGain, prestigeMultiplier, quitJob, ticketsForNextPoint } from '../../core/prestige';
import { pick } from '../../util';
import type { AppContext, Tab } from '../app';
import { h, setDisabled, setText } from '../dom';
import { formatNumber } from '../format';
import { showModal } from '../modal';

const pct = (x: number) => `${Math.round(x * 100)} %`;

type AchFilter = 'new' | 'done' | 'open';
const FILTER_LABEL: Record<AchFilter, string> = { new: 'Neu', done: 'Geschafft', open: 'Offen' };
/** Zeitpunkt, bis zu dem Achievements angeschaut wurden (im Spielstand, damit „neu“ ein Neuladen übersteht) */
const SEEN_FLAG = 'ach:seen';

/** Prestige („Kündigen“) und Achievements. */
export function careerTab(): Tab {
  let ctx: AppContext;
  /** Achievements, die seit diesem Zeitpunkt dazukamen, gelten in dieser Ansicht als „neu“ */
  let viewSince = 0;
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
  const chips = (['new', 'done', 'open'] as const).map((f) => {
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
            if (!quitJob(ctx.state)) return;
            ctx.saver.saveNow(); // sonst macht Schließen vor dem Autosave die Kündigung rückgängig
            ctx.sfx.quit();
            ctx.haptic('milestone');
            const c = companyOf(ctx.state.prestige.company);
            if (c.quirk) ctx.log.write('warn', `hr[42]: Neue Firma, neue Sitten: „${c.quirk.title}“ (${describeQuirk(c.quirk.mods)}).`);
            showModal({
              title: `Erster Arbeitstag: ${c.name}`,
              body: [
                pick(FAREWELLS),
                c.welcome,
                ...(c.quirk
                  ? [
                      h('p', { class: 'quirk-line' }, [
                        h('strong', { text: `Hier üblich: ${c.quirk.title}. ` }),
                        c.quirk.flavor,
                        h('span', { class: 'quirk-mods', text: describeQuirk(c.quirk.mods) }),
                      ]),
                    ]
                  : []),
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
    const isNew = (id: string) => (s.achievements[id] ?? 0) > viewSince;
    const counts = { new: 0, done: n, open: ACHIEVEMENTS.length - n };
    for (const a of ACHIEVEMENTS) if (isNew(a.id)) counts.new++;
    if (filter === 'new' && counts.new === 0) filter = 'open';

    setText(achSummary, `${n} von ${ACHIEVEMENTS.length} geschafft · +${pct(achievementMultiplier(s) - 1)} auf alles`);
    achFill.style.width = `${(n / ACHIEVEMENTS.length) * 100}%`;
    for (const c of chips) {
      setText(c.count, String(counts[c.f]));
      c.el.hidden = c.f === 'new' && counts.new === 0;
      c.el.classList.toggle('active', c.f === filter);
      c.el.setAttribute('aria-pressed', String(c.f === filter));
    }
    achEmpty.hidden = counts[filter] > 0;
    setText(achEmpty, filter === 'open' ? 'Alles geschafft. Zeit für Urlaub. (Abgelehnt.)' : 'Noch nichts. Weiter tippen.');

    achList.replaceChildren(
      ...ACHIEVEMENTS.map((a) => {
        const at = s.achievements[a.id];
        const done = !!at;
        const fresh = isNew(a.id);
        const secret = a.hidden && !done;
        const show = filter === 'new' ? fresh : filter === 'done' ? done : !done;
        return h('li', { class: `ach${done ? ' done' : ''}${secret ? ' secret' : ''}${fresh ? ' new' : ''}`, hidden: show ? undefined : '' }, [
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
      }),
    );
  };

  return {
    id: 'career',
    label: 'Karriere',
    icon: '[★]',
    mount(c) {
      ctx = c;
      // Ältere Spielstände: alles bisher Freigeschaltete gilt als gesehen
      c.state.flags[SEEN_FLAG] ??= Date.now();
      viewSince = c.state.flags[SEEN_FLAG];
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
      // „Neu“ = seit dem letzten Besuch; ab jetzt gilt alles als gesehen
      const s = ctx.state;
      viewSince = s.flags[SEEN_FLAG] ?? 0;
      s.flags[SEEN_FLAG] = Date.now();
      filter = Object.values(s.achievements).some((t) => t > viewSince) ? 'new' : 'open';
      achShown = -1;
    },
    badge() {
      const seen = ctx.state.flags[SEEN_FLAG] ?? 0;
      return Object.values(ctx.state.achievements).some((t) => t > seen);
    },
  };
}
