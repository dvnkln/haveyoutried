import { CONFIG } from '../../config';
import type { AppContext, Tab } from '../app';
import { h, setText } from '../dom';
import { formatDuration, formatNumber } from '../format';
import { SWITCHES } from '../audio';
import { TAP_SOUND_IDS } from '../../core/state';
import { hapticSupport } from '../haptics';
import { showModal } from '../modal';
import { resetTutorial, setTutorialOff, tutorialOff } from '../tutorial';
import { clearWall, paintWall, validWall, wallChoices } from '../wallpaper';
import { ACHIEVEMENTS } from '../../content/achievements';
import { achievementCount } from '../../core/achievements';

/**
 * Seitlich wischen = blättern (die Maus darf über den Rand hinausziehen).
 * down/up für Extras wie den Switch-Tester (Klick beim Drücken, Rückklick beim Loslassen).
 */
function onSwipe(el: HTMLElement, step: (dir: number) => void, hooks: { down?(): void; up?(): void } = {}): void {
  let downX: number | null = null;
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    downX = e.clientX;
    el.setPointerCapture?.(e.pointerId);
    hooks.down?.();
  });
  const up = (e: PointerEvent) => {
    if (downX === null) return;
    const dx = e.clientX - downX;
    downX = null;
    hooks.up?.();
    if (e.type === 'pointerup' && Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
}

const achievementName = (id: string) => ACHIEVEMENTS.find((a) => a.id === id)?.name ?? id;

type SwitchType = 'clicky' | 'tactile' | 'linear';
const TYPE_LABEL: Record<SwitchType, string> = { clicky: 'klickend', tactile: 'taktil', linear: 'linear' };

/** Aussehen und Daten der Switches (Federkraft wie beim Original), plus ein Insider pro Switch */
const SWITCH_LOOK: Record<(typeof TAP_SOUND_IDS)[number], { stem: string; housing: string; type: SwitchType; force: number; loud: number; quip: string }> = {
  blue: { stem: '#5b9bff', housing: '#3a3f4b', type: 'clicky', force: 60, loud: 3, quip: 'Großraumbüro-Terror. Die Kollegen planen etwas.' },
  green: { stem: '#5cc77f', housing: '#3a3f4b', type: 'clicky', force: 80, loud: 3, quip: 'Wie Blue, nur mit Krafttraining.' },
  brown: { stem: '#a97452', housing: '#3a3f4b', type: 'tactile', force: 55, loud: 2, quip: 'Der Kompromiss. Wie jedes Meeting.' },
  red: { stem: '#ff6b6b', housing: '#3a3f4b', type: 'linear', force: 45, loud: 2, quip: 'Leicht, schnell, beliebt bei Gamern und Praktikanten.' },
  black: { stem: '#3d3438', housing: '#8a8f9b', type: 'linear', force: 60, loud: 2, quip: 'Old School. Schwer wie ein Montag.' },
  silent: { stem: '#ff9aa2', housing: '#3a3f4b', type: 'linear', force: 45, loud: 1, quip: 'Für Telefonkonferenzen mit dem Chef.' },
};

type SwitchId = (typeof TAP_SOUND_IDS)[number];
/** gespeicherter Switch, unbekannte Werte (alter Spielstand) → Blue */
const validSwitch = (id: string): SwitchId => ((TAP_SOUND_IDS as readonly string[]).includes(id) ? (id as SwitchId) : 'blue');

/** Switch von oben: Gehäuse mit Kreuz-Stem */
const switchSvg = (stem: string, housing: string) => `<svg viewBox="0 0 44 44">
  <rect x="3" y="3" width="38" height="38" rx="7" fill="${housing}" stroke="var(--ink)" stroke-width="2.5"/>
  <rect x="9" y="9" width="26" height="26" rx="5" fill="#fffaf0" opacity=".14"/>
  <path d="M19 12 h6 v7 h7 v6 h-7 v7 h-6 v-7 h-7 v-6 h7Z" fill="${stem}" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round"/>
  <circle cx="10" cy="10" r="1.6" fill="#fffaf0" opacity=".5"/><circle cx="34" cy="34" r="1.6" fill="#fffaf0" opacity=".5"/>
</svg>`;

/** Stats, Einstellungen, Spielstand. */
export function systemTab(): Tab {
  let ctx: AppContext;
  const stat = (label: string) => {
    const value = h('dd');
    return { value, nodes: [h('dt', { text: label }), value] };
  };
  const stats = {
    total: stat('Tickets (dieser Job)'),
    solved: stat('Von Hand gelöst'),
    clicks: stat('Anschläge'),
    offline: stat('Nachts erledigt'),
    play: stat('Uptime'),
    since: stat('Im Dienst seit'),
  };
  // Symbol-Schalter: bei „aus“ rot durchgestrichen
  const hapticBtn = h('button', { class: 'icon-toggle', type: 'button', role: 'switch', 'aria-label': 'Vibration', text: '((•))' });
  const hintBtn = h('button', { class: 'icon-toggle', type: 'button', role: 'switch', 'aria-label': 'Hinweise vom Vorgänger', text: '✎' });
  const soundBtn = h('button', { class: 'icon-toggle', type: 'button', role: 'switch', 'aria-label': 'Sound', text: '♪' });
  const volume = h('input', { class: 'volume', type: 'range', min: '0', max: '1', step: '0.1', 'aria-label': 'Lautstärke Tastatur und Spiel' });
  const ambVolume = h('input', { class: 'volume', type: 'range', min: '0', max: '1', step: '0.1', 'aria-label': 'Lautstärke Büro-Geräusche' });
  // Switch-Auswahl: ein Switch zur Zeit, Pfeile/Wischen/Punkte wechseln (= einbauen), Drücken = Probe wie am Switch-Tester
  const pic = h('span', { class: 'switch-pic', 'aria-hidden': 'true' });
  const name = h('span', { class: 'switch-name' });
  const type = h('span', { class: 'switch-type' });
  const force = h('span', { class: 'meter-label' });
  const forceFill = h('span', { class: 'meter-fill' });
  const loud = h('span', { class: 'switch-loud' });
  const quip = h('span', { class: 'switch-quip' });
  const card = h('button', { class: 'switch-card', type: 'button' }, [
    pic,
    h('span', { class: 'switch-info' }, [
      name,
      type,
      h('span', { class: 'switch-meter' }, [force, h('span', { class: 'meter' }, [forceFill])]),
      loud,
      quip,
    ]),
  ]);
  const prevBtn = h('button', { class: 'switch-arrow', type: 'button', 'aria-label': 'Vorheriger Switch', text: '‹' });
  const nextBtn = h('button', { class: 'switch-arrow', type: 'button', 'aria-label': 'Nächster Switch', text: '›' });
  const dots = TAP_SOUND_IDS.map((id) =>
    h('button', { class: 'switch-dot', type: 'button', role: 'radio', tabindex: '-1', 'aria-label': `Cherry ${SWITCHES[id].label}, ${SWITCHES[id].hint}`, style: `--stem:${SWITCH_LOOK[id].stem}` }),
  );
  /** angezeigter Switch; null = Karte noch nicht befüllt */
  let shown: SwitchId | null = null;
  const showSwitch = (id: SwitchId, dir = 0) => {
    if (shown === id) return;
    shown = id;
    const look = SWITCH_LOOK[id];
    pic.innerHTML = switchSvg(look.stem, look.housing);
    setText(name, SWITCHES[id].label);
    setText(type, TYPE_LABEL[look.type]);
    type.className = `switch-type type-${look.type}`;
    setText(force, `${look.force} cN`);
    forceFill.style.width = `${Math.round((look.force / 80) * 100)}%`;
    setText(loud, `${'●'.repeat(look.loud)}${'○'.repeat(3 - look.loud)} Lautstärke`);
    setText(quip, look.quip);
    // Radio-Muster: nur der gewählte Punkt ist per Tab erreichbar, Pfeile wechseln
    dots.forEach((d, i) => {
      const on = TAP_SOUND_IDS[i] === id;
      d.setAttribute('aria-checked', String(on));
      d.tabIndex = on ? 0 : -1;
    });
    if (dir) {
      card.classList.remove('slide-l', 'slide-r');
      void card.offsetWidth; // Animation neu starten
      card.classList.add(dir > 0 ? 'slide-r' : 'slide-l');
    }
  };
  const HAPTIC_HINT = {
    vibrate: 'Vibriert beim Tippen und Kaufen. Spürst du nichts? In Android „Berührungs-Feedback“ einschalten.',
    ios: 'iPhone: Safari erlaubt nur ein leichtes Klicken (ab iOS 18). Mehr gibt Apple nicht her.',
    none: 'Dein Gerät kann nicht vibrieren. Bei mir geht’s.',
  } as const;

  // Alles löschen: statt „yes“ eintippen ein Kippschalter mit Sicherung; erst dann geht „Ausführen“
  const resetDialog = () => {
    const sw = h('button', { class: 'kill-switch', type: 'button', role: 'switch', 'aria-checked': 'false', 'aria-label': 'Wirklich alles löschen' }, [
      h('span', { class: 'ks-track', 'aria-hidden': 'true' }, [h('span', { class: 'ks-knob' })]),
      h('span', { class: 'ks-label', text: 'Sicherung umlegen' }),
    ]);
    const armed = () => sw.getAttribute('aria-checked') === 'true';
    let run: HTMLButtonElement | null = null;
    showModal({
      title: 'rm -rf / --no-preserve-root',
      body: ['Löscht den kompletten Spielstand. Es gibt kein Backup. (Es gab nie ein Backup.)', sw],
      actions: [
        {
          label: 'Ausführen',
          danger: true,
          init: (btn) => {
            run = btn;
            btn.disabled = true;
          },
          onClick: () => {
            // doppelt gesichert: ohne umgelegten Schalter passiert nichts
            if (!armed()) return false;
            ctx.saver.wipe();
            location.reload();
          },
        },
        { label: 'Abbrechen', primary: true },
      ],
    });
    sw.addEventListener('click', () => {
      const on = !armed();
      sw.setAttribute('aria-checked', String(on));
      setText(sw.querySelector('.ks-label')!, on ? 'Scharf. Letzte Chance.' : 'Sicherung umlegen');
      if (run) run.disabled = !on;
      ctx.haptic(on ? 'error' : 'tap');
      ctx.sfx.tick();
    });
  };

  // Hintergrundbild: Karussell wie bei den Switches. Weiterblättern = aufhängen; gesperrte zeigen, welches Achievement sie bringt
  const wallPic = h('div', { class: 'wallpaper thumb', 'aria-hidden': 'true' });
  const wallName = h('span', { class: 'wall-name' });
  const wallLock = h('span', { class: 'wall-lock' });
  const wallCount = h('span', { class: 'wall-count' });
  const wallCard = h('div', { class: 'switch-card wall-card', 'aria-live': 'polite' }, [
    wallPic,
    h('span', { class: 'wall-info' }, [wallName, wallLock, wallCount]),
  ]);
  const wallPrev = h('button', { class: 'switch-arrow', type: 'button', 'aria-label': 'Vorheriges Hintergrundbild', text: '‹' });
  const wallNext = h('button', { class: 'switch-arrow', type: 'button', 'aria-label': 'Nächstes Hintergrundbild', text: '›' });
  /** angezeigtes Bild (kann ein gesperrtes sein); null = noch nicht befüllt */
  let wallShown: string | null = null;
  let wallSig = '';
  const choices = () => wallChoices(ctx.state, achievementName);
  const showWall = (id: string, dir = 0) => {
    const list = choices();
    const i = Math.max(0, list.findIndex((c) => c.id === id));
    const c = list[i]!;
    wallShown = c.id;
    if (c.locked) clearWall(wallPic);
    else paintWall(wallPic, ctx.state, c.id);
    wallCard.classList.toggle('locked', !!c.locked);
    setText(wallName, c.locked ? '???' : c.name);
    const hanging = c.id === validWall(ctx.state, ctx.state.settings.wallpaper);
    setText(wallLock, c.locked ? `Gesperrt. Gibt’s für: ${c.locked}` : [c.note, hanging ? 'Hängt gerade.' : ''].filter(Boolean).join(' '));
    setText(wallCount, `${i + 1} / ${list.length}`);
    if (dir) {
      wallCard.classList.remove('slide-l', 'slide-r');
      void wallCard.offsetWidth; // Animation neu starten
      wallCard.classList.add(dir > 0 ? 'slide-r' : 'slide-l');
    }
  };
  /** Weiterblättern: freigeschaltete werden gleich aufgehängt, gesperrte nur gezeigt */
  const stepWall = (dir: number) => {
    const list = choices();
    const i = list.findIndex((c) => c.id === wallShown);
    const next = list[(i + dir + list.length) % list.length]!;
    if (!next.locked) ctx.state.settings.wallpaper = next.id;
    showWall(next.id, dir);
    ctx.sfx.tick();
  };
  const renderWalls = () => {
    const s = ctx.state;
    // neu freigeschaltet oder Firma gewechselt: Karussell zeigt wieder das aufgehängte Bild (billiger Vergleich, läuft jeden Frame)
    const sig = `${achievementCount(s)}|${s.prestige.company}`;
    if (sig === wallSig && wallShown !== null) return;
    wallSig = sig;
    showWall(validWall(s, s.settings.wallpaper));
  };

  /** Bereich der Einstellungen: Kopfzeile (mit Schalter für alles), darunter die Einzelheiten */
  const group = (title: string, toggle: HTMLElement | null, children: HTMLElement[]) =>
    h('section', { class: 'conf-group' }, [h('div', { class: 'conf-head' }, [h('span', { class: 'conf-title', text: title }), ...(toggle ? [toggle] : [])]), ...children]);

  const button = (label: string, onClick: () => void, cls = 'btn') => {
    const b = h('button', { class: cls, type: 'button', text: label });
    b.addEventListener('click', onClick);
    return b;
  };

  return {
    id: 'system',
    label: 'System',
    icon: '(⚙)',
    mount(c) {
      ctx = c;
      hapticBtn.addEventListener('click', () => {
        ctx.state.settings.haptics = !ctx.state.settings.haptics;
        ctx.haptic('tap');
        ctx.sfx.tick();
      });
      hintBtn.addEventListener('click', () => {
        setTutorialOff(ctx.state, !tutorialOff(ctx.state));
        ctx.sfx.tick();
      });
      soundBtn.addEventListener('click', () => {
        ctx.state.settings.sound = !ctx.state.settings.sound;
        void ctx.sfx.unlock().then(() => ctx.sfx.tick());
      });
      const current = () => validSwitch(ctx.state.settings.tapSound);
      /** Wechseln = einbauen; mit Probe und Vibration, außer beim Wischen (da hat der Finger schon geklickt) */
      const choose = (id: SwitchId, dir: number, preview = true) => {
        ctx.state.settings.tapSound = id;
        ctx.state.settings.sound = true;
        showSwitch(id, dir);
        if (!preview) return;
        void ctx.sfx.unlock().then(() => ctx.sfx.preview(id));
        ctx.haptic('tap');
      };
      const step = (dir: number, preview = true) => {
        const i = TAP_SOUND_IDS.indexOf(current());
        choose(TAP_SOUND_IDS[(i + dir + TAP_SOUND_IDS.length) % TAP_SOUND_IDS.length]!, dir, preview);
      };
      prevBtn.addEventListener('click', () => step(-1));
      nextBtn.addEventListener('click', () => step(1));
      dots.forEach((d, i) => {
        d.addEventListener('click', () => {
          const target = TAP_SOUND_IDS[i]!;
          if (target !== current()) choose(target, i > TAP_SOUND_IDS.indexOf(current()) ? 1 : -1);
        });
        d.addEventListener('keydown', (e) => {
          const dir = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : 0;
          if (!dir) return;
          e.preventDefault();
          step(dir);
          dots[TAP_SOUND_IDS.indexOf(current())]?.focus();
        });
      });
      // Switch-Tester: runter = Klick, hoch = Rückklick; seitlich wischen = wechseln
      /** Rückklick erst nach dem Klick: beim ersten Antippen muss der Ton noch aufwachen */
      let pressed: Promise<unknown> = Promise.resolve();
      onSwipe(card, (dir) => step(dir, false), {
        down() {
          card.classList.add('pressed');
          ctx.state.settings.sound = true;
          const id = current();
          pressed = ctx.sfx.unlock().then(() => ctx.sfx.tap(id));
          ctx.haptic('tap');
        },
        up() {
          card.classList.remove('pressed');
          const id = current();
          void pressed.then(() => ctx.sfx.release(id));
        },
      });
      // Tastatur (Enter/Leertaste) löst nur „click“ aus: dann einmal komplett probehören
      card.addEventListener('click', (e) => {
        if (e.detail !== 0) return;
        ctx.state.settings.sound = true;
        void ctx.sfx.unlock().then(() => ctx.sfx.preview(current()));
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          step(e.key === 'ArrowLeft' ? -1 : 1);
        }
      });
      wallPrev.addEventListener('click', () => stepWall(-1));
      wallNext.addEventListener('click', () => stepWall(1));
      onSwipe(wallCard, stepWall);
      ambVolume.value = String(ctx.state.settings.ambienceVolume);
      ambVolume.addEventListener('input', () => {
        ctx.state.settings.ambienceVolume = Number(ambVolume.value);
      });
      volume.value = String(ctx.state.settings.volume);
      volume.addEventListener('input', () => {
        ctx.state.settings.volume = Number(volume.value);
      });
      volume.addEventListener('change', () => {
        void ctx.sfx.unlock().then(() => ctx.sfx.buy());
      });

      return h('div', { class: 'system' }, [
        h('div', { class: 'section-title', text: '# uptime && last' }),
        h('dl', { class: 'stats' }, Object.values(stats).flatMap((s) => s.nodes)),

        h('div', { class: 'section-title', text: '# /etc/helpdesk.conf' }),
        group('Sound', soundBtn, [
          h('p', { class: 'hint conf-hint', text: 'Schaltet alles auf einmal. iPhone im Lautlos-Modus bleibt stumm.' }),
          h('div', { class: 'setting' }, [h('div', { text: 'Tastatur & Spiel' }), volume]),
          h('div', { class: 'setting' }, [
            h('div', {}, [h('div', { text: 'Büro-Geräusche' }), h('div', { class: 'hint', text: 'Ganz nach links = aus.' })]),
            ambVolume,
          ]),
          h('div', { class: 'setting-col' }, [
            h('div', { text: 'Tastatur-Switch (Klang beim Tippen)' }),
            h('div', { class: 'hint', text: 'Switch drücken = Probe hören. Pfeile oder Wischen = anderen einbauen.' }),
            h('div', { class: 'switch-carousel' }, [prevBtn, card, nextBtn]),
            h('div', { class: 'switch-dots', role: 'radiogroup', 'aria-label': 'Klick-Sound' }, dots),
          ]),
        ]),
        group('Vibration', hapticBtn, [h('p', { class: 'hint conf-hint', text: HAPTIC_HINT[hapticSupport()] })]),
        group('Optik', null, [
          h('div', { class: 'setting-col' }, [
            h('div', { text: 'Hintergrundbild' }),
            h('div', { class: 'hint', text: 'Jede Firma hat ihr eigenes. Weitere gibt’s für Achievements. Pfeile oder Wischen = anderes aufhängen.' }),
            h('div', { class: 'switch-carousel' }, [wallPrev, wallCard, wallNext]),
          ]),
        ]),

        h('div', { class: 'section-title', text: '# Spielstand' }),
        // Hinweise vom Vorgänger: eine Zeile mit Schalter und „nochmal lesen“
        h('div', { class: 'setting' }, [
          h('div', {}, [h('div', { text: 'Hinweise vom Vorgänger' }), h('div', { class: 'hint', text: 'Post-its, wenn etwas neu ist.' })]),
          h('div', { class: 'setting-btns' }, [
            button(
              'Nochmal',
              () => {
                resetTutorial(ctx.state);
                ctx.log.write('info', 'hr[42]: Übergabe-Post-its wieder aufgehängt. Mit Tesafilm. Wieder schief.');
                ctx.sfx.tick();
              },
              'btn btn-compact',
            ),
            hintBtn,
          ]),
        ]),
        h('div', { class: 'actions actions-reset' }, [
          button('Alles löschen', resetDialog, 'btn btn-danger'),
        ]),
        h('p', {
          class: 'hint',
          text: `Autosave alle ${CONFIG.autosaveMs / 1_000} s. Kündigen geht im Karriere-Tab.`,
        }),
      ]);
    },
    render() {
      const s = ctx.state;
      renderWalls();
      setText(stats.total.value, formatNumber(s.ticketsTotal));
      setText(stats.solved.value, formatNumber(s.flags.solved ?? 0));
      setText(stats.clicks.value, formatNumber(s.clicks));
      setText(stats.offline.value, formatNumber(s.stats.offlineTickets));
      setText(stats.play.value, formatDuration(s.stats.playTimeMs));
      setText(stats.since.value, new Date(s.stats.startedAt).toLocaleDateString('de-DE'));
      for (const [btn, on] of [
        [hapticBtn, s.settings.haptics],
        [hintBtn, !tutorialOff(s)],
        [soundBtn, s.settings.sound],
      ] as const) {
        btn.setAttribute('aria-checked', String(on));
        btn.classList.toggle('off', !on);
      }
      volume.disabled = !s.settings.sound;
      ambVolume.disabled = !s.settings.sound;
      showSwitch(validSwitch(s.settings.tapSound));
    },
  };
}
