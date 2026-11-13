/**
 * Memes in der Meme-Pause: bekannte Templates nachgezeichnet (eigene Zeichnungen, keine Original-Fotos),
 * dazu Screenshots von Kurznachrichten und Code sowie reine Text-Beiträge (nur readit).
 * Die Bildtexte liegen als HTML über der Zeichnung, damit sie sauber umbrechen.
 */
import type { ImagePost, MemePost, MemeTpl } from '../content/memes';
import { h } from './dom';

// Zeichnungen: eigene Nachzeichnungen der bekannten Vorlagen (src/assets/memes, Vergleich in .local/memes/art)
import drakeNo from '../assets/memes/drake-no.svg';
import drakeYes from '../assets/memes/drake-yes.svg';
import buttonsTop from '../assets/memes/buttons-top.svg';
import buttonsBottom from '../assets/memes/buttons-bottom.svg';
import brain0 from '../assets/memes/brain-0.svg';
import brain1 from '../assets/memes/brain-1.svg';
import brain2 from '../assets/memes/brain-2.svg';
import brain3 from '../assets/memes/brain-3.svg';
import change from '../assets/memes/change.svg';
import bell from '../assets/memes/bell.svg';
import panik from '../assets/memes/panik-panik.svg';
import kalm from '../assets/memes/panik-kalm.svg';
import panik2 from '../assets/memes/panik-panik2.svg';
import bike0 from '../assets/memes/bike-0.svg';
import bike1 from '../assets/memes/bike-1.svg';
import bike2 from '../assets/memes/bike-2.svg';
import fine1 from '../assets/memes/fine-1.svg';
import fine2 from '../assets/memes/fine-2.svg';
import exitTop from '../assets/memes/exit-top.svg';
import exitBottom from '../assets/memes/exit-bottom.svg';
import boyfriend from '../assets/memes/boyfriend.svg';
import boss from '../assets/memes/boss.svg';
import kid from '../assets/memes/kid.svg';

const BRAINS = [brain0, brain1, brain2, brain3];
const PANIK = [panik, kalm, panik2];

/** Maße der Zeichnungen (viewBox): <img> mit width/height hat seine Höhe schon vor dem Laden (Scrollen rechnet damit) */
const SIZE = new Map<string, readonly [number, number]>([
  ...[drakeNo, drakeYes].map((s) => [s, [600, 600]] as const),
  ...[buttonsTop, buttonsBottom].map((s) => [s, [600, 420]] as const),
  ...[brain0, brain1, brain2, brain3].map((s) => [s, [430, 300]] as const),
  ...[panik, kalm, panik2].map((s) => [s, [320, 290]] as const),
  ...[bike0, bike1, bike2].map((s) => [s, [440, 220]] as const),
  ...[fine1, fine2].map((s) => [s, [290, 280]] as const),
  ...[change, boss, kid].map((s) => [s, [480, 360]] as const),
  [bell, [680, 500]],
  [exitTop, [800, 340]],
  [exitBottom, [800, 420]],
  [boyfriend, [600, 400]],
]);
const art = (src: string) => {
  const [w, hgt] = SIZE.get(src) ?? [4, 3];
  return h('img', { class: 'mt-art', src, alt: '', draggable: 'false', width: String(w), height: String(hgt) });
};
/** Bildtext: w = weiß mit schwarzem Rand, b = schwarz auf Weiß (Zelle), l = Etikett, s = schlicht schwarz */
const cap = (text: string, cls: string) => h('span', { class: `mt-cap ${cls}`, text });
const panel = (cls: string, ...kids: HTMLElement[]) => h('div', { class: `mt-panel ${cls}` }, kids);

