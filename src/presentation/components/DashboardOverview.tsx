import React, { useState } from 'react';
import { RawRun, GameSummary } from '../../domain/types';
import { BarChart3, Swords, Compass } from 'lucide-react';
import DashboardMetrics from './DashboardMetrics';
import PerformanceCharts from './PerformanceCharts';
import AnalysisTabContainer from './AnalysisTabContainer';
import ChessDashboard from './ChessDashboard';

interface DashboardOverviewProps {
  runs: RawRun[];
  sortedRuns: RawRun[];
  summaries: GameSummary[];
  onDeleteRun: (id: string) => void;
}

type SubTabType = 'linkedin' | 'chess' | 'advanced';

export default function DashboardOverview({
  runs,
  sortedRuns,
  summaries,
  onDeleteRun,
}: DashboardOverviewProps) {
  const [activeTab, setActiveTab] = useState<SubTabType>('linkedin');

  const totalRuns = runs.length;
  
  // Calculate global stats (LinkedIn specific)
  const linkedinSummaries = summaries.filter(s => s.juego !== 'Chess');
  const totalAhorro = linkedinSummaries.reduce((acc, s) => acc + (s.totalPartidas * s.ahorroS), 0);
  const avgDiff = linkedinSummaries.length > 0 
    ? Number((linkedinSummaries.reduce((acc, s) => acc + s.diferenciaPct, 0) / linkedinSummaries.length).toFixed(1))
    : 0;

  const tabs = [
    { id: 'linkedin', label: 'Juegos LinkedIn', icon: BarChart3 },
    { id: 'chess', label: 'Ajedrez ELO', icon: Swords },
    { id: 'advanced', label: 'Análisis Avanzado', icon: Compass },
  ] as const;

  return (
    <div className="space-y-6 text-xs">
      {/* Global KPIs overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#111] border border-neutral-800 p-5 rounded-3xl">
          <div className="text-[10px] font-bold text-neutral-550 uppercase tracking-wider">Partidas Registradas</div>
          <div className="text-2xl font-bold text-white font-mono mt-1">{totalRuns}</div>
        </div>
        <div className="bg-[#111] border border-neutral-800 p-5 rounded-3xl">
          <div className="text-[10px] font-bold text-neutral-550 uppercase tracking-wider">Diferencia Promedio (LIG)</div>
          <div className={`text-2xl font-bold font-mono mt-1 ${avgDiff > 0 ? 'text-emerald-400' : 'text-neutral-400'}`}>
            {avgDiff > 0 ? `+${avgDiff}%` : `${avgDiff}%`}
          </div>
        </div>
        <div className="bg-[#111] border border-neutral-800 p-5 rounded-3xl">
          <div className="text-[10px] font-bold text-neutral-550 uppercase tracking-wider">Tiempo Total Ahorrado</div>
          <div className="text-2xl font-bold text-white font-mono mt-1">
            {totalAhorro > 0 ? `${(totalAhorro / 3600).toFixed(1)} Hrs` : '0.0 Hrs'}
          </div>
        </div>
      </div>

      {/* Tab Selection */}
      <div className="flex bg-neutral-950 border border-neutral-800 p-1.5 rounded-2xl w-fit gap-1" id="dashboard-tab-selector">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-neutral-800 text-white border border-neutral-700'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub View Content */}
      <div className="space-y-6">
        {activeTab === 'linkedin' && (
          <>
            {runs.filter(r => r.juego !== 'Chess').length > 0 ? (
              <>
                <DashboardMetrics summaries={summaries.filter(s => s.juego !== 'Chess')} />
                <PerformanceCharts runs={sortedRuns.filter(r => r.juego !== 'Chess')} />
              </>
            ) : (
              <div className="text-center py-12 border border-neutral-800 rounded-3xl bg-[#111] text-neutral-500">
                Aquí aparecerán tus estadísticas de LinkedIn cuando registres la primera partida.
              </div>
            )}
          </>
        )}

        {activeTab === 'chess' && (
          <ChessDashboard 
            runs={runs} 
            onDeleteRun={onDeleteRun} 
          />
        )}

        {activeTab === 'advanced' && (
          <>
            {runs.filter(r => r.juego !== 'Chess').length > 0 ? (
              <AnalysisTabContainer
                runs={runs.filter(r => r.juego !== 'Chess')}
                summaries={summaries.filter(s => s.juego !== 'Chess')}
              />
            ) : (
              <div className="text-center py-12 border border-neutral-800 rounded-3xl bg-[#111] text-neutral-550">
                Registra partidas de juegos de LinkedIn para habilitar análisis avanzados.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
