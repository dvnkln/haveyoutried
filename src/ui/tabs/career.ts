import { ACHIEVEMENTS_CFG, PRESTIGE } from '../../config';
import { ACHIEVEMENTS } from '../../content/achievements';
import { companyOf, FAREWELLS } from '../../content/companies';
import { achievementCount } from '../../core/achievements';
import { canQuit, prestigeGain, quitJob, ticketsForNextPoint } from '../../core/prestige';
import { pick } from '../../util';
import type { AppContext, Tab } from '../app';
import { h, setDisabled, setText } from '../dom';
import { formatNumber } from '../format';
import { showModal } from '../modal';

const pct = (x: number) => `${Math.round(x * 100)} %`;

/** Prestige („Kündigen“) und Achievements. */
export function careerTab(): Tab {
  let ctx: AppContext;
  let seenAchievements = 0;

  const company = h('dd');
  const jobs = h('dd');
  const exp = h('dd');
  const gain = h('dd');
  const next = h('dd');
  const quitBtn = h('button', { class: 'btn btn-danger quit-btn', type: 'button', text: 'Kündigen' });
  const quitHint = h('p', { class: 'hint' });

  const achTitle = h('div', { class: 'section-title' });
  const achList = h('ul', { class: 'achievements' });
  let achSig = '';

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
          ` (dann ${pct((s.prestige.experience + g) * PRESTIGE.bonusPerPoint)} Bonus auf alles).`,
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
            ctx.sfx.milestone();
            ctx.haptic('milestone');
            const c = companyOf(ctx.state.prestige.company);
            showModal({
              title: `Erster Arbeitstag: ${c.name}`,
              body: [pick(FAREWELLS), c.welcome],
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
    setText(achTitle, `# Achievements (${n}/${ACHIEVEMENTS.length}) · +${pct(n * ACHIEVEMENTS_CFG.bonusPerAchievement)} auf alles`);
    achList.replaceChildren(
      ...ACHIEVEMENTS.map((a) => {
        const done = !!s.achievements[a.id];
        const secret = a.hidden && !done;
        return h('li', { class: `ach${done ? ' done' : ''}${secret ? ' secret' : ''}` }, [
          h('span', { class: 'ach-mark', text: done ? '[x]' : '[ ]' }),
          h('span', { class: 'ach-body' }, [
            h('span', { class: 'ach-name', text: secret ? '??? (geheim)' : a.name }),
            h('span', { class: 'ach-desc', text: secret ? 'Wird verraten, wenn es passiert.' : a.desc }),
          ]),
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
      quitBtn.addEventListener('click', confirmQuit);
      return h('div', { class: 'system career' }, [
        h('div', { class: 'section-title', text: '# Lebenslauf' }),
        h('dl', { class: 'stats' }, [
          h('dt', { text: 'Arbeitgeber' }),
          company,
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
        achList,
      ]);
    },
    render() {
      const s = ctx.state;
      const g = prestigeGain(s);
      setText(company, companyOf(s.prestige.company).name);
      setText(jobs, String(s.prestige.jobs + 1));
      setText(exp, `${s.prestige.experience} (+${pct(s.prestige.experience * PRESTIGE.bonusPerPoint)})`);
      setText(gain, `+${g}`);
      setText(next, `${formatNumber(ticketsForNextPoint(s))} Tickets gesamt`);
      setDisabled(quitBtn, !canQuit(s));
      setText(
        quitHint,
        g >= 1
          ? 'Arbeitszeugnis: „stets bemüht“. Reicht für den nächsten Job.'
          : s.prestige.experience > 0
            ? `Gerade erst angefangen. Noch ${formatNumber(Math.max(0, ticketsForNextPoint(s) - s.ticketsAllTime))} Tickets bis zur nächsten Berufserfahrung.`
            : `Noch zu wenig Erfahrung für ein gutes Arbeitszeugnis. Erster Punkt ab ${formatNumber(PRESTIGE.ticketsPerPoint)} Tickets.`,
      );
      const sig = Object.keys(s.achievements).join();
      if (sig !== achSig) {
        achSig = sig;
        rebuildAchievements();
      }
    },
    onShow() {
      seenAchievements = achievementCount(ctx.state);
    },
    badge() {
      return achievementCount(ctx.state) > seenAchievements;
    },
  };
}
