import { useState, useMemo } from 'react';
import { RawRun, GameType, GAME_CONFIGS } from '../../domain/types';
import { DEFAULT_RECORD_TIMES } from '../../domain/constants';
import { recalculateMetrics, determineRunContext } from '../../domain/metrics';
import { LocalStorageRepository } from '../../infrastructure/storage/LocalStorageRepository';
import { FirestoreRepository } from '../../infrastructure/storage/FirestoreRepository';

export function useRuns() {
  const localStorageRepo = useMemo(() => new LocalStorageRepository(), []);
  const [runs, setRuns] = useState<RawRun[]>([]);

  const { sortedRuns, summaries } = useMemo(() => recalculateMetrics(runs), [runs]);

  const recordTimes = useMemo(() => {
    const mapping = { ...DEFAULT_RECORD_TIMES };
    summaries.forEach((s) => {
      if (s.record > 0) mapping[s.juego] = s.record;
    });
    return mapping;
  }, [summaries]);

  const lastCommunityAverages = useMemo(() => {
    const mapping: Record<GameType, number> = {
      Patches: 45.74, Zip: 31.49, Sudoku: 118.44, Queens: 84.03, Chess: 0,
    };
    runs.forEach((r) => {
      if (r.media > 0) mapping[r.juego] = r.media;
    });
    return mapping;
  }, [runs]);

  const handleAddRun = async (
    newRunData: Omit<RawRun, 'id' | 'ahorro' | 'contexto'>,
    user: { uid: string } | null,
    firestoreRepo: FirestoreRepository | null,
    setIsSyncingLive: (v: boolean) => void,
  ) => {
    const ahorro = Number((newRunData.media - newRunData.yo).toFixed(2));
    const gameRuns = runs.filter((r) => r.juego === newRunData.juego);
    const prevRecord = recordTimes[newRunData.juego];
    const { direction } = GAME_CONFIGS[newRunData.juego];
    const contexto = determineRunContext(newRunData.yo, newRunData.media, gameRuns, prevRecord, direction);
    const runToSave: Omit<RawRun, 'id'> = { ...newRunData, ahorro, contexto };

    if (user && firestoreRepo) {
      setIsSyncingLive(true);
      try {
        await firestoreRepo.saveRun(runToSave);
        const reloaded = await firestoreRepo.loadRuns();
        setRuns(reloaded);
      } catch (err: unknown) {
        alert(`Error al registrar en Firestore: ${err instanceof Error ? err.message : 'La partida se guardó localmente.'}`);
      } finally {
        setIsSyncingLive(false);
      }
    } else {
      const saved = await localStorageRepo.saveRun(runToSave);
      setRuns((prev) => [...prev, saved]);
    }
  };

  const handleDeleteRun = async (
    id: string,
    user: { uid: string } | null,
    firestoreRepo: FirestoreRepository | null,
    setIsSyncingLive: (v: boolean) => void,
  ) => {
    const isCloud = !!user;
    const confirmMessage = isCloud
      ? '¿Estás seguro de que deseas eliminar permanentemente este registro de tu base de datos en la nube?'
      : '¿Estás seguro de que deseas eliminar permanentemente este registro del historial local?';

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    if (isCloud && firestoreRepo) {
      setIsSyncingLive(true);
      try {
        await firestoreRepo.deleteRun(id);
        const reloaded = await firestoreRepo.loadRuns();
        setRuns(reloaded);
      } catch (err: unknown) {
        alert(`Error al eliminar de Firestore: ${err instanceof Error ? err.message : 'No se pudo procesar la eliminación.'}`);
      } finally {
        setIsSyncingLive(false);
      }
    } else {
      await localStorageRepo.deleteRun(id);
      setRuns((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const handleResetData = async (
    user: { uid: string } | null,
    firestoreRepo: FirestoreRepository | null,
    setIsSyncingLive: (v: boolean) => void,
  ) => {
    const isCloud = !!user;
    const confirmMessage = isCloud
      ? '¿Deseas eliminar permanentemente todo tu historial de partidas de la nube? Esta acción no se puede deshacer.'
      : '¿Deseas eliminar permanentemente todo tu historial de partidas local? Se perderán todas tus estadísticas locales.';

    if (window.confirm(confirmMessage)) {
      if (isCloud && firestoreRepo) {
        setIsSyncingLive(true);
        try {
          for (const run of runs) {
            await firestoreRepo.deleteRun(run.id);
          }
          setRuns([]);
        } catch (err: unknown) {
          alert('Error al vaciar datos en la nube: ' + (err instanceof Error ? err.message : ''));
        } finally {
          setIsSyncingLive(false);
        }
      } else {
        localStorageRepo.seedRuns([]);
        setRuns([]);
      }
    }
  };

  const handleImportRuns = async (
    importedRuns: Omit<RawRun, 'id' | 'ahorro' | 'contexto'>[],
    user: { uid: string } | null,
    firestoreRepo: FirestoreRepository | null,
    setIsSyncingLive: (v: boolean) => void,
  ) => {
    setIsSyncingLive(true);
    try {
      const sortedImported = [...importedRuns].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      const currentRunsHistory = [...runs];
      const runsToSave: RawRun[] = [];

      for (let i = 0; i < sortedImported.length; i++) {
        const newRunData = sortedImported[i];
        const ahorro = Number((newRunData.media - newRunData.yo).toFixed(2));
        const gameRuns = currentRunsHistory.filter(r => r.juego === newRunData.juego);
        const { direction } = GAME_CONFIGS[newRunData.juego];
        const record = gameRuns.length > 0
          ? direction === 'lower'
            ? Math.min(...gameRuns.map(r => r.yo))
            : Math.max(...gameRuns.map(r => r.yo))
          : DEFAULT_RECORD_TIMES[newRunData.juego];

        const contexto = determineRunContext(newRunData.yo, newRunData.media, gameRuns, record, direction);

        const run: RawRun = {
          ...newRunData,
          id: `imported-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
          ahorro,
          contexto,
        };

        runsToSave.push(run);
        currentRunsHistory.push(run);
      }

      if (user && firestoreRepo) {
        await firestoreRepo.seedRuns(runsToSave);
        const reloaded = await firestoreRepo.loadRuns();
        setRuns(reloaded);
      } else {
        await localStorageRepo.seedRuns(currentRunsHistory);
        setRuns(currentRunsHistory);
      }
    } finally {
      setIsSyncingLive(false);
    }
  };

  return {
    runs,
    sortedRuns,
    summaries,
    recordTimes,
    lastCommunityAverages,
    setRuns,
    localStorageRepo,
    handleAddRun,
    handleDeleteRun,
    handleResetData,
    handleImportRuns,
  };
}
