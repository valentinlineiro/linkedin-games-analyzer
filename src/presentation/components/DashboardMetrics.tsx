import React from 'react';
import { GameSummary, GAME_CONFIGS } from '../../domain/types';
import { Target, TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface DashboardMetricsProps {
  summaries: GameSummary[];
}

export default function DashboardMetrics({ summaries }: DashboardMetricsProps) {
  const fmt = (n: number, d = 1) => n.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" id="kpi-cards-grid">
      {summaries.filter(s => s.yo > 0).map((summary) => {
        const { direction, unit } = GAME_CONFIGS[summary.juego];
        const faster = direction === 'lower' ? summary.yo < summary.media : summary.yo >= summary.media;
        const pct = Math.abs(summary.diferenciaPct);
        const delta = summary.deltaSemana;
        const improving = delta !== null && (direction === 'lower' ? delta < 0 : delta > 0);
        const regressing = delta !== null && (direction === 'lower' ? delta > 0 : delta < 0);

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
              <span className="text-2xl font-bold text-white font-mono">{fmt(summary.yo)}{unit}</span>
              <span className="text-xs text-neutral-500">vs {fmt(summary.media)}{unit}</span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-neutral-500">
              <span className="flex items-center gap-1">
                <Target className="w-3 h-3" />
                <span className="font-mono text-neutral-400">{fmt(summary.record, 0)}{unit}</span>
              </span>

              {delta !== null ? (
                <span className={`flex items-center gap-0.5 font-mono font-semibold ${
                  improving ? 'text-emerald-400' : regressing ? 'text-rose-400' : 'text-neutral-500'
                }`}>
                  {improving
                    ? <TrendingDown className="w-3 h-3" />
                    : regressing
                    ? <TrendingUp className="w-3 h-3" />
                    : <Minus className="w-3 h-3" />}
                  {improving ? `${fmt(Math.abs(delta))}s` : regressing ? `+${fmt(delta)}s` : '—'}
                </span>
              ) : (
                <span className="text-neutral-700 text-[10px]">sin datos previos</span>
              )}
            </div>

            <div className="h-px bg-neutral-800" />

            <div className="flex items-center justify-between text-[10px]">
              <span className="text-neutral-500">
                Victorias <span className="text-neutral-700">({summary.totalPartidas})</span>
              </span>
              <span className={`font-mono font-semibold ${
                summary.victoriasPct >= 0.7 ? 'text-emerald-400' : summary.victoriasPct >= 0.5 ? 'text-neutral-300' : 'text-rose-400'
              }`}>
                {Math.round(summary.victoriasPct * 100)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
