import React, { useState, useMemo, useRef } from 'react';
import { RawRun, GameType } from '../../domain/types';
import { PlusCircle, TrendingUp, Calendar, FileUp } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface ChessViewProps {
  runs: RawRun[];
  onAddRun: (run: Omit<RawRun, 'id' | 'ahorro' | 'contexto'>) => void;
  onImportRuns: (runs: Omit<RawRun, 'id' | 'ahorro' | 'contexto'>[]) => Promise<void>;
  lastCommunityAverages: Record<GameType, number>;
}

export default function ChessView({ runs, onAddRun, onImportRuns, lastCommunityAverages }: ChessViewProps) {
  const chessRuns = useMemo(
    () => runs.filter(r => r.juego === 'Chess').sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [runs]
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) throw new Error('Archivo vacío.');

        // Find header row
        const headerIdx = lines.findIndex(l => {
          const low = l.toLowerCase();
          return low.includes('yo') || low.includes('elo') || low.includes('tiempo') || low.includes('fecha') || low.includes('date');
        });
        if (headerIdx === -1) throw new Error('No se encontró fila de encabezados.');

        const headers = lines[headerIdx].split(',').map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
        const col = (terms: string[]) => headers.findIndex(h => terms.some(t => h.includes(t)));

        const tsIdx = col(['time', 'date', 'fecha', 'marca']);
        const eloIdx = col(['yo', 'elo', 'tiempo personal', 'mine']);
        const colorIdx = col(['color']);
        const resultadoIdx = col(['resultado', 'result']);
        const mediaIdx = col(['media', 'average', 'objetivo', 'target', 'comunidad']);
        const notaIdx = col(['nota', 'note', 'comment']);

        if (eloIdx === -1) throw new Error('No se encontró columna de ELO / Tiempo Personal.');

        const parseDateStr = (s: string): string => {
          const parts = s.trim().split(/[\/\-]/);
          if (parts.length === 3) {
            const [a, b, c] = parts.map(Number);
            // DD/MM/YYYY
            const d = new Date(c < 100 ? c + 2000 : c, b - 1, a);
            if (!isNaN(d.getTime())) return d.toISOString();
          }
          const d = new Date(s);
          if (!isNaN(d.getTime())) return d.toISOString();
          throw new Error(`Fecha inválida: "${s}"`);
        };

        const imported: Omit<RawRun, 'id' | 'ahorro' | 'contexto'>[] = [];
        for (let i = headerIdx + 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
          const eloVal = parseFloat((cols[eloIdx] || '').replace(',', '.'));
          if (isNaN(eloVal) || eloVal <= 0) continue;

          // Skip rows that clearly belong to another game (if juego column present)
          const gameIdx = col(['juego', 'game']);
          if (gameIdx !== -1 && cols[gameIdx] && cols[gameIdx].toLowerCase() !== 'chess') continue;

          const colorRaw = (colorIdx !== -1 ? cols[colorIdx] : '').toUpperCase();
          const resultadoRaw = (resultadoIdx !== -1 ? cols[resultadoIdx] : '').toUpperCase();
          const mediaVal = mediaIdx !== -1 ? parseFloat((cols[mediaIdx] || '').replace(',', '.')) : NaN;
          const tsRaw = tsIdx !== -1 && cols[tsIdx] ? cols[tsIdx] : new Date().toISOString();

          const run: Omit<RawRun, 'id' | 'ahorro' | 'contexto'> = {
            timestamp: parseDateStr(tsRaw),
            juego: 'Chess',
            yo: eloVal,
            media: !isNaN(mediaVal) && mediaVal > 0 ? mediaVal : (lastCommunityAverages['Chess'] || eloVal),
            nota: notaIdx !== -1 ? (cols[notaIdx] || '') : '',
          };
          if (['B', 'N'].includes(colorRaw)) run.color = colorRaw as 'B' | 'N';
          if (['V', 'T', 'D'].includes(resultadoRaw)) run.resultado = resultadoRaw as 'V' | 'T' | 'D';
          imported.push(run);
        }

        if (imported.length === 0) throw new Error('No se encontraron partidas de Chess válidas.');

        const ok = window.confirm(`Se encontraron ${imported.length} partidas de Chess. ¿Importar?`);
        if (ok) {
          await onImportRuns(imported);
          setImportMsg({ text: `${imported.length} partidas importadas`, ok: true });
          setTimeout(() => setImportMsg(null), 4000);
        }
      } catch (err: any) {
        setImportMsg({ text: err.message || 'Error al procesar el CSV.', ok: false });
        setTimeout(() => setImportMsg(null), 6000);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Form state
  const [color, setColor] = useState<'B' | 'N' | null>(null);
  const [resultado, setResultado] = useState<'V' | 'T' | 'D' | null>(null);
  const [elo, setElo] = useState('');
  const [target, setTarget] = useState('');
  const [nota, setNota] = useState('');
  const [fecha, setFecha] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const eloVal = parseFloat(elo);
    if (isNaN(eloVal) || eloVal <= 0) { alert('ELO inválido.'); return; }
    if (!color) { alert('Selecciona el color (B/N).'); return; }
    if (!resultado) { alert('Selecciona el resultado (V/T/D).'); return; }

    const targetVal = parseFloat(target);
    const media = !isNaN(targetVal) && targetVal > 0 ? targetVal : (lastCommunityAverages['Chess'] || eloVal);

    onAddRun({
      timestamp: new Date(fecha).toISOString(),
      juego: 'Chess',
      yo: eloVal,
      media,
      nota: nota.trim() || '',
      color,
      resultado,
    });

    setColor(null);
    setResultado(null);
    setElo('');
    setNota('');
  };

  // Stats
  const stats = useMemo(() => {
    if (chessRuns.length === 0) return null;
    const elos = chessRuns.map(r => r.yo);
    const wins = chessRuns.filter(r => r.resultado === 'V').length;
    const draws = chessRuns.filter(r => r.resultado === 'T').length;
    const losses = chessRuns.filter(r => r.resultado === 'D').length;

    const asB = chessRuns.filter(r => r.color === 'B');
    const asN = chessRuns.filter(r => r.color === 'N');
    const winsAsB = asB.filter(r => r.resultado === 'V').length;
    const winsAsN = asN.filter(r => r.resultado === 'V').length;

    const latest = chessRuns[chessRuns.length - 1];
    const prev = chessRuns[chessRuns.length - 2];
    const delta = prev ? latest.yo - prev.yo : null;

    return {
      latest: latest.yo,
      max: Math.max(...elos),
      min: Math.min(...elos),
      avg: Math.round(elos.reduce((a, b) => a + b, 0) / elos.length),
      wins, draws, losses,
      total: chessRuns.length,
      winsAsB, totalAsB: asB.length,
      winsAsN, totalAsN: asN.length,
      delta,
    };
  }, [chessRuns]);

  // Chart data
  const chartData = chessRuns.map(r => ({
    fecha: new Date(r.timestamp).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
    elo: r.yo,
    resultado: r.resultado,
    color: r.color,
    fullDate: new Date(r.timestamp).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
  }));

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

  const btnBase = 'px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer';
  const btnInactive = 'bg-[#1a1a1a] border-neutral-800 text-neutral-500 hover:text-neutral-300';

  return (
    <div className="space-y-6">
      {/* Log form */}
      <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-6 space-y-5">
        <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-rose-400" /> Registrar partida de Chess
          </h3>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-neutral-800 rounded-lg text-xs text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-all cursor-pointer"
          >
            <FileUp className="w-3.5 h-3.5" /> Importar CSV
          </button>
        </div>
        {importMsg && (
          <div className={`px-3 py-2 rounded-xl border text-xs ${importMsg.ok ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-rose-500/10 border-rose-500/20 text-rose-300'}`}>
            {importMsg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="block text-neutral-400 font-semibold uppercase tracking-wider">Fecha y Hora</label>
            <input
              type="datetime-local"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full px-3.5 py-2 border border-neutral-800 rounded-xl bg-[#1a1a1a] text-neutral-200 focus:border-neutral-700 focus:outline-none font-sans"
            />
          </div>

          <div className="grid grid-cols-[auto_1fr_1fr] gap-4 items-end">
            {/* Color */}
            <div className="space-y-1.5">
              <label className="block text-neutral-400 font-semibold uppercase tracking-wider">Color</label>
              <div className="flex gap-1">
                {(['B', 'N'] as const).map(c => (
                  <button key={c} type="button"
                    onClick={() => setColor(prev => prev === c ? null : c)}
                    className={`${btnBase} ${color === c ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' : btnInactive}`}
                  >{c}</button>
                ))}
              </div>
            </div>

            {/* Result */}
            <div className="space-y-1.5">
              <label className="block text-neutral-400 font-semibold uppercase tracking-wider">Resultado</label>
              <div className="flex gap-1">
                {(['V', 'T', 'D'] as const).map(r => (
                  <button key={r} type="button"
                    onClick={() => setResultado(prev => prev === r ? null : r)}
                    className={`${btnBase} ${
                      resultado === r
                        ? r === 'V' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : r === 'T' ? 'bg-neutral-500/20 border-neutral-500/40 text-neutral-300'
                        : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                        : btnInactive
                    }`}
                  >{r}</button>
                ))}
              </div>
            </div>

            {/* ELO */}
            <div className="space-y-1.5">
              <label className="block text-neutral-400 font-semibold uppercase tracking-wider">Nuevo ELO</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="ej. 1450"
                value={elo}
                onChange={e => setElo(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-800 rounded-lg bg-[#1a1a1a] text-neutral-200 focus:border-neutral-700 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-neutral-400 font-semibold uppercase tracking-wider">Rating objetivo <span className="normal-case text-neutral-600">(opcional)</span></label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="ej. 1600"
                value={target}
                onChange={e => setTarget(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-800 rounded-lg bg-[#1a1a1a] text-neutral-200 focus:border-neutral-700 focus:outline-none font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-neutral-400 font-semibold uppercase tracking-wider">Nota <span className="normal-case text-neutral-600">(opcional)</span></label>
              <input
                type="text"
                placeholder="ej. Apertura italiana"
                value={nota}
                onChange={e => setNota(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-800 rounded-lg bg-[#1a1a1a] text-neutral-200 focus:border-neutral-700 focus:outline-none text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-rose-500 hover:bg-rose-400 text-white font-bold py-2.5 rounded-xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" /> Guardar partida
          </button>
        </form>
      </div>

      {/* Stats + Chart */}
      {stats && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Latest ELO */}
            <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-4 space-y-1 col-span-2 sm:col-span-1">
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider">ELO actual</p>
              <p className="text-2xl font-bold font-mono text-white">{stats.latest}</p>
              {stats.delta !== null && (
                <p className={`text-[11px] font-mono font-semibold ${stats.delta > 0 ? 'text-emerald-400' : stats.delta < 0 ? 'text-rose-400' : 'text-neutral-500'}`}>
                  {stats.delta > 0 ? `+${stats.delta}` : stats.delta} vs partida anterior
                </p>
              )}
            </div>

            {/* Max / Min / Avg */}
            <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-4 space-y-2">
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Máximo</p>
              <p className="text-xl font-bold font-mono text-emerald-400">{stats.max}</p>
            </div>
            <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-4 space-y-2">
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Mínimo</p>
              <p className="text-xl font-bold font-mono text-rose-400">{stats.min}</p>
            </div>
            <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-4 space-y-2">
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Media</p>
              <p className="text-xl font-bold font-mono text-neutral-300">{stats.avg}</p>
            </div>
          </div>

          {/* W/D/L + color breakdown */}
          <div className="grid grid-cols-2 gap-3">
            {/* W/D/L */}
            <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-4 space-y-3">
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Resultados ({stats.total} partidas)</p>
              <div className="flex items-center gap-3 text-sm font-bold font-mono">
                <span className="text-emerald-400">{stats.wins}V</span>
                <span className="text-neutral-500">{stats.draws}T</span>
                <span className="text-rose-400">{stats.losses}D</span>
              </div>
              {/* Bar */}
              <div className="flex h-2 rounded-full overflow-hidden gap-px">
                {stats.wins > 0 && <div className="bg-emerald-500" style={{ flex: stats.wins }} />}
                {stats.draws > 0 && <div className="bg-neutral-600" style={{ flex: stats.draws }} />}
                {stats.losses > 0 && <div className="bg-rose-500" style={{ flex: stats.losses }} />}
              </div>
              <p className="text-[10px] text-neutral-500">
                {Math.round((stats.wins / stats.total) * 100)}% victorias · {Math.round((stats.draws / stats.total) * 100)}% tablas
              </p>
            </div>

            {/* Color win rate */}
            <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-4 space-y-3">
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Por color</p>
              {stats.totalAsB > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400">Blancas</span>
                    <span className="font-mono font-semibold text-white">
                      {stats.winsAsB}/{stats.totalAsB} · {Math.round((stats.winsAsB / stats.totalAsB) * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-neutral-300 rounded-full" style={{ width: `${(stats.winsAsB / stats.totalAsB) * 100}%` }} />
                  </div>
                </div>
              )}
              {stats.totalAsN > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-400">Negras</span>
                    <span className="font-mono font-semibold text-white">
                      {stats.winsAsN}/{stats.totalAsN} · {Math.round((stats.winsAsN / stats.totalAsN) * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                    <div className="h-full bg-neutral-700 rounded-full" style={{ width: `${(stats.winsAsN / stats.totalAsN) * 100}%` }} />
                  </div>
                </div>
              )}
              {stats.totalAsB === 0 && stats.totalAsN === 0 && (
                <p className="text-xs text-neutral-600">Sin datos de color aún</p>
              )}
            </div>
          </div>

          {/* ELO chart */}
          {chessRuns.length >= 2 && (
            <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-4 sm:p-6 space-y-4">
              <h3 className="font-display text-base font-bold text-white flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-rose-400" /> Progresión ELO
              </h3>
              <div className="h-56 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
                    <XAxis dataKey="fecha" tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fill: '#6b7280', fontSize: 10, fontFamily: 'monospace' }} domain={['auto', 'auto']} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="elo" stroke="#f43f5e" strokeWidth={2} dot={<CustomDot />} activeDot={{ r: 6, strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-4 text-[10px] text-neutral-500">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />Victoria</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-neutral-600 shrink-0" />Tablas</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />Derrota</span>
              </div>
            </div>
          )}
        </>
      )}

      {!stats && (
        <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-8 text-center space-y-2">
          <p className="text-neutral-400 text-sm">Sin partidas de Chess registradas</p>
          <p className="text-neutral-600 text-xs">Registra tu primera partida arriba para ver estadísticas.</p>
        </div>
      )}
    </div>
  );
}
