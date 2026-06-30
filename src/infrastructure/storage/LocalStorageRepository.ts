import { RunRepository } from '../../core/ports/RunRepository';
import { RawRun } from '../../domain/types';

export class LocalStorageRepository implements RunRepository {
  private STORAGE_KEY = 'linkedin_games_runs';

  async loadRuns(): Promise<RawRun[]> {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (!saved) return [];
    try {
      return JSON.parse(saved) as RawRun[];
    } catch (e) {
      console.error('Failed to parse localStorage runs:', e);
      return [];
    }
  }

  async saveRun(run: Omit<RawRun, 'id'>): Promise<RawRun> {
    const runs = await this.loadRuns();
    const tempId = `run-${Math.random().toString(36).substring(2, 11)}`;
    const newRun: RawRun = {
      ...run,
      id: tempId,
    };
    runs.push(newRun);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(runs));
    return newRun;
  }

  async deleteRun(id: string): Promise<void> {
    const runs = await this.loadRuns();
    const filtered = runs.filter((r) => r.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
  }

  async seedRuns(runs: RawRun[]): Promise<void> {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(runs));
  }

  async clearAll(): Promise<void> {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