const TEMPLATES: Record<MemeTpl, (t: string[]) => HTMLElement> = {
  drake: (t) => h('div', { class: 'mt mt-drake' }, [art(drakeNo), cap(t[0]!, 'b'), art(drakeYes), cap(t[1]!, 'b')]),
  buttons: (t) =>
    h('div', { class: 'mt mt-buttons' }, [
      panel('p-top', art(buttonsTop), cap(t[0]!, 's at-btn1'), cap(t[1]!, 's at-btn2')),
      panel('p-bottom', art(buttonsBottom), cap(t[2] ?? 'Ich', 'w at-bottom')),
    ]),
  brain: (t) => h('div', { class: 'mt mt-brain' }, t.flatMap((x, i) => [cap(x, 'b'), art(BRAINS[Math.min(i, 3)]!)])),
  fine: (t) =>
    h('div', { class: 'mt mt-fine' }, [
      panel('', art(fine1), cap(t[0]!, 'w at-fire'), cap(t[1] ?? 'Ich', 'w at-dog')),
      panel('', art(fine2), h('span', { class: 'mt-say', text: 'THIS IS FINE.' })),
    ]),
  changemind: (t) => h('div', { class: 'mt mt-change' }, [panel('', art(change), cap(t[0]!, 's at-sign'), cap('CHANGE MY MIND', 's at-cmm'))]),
  boyfriend: (t) => h('div', { class: 'mt mt-boyfriend' }, [panel('', art(boyfriend), cap(t[0]!, 'w at-bf1'), cap(t[1]!, 'w at-bf2'), cap(t[2]!, 'w at-bf3'))]),
  bell: (t) => h('div', { class: 'mt mt-bell' }, [panel('', art(bell), cap(t[0]!, 's at-b1'), cap(t[1]!, 's at-b2'), cap(t[2] ?? t[0]!, 's at-b3'))]),
  panik: (t) => h('div', { class: 'mt mt-panik' }, t.flatMap((x, i) => [cap(x, 'b'), art(PANIK[Math.min(i, 2)]!)])),
  exit: (t) =>
    h('div', { class: 'mt mt-exit' }, [
      panel('p-top', art(exitTop), cap(t[0]!, 'w at-ex1'), cap(t[1]!, 'w at-ex2')),
      panel('p-bottom', art(exitBottom), cap(t[2] ?? 'Ich', 'w at-car')),
    ]),
  bike: (t) =>
    h('div', { class: 'mt mt-bike' }, [panel('', art(bike0), cap(t[0]!, 'w at-top')), panel('', art(bike1)), panel('', art(bike2), cap(t[1]!, 'w at-top'))]),
};
const MACRO_PICS = { boss, kid };

/** Kurznachricht als Bildschirmfoto: Profilbild, Name, Kürzel, Text, Uhrzeit */
const tweet = (p: Extract<MemePost, { t: 'tweet' }>) =>
  h('div', { class: 'mx-tweet' }, [
    h('div', { class: 'mx-tw-head' }, [
      h('span', { class: 'mx-tw-ava', style: `background:${p.color ?? '#7a8bd6'}`, text: p.name.slice(0, 1) }),
      h('span', { class: 'mx-tw-who' }, [h('b', { text: p.name }), h('span', { text: `@${p.handle}` })]),
    ]),
    h('div', { class: 'mx-tw-text', text: p.text }),
    h('div', { class: 'mx-tw-meta', text: p.meta ?? '10:24 · 13. Nov. · 1,2 Mio. Mal angezeigt' }),
  ]);

/** Code als Bildschirmfoto aus dem Editor: Dateireiter, Zeilennummern, einfache Farben */
const KW = /\b(if|else|for|while|return|const|let|function|def|import|from|true|false|None|null|try|catch|except|sudo|rm|git|SELECT|FROM|WHERE|DROP|TABLE)\b/g;
const COMMENT = /(^|\s)(\/\/|#|--)(?=\s|$)/;
const codeLine = (line: string) => {
  const span = h('span', { class: 'mx-code-line' });
  // Zeichenketten zuerst abtrennen: ein # oder // darin ist kein Kommentar (kein innerHTML mit Inhalt)
  const parts = line.split(/("[^"]*"|'[^']*')/);
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    if (/^["']/.test(part)) {
      span.append(h('span', { class: 'c-str', text: part }));
      continue;
    }
    const m = COMMENT.exec(part);
    const code = m ? part.slice(0, m.index + m[1]!.length) : part;
    let last = 0;
    for (const k of code.matchAll(KW)) {
      span.append(code.slice(last, k.index), h('span', { class: 'c-kw', text: k[0] }));
      last = k.index! + k[0].length;
    }
    span.append(code.slice(last));
    if (m) {
      // Rest der Zeile ab dem Kommentarzeichen, auch eventuelle Strings dahinter
      span.append(h('span', { class: 'c-com', text: part.slice(code.length) + parts.slice(i + 1).join('') }));
      break;
    }
  }
  return span;
};
const code = (p: Extract<MemePost, { t: 'code' }>) =>
  h('div', { class: 'mx-code' }, [
    h('div', { class: 'mx-code-tab' }, [h('span', { text: p.file }), h('span', { class: 'mx-code-x', text: '×' })]),
    h('div', { class: 'mx-code-body' }, p.lines.map((l, i) => h('div', { class: 'mx-code-row' }, [h('span', { class: 'mx-code-no', text: String(i + 1) }), codeLine(l)]))),
  ]);

/** Das „Bild“ eines Beitrags (Text-Beiträge haben keins und kommen hier nicht hin) */
export function memeImage(p: ImagePost): HTMLElement {
  switch (p.t) {
    case 'tpl':
      return TEMPLATES[p.tpl](p.txt);
    case 'macro':
      return h('div', { class: 'mt mt-macro' }, [art(MACRO_PICS[p.pic]), cap(p.top, 'w at-top'), cap(p.bottom, 'w at-bottom')]);
    case 'tweet':
      return tweet(p);
    case 'code':
      return code(p);
  }
}
