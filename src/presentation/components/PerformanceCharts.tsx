import React, { useState } from 'react';
import { RawRun, GameType } from '../../domain/types';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
} from 'recharts';
import { Sparkles, Calendar, TrendingUp, AlertTriangle } from 'lucide-react';
// ponytail: Legend removed — tooltip covers it, legend was redundant noise on mobile

interface PerformanceChartsProps {
  runs: RawRun[];
}

interface TooltipPayloadItem {
  payload: {
    fecha: string;
    yo: number;
    mediaComunidad: number;
    mediaSemana: number;
    contexto: string;
    ahorro: number;
    isAnomaly: boolean;
    isRecord: boolean;
    fullDate: string;
    nota?: string;
  };
}

// Custom tooltip
const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#151515] border border-neutral-800 text-neutral-200 p-4 rounded-xl shadow-xl max-w-sm" id="chart-custom-tooltip">
        <div className="flex items-center gap-1.5 mb-2">
          <Calendar className="w-3.5 h-3.5 text-neutral-500" />
          <span className="text-[11px] text-neutral-500 font-medium font-mono">{data.fullDate}</span>
        </div>
        
        <div className="space-y-1.5 border-b border-neutral-800 pb-2 mb-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-neutral-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Tu Tiempo:
            </span>
            <strong className="text-emerald-400 font-mono text-sm">{data.yo} s</strong>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-neutral-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-neutral-600" /> Media Comunidad:
            </span>
            <strong className="text-neutral-400 font-mono text-sm">{data.mediaComunidad} s</strong>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-neutral-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-400" /> Media Móvil (7d):
            </span>
            <strong className="text-indigo-400 font-mono text-sm">{data.mediaSemana} s</strong>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="text-neutral-500">Ahorro de Tiempo:</span>
            <span className={`font-semibold font-mono ${data.ahorro >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {data.ahorro >= 0 ? `+${data.ahorro}` : data.ahorro} s
            </span>
          </div>
          
          {data.contexto === 'Anomalía' && (
            <div className="mt-2 flex items-start gap-1 bg-rose-500/10 text-rose-400 text-[11px] p-2 rounded-lg border border-rose-500/20">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-rose-300">Anomalía Detectada</strong>
                {data.nota || 'Tiempo inusualmente alto en comparación con tu media.'}
              </div>
            </div>
          )}

          {data.contexto === 'Máximo' && (
            <div className="mt-2 flex items-start gap-1 bg-amber-500/10 text-amber-400 text-[11px] p-2 rounded-lg border border-amber-500/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-200">¡Récord Personal!</strong>
                {data.nota || 'Excelente rendimiento récord en esta sesión.'}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export default function PerformanceCharts({ runs }: PerformanceChartsProps) {
  const [selectedGame, setSelectedGame] = useState<GameType>('Patches');

  // Filter and sort runs for selected game
  const gameRuns = runs
    .filter(r => r.juego === selectedGame)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Formatter for charts
  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  // Prepare data for recharts
  const chartData = gameRuns.map(run => ({
    fecha: formatDate(run.timestamp),
    yo: run.yo,
    mediaComunidad: run.media,
    mediaSemana: run.mediaSemana || run.yo,
    contexto: run.contexto,
    ahorro: Number((run.media - run.yo).toFixed(1)),
    isAnomaly: run.contexto === 'Anomalía',
    isRecord: run.contexto === 'Máximo',
    fullDate: new Date(run.timestamp).toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }),
    nota: run.nota
  }));

  const games: GameType[] = ['Patches', 'Zip', 'Sudoku', 'Queens'];

  // Calculate some analytics for the selected game
  const latestRun = gameRuns[gameRuns.length - 1];
  const earliestRun = gameRuns[0];
  const improvement = latestRun && earliestRun ? earliestRun.yo - latestRun.yo : 0;
  const averageYo = gameRuns.length > 0
    ? gameRuns.reduce((acc, r) => acc + r.yo, 0) / gameRuns.length
    : 0;

  // Custom Dots to highlight Anomalies and Records
  const CustomDot = (props: { cx?: number; cy?: number; payload?: TooltipPayloadItem['payload'] }) => {
    if (props.payload?.isAnomaly) {
      return (
        <g>
          <circle cx={props.cx} cy={props.cy} r={8} fill="#f43f5e" className="animate-ping opacity-45" />
          <circle cx={props.cx} cy={props.cy} r={5} fill="#f43f5e" stroke="#111" strokeWidth={1.5} />
        </g>
      );
    }
    if (props.payload?.isRecord) {
      return (
        <g>
          <circle cx={props.cx} cy={props.cy} r={8} fill="#f59e0b" className="animate-pulse opacity-60" />
          <circle cx={props.cx} cy={props.cy} r={5} fill="#f59e0b" stroke="#111" strokeWidth={1.5} />
        </g>
      );
    }
    return <circle cx={props.cx} cy={props.cy} r={3} fill="#10b981" stroke="#111" strokeWidth={1} />;
  };

  return (
    <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-4 sm:p-6 space-y-4" id="performance-charts-panel">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-base font-bold text-white flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-emerald-400" /> Histórico
        </h3>
        <div className="flex overflow-x-auto gap-1 p-1 bg-neutral-950 border border-neutral-800 rounded-xl" id="game-selector-tabs">
          {games.map(game => (
            <button
              key={game}
              onClick={() => setSelectedGame(game)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                selectedGame === game
                  ? 'bg-neutral-800 text-white border border-neutral-700'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {game}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-4 text-[10px] text-neutral-500">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />Tu tiempo</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-400 shrink-0" />Media 7 días</span>
      </div>

      <div className="h-64 sm:h-80 w-full" id="recharts-wrapper">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
            <XAxis
              dataKey="fecha"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              name="Media 7d"
              type="monotone"
              dataKey="mediaSemana"
              stroke="#818cf8"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              name="Tu tiempo"
              type="monotone"
              dataKey="yo"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={<CustomDot />}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
