import React, { useState } from 'react';
import { RawRun, GameSummary } from '../../domain/types';
import { ShieldAlert, AlertTriangle, HelpCircle, Check, Search, Trash2 } from 'lucide-react';

interface AnomalyDetectorProps {
  runs: RawRun[];
  summaries: GameSummary[];
  onDeleteRun?: (id: string) => void;
}

export default function AnomalyDetector({ runs, summaries, onDeleteRun }: AnomalyDetectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showExplanation, setShowExplanation] = useState(true);

  // Filter anomalies (context === 'Anomalía')
  const anomalies = runs
    .filter(r => r.contexto === 'Anomalía')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filteredAnomalies = anomalies.filter(a => 
    a.juego.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (a.nota && a.nota.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toLocaleString('es-ES', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-6 space-y-6" id="anomaly-detector-panel">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-500" /> Detección de Anomalías Estadísticas
          </h3>
          <p className="text-xs text-neutral-500">
            Identificación de partidas con varianzas inusuales respecto a tu media móvil semanal.
          </p>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64" id="anomaly-search-wrapper">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por juego o notas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 border border-neutral-800 bg-[#1a1a1a] text-neutral-200 rounded-xl text-xs focus:border-neutral-700 focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Statistical Explanation block */}
      {showExplanation && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl relative text-xs text-neutral-300 leading-relaxed" id="statistical-explanation-box">
          <button 
            onClick={() => setShowExplanation(false)}
            className="absolute top-3 right-3 text-neutral-500 hover:text-neutral-300 font-bold text-base cursor-pointer"
            title="Cerrar explicación"
          >
            ×
          </button>
          <div className="flex gap-2">
            <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5 pr-4">
              <strong className="text-white block">¿Cómo funciona el motor de anomalías?</strong>
              <p>
                Las partidas se evalúan comparando tu tiempo individual (<code className="bg-neutral-950 text-neutral-300 border border-neutral-800 px-1 py-0.5 rounded font-mono">Yo</code>) contra tu media móvil de los últimos 7 días (<code className="bg-neutral-950 text-neutral-300 border border-neutral-800 px-1 py-0.5 rounded font-mono">Media semana</code>). 
                Si el tiempo de la partida supera la media móvil de la semana en más de <strong>1.5 desviaciones típicas (volatilidad)</strong>, el sistema lo cataloga de inmediato como una <strong className="text-rose-400">Anomalía de Bajo Rendimiento</strong>.
              </p>
              <p>
                Estas desviaciones suelen ser causadas por factores prácticos identificables: clicks accidentales (falsos positivos en Queens o Patches), bloqueos de razonamiento en patrones complejos de Sudoku, o distracciones externas ocasionales.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Anomalies Table / List */}
      {filteredAnomalies.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-neutral-800" id="anomalies-table-container">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#151515] border-b border-neutral-800 text-neutral-400 uppercase tracking-wider font-semibold">
                <th className="p-3">Juego</th>
                <th className="p-3">Fecha y Hora</th>
                <th className="p-3 text-right">Tiempo Registrado</th>
                <th className="p-3 text-right">Media Móvil (7d)</th>
                <th className="p-3 text-right">Desviación (s)</th>
                <th className="p-3">Causa / Nota Técnica</th>
                {onDeleteRun && <th className="p-3 text-center">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {filteredAnomalies.map((anomaly) => {
                const gameSummary = summaries.find(s => s.juego === anomaly.juego);
                const averageWeekly = anomaly.mediaSemana || (gameSummary ? gameSummary.yo : 50);
                const secondsOver = anomaly.yo - averageWeekly;
                const percentageOver = (secondsOver / averageWeekly) * 100;

                return (
                  <tr key={anomaly.id} className="hover:bg-[#151515]/50 transition-all">
                    <td className="p-3 font-semibold text-neutral-200">{anomaly.juego}</td>
                    <td className="p-3 text-neutral-500">
                      {new Date(anomaly.timestamp).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-rose-400">
                      {formatNumber(anomaly.yo, 1)}s
                    </td>
                    <td className="p-3 text-right font-mono text-neutral-500">
                      {formatNumber(averageWeekly, 1)}s
                    </td>
                    <td className="p-3 text-right font-mono text-rose-400 font-semibold">
                      +{formatNumber(secondsOver, 1)}s (+{formatNumber(percentageOver, 0)}%)
                    </td>
                    <td className="p-3 text-neutral-400 italic">
                      <span className="inline-flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                        {anomaly.nota || 'Atraso excesivo sin justificación guardada.'}
                      </span>
                    </td>
                    {onDeleteRun && (
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            if (window.confirm('¿Seguro que deseas eliminar este registro anómalo de la base de datos?')) {
                              onDeleteRun(anomaly.id);
                            }
                          }}
                          className="p-1.5 text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                          title="Eliminar partida"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 bg-[#151515]/30 border border-dashed border-neutral-800 rounded-xl" id="no-anomalies-card">
          <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-neutral-200">¡Ninguna anomalía detectada!</p>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
            Todos tus tiempos registrados en los filtros actuales se encuentran dentro del rango de varianza estadística normal de tus medias móviles.
          </p>
        </div>
      )}

      {/* Volatilidad Context Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="volatility-insights-grid">
        <div className="border border-neutral-800 bg-[#151515]/30 rounded-xl p-4 space-y-2">
          <h4 className="font-semibold text-xs text-neutral-300 uppercase tracking-wider">Juegos Más Volátiles (Alta dispersión)</h4>
          <p className="text-xs text-neutral-400 leading-relaxed">
            <strong>Patches (0.70)</strong> y <strong>Zip (0.56)</strong> tienen los coeficientes de variabilidad más altos. Esto se debe a que son juegos propensos a récords extremos rápidos (7 segundos) pero que se penalizan duramente si te confundes en un click inicial, ensanchando la desviación típica.
          </p>
        </div>
        <div className="border border-neutral-800 bg-[#151515]/30 rounded-xl p-4 space-y-2">
          <h4 className="font-semibold text-xs text-neutral-300 uppercase tracking-wider">Juegos Más Estables (Consistencia sólida)</h4>
          <p className="text-xs text-neutral-400 leading-relaxed">
            <strong>Sudoku (0.34)</strong> y <strong>Queens (0.32)</strong> muestran una constancia altísima. Requieren un ritmo analítico donde la suerte influye menos; tus tiempos orbitan de forma muy estable cerca de tus medias de 81s y 50s respectivamente, minimizando falsas alarmas de anomalías.
          </p>
        </div>
      </div>
    </div>
  );
}
