import React, { useMemo } from 'react';
import { RawRun, GameType } from '../../domain/types';
import { calculatePearsonCorrelation } from '../../domain/metrics';
import { HelpCircle, AlertCircle, BarChart2 } from 'lucide-react';

interface CrossGameCorrelationPanelProps {
  runs: RawRun[];
}

const gameColors: Record<GameType, { text: string; dot: string }> = {
  Patches: { text: 'text-emerald-400', dot: 'bg-emerald-500' },
  Zip: { text: 'text-sky-400', dot: 'bg-sky-500' },
  Sudoku: { text: 'text-amber-400', dot: 'bg-amber-500' },
  Queens: { text: 'text-indigo-400', dot: 'bg-indigo-500' },
};

function getCellStyles(r: number, isDiagonal: boolean) {
  if (isDiagonal) {
    return {
      bg: 'bg-[#262626]',
      text: 'text-neutral-200 font-bold',
      label: 'Autocorrelación',
    };
  }
  if (r >= 0.5) {
    return {
      bg: 'bg-emerald-600',
      text: 'text-white font-bold',
      label: 'Fuerte Positiva',
    };
  }
  if (r >= 0.2) {
    return {
      bg: 'bg-emerald-800',
      text: 'text-emerald-100 font-semibold',
      label: 'Débil Positiva',
    };
  }
  if (r <= -0.2) {
    return {
      bg: 'bg-rose-950',
      text: 'text-rose-100 font-semibold',
      label: 'Negativa',
    };
  }
  return {
    bg: 'bg-[#161616]',
    text: 'text-neutral-400',
    label: 'Sin Relación',
  };
}

function getOverlapCount(runs: RawRun[], gameA: GameType, gameB: GameType): number {
  if (gameA === gameB) {
    const dates = new Set<string>();
    runs.forEach(r => {
      if (r.yo === 0) return;
      if (r.juego === gameA) {
        dates.add(r.timestamp.split('T')[0]);
      }
    });
    return dates.size;
  }
  
  const dates: Record<string, { a: boolean; b: boolean }> = {};
  runs.forEach(r => {
    if (r.yo === 0) return;
    const date = r.timestamp.split('T')[0];
    if (!dates[date]) {
      dates[date] = { a: false, b: false };
    }
    if (r.juego === gameA) dates[date].a = true;
    if (r.juego === gameB) dates[date].b = true;
  });
  return Object.values(dates).filter(d => d.a && d.b).length;
}

const GAMES: GameType[] = ['Patches', 'Zip', 'Sudoku', 'Queens'];

