import { countedMistakes } from '../../core/incidents';
import { INCIDENTS } from '../../config';
import { MAILS, type Mail } from '../../content/incidents';
import { shuffle } from '../../util';
import { cssZoom, h, juice, SHAKE, setText } from '../dom';
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

  /** Stapel leer → neu mischen, damit immer genug Mails da sind */
  private refill(min: number): void {
    while (this.deck.length < min) this.deck.push(...shuffle(this.mails, this.rnd));
  }

  get current(): Mail {
    this.refill(1);
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

  /** die nächsten Mails im Posteingang (nur zur Anzeige) */
  peek(n: number): Mail[] {
    this.refill(1);
    return this.deck.slice(1, 1 + n);
  }

  score(): number {
    if (this.answered === 0) return 0;
    // verziehene Fehlgriffe zählen nicht (Doku gefunden, Server unterm Tisch Stufe 3)
    if (this.correct === 0) return 0;
    const wrong = countedMistakes(this.answered - this.correct);
    const accuracy = this.correct / (this.correct + wrong);
    return Math.min(1, this.correct / this.target) * accuracy;
  }
}

const AVATAR_COLORS = ['#ff9aa2', '#a0c4ff', '#ffd166', '#9be3c1', '#cdb4db', '#ffc9a8'];
const hash = (t: string) => [...t].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Absender als „name@“ + fette Domain: die Domain verrät meist alles */
function addressEl(from: string): HTMLElement {
  const at = from.lastIndexOf('@');
  return h('span', { class: 'mail-addr' }, [from.slice(0, at + 1), h('b', { text: from.slice(at + 1) })]);
}

export function spamGame(): Minigame {
  const sim = new SpamSim();
  let api: GameApi | null = null;
  let unread = 4211;

  const avatar = h('span', { class: 'mail-avatar', 'aria-hidden': 'true' });
  const from = h('div', { class: 'mail-from' });
  const subject = h('div', { class: 'mail-subject' });
  const preview = h('div', { class: 'mail-preview' });
  const card = h('div', { class: 'mail-card' }, [
    h('div', { class: 'mail-head' }, [avatar, h('div', { class: 'mail-meta' }, [from, h('div', { class: 'mail-to', text: 'an: it@firma.de' })])]),
    subject,
    preview,
  ]);
  const verdict = h('div', { class: 'mail-verdict', 'aria-hidden': 'true' });
  const stage = h('div', { class: 'mail-stage' }, [card, verdict]);
  const queue = h('div', { class: 'mc-queue', 'aria-hidden': 'true' });
  const unreadEl = h('span', { class: 'mc-unread' });
  const feedback = h('div', { class: 'mail-feedback', 'aria-live': 'polite' });
  const wrap = h('div', { class: 'spam' });

  const show = () => {
    const mail = sim.current;
    const name = mail.from.slice(0, mail.from.indexOf('@'));
    setText(avatar, name.charAt(0).toUpperCase());
    avatar.style.background = AVATAR_COLORS[hash(mail.from) % AVATAR_COLORS.length]!;
    from.replaceChildren(addressEl(mail.from));
    setText(subject, mail.subject);
    setText(preview, mail.preview);
    card.style.transform = '';
    card.classList.remove('fly-left', 'fly-right');
    queue.replaceChildren(
      ...sim.peek(3).map((m) =>
        h('div', { class: 'mc-item' }, [h('span', { class: 'mc-dot' }), addressEl(m.from), h('span', { class: 'mc-subj', text: m.subject })]),
      ),
    );
    setText(unreadEl, `${unread.toLocaleString('de-DE')} ungelesen`);
  };

  let locked = false;
  let verdictTimer = 0;
  const decide = (saysSpam: boolean) => {
    if (locked || !api) return;
    const mail = sim.current;
    const ok = sim.answer(saysSpam);
    unread--;
    locked = true;
    card.classList.add(saysSpam ? 'fly-left' : 'fly-right');
    // sofort sehen, ob es richtig war: Stempel über der Mail, Rahmen blitzt
    verdict.className = `mail-verdict ${ok ? 'ok' : 'bad'}`;
    verdict.textContent = ok ? '✓' : '✗';
    void verdict.offsetWidth;
    verdict.classList.add('show');
    wrap.classList.remove('flash-ok', 'flash-bad');
    void wrap.offsetWidth;
    wrap.classList.add(ok ? 'flash-ok' : 'flash-bad');
    clearTimeout(verdictTimer);
    verdictTimer = window.setTimeout(() => verdict.classList.remove('show'), ok ? 380 : 650);
    feedback.classList.toggle('ok', ok);
    if (ok) {
      api.sfx.tap();
      api.haptic('tap');
      setText(feedback, mail.spam ? '✓ Spam erwischt' : '✓ Echte Mail durchgelassen');
    } else {
      api.sfx.error();
      api.haptic('error');
      setText(feedback, mail.spam ? `✗ Das war Spam (${mail.from.split('@')[1]})` : '✗ Das war echt!');
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
        // Karte folgt dem Finger auch im verkleinerten Spiel; Schwelle bleibt in echten Pixeln
        card.style.transform = `translateX(${dx / cssZoom(card)}px) rotate(${dx / 25}deg)`;
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

      const spamBtn = h('button', { class: 'btn btn-danger mail-btn mail-btn-spam', type: 'button', text: '◀ Spam' });
      const hamBtn = h('button', { class: 'btn btn-primary mail-btn mail-btn-ham', type: 'button', text: 'Echt ▶' });
      spamBtn.addEventListener('click', () => decide(true));
      hamBtn.addEventListener('click', () => decide(false));

      show();
      wrap.append(
        h('div', { class: 'mc-bar' }, [h('span', { class: 'mc-folder', text: 'Posteingang' }), unreadEl]),
        stage,
        queue,
        feedback,
        h('div', { class: 'mail-actions' }, [spamBtn, hamBtn]),
      );
      root.append(wrap);
    },
    update() {
      /* ereignisgetrieben */
    },
    score: () => sim.score(),
    status: () => `sortiert: ${sim.answered} · richtig: ${sim.correct}/${CFG.target}`,
  };
}
