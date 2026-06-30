import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageRepository } from './LocalStorageRepository';

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => { mockStorage[key] = value; },
      clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
      removeItem: (key: string) => { delete mockStorage[key]; },
      length: 0,
      key: () => null,
    },
    writable: true,
    configurable: true,
  });
});

describe('LocalStorageRepository', () => {
  let repo: LocalStorageRepository;

  beforeEach(() => {
    localStorage.clear();
    repo = new LocalStorageRepository();
  });

  it('loads empty array when no data in localStorage', async () => {
    const runs = await repo.loadRuns();
    expect(runs).toEqual([]);
  });

  it('saves and loads a run', async () => {
    const runData = {
      timestamp: '2026-06-01T10:00:00Z',
      juego: 'Sudoku' as const,
      yo: 85,
      media: 118,
      ahorro: 33,
      contexto: 'Exploración' as const,
    };
    const saved = await repo.saveRun(runData);
    expect(saved.id).toBeDefined();
    expect(saved.juego).toBe('Sudoku');
    expect(saved.yo).toBe(85);
    expect(saved.media).toBe(118);
    expect(saved.ahorro).toBe(33);
    expect(saved.contexto).toBe('Exploración');

    const loaded = await repo.loadRuns();
    expect(loaded).toHaveLength(1);
    expect(loaded[0]).toEqual(saved);
  });

  it('deletes a run by id', async () => {
    const run1 = await repo.saveRun({
      timestamp: '2026-06-01T10:00:00Z', juego: 'Sudoku', yo: 85, media: 118, ahorro: 33, contexto: 'Exploración',
    });
    const run2 = await repo.saveRun({
      timestamp: '2026-06-02T10:00:00Z', juego: 'Queens', yo: 50, media: 84, ahorro: 34, contexto: 'Exploración',
    });

    await repo.deleteRun(run1.id);
    const loaded = await repo.loadRuns();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe(run2.id);
  });

  it('replaces all data when seeding', async () => {
    await repo.seedRuns([
      { id: 'existing-1', timestamp: '2026-06-01T10:00:00Z', juego: 'Sudoku', yo: 85, media: 118, ahorro: 33, contexto: 'Exploración' },
    ]);
    await repo.seedRuns([
      { id: 'new-1', timestamp: '2026-06-03T10:00:00Z', juego: 'Patches', yo: 20, media: 45, ahorro: 25, contexto: 'Exploración' },
    ]);

    const loaded = await repo.loadRuns();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('new-1');
    expect(loaded[0].juego).toBe('Patches');
  });

  it('handles malformed JSON gracefully', async () => {
    localStorage.setItem('linkedin_games_runs', 'not-valid-json');
    const runs = await repo.loadRuns();
    expect(runs).toEqual([]);
  });
});
