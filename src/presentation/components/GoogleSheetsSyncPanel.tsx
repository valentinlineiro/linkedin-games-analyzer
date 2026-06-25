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

interface GoogleSheetsSyncPanelProps {
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

export default function GoogleSheetsSyncPanel({
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
}: GoogleSheetsSyncPanelProps) {
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
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión con Google.');
    }
  };

  const handleSignOut = async () => {
    setError(null);
    try {
      await onSignOut();
      setSuccessMessage('Sesión de la nube desconectada.');
    } catch (err: any) {
      setError('Error al cerrar sesión.');
    }
  };

  const handlePull = async () => {
    setError(null);
    setLocalProcessing(true);
    try {
      await onPullFromSheet();
      setSuccessMessage('¡Datos actualizados desde Firestore!');
    } catch (err: any) {
      setError(err.message || 'Error al descargar datos de Firestore.');
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
    } catch (err: any) {
      setError(err.message || 'Error al subir partidas a Firestore.');
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
      const headers = ['Timestamp', 'Juego', 'Tiempo Personal (Yo)', 'Media Comunidad', 'Ahorro (s)', 'Contexto', 'Notas'];
      
      // Form values escaping comma and quote characters
      const csvRows = runs.map(run => {
        const timestamp = run.timestamp;
        const juego = run.juego;
        const yo = run.yo;
        const media = run.media;
        const ahorro = run.ahorro;
        const contexto = run.contexto;
        const nota = (run.nota || '').replace(/"/g, '""');
        return [
          timestamp,
          juego,
          yo,
          media,
          ahorro,
          contexto,
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
    } catch (err: any) {
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

        const importedRuns: Omit<RawRun, 'id' | 'ahorro' | 'contexto'>[] = [];
        
        // Match headers to find correct columns (supports English and Spanish names)
        const headerLine = lines[0].toLowerCase();
        const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        
        const tsIdx = headers.findIndex(h => h.includes('time') || h.includes('marca') || h.includes('fecha'));
        const gameIdx = headers.findIndex(h => h.includes('juego') || h.includes('game'));
        const yoIdx = headers.findIndex(h => h.includes('yo') || h.includes('tiempo') || h.includes('personal') || h.includes('personal'));
        const mediaIdx = headers.findIndex(h => h.includes('media') || h.includes('comunidad') || h.includes('average'));
        const noteIdx = headers.findIndex(h => h.includes('nota') || h.includes('comentario') || h.includes('comment') || h.includes('note'));

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Split columns while respecting quoted values containing commas
          const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
          const cols = matches.map(c => c.trim().replace(/^"|"$/g, ''));

          if (cols.length < 3) continue;

          const timestampRaw = tsIdx !== -1 && cols[tsIdx] ? cols[tsIdx] : new Date().toISOString();
          const juegoRaw = gameIdx !== -1 ? cols[gameIdx] : '';
          const yoRaw = parseFloat(yoIdx !== -1 ? cols[yoIdx] : cols[2]);
          const mediaRaw = parseFloat(mediaIdx !== -1 ? cols[mediaIdx] : cols[3]);
          const nota = noteIdx !== -1 && cols[noteIdx] ? cols[noteIdx] : '';

          if (!juegoRaw || isNaN(yoRaw) || isNaN(mediaRaw)) continue;

          // Standardize Game Types
          let juegoClean = juegoRaw.trim();
          // Capitalize first letter
          juegoClean = juegoClean.charAt(0).toUpperCase() + juegoClean.slice(1).toLowerCase();
          
          if (!['Patches', 'Zip', 'Sudoku', 'Queens'].includes(juegoClean)) continue;

          importedRuns.push({
            timestamp: new Date(timestampRaw).toISOString(),
            juego: juegoClean as GameType,
            yo: yoRaw,
            media: mediaRaw,
            nota: nota.replace(/""/g, '"') // unescape quotes
          });
        }

        if (importedRuns.length === 0) {
          throw new Error('No se encontraron partidas válidas. Asegúrate de usar los encabezados correctos.');
        }

        const confirmed = window.confirm(
          `Se detectaron ${importedRuns.length} partidas válidas para importar.\n\n¿Deseas agregarlas a tu base de datos actual?`
        );

        if (confirmed) {
          setLocalProcessing(true);
          await onImportRuns(importedRuns);
          setSuccessMessage(`¡Importación exitosa! Se añadieron ${importedRuns.length} partidas.`);
        }
      } catch (err: any) {
        setError(err.message || 'Error al procesar el archivo CSV.');
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
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <Cloud className="w-5 h-5 text-emerald-400" /> Sincronización en la Nube
          </h3>
          <p className="text-xs text-neutral-500">
            Guarda, recupera y centraliza tus estadísticas y tiempos de partidas de LinkedIn de forma rápida y segura en la base de datos Firestore.
          </p>
        </div>
        <div className="shrink-0">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
            user 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
          }`}>
            {user ? '● Nube Activa' : '○ Modo Local'}
          </span>
        </div>
      </div>

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
          <div className="bg-[#161616] border border-neutral-800 rounded-xl p-5 text-center space-y-4" id="cloud-login-card">
            <div className="max-w-md mx-auto space-y-2">
              <h4 className="text-sm font-semibold text-white">Sincroniza tus registros en Firestore</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Inicia sesión de forma segura con Google para habilitar el guardado automático. Tus registros se sincronizarán en la nube para que puedas acceder a ellos desde cualquier dispositivo.
              </p>
            </div>
            <button
              onClick={handleSignIn}
              disabled={isBusy}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition-all active:scale-95"
            >
              <Database className="w-4 h-4" /> Iniciar Sesión con Google
            </button>
          </div>

          {/* Local tools accessible offline */}
          <div className="border border-neutral-800 bg-neutral-900/50 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
            <div className="space-y-1 text-center sm:text-left">
              <p className="font-semibold text-neutral-300 flex items-center gap-1.5 justify-center sm:justify-start">
                <Shield className="w-3.5 h-3.5 text-neutral-500" /> Herramientas de Respaldo Local
              </p>
              <p className="text-[10px] text-neutral-500">
                Puedes respaldar o importar tus datos mediante archivos CSV de Excel en cualquier momento.
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto justify-center">
              <button
                onClick={triggerFileInput}
                disabled={isBusy}
                className="flex items-center gap-1 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-750 rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <FileUp className="w-3.5 h-3.5" /> Importar CSV
              </button>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-750 rounded-lg font-medium transition-all active:scale-95 cursor-pointer"
              >
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
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-semibold text-white">
                  Sincronización en Tiempo Real Activa
                </span>
              </div>
              <p className="text-[10px] text-neutral-400">
                Las partidas nuevas se registrarán automáticamente en tu cuenta Firestore. Tienes <strong>{runs.length}</strong> partidas cargadas en este panel.
              </p>
            </div>

            {/* Action Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
              <button
                onClick={handlePull}
                disabled={isBusy}
                className="bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 border border-neutral-800 rounded-xl p-3 flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer"
                title="Baja las partidas guardadas en tu Firestore"
              >
                <DownloadCloud className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-bold text-white">Descargar de Nube</span>
                <span className="text-[8px] text-neutral-500">Recargar desde base de datos</span>
              </button>

              <button
                onClick={handlePush}
                disabled={isBusy || runs.length === 0}
                className="bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 border border-neutral-800 rounded-xl p-3 flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer"
                title="Sube y mezcla tus partidas locales activas en la nube"
              >
                <UploadCloud className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-bold text-white">Respaldar Historial</span>
                <span className="text-[8px] text-neutral-500">Combinar local con nube</span>
              </button>

              <button
                onClick={triggerFileInput}
                disabled={isBusy}
                className="bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 border border-neutral-800 rounded-xl p-3 flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer"
                title="Importar partidas desde una hoja de cálculo guardada en CSV"
              >
                <FileUp className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-bold text-white">Importar CSV</span>
                <span className="text-[8px] text-neutral-500">Subir archivo de excel (.csv)</span>
              </button>

              <button
                onClick={handleExportCSV}
                disabled={runs.length === 0}
                className="bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 border border-neutral-800 rounded-xl p-3 flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer"
                title="Descargar todas tus partidas en formato CSV de excel"
              >
                <FileDown className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-bold text-white">Exportar CSV</span>
                <span className="text-[8px] text-neutral-500">Bajar archivo de excel (.csv)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
