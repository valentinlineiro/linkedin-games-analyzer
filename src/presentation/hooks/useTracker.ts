import { useState, useEffect, useMemo } from 'react';
import { RawRun, GameSummary, GameType, AuthUser, SpreadsheetInfo } from '../../domain/types';
import { INITIAL_RUNS, DEFAULT_RECORD_TIMES } from '../../domain/constants';
import { recalculateMetrics, determineRunContext } from '../../domain/metrics';
import { FirebaseAuthGateway } from '../../infrastructure/auth/FirebaseAuthGateway';
import { LocalStorageRepository } from '../../infrastructure/storage/LocalStorageRepository';
import { GoogleSheetsRepository } from '../../infrastructure/storage/GoogleSheetsRepository';

// Helper to extract spreadsheet ID from URL or input
export const extractSpreadsheetId = (input: string): string | null => {
  if (!input) return null;
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : input.trim();
};

export function useTracker() {
  // Instantiate core gateways and repositories (adapted from infrastructure)
  const authGateway = useMemo(() => new FirebaseAuthGateway(), []);
  const localStorageRepo = useMemo(() => new LocalStorageRepository(), []);
  const googleSheetsRepo = useMemo(() => new GoogleSheetsRepository(null, () => authGateway.getAccessToken()), [authGateway]);

  // UI / App States
  const [runs, setRuns] = useState<RawRun[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeSpreadsheet, setActiveSpreadsheet] = useState<SpreadsheetInfo | null>(null);
  const [isSyncingLive, setIsSyncingLive] = useState(false);

  // 1. Subscribe to Authentication States
  useEffect(() => {
    const unsubscribe = authGateway.onAuthStateChanged(
      (currentUser) => {
        setUser(currentUser);
        setAuthLoading(false);

        // Auto-connect sheet if logged in and a saved ID exists
        const savedSheetId = localStorage.getItem('google_spreadsheet_id');
        if (savedSheetId && currentUser) {
          handleConnectSheet(savedSheetId, true);
        } else if (!currentUser) {
          // If not authenticated, fall back to localStorage repository
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
  }, [authGateway]);

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
      
      const savedSheetId = localStorage.getItem('google_spreadsheet_id');
      if (savedSheetId) {
        await handleConnectSheet(savedSheetId);
      }
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
      handleDisconnectSheet();
    } catch (err) {
      alert('Error al cerrar sesión.');
    }
  };

  // Actions: Spreadsheet Connection
  const handleConnectSheet = async (sheetIdOrUrl: string, isAuto = false) => {
    const cleanId = extractSpreadsheetId(sheetIdOrUrl);
    if (!cleanId) return;

    setIsSyncingLive(true);
    try {
      googleSheetsRepo.setSpreadsheetId(cleanId);
      const details = await googleSheetsRepo.fetchSpreadsheetDetails(cleanId);
      setActiveSpreadsheet(details);
      localStorage.setItem('google_spreadsheet_id', cleanId);

      const loadedRuns = await googleSheetsRepo.loadRuns();
      setRuns(loadedRuns);
    } catch (err: any) {
      console.error('Spreadsheet connection failed:', err);
      if (!isAuto) {
        alert(err.message || 'No se pudo conectar la hoja de cálculo.');
        throw err;
      } else {
        handleDisconnectSheet();
      }
    } finally {
      setIsSyncingLive(false);
    }
  };

  const handleDisconnectSheet = () => {
    setActiveSpreadsheet(null);
    localStorage.removeItem('google_spreadsheet_id');
    // Load local storage cache as fallback
    localStorageRepo.loadRuns().then((localRuns) => {
      setRuns(localRuns.length > 0 ? localRuns : INITIAL_RUNS);
    });
  };

  const handleCreateNewSheet = async () => {
    setIsSyncingLive(true);
    try {
      const details = await googleSheetsRepo.createNewSpreadsheet('LinkedIn Games Tracker & Analytics');
      
      if (runs.length > 0) {
        const confirmed = window.confirm(
          `Se ha creado con éxito la nueva hoja "${details.title}" en tu Google Drive.\n\n¿Deseas migrar e inicializar tu hoja de cálculo con las ${runs.length} partidas de rendimiento que tienes actualmente en pantalla para no perder ningún dato?`
        );
        if (confirmed) {
          await googleSheetsRepo.appendMultipleRuns(runs);
        }
      }

      googleSheetsRepo.setSpreadsheetId(details.id);
      const loaded = await googleSheetsRepo.loadRuns();
      setActiveSpreadsheet(details);
      setRuns(loaded);
      localStorage.setItem('google_spreadsheet_id', details.id);
    } catch (err: any) {
      alert(err.message || 'No se pudo crear la hoja de cálculo de Google.');
    } finally {
      setIsSyncingLive(false);
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

    if (activeSpreadsheet) {
      setIsSyncingLive(true);
      try {
        await googleSheetsRepo.saveRun(runToSave);
        const reloaded = await googleSheetsRepo.loadRuns();
        setRuns(reloaded);
      } catch (err: any) {
        alert(`Error al registrar en Google Sheets: ${err.message || 'La partida se guardó localmente.'}`);
      } finally {
        setIsSyncingLive(false);
      }
    } else {
      const saved = await localStorageRepo.saveRun(runToSave);
      setRuns((prev) => [...prev, saved]);
    }
  };

  const handleDeleteRun = async (id: string) => {
    const isCloud = !!activeSpreadsheet;
    const confirmMessage = isCloud
      ? '¿Estás seguro de que deseas eliminar permanentemente este registro de tu hoja de cálculo en Google Drive?'
      : '¿Estás seguro de que deseas eliminar permanentemente este registro del historial local?';

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    if (isCloud) {
      setIsSyncingLive(true);
      try {
        await googleSheetsRepo.deleteRun(id);
        const reloaded = await googleSheetsRepo.loadRuns();
        setRuns(reloaded);
      } catch (err: any) {
        alert(`Error al eliminar de Google Sheets: ${err.message || 'No se pudo procesar la eliminación.'}`);
      } finally {
        setIsSyncingLive(false);
      }
    } else {
      await localStorageRepo.deleteRun(id);
      setRuns((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const handleResetData = () => {
    if (activeSpreadsheet) {
      alert('La opción de restablecer historial está deshabilitada mientras estás conectado a una hoja de cálculo en Google Drive.');
      return;
    }

    if (window.confirm('¿Deseas restablecer todos los registros diarios a sus valores históricos originales? Se perderán las nuevas partidas que hayas registrado.')) {
      localStorageRepo.seedRuns(INITIAL_RUNS);
      setRuns(INITIAL_RUNS);
    }
  };

  const handlePullFromSheet = async () => {
    if (!activeSpreadsheet) return;
    setIsSyncingLive(true);
    try {
      const loaded = await googleSheetsRepo.loadRuns();
      setRuns(loaded);
    } catch (err: any) {
      alert(err.message || 'Error al descargar datos de Google Sheets.');
      throw err;
    } finally {
      setIsSyncingLive(false);
    }
  };

  const handlePushToSheet = async () => {
    if (!activeSpreadsheet) return;
    if (runs.length === 0) return;
    const confirmed = window.confirm(
      '¿Deseas subir todas tus partidas de rendimiento actuales a Google Sheets? Se añadirán a las respuestas existentes.'
    );
    if (!confirmed) return;
    setIsSyncingLive(true);
    try {
      await googleSheetsRepo.appendMultipleRuns(runs);
      const loaded = await googleSheetsRepo.loadRuns();
      setRuns(loaded);
    } catch (err: any) {
      alert(err.message || 'Error al subir partidas a Google Sheets.');
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
    activeSpreadsheet,
    isSyncingLive,
    onSignIn: handleSignIn,
    onSignOut: handleSignOut,
    onConnectSheet: handleConnectSheet,
    onDisconnectSheet: handleDisconnectSheet,
    onCreateNewSheet: handleCreateNewSheet,
    onPullFromSheet: handlePullFromSheet,
    onPushToSheet: handlePushToSheet,
    onAddRun: handleAddRun,
    onDeleteRun: handleDeleteRun,
    onResetData: handleResetData,
  };
}