export default function CrossGameCorrelationPanel({ runs }: CrossGameCorrelationPanelProps) {
  // Calculate 4x4 matrix
  const matrix = useMemo(() => {
    return GAMES.map(gameA => {
      return GAMES.map(gameB => {
        const isDiagonal = gameA === gameB;
        const r = isDiagonal ? 1.00 : calculatePearsonCorrelation(runs, gameA, gameB);
        const overlap = getOverlapCount(runs, gameA, gameB);
        return { gameA, gameB, r, isDiagonal, overlap };
      });
    });
  }, [runs]);

  // Unique pairs list for relationship analysis
  const uniquePairs = useMemo(() => {
    const pairsList: { gameA: GameType; gameB: GameType; r: number; overlap: number }[] = [];
    for (let i = 0; i < GAMES.length; i++) {
      for (let j = i + 1; j < GAMES.length; j++) {
        const gameA = GAMES[i];
        const gameB = GAMES[j];
        const r = calculatePearsonCorrelation(runs, gameA, gameB);
        const overlap = getOverlapCount(runs, gameA, gameB);
        pairsList.push({ gameA, gameB, r, overlap });
      }
    }
    return pairsList;
  }, [runs]);

  // Valid pairs with at least 2 days of overlapping data
  const validPairs = useMemo(() => {
    return uniquePairs.filter(p => p.overlap >= 2);
  }, [uniquePairs]);

  // Strongest Positive Correlation (r >= 0.3)
  const strongestPositive = useMemo(() => {
    const positives = validPairs.filter(p => p.r >= 0.3);
    if (positives.length === 0) return null;
    return [...positives].sort((a, b) => b.r - a.r)[0];
  }, [validPairs]);

  // Strongest Negative Correlation (r <= -0.2)
  const strongestNegative = useMemo(() => {
    const negatives = validPairs.filter(p => p.r <= -0.2);
    if (negatives.length === 0) return null;
    return [...negatives].sort((a, b) => a.r - b.r)[0];
  }, [validPairs]);

  return (
    <div className="space-y-6" id="cross-game-correlation-panel">
      {/* Header */}
      <div>
        <h3 className="font-display font-bold text-lg text-white">Correlación Cruzada</h3>
        <p className="text-xs text-neutral-500">
          Matriz de correlación de Pearson (r) basada en los ratios de rendimiento diarios (media del día / tiempo personal).
          Valores cercanos a +1 indican rendimiento consistente alineado; cercanos a -1 indican rendimientos opuestos.
        </p>
      </div>

      {/* Grid Container */}
      <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-5">
        <div className="overflow-x-auto pb-4" id="correlation-matrix-container">
          <div className="min-w-[340px] max-w-[480px] mx-auto grid grid-cols-5 gap-2.5 p-4 bg-neutral-950/20 border border-neutral-900 rounded-2xl">
            {/* Top Left Cell */}
            <div className="flex items-center justify-center text-neutral-600">
              <BarChart2 className="w-5 h-5" />
            </div>

            {/* Top Headers */}
            {GAMES.map(game => (
              <div key={`header-top-${game}`} className="flex flex-col items-center justify-center py-2">
                <span className={`text-[10px] sm:text-xs font-semibold ${gameColors[game].text}`}>{game}</span>
                <span className={`w-1.5 h-1.5 rounded-full mt-1 ${gameColors[game].dot}`} />
              </div>
            ))}

            {/* Matrix Rows */}
            {GAMES.map((gameA, rowIndex) => (
              <React.Fragment key={`row-${gameA}`}>
                {/* Left Label */}
                <div className="flex items-center justify-end pr-2 py-1 text-right">
                  <span className={`text-[10px] sm:text-xs font-semibold ${gameColors[gameA].text}`}>{gameA}</span>
                </div>

                {/* Matrix Row Cells */}
                {matrix[rowIndex].map((cell) => {
                  const { r, isDiagonal, overlap, gameB } = cell;
                  const styles = getCellStyles(r, isDiagonal);
                  const formattedVal = isDiagonal
                    ? '1.00'
                    : r > 0
                      ? `+${r.toFixed(2)}`
                      : r < 0
                        ? `${r.toFixed(2)}`
                        : '0.00';

                  return (
                    <div
                      key={`cell-${gameA}-${gameB}`}
                      id={`corr-cell-${gameA.toLowerCase()}-${gameB.toLowerCase()}`}
                      className={`aspect-square flex flex-col items-center justify-center rounded-xl transition-all cursor-default select-none relative group border border-neutral-900/60 ${styles.bg} ${styles.text} hover:scale-105`}
                    >
                      <span className="text-xs sm:text-sm font-mono">{formattedVal}</span>

                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-neutral-950 border border-neutral-800 text-[10px] text-neutral-300 py-1.5 px-2 rounded-lg whitespace-nowrap shadow-2xl z-20 pointer-events-none">
                        <p className="font-semibold text-white">{gameA} vs {gameB}</p>
                        <p className="text-neutral-400 mt-0.5">
                          {isDiagonal ? 'Mismo juego' : `${styles.label} (r = ${r > 0 ? `+${r.toFixed(2)}` : r.toFixed(2)})`}
                        </p>
                        {!isDiagonal && (
                          <p className="text-neutral-500 text-[9px] mt-0.5">
                            Coincidencia: {overlap} {overlap === 1 ? 'día' : 'días'}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-4 text-[10px] sm:text-xs text-neutral-400 border-t border-neutral-900 pt-4" id="correlation-legend">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-600 border border-emerald-500/20" />
            <span>Fuerte Positiva (&ge; 0.5)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-800 border border-emerald-700/20" />
            <span>Débil Positiva (0.2 a 0.5)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#161616] border border-neutral-800" />
            <span>Sin Relación (-0.2 a 0.2)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-950 border border-rose-900/20" />
            <span>Negativa (&le; -0.2)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-[#262626] border border-neutral-700/20" />
            <span>Autocorrelación (1.00)</span>
          </div>
        </div>
      </div>

      {/* Dynamic Descriptions */}
      <div className="space-y-3" id="correlation-descriptions">
        <h4 className="font-semibold text-sm text-neutral-300">Análisis de Relación</h4>
        
        {strongestPositive || strongestNegative ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {strongestPositive && (
              <div
                className="bg-emerald-950/10 border border-emerald-500/20 rounded-xl p-4 flex gap-3 text-xs text-neutral-300 hover:border-emerald-500/35 transition-all"
                id="positive-correlation-card"
              >
                <span className="text-lg shrink-0 mt-0.5">🧠</span>
                <div className="space-y-1">
                  <span className="text-white font-semibold text-sm block">
                    {strongestPositive.gameA} y {strongestPositive.gameB} (r = +{strongestPositive.r.toFixed(2)})
                  </span>
                  <p className="leading-relaxed">
                    Tu rendimiento en estas dos disciplinas tiene una {strongestPositive.r >= 0.5 ? 'correlación positiva fuerte' : 'correlación positiva débil'}.
                    Esto significa que los días en los que resuelves rápido {strongestPositive.gameB}, también sueles destacar en {strongestPositive.gameA}.
                  </p>
                </div>
              </div>
            )}

            {strongestNegative && (
              <div
                className="bg-rose-950/10 border border-rose-500/20 rounded-xl p-4 flex gap-3 text-xs text-neutral-300 hover:border-rose-500/35 transition-all"
                id="negative-correlation-card"
              >
                <span className="text-lg shrink-0 mt-0.5">⚖️</span>
                <div className="space-y-1">
                  <span className="text-white font-semibold text-sm block">
                    {strongestNegative.gameA} y {strongestNegative.gameB} (r = {strongestNegative.r.toFixed(2)})
                  </span>
                  <p className="leading-relaxed">
                    Tu rendimiento en estas dos disciplinas tiene una correlación negativa.
                    Esto significa que los días en los que resuelves rápido {strongestNegative.gameA}, sueles tardar más en completar {strongestNegative.gameB}, o viceversa, lo que podría sugerir fatiga o un enfoque mental diferente.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            className="bg-neutral-900/30 border border-neutral-800 rounded-xl p-5 flex gap-4 text-xs text-neutral-400 items-center justify-center"
            id="correlation-fallback-card"
          >
            <AlertCircle className="w-5 h-5 text-neutral-500 shrink-0" />
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-neutral-300 font-semibold block">Datos Insuficientes</span>
              <p>
                Juega más partidas diarias en varios juegos para ver análisis de correlación.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Educational Box */}
      <div
        className="bg-gradient-to-br from-indigo-500/10 via-indigo-600/5 to-transparent border border-indigo-500/25 rounded-xl p-5 hover:border-indigo-500/40 transition-all flex gap-4 text-xs text-neutral-300 leading-relaxed"
        id="correlation-educational-box"
      >
        <HelpCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-2">
          <strong className="text-white block text-sm font-semibold">¿Cómo se calcula e interpreta la correlación cruzada?</strong>
          <p>
            El <strong>Coeficiente de Correlación de Pearson (r)</strong> mide la relación lineal entre dos variables en una escala de <code>-1.00</code> (relación negativa perfecta) a <code>+1.00</code> (relación positiva perfecta).
          </p>
          <p>
            Para este análisis, utilizamos la <strong>relación diaria de rendimiento</strong> (el ratio <code>media_del_juego / tu_tiempo</code>). Un valor de ratio más alto indica que resolviste el juego más rápido en comparación con la media de la comunidad en ese día.
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li><strong>Correlación Positiva (r &ge; 0.2):</strong> Indica que tiendes a tener buenos días simultáneamente en ambos juegos (por ejemplo, buena agudeza visual o rapidez cognitiva general).</li>
            <li><strong>Sin Relación (-0.2 &lt; r &lt; 0.2):</strong> Tu rendimiento en un juego es independiente del rendimiento en el otro.</li>
            <li><strong>Correlación Negativa (r &le; -0.2):</strong> Cuando te va muy bien en un juego, tiendes a tardar más en el otro, lo cual puede indicar fatiga cerebral o que consumiste gran parte de tu enfoque diario en el primer juego.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
