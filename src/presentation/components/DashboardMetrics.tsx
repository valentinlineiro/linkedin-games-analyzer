import React from 'react';
import { GameSummary } from '../../domain/types';
import { Target } from 'lucide-react';

interface DashboardMetricsProps {
  summaries: GameSummary[];
}

export default function DashboardMetrics({ summaries }: DashboardMetricsProps) {
  const fmt = (n: number, d = 1) => n.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" id="kpi-cards-grid">
      {summaries.map((summary) => {
        const faster = summary.yo < summary.media;
        const pct = Math.abs(summary.ahorroPct);

        return (
          <div
            key={summary.juego}
            className="bg-[#111111] border border-neutral-800 rounded-2xl p-4 hover:border-neutral-700 transition-all space-y-3"
          >
            <div className="flex justify-between items-start">
              <h4 className="font-display font-bold text-sm text-white">{summary.juego}</h4>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                faster
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}>
                {faster ? `−${fmt(pct, 0)}%` : `+${fmt(pct, 0)}%`}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white font-mono">{fmt(summary.yo)}s</span>
              <span className="text-xs text-neutral-500">vs {fmt(summary.media)}s</span>
            </div>

            <div className="flex items-center gap-1 text-[10px] text-neutral-500">
              <Target className="w-3 h-3" />
              Récord: <span className="font-mono text-neutral-400 ml-0.5">{fmt(summary.record, 0)}s</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
