import { h } from './dom';

export interface ModalAction {
  label: string;
  primary?: boolean;
  danger?: boolean;
  /** `false` zurückgeben hält das Modal offen */
  onClick?: () => boolean | void;
}

export interface ModalOptions {
  title: string;
  body: (Node | string)[];
  actions?: ModalAction[];
  /** Buttons untereinander (Entscheidungen) */
  stacked?: boolean;
  /** Buttons erst nach dieser Zeit aktiv – gegen versehentliche Taps beim Dauertippen */
  armDelayMs?: number;
  /** Mit Esc/Zurück geschlossen, ohne Button */
  onDismiss?: () => void;
  className?: string;
}

/** Einfaches Modal auf Basis von <dialog>. Phase 2: Zufallsevents mit Entscheidung. */
export function showModal({
  title,
  body,
  actions = [{ label: 'OK', primary: true }],
  stacked = false,
  armDelayMs = 0,
  onDismiss,
  className = '',
}: ModalOptions): () => void {
  const dialog = h('dialog', { class: `modal ${className}`.trim() });
  const close = () => {
    dialog.close();
    dialog.remove();
  };

  const buttons = actions.map((a) => {
    const btn = h('button', {
      class: ['btn', a.primary ? 'btn-primary' : '', a.danger ? 'btn-danger' : ''].join(' ').trim(),
      type: 'button',
      text: a.label,
    });
    btn.addEventListener('click', () => {
      if (a.onClick?.() !== false) close();
    });
    return btn;
  });

  dialog.append(
    h('div', { class: 'modal-title', text: title }),
    h('div', { class: 'modal-body' }, body.map((b) => (typeof b === 'string' ? h('p', { text: b }) : b))),
    h('div', { class: stacked ? 'modal-actions stacked' : 'modal-actions' }, buttons),
  );
  if (armDelayMs > 0) {
    for (const b of buttons) b.disabled = true;
    setTimeout(() => buttons.forEach((b) => (b.disabled = false)), armDelayMs);
  }
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
    onDismiss?.();
  });
  document.body.append(dialog);
  dialog.showModal();
  return close;
}
