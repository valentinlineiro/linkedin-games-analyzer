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
  const [activeMainTab, setActiveMainTab] = React.useState<'linkedin' | 'chess' | 'analysis'>('linkedin');
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

  const handleResetClick = () => {
    if (confirmingReset) {
      onResetData();
      setConfirmingReset(false);
    } else {
      setConfirmingReset(true);
    }
  };

  React.useEffect(() => {
    if (confirmingReset) {
      const timer = setTimeout(() => setConfirmingReset(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [confirmingReset]);

  const hasData = runs.length > 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-200 font-sans selection:bg-emerald-500/20" id="app-root-container">
      {/* Header */}
      <header className="bg-[#111111] border-b border-neutral-800 sticky top-0 z-40 px-6 py-4" id="app-header">
        <div className="max-w-4xl mx-auto flex justify-between items-center gap-4">
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
              {(['linkedin', 'chess', 'analysis'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveMainTab(tab)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    activeMainTab === tab
                      ? 'bg-neutral-800 text-white border border-neutral-700'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {tab === 'linkedin' ? 'LinkedIn' : tab === 'chess' ? 'Chess' : 'Análisis'}
                </button>
              ))}
            </div>

            {/* Cloud status indicator */}
            {activeSpreadsheet ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                <Cloud className="w-3.5 h-3.5" /> {isSyncingLive ? 'Guardando…' : 'Nube activa'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border bg-neutral-800 text-neutral-500 border-neutral-700">
                <CloudOff className="w-3.5 h-3.5" /> Local
              </span>
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
                className={`px-3 py-1.5 border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  confirmingReset
                    ? 'border-rose-500/50 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                    : 'border-neutral-700 text-neutral-500 hover:bg-neutral-800 hover:text-white'
                }`}
              >
                {confirmingReset ? '¿Confirmar? Haz clic de nuevo' : 'Limpiar historial'}
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
            {hasData && (
              <>
                <DashboardMetrics summaries={summaries.filter(s => s.juego !== 'Chess')} />
                <PerformanceCharts runs={sortedRuns} />
              </>
            )}
          </>
        )}
        {activeMainTab === 'chess' && (
          <ChessView
            runs={runs}
            onAddRun={onAddRun}
            lastCommunityAverages={lastCommunityAverages}
          />
        )}
        {activeMainTab === 'analysis' && (
          <AnalysisTabContainer runs={runs} summaries={summaries} />
        )}
      </main>

      <footer className="text-center py-8 text-xs text-neutral-700 max-w-4xl mx-auto border-t border-neutral-800" id="app-footer">
        <p>© 2026 LinkedIn Games Tracker</p>
      </footer>
    </div>
  );
}
