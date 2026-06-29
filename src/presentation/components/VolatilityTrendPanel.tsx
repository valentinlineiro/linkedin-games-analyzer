import React, { useState, useMemo } from 'react';
import { RawRun, GameType } from '../../domain/types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Activity, HelpCircle, AlertCircle } from 'lucide-react';
import { calculateWeeklyVolatility } from '../../domain/metrics';

interface VolatilityTrendPanelProps {
  runs: RawRun[];
}

const gameColors: Record<GameType, { stroke: string; border: string; bg: string; text: string; bgActive: string }> = {
  Patches: { stroke: '#10b981', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5', text: 'text-emerald-400', bgActive: 'bg-emerald-500/10' },
  Zip:     { stroke: '#0ea5e9', border: 'border-sky-500/20',     bg: 'bg-sky-500/5',     text: 'text-sky-400',     bgActive: 'bg-sky-500/10' },
  Sudoku:  { stroke: '#f59e0b', border: 'border-amber-500/20',   bg: 'bg-amber-500/5',   text: 'text-amber-400',   bgActive: 'bg-amber-500/10' },
  Queens:  { stroke: '#8b5cf6', border: 'border-indigo-500/20',  bg: 'bg-indigo-500/5',  text: 'text-indigo-400',  bgActive: 'bg-indigo-500/10' },
  Chess:   { stroke: '#f43f5e', border: 'border-rose-500/20',    bg: 'bg-rose-500/5',    text: 'text-rose-400',    bgActive: 'bg-rose-500/10' },
};

export default function VolatilityTrendPanel({ runs }: VolatilityTrendPanelProps) {
  const games: GameType[] = ['Patches', 'Zip', 'Sudoku', 'Queens', 'Chess'];

  const [visibleGames, setVisibleGames] = useState<Record<GameType, boolean>>({
    Patches: true,
    Zip: true,
    Sudoku: true,
    Queens: true,
    Chess: true,
  });

  // Calculate weekly volatility data
  const data = useMemo(() => {
    return calculateWeeklyVolatility(runs);
  }, [runs]);

  // Dynamic custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#151515] border border-neutral-800 text-neutral-200 p-4 rounded-xl shadow-xl min-w-[200px]" id="volatility-custom-tooltip">
          <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-neutral-800">
            <Activity className="w-3.5 h-3.5 text-neutral-500" />
            <span className="text-[11px] font-bold text-neutral-400 font-mono">Semana: {label}</span>
          </div>
          <div className="space-y-1.5">
            {payload.map((item: any) => {
              const gameName = item.name as GameType;
              const config = gameColors[gameName];
              return (
                <div key={item.name} className="flex justify-between items-center text-xs">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: config.stroke }} />
                    {gameName}:
                  </span>
                  <strong className="font-mono text-sm" style={{ color: config.stroke }}>
                    {item.value !== undefined && item.value !== null ? item.value.toFixed(3) : '-'}
                  </strong>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  // Determine if there is any data to plot
  const hasData = data.length > 0;

  return (
    <div className="space-y-6" id="volatility-trend-panel">
      {/* Header and Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display font-bold text-lg text-white">Tendencia de Volatilidad</h3>
          <p className="text-xs text-neutral-500">
            Evolución del Coeficiente de Variación (CV) semanal. Una pendiente descendente indica mayor consistencia.
          </p>
        </div>

        {/* Custom Game Visibility Toggles */}
        <div className="flex flex-wrap gap-2" id="volatility-game-toggles">
          {games.map(game => {
            const config = gameColors[game];
            const isVisible = visibleGames[game];
            return (
              <button
                key={game}
                onClick={() => setVisibleGames(prev => ({ ...prev, [game]: !prev[game] }))}
                className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer active:scale-95 ${
                  isVisible
                    ? `${config.border} ${config.bgActive} ${config.text}`
                    : 'border-neutral-800 bg-neutral-950 text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 transition-colors"
                  style={{ backgroundColor: isVisible ? config.stroke : '#404040' }}
                />
                {game}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart container */}
      <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-5">
        <div className="h-80 w-full" id="volatility-chart-container">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" />
                <XAxis
                  dataKey="week"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }}
                  label={{ value: 'Coeficiente de Variación (CV)', angle: -90, position: 'insideLeft', offset: 0, style: { fill: '#6b7280', fontSize: 10, textAnchor: 'middle' } }}
                />
                <Tooltip content={<CustomTooltip />} />
                {games.map(game => {
                  if (!visibleGames[game]) return null;
                  return (
                    <Line
                      key={game}
                      type="monotone"
                      dataKey={game}
                      name={game}
                      stroke={gameColors[game].stroke}
                      strokeWidth={2}
                      dot={{ r: 3, strokeWidth: 1 }}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                      connectNulls
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-xs text-neutral-500 gap-2">
              <AlertCircle className="w-6 h-6 text-neutral-600" />
              <span>No hay suficientes datos registrados para graficar la volatilidad.</span>
            </div>
          )}
        </div>
      </div>

      {/* Educational Box */}
      <div className="bg-gradient-to-br from-indigo-500/10 via-indigo-600/5 to-transparent border border-indigo-500/25 rounded-xl p-5 hover:border-indigo-500/40 transition-all flex gap-4 text-xs text-neutral-300 leading-relaxed" id="volatility-educational-box">
        <HelpCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-2">
          <strong className="text-white block text-sm font-semibold">¿Qué es el Coeficiente de Variación (CV)?</strong>
          <p>
            El <strong>Coeficiente de Variación (CV)</strong> es una métrica estadística calculada como la desviación típica dividida por la media aritmética (<code className="bg-neutral-900 px-1 py-0.5 rounded text-indigo-300 font-mono">CV = σ / μ</code>).
          </p>
          <p>
            A diferencia de la desviación típica estándar, el CV no tiene dimensiones (es un ratio decimal), lo que permite <strong>normalizar la volatilidad</strong>. Gracias a esto, podemos comparar la consistencia de juegos muy rápidos como <strong>Zip</strong> (con tiempos en torno a los 22s) y juegos más largos como <strong>Sudoku</strong> (cuyos tiempos suelen rondar los 80s) en una misma escala.
          </p>
          <p>
            <strong>Interpretación:</strong> Un CV más bajo (cercano a 0) indica una desviación menor respecto a tu media y, por tanto, una <strong>mayor consistencia, regularidad y menos errores de resolución</strong> en tus partidas.
          </p>
        </div>
      </div>
    </div>
  );
}
