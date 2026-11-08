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
}

/** Einfaches Modal auf Basis von <dialog>. Phase 2: Zufallsevents mit Entscheidung. */
export function showModal({ title, body, actions = [{ label: 'OK', primary: true }] }: ModalOptions): () => void {
  const dialog = h('dialog', { class: 'modal' });
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
    h('div', { class: 'modal-actions' }, buttons),
  );
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });
  document.body.append(dialog);
  dialog.showModal();
  return close;
}
