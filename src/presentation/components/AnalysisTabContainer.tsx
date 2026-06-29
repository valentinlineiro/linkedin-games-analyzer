import React, { useState } from 'react';
import { RawRun, GameSummary } from '../../domain/types';
import { Calendar, Clock, Activity, BarChart2 } from 'lucide-react';
import HeatmapPanel from './HeatmapPanel';
import TemporalAnalysisPanel from './TemporalAnalysisPanel';
import VolatilityTrendPanel from './VolatilityTrendPanel';

interface AnalysisTabContainerProps {
  runs: RawRun[];
  summaries: GameSummary[];
}

type SubTabType = 'heatmap' | 'temporal' | 'volatility' | 'correlation';

export default function AnalysisTabContainer({ runs, summaries }: AnalysisTabContainerProps) {
  const [activeTab, setActiveTab] = useState<SubTabType>('heatmap');

  const subTabs = [
    { id: 'heatmap', label: 'Mapa de Calor', icon: Calendar },
    { id: 'temporal', label: 'Rendimiento por Hora', icon: Clock },
    { id: 'volatility', label: 'Tendencia de Volatilidad', icon: Activity },
    { id: 'correlation', label: 'Correlación Cruzada', icon: BarChart2 },
  ] as const;

  return (
    <div className="space-y-6" id="analysis-tab-container">
      {/* Navigation bar */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-neutral-950 border border-neutral-800 rounded-2xl w-fit" id="analysis-sub-tabs">
        {subTabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content area */}
      <div className="bg-[#111111] border border-neutral-800 rounded-3xl p-6 min-h-[400px]">
        {activeTab === 'heatmap' && <HeatmapPanel runs={runs} />}
        {activeTab === 'temporal' && <TemporalAnalysisPanel runs={runs} />}
        {activeTab === 'volatility' && <VolatilityTrendPanel runs={runs} />}
        {activeTab === 'correlation' && <div id="subtab-correlation">Correlación Cruzada (Placeholder)</div>}
      </div>
    </div>
  );
}
