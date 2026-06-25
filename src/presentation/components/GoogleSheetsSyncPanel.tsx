import React, { useState, useEffect } from 'react';
import { RawRun, AuthUser, SpreadsheetInfo } from '../../domain/types';
import { 
  Database, 
  Check, 
  LogOut, 
  Plus, 
  AlertCircle, 
  ExternalLink, 
  FileSpreadsheet, 
  DownloadCloud, 
  UploadCloud,
  ChevronRight
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
}

export default function GoogleSheetsSyncPanel({
  runs,
  user,
  authLoading,
  activeSpreadsheet,
  isSyncingLive,
  onSignIn,
  onSignOut,
  onConnectSheet,
  onDisconnectSheet,
  onCreateNewSheet,
  onPullFromSheet,
  onPushToSheet
}: GoogleSheetsSyncPanelProps) {
  const [sheetInput, setSheetInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [localProcessing, setLocalProcessing] = useState(false);

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
      setSuccessMessage('Sesión de Google Sheets desconectada.');
    } catch (err: any) {
      setError('Error al cerrar sesión.');
    }
  };

  const handleCreateNewSheet = async () => {
    setError(null);
    setLocalProcessing(true);
    try {
      await onCreateNewSheet();
      setSuccessMessage(`¡Hoja de cálculo creada y conectada con éxito!`);
    } catch (err: any) {
      setError(err.message || 'No se pudo crear la hoja de cálculo de Google.');
    } finally {
      setLocalProcessing(false);
    }
  };

  const handleConnectSheet = async () => {
    if (!sheetInput.trim()) {
      setError('Por favor introduce un enlace o ID de Google Spreadsheet válido.');
      return;
    }
    setError(null);
    setLocalProcessing(true);
    try {
      await onConnectSheet(sheetInput);
      setSheetInput('');
      setSuccessMessage(`¡Conectado correctamente a la hoja de cálculo!`);
    } catch (err: any) {
      setError(err.message || 'Error al conectar la hoja de cálculo. Revisa que el enlace sea correcto y tengas permisos.');
    } finally {
      setLocalProcessing(false);
    }
  };

  const handlePull = async () => {
    setError(null);
    setLocalProcessing(true);
    try {
      await onPullFromSheet();
      setSuccessMessage('¡Datos sincronizados desde Google Sheets!');
    } catch (err: any) {
      setError(err.message || 'Error al descargar datos de Google Sheets.');
    } finally {
      setLocalProcessing(false);
    }
  };

  const handlePush = async () => {
    setError(null);
    setLocalProcessing(true);
    try {
      await onPushToSheet();
      setSuccessMessage('¡Historial guardado con éxito en Google Sheets!');
    } catch (err: any) {
      setError(err.message || 'Error al subir partidas a Google Sheets.');
    } finally {
      setLocalProcessing(false);
    }
  };

  if (authLoading) {
    return (
      <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[220px]" id="google-sheets-sync-panel-loading">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-4" />
        <p className="text-xs text-neutral-400">Verificando conexión con Google Drive...</p>
      </div>
    );
  }

  const isBusy = isSyncingLive || localProcessing;

  return (
    <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-6 space-y-6" id="google-sheets-sync-panel">
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" /> Guardar en Google Sheets
          </h3>
          <p className="text-xs text-neutral-500">
            Conecta una hoja de cálculo en Google Drive para guardar, recuperar y centralizar todas tus partidas competitivas en tiempo real.
          </p>
        </div>
        <div className="shrink-0">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
            activeSpreadsheet 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
          }`}>
            {activeSpreadsheet ? '● Conectado' : '○ Desconectado'}
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

      {/* Authentication view */}
      {!user ? (
        <div className="bg-[#161616] border border-neutral-800 rounded-xl p-5 text-center space-y-4" id="google-auth-login-card">
          <div className="max-w-md mx-auto space-y-2">
            <h4 className="text-sm font-semibold text-white">Almacenamiento en Google Drive</h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Inicia sesión de forma segura para permitir que la aplicación cree de forma automática una nueva hoja de cálculo limpia, o selecciona una de tus carpetas existentes.
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
      ) : (
        <div className="space-y-4" id="google-sheets-connected-card">
          {/* User Information */}
          <div className="flex items-center justify-between p-3 bg-[#161616] rounded-xl border border-neutral-800 text-xs">
            <div className="flex items-center gap-2.5">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || 'Google User'} referrerPolicy="no-referrer" className="w-6 h-6 rounded-full border border-neutral-700" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                  {user.displayName?.charAt(0) || 'U'}
                </div>
              )}
              <div>
                <p className="font-semibold text-white">{user.displayName || 'Usuario de Google'}</p>
                <p className="text-[10px] text-neutral-500">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              disabled={isBusy}
              className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-rose-400 rounded-lg transition-all cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Active sheet state */}
          {activeSpreadsheet ? (
            <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-xl p-4 space-y-4" id="active-spreadsheet-controls">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs font-semibold text-white line-clamp-1">
                      {activeSpreadsheet.title}
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-400">
                    Las nuevas partidas se registrarán directamente como filas en esta hoja en Google Drive.
                  </p>
                </div>
                <a
                  href={activeSpreadsheet.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-300 hover:text-emerald-400 transition-all text-[11px] flex items-center gap-1 shrink-0"
                  title="Abrir hoja de cálculo en nueva pestaña"
                >
                  Abrir <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Synchronize actions */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  onClick={handlePull}
                  disabled={isBusy}
                  className="bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 border border-neutral-800 rounded-xl p-2.5 flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer"
                >
                  <DownloadCloud className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-bold text-white">Sincronizar Desde Hoja</span>
                  <span className="text-[8px] text-neutral-500">Descargar filas más recientes</span>
                </button>

                <button
                  onClick={handlePush}
                  disabled={isBusy || runs.length === 0}
                  className="bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 border border-neutral-800 rounded-xl p-2.5 flex flex-col items-center justify-center text-center gap-1.5 transition-all cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4 text-emerald-400" />
                  <span className="text-[10px] font-bold text-white">Subir Todo el Historial</span>
                  <span className="text-[8px] text-neutral-500">Guardar {runs.length} partidas locales</span>
                </button>
              </div>

              {/* Disconnect sheet only */}
              <div className="flex justify-end pt-1">
                <button
                  onClick={onDisconnectSheet}
                  className="text-[10px] text-neutral-500 hover:text-neutral-300 underline cursor-pointer"
                >
                  Desconectar esta hoja (volver a modo local)
                </button>
              </div>
            </div>
          ) : (
            /* No sheet connected view */
            <div className="space-y-4" id="spreadsheet-connection-choices">
              {/* Choice A: Create a brand new beautiful spreadsheet */}
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <h5 className="text-xs font-bold text-white">A) Crear una nueva Hoja de Cálculo limpia</h5>
                  <p className="text-[10px] text-neutral-400 leading-normal">
                    Se creará en tu Google Drive una hoja lista llamada <strong className="text-neutral-300">"LinkedIn Games Tracker &amp; Analytics"</strong> con la estructura óptima para almacenar los datos de inmediato.
                  </p>
                </div>
                <button
                  onClick={handleCreateNewSheet}
                  disabled={isBusy}
                  className="shrink-0 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs py-2 px-3 rounded-xl flex items-center gap-1 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                >
                  {isBusy ? 'Creando...' : 'Crear Hoja'} <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Choice B: Connect an existing sheet */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wide">
                  B) O conecta una Hoja de Cálculo existente
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Pega el enlace o ID de tu Google Sheet..."
                    value={sheetInput}
                    onChange={(e) => setSheetInput(e.target.value)}
                    disabled={isBusy}
                    className="flex-1 px-3 py-2 border border-neutral-800 bg-[#161616] text-neutral-200 rounded-xl text-xs focus:border-neutral-700 focus:outline-none disabled:opacity-50"
                  />
                  <button
                    onClick={handleConnectSheet}
                    disabled={isBusy || !sheetInput.trim()}
                    className="px-3 py-2 bg-[#222] hover:bg-[#333] border border-neutral-800 rounded-xl text-xs font-bold text-white flex items-center gap-1 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    Conectar <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
