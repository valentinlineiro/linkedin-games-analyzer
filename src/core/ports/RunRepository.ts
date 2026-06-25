import { RawRun } from '../../domain/types';

export interface RunRepository {
  /**
   * Loads all runs from the database/storage system.
   */
  loadRuns(): Promise<RawRun[]>;

  /**
   * Saves a new run to storage.
   */
  saveRun(run: Omit<RawRun, 'id'>): Promise<RawRun>;

  /**
   * Deletes a run from storage.
   */
  deleteRun(id: string): Promise<void>;

  /**
   * Seeds historical or mock runs into a clean storage.
   */
  seedRuns(runs: RawRun[]): Promise<void>;
}
