import React from 'react';
import { useTracker } from './hooks/useTracker';
import DashboardMetrics from './components/DashboardMetrics';
import PerformanceCharts from './components/PerformanceCharts';
import NewRunForm from './components/NewRunForm';
import GoogleSheetsSyncPanel from './components/GoogleSheetsSyncPanel';
import AnalysisTabContainer from './components/AnalysisTabContainer';
import ChessView from './components/ChessView';
import { Layers, Cloud, CloudOff, Settings } from 'lucide-react';

export default function App() {
  const [activeMainTab, setActiveMainTab] = React.useState<'linkedin' | 'chess'>('linkedin');
  const {
    runs,
    sortedRuns,
    summaries,
    recordTimes,
    lastCommunityAverages,
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
    onPushToSheet,
    onAddRun,
    onDeleteRun,
    onResetData,
    onImportRuns,
  } = useTracker();

  const [showSettings, setShowSettings] = React.useState(false);
  const [confirmingReset, setConfirmingReset] = React.useState(false);

  const handleResetClick = () => setConfirmingReset(true);

  const hasData = runs.length > 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-200 font-sans selection:bg-emerald-500/20" id="app-root-container">
      {/* Header */}
      <header className="bg-[#111111] border-b border-neutral-800 sticky top-0 z-40 px-6 py-4" id="app-header">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500 text-black font-bold rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <h1 className="font-display text-lg font-bold tracking-tight text-white">
              LinkedIn Games
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Selector */}
            <div className="flex bg-neutral-950 border border-neutral-800 p-1 rounded-xl text-xs gap-1" id="main-tab-selector">
              {(['linkedin', 'chess'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveMainTab(tab)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    activeMainTab === tab
                      ? 'bg-neutral-800 text-white border border-neutral-700'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {tab === 'linkedin' ? 'LinkedIn' : 'Chess'}
                </button>
              ))}
            </div>

            {/* Cloud status indicator — click to open settings */}
            {activeSpreadsheet ? (
              <button
                onClick={() => setShowSettings(s => !s)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 cursor-pointer hover:bg-emerald-500/20 transition-all"
              >
                <Cloud className="w-3.5 h-3.5" /> {isSyncingLive ? 'Guardando…' : 'Nube activa'}
              </button>
            ) : (
              <button
                onClick={() => setShowSettings(s => !s)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border bg-neutral-800 text-neutral-500 border-neutral-700 cursor-pointer hover:bg-neutral-700 hover:text-neutral-300 transition-all"
              >
                <CloudOff className="w-3.5 h-3.5" /> Local
              </button>
            )}

            {/* Settings toggle */}
            <button
              onClick={() => setShowSettings(s => !s)}
              className={`p-2 border rounded-xl transition-all cursor-pointer ${
                showSettings
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                  : 'border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
              title="Configuración y sincronización"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Settings panel (collapsed by default) */}
      {showSettings && (
        <div className="border-b border-neutral-800 bg-[#0d0d0d]">
          <div className="max-w-4xl mx-auto p-6 space-y-4">
            <GoogleSheetsSyncPanel
              runs={runs}
              user={user}
              authLoading={authLoading}
              activeSpreadsheet={activeSpreadsheet}
              isSyncingLive={isSyncingLive}
              onSignIn={onSignIn}
              onSignOut={onSignOut}
              onConnectSheet={onConnectSheet}
              onDisconnectSheet={onDisconnectSheet}
              onCreateNewSheet={onCreateNewSheet}
              onPullFromSheet={onPullFromSheet}
              onPushToSheet={onPushToSheet}
              onImportRuns={onImportRuns}
            />
            <div className="border-t border-neutral-800 pt-4">
              <button
                onClick={handleResetClick}
                className="px-3 py-1.5 border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border-neutral-700 text-neutral-500 hover:bg-neutral-800 hover:text-white"
              >
                Limpiar historial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation modal for reset */}
      {confirmingReset && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setConfirmingReset(false)}>
          <div className="bg-[#1a1a1a] border border-neutral-700 rounded-2xl p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
            <h4 className="font-bold text-white text-sm">¿Eliminar todo el historial?</h4>
            <p className="text-xs text-neutral-400">Esta acción es irreversible. Se borrarán todos los registros locales.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmingReset(false)}
                className="flex-1 px-3 py-2 border border-neutral-700 rounded-xl text-xs font-semibold text-neutral-400 hover:bg-neutral-800 hover:text-white transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => { onResetData(); setConfirmingReset(false); }}
                className="flex-1 px-3 py-2 bg-rose-500 hover:bg-rose-400 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto p-6 space-y-6" id="app-main-content">
        {activeMainTab === 'linkedin' && (
          <>
            <NewRunForm
              onAddRun={onAddRun}
              onAddRuns={onImportRuns}
              recordTimes={recordTimes}
              lastCommunityAverages={lastCommunityAverages}
            />
            {hasData ? (
              <>
                <DashboardMetrics summaries={summaries.filter(s => s.juego !== 'Chess')} />
                <PerformanceCharts runs={sortedRuns.filter(r => r.juego !== 'Chess')} />
                <AnalysisTabContainer
                  runs={runs.filter(r => r.juego !== 'Chess')}
                  summaries={summaries.filter(s => s.juego !== 'Chess')}
                />
              </>
            ) : (
              <p className="text-center text-xs text-neutral-600 py-4">
                Aquí aparecerán tus estadísticas cuando registres la primera partida.
              </p>
            )}
          </>
        )}
        {activeMainTab === 'chess' && (
          <ChessView
            runs={runs}
            onAddRun={onAddRun}
            onImportRuns={onImportRuns}
            lastCommunityAverages={lastCommunityAverages}
          />
        )}
      </main>

      <footer className="text-center py-8 text-xs text-neutral-700 max-w-4xl mx-auto border-t border-neutral-800" id="app-footer">
        <p>© 2026 LinkedIn Games Tracker</p>
      </footer>
    </div>
  );
}
