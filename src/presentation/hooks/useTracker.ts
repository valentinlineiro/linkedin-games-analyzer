import { useState, useEffect, useMemo } from 'react';
import { RawRun, GameSummary, GameType, AuthUser, SpreadsheetInfo } from '../../domain/types';
import { INITIAL_RUNS, DEFAULT_RECORD_TIMES } from '../../domain/constants';
import { recalculateMetrics, determineRunContext } from '../../domain/metrics';
import { FirebaseAuthGateway } from '../../infrastructure/auth/FirebaseAuthGateway';
import { LocalStorageRepository } from '../../infrastructure/storage/LocalStorageRepository';
import { FirestoreRepository } from '../../infrastructure/storage/FirestoreRepository';

export function useTracker() {
  // Instantiate core gateways and repositories
  const authGateway = useMemo(() => new FirebaseAuthGateway(), []);
  const localStorageRepo = useMemo(() => new LocalStorageRepository(), []);
  const firestoreRepo = useMemo(() => new FirestoreRepository(() => authGateway.getCurrentUser()?.uid || null), [authGateway]);

  // UI / App States
  const [runs, setRuns] = useState<RawRun[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSyncingLive, setIsSyncingLive] = useState(false);

  // 1. Subscribe to Authentication States
  useEffect(() => {
    const unsubscribe = authGateway.onAuthStateChanged(
      (currentUser) => {
        setUser(currentUser);
        setAuthLoading(false);

        if (currentUser) {
          setIsSyncingLive(true);
          firestoreRepo.loadRuns()
            .then((cloudRuns) => {
              if (cloudRuns.length > 0) {
                setRuns(cloudRuns);
              } else {
                // If cloud is empty, fallback to local storage
                localStorageRepo.loadRuns().then((localRuns) => {
                  setRuns(localRuns.length > 0 ? localRuns : INITIAL_RUNS);
                });
              }
            })
            .catch((err) => {
              console.error('Failed to load runs from Firestore:', err);
              localStorageRepo.loadRuns().then((localRuns) => {
                setRuns(localRuns.length > 0 ? localRuns : INITIAL_RUNS);
              });
            })
            .finally(() => {
              setIsSyncingLive(false);
            });
        } else {
          // If not authenticated, load from localStorage
          localStorageRepo.loadRuns().then((localRuns) => {
            setRuns(localRuns.length > 0 ? localRuns : INITIAL_RUNS);
          });
        }
      },
      () => {
        // Fallback or silent failures
      }
    );
    return () => unsubscribe();
  }, [authGateway, firestoreRepo, localStorageRepo]);

  // 2. Recalculate metrics on data change
  const { sortedRuns, summaries } = useMemo(() => {
    return recalculateMetrics(runs);
  }, [runs]);

  // 3. Keep track of dynamic record times for form suggestions
  const recordTimes = useMemo(() => {
    const mapping = { ...DEFAULT_RECORD_TIMES };
    summaries.forEach((summary) => {
      if (summary.record > 0) {
        mapping[summary.juego] = summary.record;
      }
    });
    return mapping;
  }, [summaries]);

  // Actions: Authentication
  const handleSignIn = async () => {
    setAuthLoading(true);
    try {
      const loggedUser = await authGateway.signIn();
      setUser(loggedUser);
    } catch (err: any) {
      alert(err.message || 'Error al iniciar sesión con Google.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await authGateway.signOut();
      setUser(null);
    } catch (err) {
      alert('Error al cerrar sesión.');
    }
  };

  // Actions: Database/Storage Operations
  const handleAddRun = async (newRunData: Omit<RawRun, 'id' | 'ahorro' | 'contexto'>) => {
    const ahorro = Number((newRunData.media - newRunData.yo).toFixed(2));
    const gameRuns = runs.filter((r) => r.juego === newRunData.juego);
    const prevRecord = recordTimes[newRunData.juego];
    const contexto = determineRunContext(newRunData.yo, newRunData.media, gameRuns, prevRecord);

    const runToSave: Omit<RawRun, 'id'> = {
      ...newRunData,
      ahorro,
      contexto,
    };

    if (user) {
      setIsSyncingLive(true);
      try {
        await firestoreRepo.saveRun(runToSave);
        const reloaded = await firestoreRepo.loadRuns();
        setRuns(reloaded);
      } catch (err: any) {
        alert(`Error al registrar en Firestore: ${err.message || 'La partida se guardó localmente.'}`);
      } finally {
        setIsSyncingLive(false);
      }
    } else {
      const saved = await localStorageRepo.saveRun(runToSave);
      setRuns((prev) => [...prev, saved]);
    }
  };

  const handleDeleteRun = async (id: string) => {
    const isCloud = !!user;
    const confirmMessage = isCloud
      ? '¿Estás seguro de que deseas eliminar permanentemente este registro de tu base de datos en la nube?'
      : '¿Estás seguro de que deseas eliminar permanentemente este registro del historial local?';

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    if (isCloud) {
      setIsSyncingLive(true);
      try {
        await firestoreRepo.deleteRun(id);
        const reloaded = await firestoreRepo.loadRuns();
        setRuns(reloaded);
      } catch (err: any) {
        alert(`Error al eliminar de Firestore: ${err.message || 'No se pudo procesar la eliminación.'}`);
      } finally {
        setIsSyncingLive(false);
      }
    } else {
      await localStorageRepo.deleteRun(id);
      setRuns((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const handleResetData = async () => {
    const isCloud = !!user;
    const confirmMessage = isCloud
      ? '¿Deseas restablecer todas tus partidas en la nube a los valores históricos originales?'
      : '¿Deseas restablecer todos los registros diarios a sus valores históricos originales? Se perderán las nuevas partidas que hayas registrado.';

    if (window.confirm(confirmMessage)) {
      if (isCloud) {
        setIsSyncingLive(true);
        try {
          // Clear current runs and seed with INITIAL_RUNS
          // Firestore does not have an atomic 'clear collection' API, so we delete each one or seed directly.
          // Since it's a seed, we can just delete the active runs and save the initial runs.
          for (const run of runs) {
            await firestoreRepo.deleteRun(run.id);
          }
          await firestoreRepo.seedRuns(INITIAL_RUNS);
          const reloaded = await firestoreRepo.loadRuns();
          setRuns(reloaded);
        } catch (err: any) {
          alert('Error al restablecer datos en la nube: ' + err.message);
        } finally {
          setIsSyncingLive(false);
        }
      } else {
        localStorageRepo.seedRuns(INITIAL_RUNS);
        setRuns(INITIAL_RUNS);
      }
    }
  };

  const handlePullFromCloud = async () => {
    if (!user) return;
    setIsSyncingLive(true);
    try {
      const loaded = await firestoreRepo.loadRuns();
      setRuns(loaded);
    } catch (err: any) {
      alert(err.message || 'Error al descargar datos de la nube.');
      throw err;
    } finally {
      setIsSyncingLive(false);
    }
  };

  const handlePushToCloud = async () => {
    if (!user) return;
    if (runs.length === 0) return;
    const confirmed = window.confirm(
      '¿Deseas subir todas tus partidas de rendimiento actuales a la nube? Se combinarán con tus partidas existentes.'
    );
    if (!confirmed) return;
    setIsSyncingLive(true);
    try {
      await firestoreRepo.seedRuns(runs);
      const loaded = await firestoreRepo.loadRuns();
      setRuns(loaded);
    } catch (err: any) {
      alert(err.message || 'Error al subir partidas a la nube.');
      throw err;
    } finally {
      setIsSyncingLive(false);
    }
  };

  const handleImportRuns = async (importedRuns: Omit<RawRun, 'id' | 'ahorro' | 'contexto'>[]) => {
    setIsSyncingLive(true);
    try {
      // Sort imported runs chronologically to evaluate context correctly
      const sortedImported = [...importedRuns].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      let currentRunsHistory = [...runs];
      const runsToSave: RawRun[] = [];

      for (let i = 0; i < sortedImported.length; i++) {
        const newRunData = sortedImported[i];
        const ahorro = Number((newRunData.media - newRunData.yo).toFixed(2));
        
        // Filter history for game
        const gameRuns = currentRunsHistory.filter(r => r.juego === newRunData.juego);
        
        // Determine best record time to evaluate "Máximo"
        const record = gameRuns.length > 0 
          ? Math.min(...gameRuns.map(r => r.yo)) 
          : DEFAULT_RECORD_TIMES[newRunData.juego];

        const contexto = determineRunContext(newRunData.yo, newRunData.media, gameRuns, record);

        const run: RawRun = {
          ...newRunData,
          id: `imported-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`,
          ahorro,
          contexto
        };

        runsToSave.push(run);
        currentRunsHistory.push(run);
      }

      if (user) {
        await firestoreRepo.seedRuns(runsToSave);
        const reloaded = await firestoreRepo.loadRuns();
        setRuns(reloaded);
      } else {
        await localStorageRepo.seedRuns(currentRunsHistory);
        setRuns(currentRunsHistory);
      }
    } catch (err: any) {
      alert(`Error al importar partidas: ${err.message}`);
      throw err;
    } finally {
      setIsSyncingLive(false);
    }
  };

  return {
    runs,
    sortedRuns,
    summaries,
    recordTimes,
    user,
    authLoading,
    activeSpreadsheet: user ? { id: 'firestore', title: 'Base de datos Firestore', url: '#' } : null,
    isSyncingLive,
    onSignIn: handleSignIn,
    onSignOut: handleSignOut,
    onConnectSheet: () => {},
    onDisconnectSheet: handleSignOut,
    onCreateNewSheet: () => {},
    onPullFromSheet: handlePullFromCloud,
    onPushToSheet: handlePushToCloud,
    onAddRun: handleAddRun,
    onDeleteRun: handleDeleteRun,
    onResetData: handleResetData,
    onImportRuns: handleImportRuns,
  };
}

