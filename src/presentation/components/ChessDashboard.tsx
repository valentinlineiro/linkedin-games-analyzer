import React, { useMemo } from 'react';
import { RawRun } from '../../domain/types';
import { calculateChessStats } from '../../domain/metrics';
import { Calendar, Trash2 } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface ChessDashboardProps {
  runs: RawRun[];
  onDeleteRun: (id: string) => void;
}

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  const fill = payload.resultado === 'V' ? '#10b981' : payload.resultado === 'D' ? '#f43f5e' : '#6b7280';
  return <circle cx={cx} cy={cy} r={4} fill={fill} stroke="#111" strokeWidth={1.5} />;
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const resultLabel = d.resultado === 'V' ? 'Victoria' : d.resultado === 'T' ? 'Tablas' : d.resultado === 'D' ? 'Derrota' : '—';
  const colorLabel = d.color === 'B' ? 'Blancas' : d.color === 'N' ? 'Negras' : '—';
  return (
    <div className="bg-[#151515] border border-neutral-800 text-neutral-200 p-3 rounded-xl shadow-xl text-xs space-y-1">
      <div className="flex items-center gap-1 text-neutral-500 mb-1">
        <Calendar className="w-3 h-3" /> <span className="font-mono">{d.fullDate}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-neutral-400">ELO</span>
        <strong className="font-mono text-white">{d.elo}</strong>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-neutral-400">Color</span>
        <span className="font-mono">{colorLabel}</span>
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-neutral-400">Resultado</span>
        <span className={`font-semibold font-mono ${d.resultado === 'V' ? 'text-emerald-400' : d.resultado === 'D' ? 'text-rose-400' : 'text-neutral-400'}`}>
          {resultLabel}
        </span>
      </div>
    </div>
  );
};

export default function ChessDashboard({ runs, onDeleteRun }: ChessDashboardProps) {
  const chessRuns = useMemo(() => 
    runs.filter(r => r.juego === 'Chess')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [runs]
  );

  const stats = useMemo(() => calculateChessStats(runs), [runs]);

  if (chessRuns.length === 0 || !stats) {
    return (
      <div className="text-center py-12 border border-neutral-800 rounded-3xl bg-[#111] text-neutral-500 text-xs">
        Registra tu primera partida de ajedrez para ver estadísticas.
      </div>
    );
  }

  const chartData = chessRuns.map(r => ({
    fecha: new Date(r.timestamp).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
    elo: r.yo,
    resultado: r.resultado,
    color: r.color,
    fullDate: new Date(r.timestamp).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
  }));

  return (
    <div className="space-y-6 text-xs">
      {/* KPI Panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#111] border border-neutral-800 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">ELO Actual</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-xl font-bold text-white font-mono">{stats.latest}</span>
            {stats.delta !== null && (
              <span className={`text-[10px] font-bold font-mono ${stats.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {stats.delta >= 0 ? `+${stats.delta}` : stats.delta}
              </span>
            )}
          </div>
        </div>
        <div className="bg-[#111] border border-neutral-800 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">ELO Máximo</span>
          <div className="text-xl font-bold text-white font-mono mt-2">{stats.max}</div>
        </div>
        <div className="bg-[#111] border border-neutral-800 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">ELO Promedio</span>
          <div className="text-xl font-bold text-white font-mono mt-2">{stats.avg}</div>
        </div>
        <div className="bg-[#111] border border-neutral-800 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-wider">Partidas (V/T/D)</span>
          <div className="text-sm font-semibold text-neutral-300 font-mono mt-2">
            {stats.total} <span className="text-[10px] text-neutral-500">({stats.wins}v / {stats.draws}t / {stats.losses}d)</span>
          </div>
        </div>
      </div>

      {/* Splits White/Black */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#111] border border-neutral-800 p-4 rounded-2xl flex justify-between items-center">
          <div className="space-y-1">
            <span className="font-semibold text-neutral-400 uppercase text-[9px] tracking-wider">Rendimiento Blancas</span>
            <div className="font-bold text-white text-base font-mono">
              {stats.totalAsB > 0 ? `${Math.round((stats.winsAsB / stats.totalAsB) * 100)}%` : '—'}
            </div>
          </div>
          <span className="text-neutral-600 text-[10px] font-mono">{stats.winsAsB} victorias / {stats.totalAsB} partidas</span>
        </div>
        <div className="bg-[#111] border border-neutral-800 p-4 rounded-2xl flex justify-between items-center">
          <div className="space-y-1">
            <span className="font-semibold text-neutral-400 uppercase text-[9px] tracking-wider">Rendimiento Negras</span>
            <div className="font-bold text-white text-base font-mono">
              {stats.totalAsN > 0 ? `${Math.round((stats.winsAsN / stats.totalAsN) * 100)}%` : '—'}
            </div>
          </div>
          <span className="text-neutral-600 text-[10px] font-mono">{stats.winsAsN} victorias / {stats.totalAsN} partidas</span>
        </div>
      </div>

      {/* ELO Graph */}
      <div className="bg-[#111] border border-neutral-800 rounded-3xl p-6">
        <h3 className="font-bold text-neutral-200 mb-4 uppercase tracking-wider">Historial de ELO</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
              <XAxis dataKey="fecha" stroke="#444" fontSize={10} tickLine={false} />
              <YAxis stroke="#444" domain={['dataMin - 50', 'dataMax + 50']} fontSize={10} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="elo"
                stroke="#f43f5e"
                strokeWidth={2}
                dot={<CustomDot />}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Game Log Table */}
      <div className="bg-[#111] border border-neutral-800 rounded-3xl overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-800 flex justify-between items-center">
          <h3 className="font-bold text-neutral-200 uppercase tracking-wider">Registro de Partidas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-500 font-semibold text-[10px] uppercase tracking-wider bg-neutral-950/30">
                <th className="px-6 py-3.5">Fecha</th>
                <th className="px-6 py-3.5">Color</th>
                <th className="px-6 py-3.5">Resultado</th>
                <th className="px-6 py-3.5">ELO</th>
                <th className="px-6 py-3.5">Notas</th>
                <th className="px-6 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900 font-mono text-[11px]">
              {[...chessRuns].reverse().map(run => (
                <tr key={run.id} className="hover:bg-neutral-900/30 text-neutral-300">
                  <td className="px-6 py-3.5 text-neutral-500">
                    {new Date(run.timestamp).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-3.5">
                    {run.color === 'B' ? 'Blancas' : 'Negras'}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`px-2 py-0.5 rounded-md font-bold ${
                      run.resultado === 'V' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      run.resultado === 'T' ? 'bg-neutral-800 text-neutral-400 border border-neutral-700' :
                      'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {run.resultado === 'V' ? 'Victoria' : run.resultado === 'T' ? 'Tablas' : 'Derrota'}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 font-bold text-white">
                    {run.yo}
                  </td>
                  <td className="px-6 py-3.5 max-w-xs truncate font-sans text-neutral-400" title={run.nota}>
                    {run.nota || '—'}
                  </td>
                  <td className="px-6 py-3.5 text-right font-sans">
                    <button
                      onClick={() => onDeleteRun(run.id)}
                      className="p-1.5 text-neutral-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/5 transition-all cursor-pointer inline-flex"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
