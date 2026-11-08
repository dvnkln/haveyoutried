import { describe, expect, it } from 'vitest';
import { CALLERS, situationalCalls } from '../../src/content/callers';
import { DEVICE_SETTINGS, GENERIC, TOPICS, topicPool, type Topic } from '../../src/content/topics';
import { VIP_TICKETS } from '../../src/content/work';
import { createInitialState } from '../../src/core/state';

describe('Themen der Tickets', () => {
  it('jedes Thema außer „allgemein“ hat Inhalt für alle Felder', () => {
    for (const [topic, t] of Object.entries(TOPICS)) {
      if (topic === 'allgemein') continue;
      for (const [field, list] of Object.entries(t)) expect(list.length, `${topic}.${field}`).toBeGreaterThan(0);
    }
  });

  it('Geräte der Themen haben Einstellungen', () => {
    for (const t of [...Object.values(TOPICS), GENERIC]) for (const d of t.devices) expect(DEVICE_SETTINGS[d].length).toBeGreaterThan(0);
  });

  it('Anrufer, Situationen und VIP-Tickets nutzen jedes Thema', () => {
    const s = createInitialState(0);
    for (const g of Object.keys(s.generators) as (keyof typeof s.generators)[]) s.generators[g].owned = 1;
    s.prestige.jobs = 1;
    const used = new Set<Topic>([
      ...CALLERS.flatMap((c) => c.lines.map((l) => l.topic)),
      ...situationalCalls(s, new Date(2026, 10, 13, 23, 0)).map((c) => c.topic),
      ...VIP_TICKETS.map((v) => v.topic),
    ]);
    expect([...used].sort()).toEqual(Object.keys(TOPICS).sort());
  });

  it('zieht meist aus dem Thema, „allgemein“ nur aus dem Allgemeinen', () => {
    expect(topicPool('drucker', 'cmds', () => 0)).toBe(TOPICS.drucker.cmds);
    expect(topicPool('drucker', 'cmds', () => 0.99)).toBe(GENERIC.cmds);
    expect(topicPool('allgemein', 'cmds', () => 0)).toBe(GENERIC.cmds);
  });

  it('jedes Anliegen hat eigene Antwort und Ursache', () => {
    for (const l of CALLERS.flatMap((c) => c.lines)) {
      expect(l.answer.length, l.text).toBeGreaterThan(10);
      expect(l.cause.length, l.text).toBeGreaterThan(2);
    }
  });
});
