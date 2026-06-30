import React, { useState, useEffect, useRef } from 'react';
import { RawRun, AuthUser, SpreadsheetInfo, GameType } from '../../domain/types';
import { 
  Database, 
  Check, 
  LogOut, 
  AlertCircle, 
  DownloadCloud, 
  UploadCloud,
  FileDown,
  FileUp,
  Cloud,
  Shield,
  Clock
} from 'lucide-react';

interface SyncPanelProps {
  runs: RawRun[];
  user: AuthUser | null;
  authLoading: boolean;
  activeSpreadsheet: SpreadsheetInfo | null;
  isSyncingLive: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onConnectSheet: (sheetIdOrUrl: string) => void;
  onDisconnectSheet: () => void;
  onCreateNewSheet: () => void;
  onPullFromSheet: () => Promise<void>;
  onPushToSheet: () => Promise<void>;
  onImportRuns: (runs: Omit<RawRun, 'id' | 'ahorro' | 'contexto'>[]) => Promise<void>;
}

export default function SyncPanel({
  runs,
  user,
  authLoading,
  activeSpreadsheet,
  isSyncingLive,
  onSignIn,
  onSignOut,
  onPullFromSheet,
  onPushToSheet,
  onImportRuns
}: SyncPanelProps) {
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [localProcessing, setLocalProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-clear messages after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSignIn = async () => {
    setError(null);
    try {
      await onSignIn();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión con Google.');
    }
  };

  const handleSignOut = async () => {
    setError(null);
    try {
      await onSignOut();
      setSuccessMessage('Sesión de la nube desconectada.');
    } catch {
      setError('Error al cerrar sesión.');
    }
  };

  const handlePull = async () => {
    setError(null);
    setLocalProcessing(true);
    try {
      await onPullFromSheet();
      setSuccessMessage('¡Datos actualizados desde Firestore!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al descargar datos de Firestore.');
    } finally {
      setLocalProcessing(false);
    }
  };

  const handlePush = async () => {
    setError(null);
    setLocalProcessing(true);
    try {
      await onPushToSheet();
      setSuccessMessage('¡Historial guardado con éxito en Firestore!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al subir partidas a Firestore.');
    } finally {
      setLocalProcessing(false);
    }
  };

  // Export runs to CSV file
  const handleExportCSV = () => {
    setError(null);
    if (runs.length === 0) {
      setError('No hay registros para exportar.');
      return;
    }

    try {
      // CSV headers
      const headers = ['Timestamp', 'Juego', 'Tiempo Personal (Yo)', 'Media Comunidad', 'Ahorro (s)', 'Contexto', 'Color', 'Resultado', 'Notas'];

      // Form values escaping comma and quote characters
      const csvRows = runs.map(run => {
        const nota = (run.nota || '').replace(/"/g, '""');
        return [
          run.timestamp,
          run.juego,
          run.yo,
          run.media,
          run.ahorro,
          run.contexto,
          run.color || '',
          run.resultado || '',
          `"${nota}"`
        ].join(',');
      });

      const csvContent = '\uFEFF' + [headers.join(','), ...csvRows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `linkedin_games_runs_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccessMessage('¡Historial exportado a CSV con éxito!');
    } catch {
      setError('Error al generar el archivo CSV.');
    }
  };

  // Trigger file selection for CSV import
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Handle CSV import parsing and seeding
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        if (lines.length < 2) throw new Error('El archivo CSV está vacío.');

        // 1. Find the header line index dynamically to skip leading empty/comma-only rows
        let headerLineIdx = -1;
        for (let i = 0; i < lines.length; i++) {
          const lowerLine = lines[i].toLowerCase();
          if (
            lowerLine.includes('fecha') || 
            lowerLine.includes('yo') || 
            lowerLine.includes('tiempo') || 
            lowerLine.includes('media') || 
            lowerLine.includes('date') || 
            lowerLine.includes('juego')
          ) {
            headerLineIdx = i;
            break;
          }
        }

        if (headerLineIdx === -1) {
          throw new Error('No se pudo encontrar una fila de encabezados válida en el archivo CSV.');
        }

        const importedRuns: Omit<RawRun, 'id' | 'ahorro' | 'contexto'>[] = [];
        
        // Match headers to find correct columns (supports English and Spanish names)
        const headerLine = lines[headerLineIdx].toLowerCase();
        const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        
        const tsIdx = headers.findIndex(h => h.includes('time') || h.includes('date') || h.includes('marca') || h.includes('fecha'));
        const gameIdx = headers.findIndex(h => h.includes('juego') || h.includes('game'));
        const yoIdx = headers.findIndex(h => (h.includes('yo') || h.includes('tiempo') || h.includes('personal') || h.includes('mine') || h.includes('me')) && !h.includes('comunidad') && !h.includes('media') && !h.includes('average'));
        const mediaIdx = headers.findIndex(h => (h.includes('media') || h.includes('comunidad') || h.includes('average') || h.includes('community') || h.includes('global')) && !h.includes('semana') && !h.includes('week'));
        const noteIdx = headers.findIndex(h => h.includes('nota') || h.includes('comentario') || h.includes('comment') || h.includes('note'));
        const colorIdx = headers.findIndex(h => h === 'color');
        const resultadoIdx = headers.findIndex(h => h === 'resultado' || h === 'result');

        // Helper to parse dates (like DD/MM/YYYY)
        const parseDateStr = (dateStr: string): string => {
          const parts = dateStr.trim().split(/[\/\-]/);
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const year = parseInt(parts[2], 10);
            
            if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
              const fullYear = year < 100 ? year + 2000 : year;
              const d = new Date(fullYear, month - 1, day);
              if (!isNaN(d.getTime())) {
                return d.toISOString();
              }
            }
          }
          const nativeDate = new Date(dateStr);
          if (!isNaN(nativeDate.getTime())) {
            return nativeDate.toISOString();
          }
          throw new Error(`Formato de fecha no válido: "${dateStr}"`);
        };

        // Helper to parse European decimals (e.g., "19,29" or "0,8")
        const parseDecimalFloat = (val: string): number => {
          if (!val) return NaN;
          const clean = val.replace(/[^0-9\.\,\-]/g, '').replace(',', '.');
          return parseFloat(clean);
        };

        // If game column is missing, try detecting from filename
        let fileDetectedGame: GameType | null = null;
        const fileNameLower = file.name.toLowerCase();
        if (fileNameLower.includes('patches')) fileDetectedGame = 'Patches';
        else if (fileNameLower.includes('zip')) fileDetectedGame = 'Zip';
        else if (fileNameLower.includes('sudoku')) fileDetectedGame = 'Sudoku';
        else if (fileNameLower.includes('queens')) fileDetectedGame = 'Queens';
        else if (fileNameLower.includes('chess')) fileDetectedGame = 'Chess';

        const VALID_GAMES: GameType[] = ['Patches', 'Zip', 'Sudoku', 'Queens', 'Chess'];
        let gameFallback: GameType | null = fileDetectedGame;

        if (gameIdx === -1 && !fileDetectedGame) {
          const response = window.prompt(
            `No se encontró una columna "Juego" en este archivo y tampoco pudimos deducirlo por el nombre: "${file.name}".\n\nPor favor, escribe el juego al que pertenecen estas partidas (Patches, Zip, Sudoku, Queens o Chess):`
          );
          if (response === null) return;

          let cleanResponse = response.trim();
          cleanResponse = cleanResponse.charAt(0).toUpperCase() + cleanResponse.slice(1).toLowerCase();

          if (VALID_GAMES.includes(cleanResponse as GameType)) {
            gameFallback = cleanResponse as GameType;
          } else {
            throw new Error('Nombre del juego no reconocido. La importación fue cancelada.');
          }
        }

        // Loop through data lines AFTER the header line index
        for (let i = headerLineIdx + 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Split columns while respecting quoted values containing commas
          const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)|\s*,|[^,]+/g) || line.split(',');
          const cols = matches.map(c => {
            const raw = c.trim();
            if (raw.startsWith(',')) return '';
            return raw.replace(/^"|"$/g, '');
          }).filter(c => c !== ''); // simple cleaning

          // Direct fallback if split regex got empty filters
          const backupCols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          const activeCols = backupCols.length >= cols.length ? backupCols : cols;

          if (activeCols.length < 2) continue;

          const timestampRaw = tsIdx !== -1 && activeCols[tsIdx] ? activeCols[tsIdx] : new Date().toISOString();
          const juegoRaw = gameIdx !== -1 && activeCols[gameIdx] ? activeCols[gameIdx] : (gameFallback || '');
          const yoRaw = yoIdx !== -1 ? parseDecimalFloat(activeCols[yoIdx]) : parseDecimalFloat(activeCols[1]);
          const mediaRaw = mediaIdx !== -1 ? parseDecimalFloat(activeCols[mediaIdx]) : parseDecimalFloat(activeCols[2]);
          const nota = noteIdx !== -1 && activeCols[noteIdx] ? activeCols[noteIdx] : '';
          const colorRaw = colorIdx !== -1 ? activeCols[colorIdx]?.trim().toUpperCase() : '';
          const resultadoRaw = resultadoIdx !== -1 ? activeCols[resultadoIdx]?.trim().toUpperCase() : '';

          if (!juegoRaw || isNaN(yoRaw)) continue;

          let juegoClean = juegoRaw.trim();
          juegoClean = juegoClean.charAt(0).toUpperCase() + juegoClean.slice(1).toLowerCase();

          if (!VALID_GAMES.includes(juegoClean as GameType)) continue;

          const run: Omit<RawRun, 'id' | 'ahorro' | 'contexto'> = {
            timestamp: parseDateStr(timestampRaw),
            juego: juegoClean as GameType,
            yo: yoRaw,
            media: isNaN(mediaRaw) ? yoRaw * 1.5 : mediaRaw,
            nota: nota.replace(/""/g, '"'),
          };

          if (juegoClean === 'Chess') {
            if (['B', 'N'].includes(colorRaw)) run.color = colorRaw as 'B' | 'N';
            if (['V', 'T', 'D'].includes(resultadoRaw)) run.resultado = resultadoRaw as 'V' | 'T' | 'D';
          }

          importedRuns.push(run);
        }

        if (importedRuns.length === 0) {
          throw new Error('No se encontraron partidas válidas. Asegúrate de usar los encabezados correctos.');
        }

        const gameScopeInfo = gameFallback ? ` de tipo [${gameFallback}]` : '';
        const confirmed = window.confirm(
          `Se detectaron ${importedRuns.length} partidas válidas${gameScopeInfo} para importar.\n\n¿Deseas agregarlas a tu base de datos actual?`
        );

        if (confirmed) {
          setLocalProcessing(true);
          await onImportRuns(importedRuns);
          setSuccessMessage(`¡Importación exitosa! Se añadieron ${importedRuns.length} partidas.`);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error al procesar el archivo CSV.');
      } finally {
        setLocalProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  if (authLoading) {
    return (
      <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[220px]" id="cloud-sync-panel-loading">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-4" />
        <p className="text-xs text-neutral-400">Verificando sesión en la nube...</p>
      </div>
    );
  }

  const isBusy = isSyncingLive || localProcessing;

  return (
    <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-6 space-y-6" id="cloud-sync-panel">
      <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
        <Cloud className="w-4 h-4 text-emerald-400" /> Nube y datos
      </h3>

      {/* Error & Success Messages */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-xs flex gap-2 items-start" id="sync-error-box">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl text-xs flex gap-2 items-start" id="sync-success-box">
          <Check className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Hidden file input for CSV Import */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImportCSV} 
        accept=".csv" 
        className="hidden" 
      />

      {/* Main card */}
      {!user ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={handleSignIn}
              disabled={isBusy}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition-all active:scale-95"
            >
              <Database className="w-4 h-4" /> Conectar con Google
            </button>
            <div className="flex gap-2">
              <button onClick={triggerFileInput} disabled={isBusy} className="flex items-center gap-1 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 rounded-lg text-xs font-medium transition-all active:scale-95 disabled:opacity-50 cursor-pointer">
                <FileUp className="w-3.5 h-3.5" /> Importar CSV
              </button>
              <button onClick={handleExportCSV} className="flex items-center gap-1 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 rounded-lg text-xs font-medium transition-all active:scale-95 cursor-pointer">
                <FileDown className="w-3.5 h-3.5" /> Exportar CSV
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4" id="cloud-connected-card">
          {/* User Information */}
          <div className="flex items-center justify-between p-3.5 bg-[#161616] rounded-xl border border-neutral-800 text-xs">
            <div className="flex items-center gap-2.5">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'Google User'} referrerPolicy="no-referrer" className="w-7 h-7 rounded-full border border-neutral-700" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[11px]">
                  {user.displayName?.charAt(0) || 'U'}
                </div>
              )}
              <div>
                <p className="font-semibold text-white">{user.displayName || 'Usuario de Google'}</p>
                <p className="text-[10px] text-neutral-500 flex items-center gap-1">
                  <Database className="w-2.5 h-2.5 text-emerald-500" /> base-de-datos • {user.email}
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              disabled={isBusy}
              className="p-2 hover:bg-neutral-800 text-neutral-400 hover:text-rose-400 rounded-lg transition-all cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Sync controls */}
          <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-xl p-4 space-y-4" id="active-cloud-controls">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <Clock className="w-3.5 h-3.5" /> Sincronización activa · {runs.length} partidas
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={handlePull} disabled={isBusy} className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 border border-neutral-800 rounded-lg text-xs font-medium text-neutral-300 transition-all cursor-pointer">
                <DownloadCloud className="w-3.5 h-3.5 text-emerald-400" /> Descargar
              </button>
              <button onClick={handlePush} disabled={isBusy || runs.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 border border-neutral-800 rounded-lg text-xs font-medium text-neutral-300 transition-all cursor-pointer">
                <UploadCloud className="w-3.5 h-3.5 text-emerald-400" /> Subir
              </button>
              <button onClick={triggerFileInput} disabled={isBusy} className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 border border-neutral-800 rounded-lg text-xs font-medium text-neutral-300 transition-all cursor-pointer">
                <FileUp className="w-3.5 h-3.5 text-emerald-400" /> Importar CSV
              </button>
              <button onClick={handleExportCSV} disabled={runs.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 border border-neutral-800 rounded-lg text-xs font-medium text-neutral-300 transition-all cursor-pointer">
                <FileDown className="w-3.5 h-3.5 text-emerald-400" /> Exportar CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
