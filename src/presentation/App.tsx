import React from 'react';
import { useTracker } from './hooks/useTracker';
import DashboardMetrics from './components/DashboardMetrics';
import PerformanceCharts from './components/PerformanceCharts';
import NewRunForm from './components/NewRunForm';
import GoogleSheetsSyncPanel from './components/GoogleSheetsSyncPanel';
import AnomalyDetector from './components/AnomalyDetector';
import AnalysisTabContainer from './components/AnalysisTabContainer';
import { RefreshCw, Layers, GraduationCap, Cloud, CloudOff } from 'lucide-react';

export default function App() {
  const [activeMainTab, setActiveMainTab] = React.useState<'dashboard' | 'analysis'>('dashboard');
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
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500 text-black font-bold rounded-xl">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight text-white flex items-center gap-2">
                LinkedIn Games <span className="font-light text-neutral-400">Tracker &amp; Analytics</span>
              </h1>
              <p className="text-xs text-neutral-500">
                Análisis de Rendimiento Diario • Detección de Anomalías Estadísticas • {activeSpreadsheet ? 'Sincronizado con Firestore' : 'Guardado Local'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Tab Selector */}
            <div className="flex bg-neutral-950 border border-neutral-800 p-1 rounded-xl text-xs gap-1" id="main-tab-selector">
              <button
                onClick={() => setActiveMainTab('dashboard')}
                className={`px-4 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeMainTab === 'dashboard'
                    ? 'bg-neutral-800 text-white border border-neutral-700'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Inicio
              </button>
              <button
                onClick={() => setActiveMainTab('analysis')}
                className={`px-4 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  activeMainTab === 'analysis'
                    ? 'bg-neutral-800 text-white border border-neutral-700'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Análisis
              </button>
            </div>

            <button
              onClick={handleResetClick}
              className={`px-3 py-1.5 border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                confirmingReset
                  ? 'border-rose-500/50 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                  : 'border-neutral-800 text-neutral-400 hover:bg-neutral-800 hover:text-white'
              }`}
              title={confirmingReset ? 'Haz clic de nuevo para confirmar' : 'Limpiar historial de partidas'}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {confirmingReset ? '¿Confirmar? Haz clic de nuevo' : 'Limpiar Historial'}
            </button>
            
            {activeSpreadsheet ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                <Cloud className="w-3.5 h-3.5" /> {isSyncingLive ? 'Guardando en la nube...' : 'Sincronización en la Nube Activa'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border bg-neutral-800 text-neutral-400 border-neutral-700">
                <CloudOff className="w-3.5 h-3.5" /> Almacenamiento Local Activo
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto p-6 space-y-6" id="app-main-content">
        {activeMainTab === 'dashboard' ? (
          <>
            {hasData ? (
              <>
                <section id="metrics-section">
                  <DashboardMetrics summaries={summaries} />
                </section>
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="charts-and-form-section">
                  <div className="lg:col-span-2">
                    <PerformanceCharts runs={sortedRuns} />
                  </div>
                  <div className="lg:col-span-1">
                    <NewRunForm
                      onAddRun={onAddRun}
                      onAddRuns={onImportRuns}
                      recordTimes={recordTimes}
                      lastCommunityAverages={lastCommunityAverages}
                    />
                  </div>
                </section>
              </>
            ) : (
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="empty-state-section">
                <div className="lg:col-span-2 flex flex-col items-center justify-center bg-[#111111] border border-neutral-800 rounded-2xl p-12 text-center space-y-6">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                    <Layers className="w-12 h-12 text-emerald-400" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-white">Registra tu primera partida</h2>
                    <p className="text-sm text-neutral-400 max-w-sm">
                      Copia el texto que LinkedIn muestra al terminar una partida y pégalo en el panel de la derecha. El app detectará el juego y el tiempo automáticamente.
                    </p>
                  </div>
                  <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-left w-full max-w-sm space-y-1">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Ejemplo de texto de LinkedIn</p>
                    <p className="text-xs text-neutral-300 font-mono">Patches #100 | 0:22 🔴</p>
                    <p className="text-[10px] text-neutral-500">o simplemente el tiempo: <span className="font-mono text-neutral-400">0:22</span></p>
                  </div>
                  <p className="text-xs text-neutral-600">También puedes usar Entrada Manual si prefieres introducir los datos a mano.</p>
                </div>
                <div className="lg:col-span-1">
                  <NewRunForm
                    onAddRun={onAddRun}
                    onAddRuns={onImportRuns}
                    recordTimes={recordTimes}
                    lastCommunityAverages={lastCommunityAverages}
                  />
                </div>
              </section>
            )}

            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="sync-and-anomalies-section">
              <div className="lg:col-span-7">
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
              </div>
              <div className="lg:col-span-5">
                <AnomalyDetector
                  runs={sortedRuns}
                  summaries={summaries}
                  onDeleteRun={onDeleteRun}
                />
              </div>
            </section>
          </>
        ) : (
          <AnalysisTabContainer runs={runs} summaries={summaries} />
        )}

        {/* Theoretical Briefing Footer Accordion */}
        {hasData && (() => {
          const patches = summaries.find(s => s.juego === 'Patches');
          const queens = summaries.find(s => s.juego === 'Queens');
          const sudoku = summaries.find(s => s.juego === 'Sudoku');
          const bestGame = [...summaries].sort((a, b) => b.rendimiento - a.rendimiento)[0];

          if (!patches || !queens || !sudoku || !bestGame) return null;

          return (
            <section className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4" id="theoretical-briefing-panel">
              <div>
                <h3 className="font-display text-md font-bold text-white flex items-center gap-1.5">
                  <GraduationCap className="w-5 h-5 text-emerald-400" /> Resumen Ejecutivo de Análisis de Datos
                </h3>
                <p className="text-xs text-neutral-500">
                  Diagnóstico estadístico de tu desempeño competitivo en los juegos de LinkedIn.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-neutral-400 leading-relaxed">
                <div className="space-y-2">
                  <h4 className="font-bold text-white uppercase tracking-wide">1. Ventaja Competitiva Identificada</h4>
                  <p>
                    Tu mayor ventaja se concentra en <strong>{bestGame.juego}</strong>. Completas el tablero en una media de <strong>{bestGame.yo.toFixed(1)}s</strong> frente a los <strong>{bestGame.media.toFixed(1)}s</strong> de la comunidad, con un coeficiente de rendimiento de <strong>{bestGame.rendimiento.toFixed(2)}x</strong>.
                  </p>
                  <p>
                    En <strong>Queens</strong> muestras <strong>{queens.rendimiento.toFixed(2)}x</strong> de rendimiento. En <strong>Sudoku</strong> alcanzas un <strong>{(sudoku.victoriasPct * 100).toFixed(0)}%</strong> de victorias sobre la comunidad ({sudoku.rendimiento.toFixed(2)}x).
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-white uppercase tracking-wide">2. Gestión de Desviaciones y Anomalías</h4>
                  <p>
                    El sistema detecta anomalías comparando cada partida con tu media móvil de los últimos 7 días. Tiempos que superen <strong>1.5 desviaciones típicas</strong> por encima de la media se etiquetan automáticamente como <strong>"Anomalía"</strong>.
                  </p>
                  <p>
                    Esto permite excluir partidas afectadas por fallos del dispositivo o distracciones puntuales, manteniendo tus proyecciones analíticas limpias.
                  </p>
                </div>
              </div>
            </section>
          );
        })()}
      </main>

      {/* Page Footer */}
      <footer className="text-center py-8 text-xs text-neutral-600 max-w-7xl mx-auto border-t border-neutral-800" id="app-footer">
        <p>© 2026 LinkedIn Games Performance Tracker • Análisis Estadístico de Rendimiento</p>
      </footer>
    </div>
  );
}
