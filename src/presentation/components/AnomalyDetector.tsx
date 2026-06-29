import React from 'react';
import { RawRun, GameSummary } from '../../domain/types';
import { ShieldAlert, Check, Trash2 } from 'lucide-react';

interface AnomalyDetectorProps {
  runs: RawRun[];
  summaries: GameSummary[];
  onDeleteRun?: (id: string) => void;
}

export default function AnomalyDetector({ runs, summaries, onDeleteRun }: AnomalyDetectorProps) {
  const anomalies = runs
    .filter(r => r.contexto === 'Anomalía')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (anomalies.length === 0) return null;

  const fmt = (n: number, d = 1) => n.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });

  return (
    <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-4 sm:p-6 space-y-4" id="anomaly-detector-panel">
      <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-rose-500" /> Anomalías
        <span className="ml-auto text-xs font-normal text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
          {anomalies.length}
        </span>
      </h3>

      <div className="space-y-2">
        {anomalies.map((anomaly) => {
          const gameSummary = summaries.find(s => s.juego === anomaly.juego);
          const weekly = anomaly.mediaSemana || (gameSummary ? gameSummary.yo : 50);
          const over = anomaly.yo - weekly;

          return (
            <div key={anomaly.id} className="flex items-center gap-3 p-3 bg-rose-500/5 border border-rose-500/15 rounded-xl">
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-sm text-white">{anomaly.juego}</span>
                  <span className="font-mono text-xs text-rose-400">{fmt(anomaly.yo)}s</span>
                  <span className="text-xs text-neutral-500">vs {fmt(weekly)}s media</span>
                  <span className="font-mono text-xs text-rose-500">+{fmt(over)}s</span>
                </div>
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  {new Date(anomaly.timestamp).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  {anomaly.nota && anomaly.nota !== 'Pegado desde LinkedIn' ? ` · ${anomaly.nota}` : ''}
                </p>
              </div>
              {onDeleteRun && (
                <button
                  onClick={() => {
                    if (window.confirm('¿Eliminar esta partida?')) onDeleteRun(anomaly.id);
                  }}
                  className="p-1.5 text-neutral-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
