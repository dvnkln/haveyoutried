import { INCIDENTS } from '../../config';
import { MAILS, type Mail } from '../../content/incidents';
import { shuffle } from '../../util';
import { h, juice, SHAKE, setText } from '../dom';
import type { GameApi, Minigame } from './types';

const CFG = INCIDENTS.games.spam;
const SWIPE_PX = 70;

/** Spiellogik ohne DOM. */
export class SpamSim {
  private deck: Mail[];
  correct = 0;
  answered = 0;

  constructor(
    private mails: readonly Mail[] = MAILS,
    private target: number = CFG.target,
    private rnd: () => number = Math.random,
  ) {
    this.deck = shuffle(mails, rnd);
  }

  get current(): Mail {
    if (this.deck.length === 0) this.deck = shuffle(this.mails, this.rnd);
    return this.deck[0]!;
  }

  /** Antwort für die aktuelle Mail; true = richtig */
  answer(saysSpam: boolean): boolean {
    const ok = this.current.spam === saysSpam;
    this.answered++;
    if (ok) this.correct++;
    this.deck.shift();
    return ok;
  }

  score(): number {
    if (this.answered === 0) return 0;
    const accuracy = this.correct / this.answered;
    return Math.min(1, this.correct / this.target) * accuracy;
  }
}

export function spamGame(): Minigame {
  const sim = new SpamSim();
  let api: GameApi | null = null;

  const from = h('div', { class: 'mail-from' });
  const subject = h('div', { class: 'mail-subject' });
  const preview = h('div', { class: 'mail-preview' });
  const card = h('div', { class: 'mail-card' }, [from, subject, preview]);
  const feedback = h('div', { class: 'mail-feedback', 'aria-live': 'polite' });

  const show = () => {
    const mail = sim.current;
    setText(from, `Von: ${mail.from}`);
    setText(subject, mail.subject);
    setText(preview, mail.preview);
    card.style.transform = '';
    card.classList.remove('fly-left', 'fly-right');
  };

  let locked = false;
  const decide = (saysSpam: boolean) => {
    if (locked || !api) return;
    const mail = sim.current;
    const ok = sim.answer(saysSpam);
    locked = true;
    card.classList.add(saysSpam ? 'fly-left' : 'fly-right');
    if (ok) {
      api.sfx.tap();
      api.haptic('tap');
      setText(feedback, '');
    } else {
      api.sfx.error();
      api.haptic('error');
      setText(feedback, mail.spam ? `Das war Spam (${mail.from.split('@')[1]})` : 'Das war echt!');
      juice(feedback, SHAKE, 250);
    }
    setTimeout(() => {
      locked = false;
      show();
    }, ok ? 160 : 420);
  };

  return {
    mount(root, gameApi) {
      api = gameApi;
      // Wischen
      let startX = 0;
      let dragging = false;
      card.addEventListener('pointerdown', (e) => {
        if (locked) return;
        dragging = true;
        startX = e.clientX;
        card.setPointerCapture(e.pointerId);
      });
      card.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - startX;
        card.style.transform = `translateX(${dx}px) rotate(${dx / 25}deg)`;
        card.dataset.lean = dx < -20 ? 'spam' : dx > 20 ? 'ham' : '';
      });
      const end = (e: PointerEvent) => {
        if (!dragging) return;
        dragging = false;
        const dx = e.clientX - startX;
        card.dataset.lean = '';
        if (dx <= -SWIPE_PX) decide(true);
        else if (dx >= SWIPE_PX) decide(false);
        else card.style.transform = '';
      };
      card.addEventListener('pointerup', end);
      card.addEventListener('pointercancel', end);

      const spamBtn = h('button', { class: 'btn btn-danger mail-btn', type: 'button', text: '◀ Spam' });
      const hamBtn = h('button', { class: 'btn btn-primary mail-btn', type: 'button', text: 'Echt ▶' });
      spamBtn.addEventListener('click', () => decide(true));
      hamBtn.addEventListener('click', () => decide(false));

      show();
      root.append(
        h('div', { class: 'spam' }, [
          h('div', { class: 'mail-stage' }, [card]),
          feedback,
          h('div', { class: 'mail-actions' }, [spamBtn, hamBtn]),
        ]),
      );
    },
    update() {
      /* ereignisgetrieben */
    },
    score: () => sim.score(),
    status: () => `sortiert: ${sim.answered} · richtig: ${sim.correct}/${CFG.target}`,
  };
}
