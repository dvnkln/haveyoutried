import { exportSave, importSave } from '../../core/save';
import type { AppContext, Tab } from '../app';
import { h, setText } from '../dom';
import { formatDuration, formatNumber } from '../format';
import { hapticsSupported } from '../haptics';
import { showModal } from '../modal';

/** Stats, Einstellungen, Spielstand. */
export function systemTab(): Tab {
  let ctx: AppContext;
  const stat = (label: string) => {
    const value = h('dd');
    return { value, nodes: [h('dt', { text: label }), value] };
  };
  const stats = {
    total: stat('Tickets (dieser Job)'),
    clicks: stat('Von Hand geschlossen'),
    offline: stat('Nachts erledigt'),
    play: stat('Uptime'),
    since: stat('Im Dienst seit'),
  };
  const hapticBtn = h('button', { class: 'btn toggle', type: 'button', role: 'switch' });

  const exportDialog = () => {
    const area = h('textarea', { class: 'save-code', readonly: '', rows: '5' });
    area.value = exportSave(ctx.state);
    showModal({
      title: 'tar czf spielstand.tgz',
      body: ['Diesen Code sicher aufbewahren. Nicht auf einen Post-it am Monitor kleben.', area],
      actions: [
        {
          label: 'Kopieren',
          primary: true,
          onClick: () => {
            area.select();
            void navigator.clipboard?.writeText(area.value).catch(() => {});
            ctx.log.write('ok', 'backup[{pid}]: savegame exported. first successful backup in years.');
          },
        },
        { label: 'Schließen' },
      ],
    });
  };

  const importDialog = () => {
    const area = h('textarea', { class: 'save-code', rows: '5', placeholder: 'Code einfügen…' });
    const error = h('p', { class: 'error' });
    showModal({
      title: 'tar xzf spielstand.tgz',
      body: ['Überschreibt den aktuellen Spielstand.', area, error],
      actions: [
        {
          label: 'Wiederherstellen',
          primary: true,
          onClick: () => {
            const state = importSave(area.value, Date.now());
            if (!state || !ctx.saver.replaceWith(state)) {
              setText(error, 'tar: Unexpected EOF in archive. Code ungültig.');
              ctx.haptic('error');
              return false;
            }
            location.reload();
          },
        },
        { label: 'Abbrechen' },
      ],
    });
  };

  const resetDialog = () => {
    const input = h('input', { class: 'confirm-input', type: 'text', autocomplete: 'off', placeholder: 'yes' });
    const error = h('p', { class: 'error' });
    showModal({
      title: 'rm -rf / --no-preserve-root',
      body: [
        'Löscht den kompletten Spielstand. Es gibt kein Backup. (Es gab nie ein Backup.)',
        'Zum Bestätigen „yes“ eintippen:',
        input,
        error,
      ],
      actions: [
        {
          label: 'Ausführen',
          danger: true,
          onClick: () => {
            if (input.value.trim().toLowerCase() !== 'yes') {
              setText(error, 'Abgebrochen. Gute Entscheidung, eigentlich.');
              ctx.haptic('error');
              return false;
            }
            ctx.saver.wipe();
            location.reload();
          },
        },
        { label: 'Abbrechen', primary: true },
      ],
    });
  };

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
      });

      return h('div', { class: 'system' }, [
        h('div', { class: 'section-title', text: '# uptime && last' }),
        h('dl', { class: 'stats' }, Object.values(stats).flatMap((s) => s.nodes)),

        h('div', { class: 'section-title', text: '# /etc/helpdesk.conf' }),
        h('div', { class: 'setting' }, [
          h('div', {}, [
            h('div', { text: 'Vibration' }),
            h('div', {
              class: 'hint',
              text: hapticsSupported() ? 'Haptisches Feedback beim Tippen.' : 'Dein Gerät kann nicht vibrieren. Bei mir geht’s.',
            }),
          ]),
          hapticBtn,
        ]),

        h('div', { class: 'section-title', text: '# Spielstand' }),
        h('div', { class: 'actions' }, [
          button('Jetzt speichern', () => {
            if (ctx.saver.saveNow()) ctx.log.write('ok', 'sync[{pid}]: savegame written to /var/lib/helpdesk');
            ctx.haptic('buy');
          }),
          button('Exportieren', exportDialog),
          button('Importieren', importDialog),
          button('Alles löschen', resetDialog, 'btn btn-danger'),
        ]),
        h('p', {
          class: 'hint',
          text: 'Autosave alle 10 s. Upgrades, Zufallsevents und „Kündigen“ folgen nach dem Change-Freeze.',
        }),
      ]);
    },
    render() {
      const s = ctx.state;
      setText(stats.total.value, formatNumber(s.ticketsTotal));
      setText(stats.clicks.value, formatNumber(s.clicks));
      setText(stats.offline.value, formatNumber(s.stats.offlineTickets));
      setText(stats.play.value, formatDuration(s.stats.playTimeMs));
      setText(stats.since.value, new Date(s.stats.startedAt).toLocaleDateString('de-DE'));
      const on = s.settings.haptics;
      setText(hapticBtn, on ? 'an' : 'aus');
      hapticBtn.setAttribute('aria-checked', String(on));
      hapticBtn.classList.toggle('active', on);
    },
  };
}
