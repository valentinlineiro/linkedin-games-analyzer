import React, { useState, useMemo } from 'react';
import { RawRun, GameType } from '../../domain/types';
import { 
  ResponsiveContainer, 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell,
  BarChart, 
  Bar, 
  ReferenceLine
} from 'recharts';
import { 
  Clock, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle, 
  Sparkles, 
  Activity, 
  Zap, 
  Info 
} from 'lucide-react';
import { groupRunsByTimeOfDay } from '../../domain/metrics';

interface TemporalAnalysisPanelProps {
  runs: RawRun[];
}

export default function TemporalAnalysisPanel({ runs }: TemporalAnalysisPanelProps) {
  const games: GameType[] = ['Patches', 'Zip', 'Sudoku', 'Queens'];
  
  // Default to first available game in runs, otherwise 'Patches'
  const [selectedGame, setSelectedGame] = useState<GameType>(() => {
    const available = games.find(g => runs.some(r => r.juego === g));
    return available || 'Patches';
  });

  const [includeAnomalies, setIncludeAnomalies] = useState<boolean>(false);

  // Grouped block data
  const blockData = useMemo(() => {
    return groupRunsByTimeOfDay(runs, selectedGame);
  }, [runs, selectedGame]);

  const activeBlocks = useMemo(() => blockData.filter(b => b.count > 0), [blockData]);

  // Highest and lowest avgRatio
  const bestBlock = useMemo(() => {
    if (activeBlocks.length === 0) return null;
    return activeBlocks.reduce((best, curr) => curr.avgRatio > best.avgRatio ? curr : best, activeBlocks[0]);
  }, [activeBlocks]);

  const worstBlock = useMemo(() => {
    if (activeBlocks.length === 0) return null;
    return activeBlocks.reduce((worst, curr) => curr.avgRatio < worst.avgRatio ? curr : worst, activeBlocks[0]);
  }, [activeBlocks]);

  // Total runs for the selected game
  const totalRunsCount = useMemo(() => {
    return runs.filter(r => r.juego === selectedGame && r.yo > 0).length;
  }, [runs, selectedGame]);

  // Find hour with the highest frequency of games played
  const peakHour = useMemo(() => {
    const filtered = runs.filter(r => r.juego === selectedGame && r.yo > 0);
    if (filtered.length === 0) return null;
    const counts: Record<number, number> = {};
    filtered.forEach(r => {
      try {
        if (!r.timestamp) return;
        const hr = new Date(r.timestamp).getHours();
        counts[hr] = (counts[hr] || 0) + 1;
      } catch (e) {
        console.error(e);
      }
    });
    let maxHr = 0;
    let maxCount = -1;
    Object.entries(counts).forEach(([hrStr, count]) => {
      const hr = parseInt(hrStr, 10);
      if (count > maxCount) {
        maxCount = count;
        maxHr = hr;
      }
    });
    return maxCount > 0 ? { hour: maxHr, count: maxCount } : null;
  }, [runs, selectedGame]);

  // Scatter plot data mapping
  const scatterData = useMemo(() => {
    return runs
      .filter(r => r.juego === selectedGame)
      .filter(r => r.yo > 0)
      .filter(r => includeAnomalies ? true : r.contexto !== 'Anomalía')
      .map(r => {
        const dateObj = new Date(r.timestamp);
        const hour = dateObj.getHours();
        return {
          ...r,
          hour,
          formattedHour: `${String(hour).padStart(2, '0')}:00`,
          fullDate: dateObj.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        };
      })
      .sort((a, b) => a.hour - b.hour);
  }, [runs, selectedGame, includeAnomalies]);

  // Custom tooltips
  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const dateObj = new Date(data.timestamp);
      
      // Calculate timezone offset representation
      const offsetMinutes = -dateObj.getTimezoneOffset();
      const offsetHrs = Math.floor(Math.abs(offsetMinutes) / 60);
      const offsetMins = Math.abs(offsetMinutes) % 60;
      const offsetSign = offsetMinutes >= 0 ? '+' : '-';
      const timezoneStr = `GMT${offsetSign}${String(offsetHrs).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;

      return (
        <div className="bg-[#151515] border border-neutral-800 text-neutral-200 p-4 rounded-xl shadow-xl max-w-xs" id="scatter-custom-tooltip">
          <div className="flex items-center gap-1.5 mb-2">
            <Calendar className="w-3.5 h-3.5 text-neutral-500" />
            <span className="text-[11px] text-neutral-500 font-medium font-mono">{data.fullDate}</span>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Hora de juego:</span>
              <strong className="text-neutral-200 font-mono">
                {String(dateObj.getHours()).padStart(2, '0')}:{String(dateObj.getMinutes()).padStart(2, '0')}
              </strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Tu Tiempo (yo):</span>
              <strong className="text-emerald-400 font-mono">{data.yo} s</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Media Comunidad:</span>
              <strong className="text-neutral-400 font-mono">{data.media} s</strong>
            </div>
            <div className="flex justify-between items-center border-t border-neutral-800/80 pt-1.5 mt-1.5">
              <span className="text-neutral-400">Rendimiento:</span>
              <strong className={`font-mono ${(data.media / data.yo) >= 1.0 ? 'text-emerald-400' : 'text-orange-400'}`}>
                {(data.media / data.yo).toFixed(2)}x
              </strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Contexto:</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                data.contexto === 'Máximo' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25' :
                data.contexto === 'Anomalía' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/25' :
                data.contexto === 'Cansancio' ? 'bg-rose-400/10 text-rose-300 border border-rose-400/25' :
                'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
              }`}>
                {data.contexto}
              </span>
            </div>
            {data.nota && (
              <div className="text-[10px] text-neutral-500 border-t border-neutral-800 pt-1 mt-1 leading-normal italic">
                "{data.nota}"
              </div>
            )}
            <div className="text-[9px] text-neutral-600 text-right mt-1 font-mono">
              {timezoneStr}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#151515] border border-neutral-800 text-neutral-200 p-3 rounded-xl shadow-xl max-w-xs" id="bar-custom-tooltip">
          <strong className="block text-xs text-neutral-100 mb-1.5">{data.block}</strong>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between items-center gap-4">
              <span className="text-neutral-400">Ratio Rendimiento:</span>
              <strong className={`font-mono ${data.avgRatio >= 1.0 ? 'text-emerald-400' : 'text-orange-400'}`}>
                {data.avgRatio.toFixed(2)}x
              </strong>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-neutral-400">Tiempo Medio (yo):</span>
              <strong className="text-neutral-200 font-mono">{data.avgYo} s</strong>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className="text-neutral-400">Partidas jugadas:</span>
              <strong className="text-indigo-400 font-mono">{data.count}</strong>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Safe number formatter
  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toLocaleString('es-ES', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  if (totalRunsCount === 0) {
    return (
      <div className="space-y-6" id="temporal-analysis-panel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-lg font-bold text-white flex items-center gap-1.5">
              <Clock className="w-5 h-5 text-emerald-400" /> Rendimiento Temporal por Hora
            </h3>
            <p className="text-xs text-neutral-500">
              Analiza a qué hora juegas mejor y cómo varía tu rendimiento frente a la comunidad.
            </p>
          </div>
          
          <div className="flex items-center gap-2" id="temporal-game-selector">
            <label htmlFor="game-select" className="text-xs text-neutral-400 font-medium whitespace-nowrap">Ver juego:</label>
            <select
              id="game-select"
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value as GameType)}
              className="bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs px-3 py-1.5 rounded-xl outline-none focus:border-neutral-700 cursor-pointer font-medium w-full sm:w-40 transition-colors"
            >
              {games.map(game => (
                <option key={game} value={game}>{game}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center border border-neutral-800 bg-neutral-900/10 rounded-3xl p-12 text-center space-y-4">
          <Clock className="w-12 h-12 text-neutral-700 animate-pulse" />
          <div className="space-y-1">
            <h4 className="text-white font-bold text-sm">Sin datos para {selectedGame}</h4>
            <p className="text-xs text-neutral-500 max-w-sm">
              Aún no has registrado ninguna partida de <strong>{selectedGame}</strong>. Registra partidas o sincroniza tus datos para ver el análisis.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="temporal-analysis-panel">
      {/* Header & Game Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-bold text-white flex items-center gap-1.5">
            <Clock className="w-5 h-5 text-emerald-400" /> Rendimiento Temporal por Hora
          </h3>
          <p className="text-xs text-neutral-500">
            Analiza a qué hora juegas mejor y cómo varía tu rendimiento frente a la comunidad.
          </p>
        </div>
        
        <div className="flex items-center gap-2" id="temporal-game-selector">
          <label htmlFor="game-select" className="text-xs text-neutral-400 font-medium whitespace-nowrap">Ver juego:</label>
          <select
            id="game-select"
            value={selectedGame}
            onChange={(e) => setSelectedGame(e.target.value as GameType)}
            className="bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs px-3 py-1.5 rounded-xl outline-none focus:border-neutral-700 cursor-pointer font-medium w-full sm:w-40 transition-colors"
          >
            {games.map(game => (
              <option key={game} value={game}>{game}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="temporal-kpi-cards">
        {/* Mejor Franja */}
        {bestBlock ? (
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 via-emerald-600/5 to-transparent border border-emerald-500/25 rounded-2xl p-5 hover:border-emerald-500/40 transition-all space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Mejor Franja Horaria</span>
              <div className="p-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h4 className="font-display font-bold text-base text-white">{bestBlock.block}</h4>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold text-emerald-400 font-mono">{formatNumber(bestBlock.avgRatio, 2)}x</span>
                <span className="text-[10px] text-neutral-400">vs comunidad</span>
              </div>
            </div>
            <div className="text-[11px] text-neutral-400 pt-1 border-t border-neutral-800/60 flex justify-between">
              <span>Media: <strong className="text-neutral-200 font-mono">{formatNumber(bestBlock.avgYo, 1)}s</strong></span>
              <span>Partidas: <strong className="text-neutral-200 font-mono">{bestBlock.count}</strong></span>
            </div>
          </div>
        ) : (
          <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-5 text-center text-xs text-neutral-500 flex items-center justify-center min-h-[140px]">
            Sin datos de mejor franja
          </div>
        )}

        {/* Peor Franja */}
        {worstBlock ? (
          <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-transparent border border-amber-500/25 rounded-2xl p-5 hover:border-amber-500/40 transition-all space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Peor Franja Horaria</span>
              <div className="p-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h4 className="font-display font-bold text-base text-white">{worstBlock.block}</h4>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold text-amber-400 font-mono">{formatNumber(worstBlock.avgRatio, 2)}x</span>
                <span className="text-[10px] text-neutral-400">vs comunidad</span>
              </div>
            </div>
            <div className="text-[11px] text-neutral-400 pt-1 border-t border-neutral-800/60 flex justify-between">
              <span>Media: <strong className="text-neutral-200 font-mono">{formatNumber(worstBlock.avgYo, 1)}s</strong></span>
              <span>Partidas: <strong className="text-neutral-200 font-mono">{worstBlock.count}</strong></span>
            </div>
          </div>
        ) : (
          <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-5 text-center text-xs text-neutral-500 flex items-center justify-center min-h-[140px]">
            Sin datos de peor franja
          </div>
        )}

        {/* Total Partidas */}
        <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-5 hover:border-neutral-700 transition-all space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Muestra de Partidas</span>
            <div className="p-1 bg-neutral-800 border border-neutral-700 text-neutral-300 rounded-lg">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h4 className="font-display font-bold text-base text-neutral-400">Total Analizadas</h4>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-white font-mono">{totalRunsCount}</span>
              <span className="text-[10px] text-neutral-500">partidas</span>
            </div>
          </div>
          <div className="text-[11px] text-neutral-500 pt-1 border-t border-neutral-800/60">
            Excluyendo anomalías en medias
          </div>
        </div>

        {/* Hora Pico */}
        {peakHour ? (
          <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-5 hover:border-neutral-700 transition-all space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Hora Más Activa</span>
              <div className="p-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h4 className="font-display font-bold text-base text-white">{String(peakHour.hour).padStart(2, '0')}:00</h4>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl font-bold text-indigo-400 font-mono">{peakHour.count}</span>
                <span className="text-[10px] text-neutral-400">partidas jugadas</span>
              </div>
            </div>
            <div className="text-[11px] text-neutral-500 pt-1 border-t border-neutral-800/60">
              Momento de mayor regularidad
            </div>
          </div>
        ) : (
          <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-5 text-center text-xs text-neutral-500 flex items-center justify-center min-h-[140px]">
            Sin datos de hora pico
          </div>
        )}
      </div>

      {/* Charts Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="temporal-charts-grid">
        {/* Scatter Plot */}
        <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="font-display font-bold text-sm text-white flex items-center gap-1.5">
                Distribución de Partidas por Hora
              </h4>
              <span className="text-[11px] text-neutral-500">
                Cada punto representa el tiempo en segundos de una partida jugada a esa hora exacta.
              </span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <input 
                type="checkbox" 
                id="toggle-anomalies" 
                checked={includeAnomalies} 
                onChange={(e) => setIncludeAnomalies(e.target.checked)}
                className="w-3.5 h-3.5 bg-neutral-900 border border-neutral-800 text-emerald-500 rounded focus:ring-emerald-500/20"
              />
              <label htmlFor="toggle-anomalies" className="text-[11px] text-neutral-400 select-none cursor-pointer">
                Incluir Anomalías
              </label>
            </div>
          </div>

          <div className="h-64 w-full" id="scatter-chart-container">
            {scatterData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" />
                  <XAxis 
                    type="number" 
                    dataKey="hour" 
                    name="Hora del día" 
                    domain={[0, 23]} 
                    ticks={[0, 4, 8, 12, 16, 20, 23]}
                    tickFormatter={h => `${String(h).padStart(2, '0')}:00`}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="yo" 
                    name="Tiempo (s)"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }}
                    label={{ value: 'Segundos (s)', angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 10 } }}
                  />
                  <Tooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3', stroke: '#333' }} />
                  <Scatter name="Partidas" data={scatterData}>
                    {scatterData.map((entry, index) => {
                      let color = '#10b981'; // normal
                      if (entry.contexto === 'Anomalía') color = '#ef4444'; // rose
                      else if (entry.contexto === 'Máximo') color = '#f59e0b'; // amber
                      else if (entry.contexto === 'Cansancio') color = '#f43f5e';
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-neutral-500">
                No hay partidas registradas para graficar
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 text-[10px] text-neutral-500 pt-1.5 border-t border-neutral-900">
            <span className="font-semibold text-neutral-400">Leyenda:</span>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Normal</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Récord</span>
            </div>
            {includeAnomalies && (
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>Anomalía</span>
              </div>
            )}
          </div>
        </div>

        {/* Bar Chart (Blocks) */}
        <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-5 space-y-4">
          <div>
            <h4 className="font-display font-bold text-sm text-white">
              Rendimiento Relativo por Bloque Horario
            </h4>
            <span className="text-[11px] text-neutral-500">
              Ratio de rendimiento promedio (media comunidad / tu tiempo). Valores &gt; 1.0 son superiores a la media.
            </span>
          </div>

          <div className="h-64 w-full" id="bar-chart-container">
            {blockData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={blockData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" />
                  <XAxis 
                    dataKey="block" 
                    tickFormatter={name => name.split(' ')[0]} // Shorten: "Madrugada", "Mañana", etc.
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#6b7280', fontSize: 10, fontWeight: 500 }}
                  />
                  <YAxis 
                    domain={[0, 'auto']}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }}
                    label={{ value: 'Ratio de Rendimiento', angle: -90, position: 'insideLeft', style: { fill: '#6b7280', fontSize: 10 } }}
                  />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <ReferenceLine y={1.0} stroke="#444" strokeWidth={1} strokeDasharray="3 3" />
                  <Bar dataKey="avgRatio" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {blockData.map((entry, index) => {
                      let color = '#525252'; // Grey for no data
                      if (entry.count > 0) {
                        color = entry.avgRatio >= 1.0 ? '#10b981' : '#f59e0b'; // Emerald if >= 1, Amber if < 1
                      }
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-neutral-500">
                No hay suficientes datos de franjas horarias
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 text-[10px] text-neutral-500 pt-1.5 border-t border-neutral-900">
            <span className="font-semibold text-neutral-400">Color de barra:</span>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-emerald-500" />
              <span>Superior a la comunidad (&ge; 1.0)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-amber-500" />
              <span>Inferior a la comunidad (&lt; 1.0)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded bg-neutral-600" />
              <span>Sin Datos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Info block */}
      <div className="bg-[#151515] border border-neutral-800 rounded-xl p-4 flex gap-3 text-xs text-neutral-400" id="temporal-insights-footer">
        <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="text-neutral-300 block">¿Cómo interpretar estos datos?</strong>
          <p className="leading-relaxed">
            El <strong>Ratio de Rendimiento</strong> se calcula dividiendo la media de la comunidad por tu propio tiempo de resolución (<code className="bg-neutral-900 px-1 py-0.5 rounded text-neutral-300 font-mono">media / yo</code>). 
            Si tu ratio es de <strong>1.25x</strong>, significa que eres un 25% más rápido que el promedio de la comunidad. 
            Identificar tus mejores franjas te ayuda a planificar tus juegos de LinkedIn en momentos de máxima agudeza mental, previniendo el cansancio o bloqueos de atención.
          </p>
        </div>
      </div>
    </div>
  );
}
