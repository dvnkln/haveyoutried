import { describe, expect, it } from 'vitest';
import { bossReport, REPORT_ITEMS } from '../../src/content/report';
import { advanceStory, dueStoryCall, STORIES, STORY_GAP_MS } from '../../src/content/stories';
import { TOPICS } from '../../src/content/topics';
import { createInitialState } from '../../src/core/state';

describe('Telefon-Geschichten', () => {
  it('Folgen kommen nacheinander, mit Abstand, und enden', () => {
    const s = createInitialState(0);
    const story = STORIES.find((x) => x.id === 'dieter')!;
    let now = 1_000_000;
    for (let i = 0; i < story.episodes.length; i++) {
      // nur die Dieter-Geschichte prüfen: andere als erledigt markieren
      for (const other of STORIES) if (other.id !== 'dieter') s.flags[`story:${s.prestige.company}:${other.id}`] = other.episodes.length;
      const due = dueStoryCall(s, now);
      expect(due?.id).toBe('dieter');
      expect(due?.call.text).toBe(story.episodes[i]!.line.text);
      if (i > 0) expect(due?.call.reply?.text).toContain(`Teil ${i + 1} von ${story.episodes.length}`);
      advanceStory(s, 'dieter', now);
      // direkt danach noch nicht wieder dran
      expect(dueStoryCall(s, now + 1)).toBeNull();
      now += STORY_GAP_MS;
    }
    expect(dueStoryCall(s, now)).toBeNull();
    expect(s.flags['stories:done']).toBe(1);
  });

  it('neue Firma, neue Geschichten; Praktikanten-Geschichte nur mit Praktikanten', () => {
    const s = createInitialState(0);
    expect(STORIES.find((x) => x.id === 'testskript')!.when!(s)).toBe(false);
    advanceStory(s, 'dieter', 0);
    s.prestige.company = 'zoo';
    expect(s.flags['story:zoo:dieter']).toBeUndefined();
  });

  it('jede Folge passt: Werkzeug zum Thema, Geräte nur bei Reparaturen', () => {
    for (const st of STORIES)
      for (const e of st.episodes) {
        expect(e.line.answer.length, e.line.text).toBeGreaterThan(10);
        if (e.line.devices) expect(e.line.fix).toBe(true);
        if (e.line.fix) {
          const t = TOPICS[e.line.topic];
          expect(t.cmds.length + t.rdp.length + t.searches.length + (e.line.devices ?? t.devices).length).toBeGreaterThan(0);
        }
      }
  });
});

describe('Mail vom Chef', () => {
  it('drei Fragen, Infrastruktur-Fragen nur, wenn vorhanden', () => {
    const s = createInitialState(0);
    const r = bossReport(s, 3 * 3_600_000, false, () => 0.3);
    expect(r.items).toHaveLength(3);
    const special = REPORT_ITEMS.filter((i) => i.when).map((i) => i.text(180, s, 1e6));
    for (const t of r.items) expect(special).not.toContain(t);
    s.generators.cron.owned = 5;
    const r2 = bossReport(s, 3 * 3_600_000, false, () => 0.3);
    expect(r2.items.some((t) => t.includes('Cronjobs'))).toBe(true);
    // Zahlen in den Fragen nie größer als das, was wirklich geschlossen wurde
    const r3 = bossReport(s, 3 * 3_600_000, false, () => 0.3, 10);
    expect(r3.items.find((t) => t.includes('Cronjobs'))).toContain(' 4 Tickets');
  });

  it('Schluss passt zur Dauer', () => {
    const s = createInitialState(0);
    expect(bossReport(s, 9 * 3_600_000, true).closer).toContain('8 Stunden');
  });
});
