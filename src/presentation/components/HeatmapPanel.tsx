import React, { useState, useMemo, useRef } from 'react';
import { RawRun, GameType } from '../../domain/types';
import { Calendar, Info } from 'lucide-react';
import { generateCalendarGrid } from '../../domain/metrics';

// Pure, timezone-independent helper to format Date to YYYY-MM-DD
function formatDateToYYYYMMDD(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

interface HeatmapPanelProps {
  runs: RawRun[];
}

interface HoveredDayInfo {
  day: Date;
  runs: RawRun[];
  x: number;
  y: number;
}

export default function HeatmapPanel({ runs }: HeatmapPanelProps) {
  const [selectedGame, setSelectedGame] = useState<GameType | 'Todos'>('Todos');
  const [hoveredDay, setHoveredDay] = useState<HoveredDayInfo | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const runsByDate = useMemo(() => {
    const map: Record<string, RawRun[]> = {};
    runs.forEach(run => {
      try {
        if (!run.timestamp) return;
        const dateStr = run.timestamp.split('T')[0];
        if (!map[dateStr]) {
          map[dateStr] = [];
        }
        map[dateStr].push(run);
      } catch (e) {
        console.error('Failed to parse run timestamp:', run.timestamp, e);
      }
    });
    return map;
  }, [runs]);

  const weeks = useMemo(() => generateCalendarGrid(new Date(), 26), []);

  const getMonthLabel = (date: Date) => {
    const months = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ];
    return months[date.getMonth()];
  };

  // Compute cell classes based on game selection and runs for the day
  const getCellClasses = (runsForDay: RawRun[]) => {
    if (selectedGame === 'Todos') {
      const uniqueGames = new Set(runsForDay.map(r => r.juego));
      const count = uniqueGames.size;
      switch (count) {
        case 0:
          return 'bg-neutral-900 border border-neutral-800/40';
        case 1:
          return 'bg-emerald-950 border border-emerald-900/30';
        case 2:
          return 'bg-emerald-800/40 border border-emerald-700/30';
        case 3:
          return 'bg-emerald-600/70 border border-emerald-500/40';
        case 4:
          return 'bg-emerald-500 border border-emerald-400/50';
        default:
          return 'bg-neutral-900 border border-neutral-800/40';
      }
    } else {
      const run = runsForDay.find(r => r.juego === selectedGame);
      if (!run) {
        return 'bg-neutral-900 border border-neutral-800/40';
      }
      switch (run.contexto) {
        case 'Máximo':
          return 'bg-amber-500 border border-amber-400/40';
        case 'Anomalía':
          return 'bg-rose-600 border border-rose-500/40';
        case 'Cansancio':
          return 'bg-rose-500/70 border border-rose-400/30';
        case 'Exploración':
          return run.yo < run.media
            ? 'bg-emerald-500 border border-emerald-400/40'
            : 'bg-orange-600 border border-orange-500/40';
        default:
          return 'bg-neutral-900 border border-neutral-800/40';
      }
    }
  };

  const handleMouseEnter = (day: Date, dayRuns: RawRun[], event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (containerRect) {
      setHoveredDay({
        day,
        runs: dayRuns,
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top,
      });
    }
  };

  const handleMouseLeave = () => {
    setHoveredDay(null);
  };

  const tooltipStyle = useMemo(() => {
    if (!hoveredDay || !containerRef.current) return {};
    const width = 256;
    const containerWidth = containerRef.current.clientWidth;
    
    let left = hoveredDay.x;
    let transform = 'translate(-50%, -100%)';
    
    if (left < width / 2) {
      left = 8;
      transform = 'translate(0, -100%)';
    } else if (left > containerWidth - width / 2) {
      left = containerWidth - 8;
      transform = 'translate(-100%, -100%)';
    }
    
    return {
      left: `${left}px`,
      top: `${hoveredDay.y - 8}px`,
      transform,
    };
  }, [hoveredDay]);

  const capitalizedDateStr = useMemo(() => {
    if (!hoveredDay) return '';
    const formatted = hoveredDay.day.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }, [hoveredDay]);

  return (
    <div className="space-y-6" id="heatmap-panel-container">
      {/* Header and Game Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" /> Mapa de Calor de Actividad
          </h3>
          <p className="text-xs text-neutral-500">
            Frecuencia de juego y consistencia de rendimiento en las últimas 26 semanas.
          </p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto" id="heatmap-game-selector">
          <label htmlFor="game-select" className="text-xs text-neutral-400 font-medium whitespace-nowrap">Ver juego:</label>
          <select
            id="game-select"
            value={selectedGame}
            onChange={(e) => setSelectedGame(e.target.value as GameType | 'Todos')}
            className="bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs px-3 py-1.5 rounded-xl outline-none focus:border-neutral-700 cursor-pointer font-medium w-full sm:w-40 transition-colors"
          >
            <option value="Todos">Todos</option>
            <option value="Patches">Patches</option>
            <option value="Zip">Zip</option>
            <option value="Sudoku">Sudoku</option>
            <option value="Queens">Queens</option>
          </select>
        </div>
      </div>

      {/* Grid Container */}
      <div 
        ref={containerRef}
        className="relative bg-neutral-950/40 border border-neutral-900 rounded-2xl p-6 overflow-visible"
        id="heatmap-grid-wrapper"
      >
        <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-transparent">
          <div className="min-w-[500px] flex select-none">
            {/* Row Labels Column */}
            <div className="flex flex-col gap-[3px] pr-3 w-8 text-right select-none pt-6 shrink-0">
              <div className="h-[14px] flex items-center justify-end text-[10px] text-neutral-500 font-medium">Lun</div>
              <div className="h-[14px]"></div>
              <div className="h-[14px] flex items-center justify-end text-[10px] text-neutral-500 font-medium">Mié</div>
              <div className="h-[14px]"></div>
              <div className="h-[14px] flex items-center justify-end text-[10px] text-neutral-500 font-medium">Vie</div>
              <div className="h-[14px]"></div>
              <div className="h-[14px]"></div>
            </div>
            
            {/* Grid Column */}
            <div className="flex flex-col overflow-visible">
              {/* Month Labels Header Row */}
              <div className="flex gap-[3px] h-5 mb-1 relative overflow-visible">
                {weeks.map((week, wIndex) => {
                  const monday = week[0];
                  const prevMonday = wIndex > 0 ? weeks[wIndex - 1][0] : null;
                  const showLabel = !prevMonday || monday.getMonth() !== prevMonday.getMonth();
                  
                  return (
                    <div key={wIndex} className="w-[14px] text-[10px] text-neutral-500 font-medium whitespace-nowrap relative">
                      {showLabel && (
                        <span className="absolute left-0 top-0">
                          {getMonthLabel(monday)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Heatmap Cells */}
              <div className="flex gap-[3px] overflow-visible">
                {weeks.map((week, wIndex) => (
                  <div key={wIndex} className="flex flex-col gap-[3px] overflow-visible">
                    {week.map((day, dIndex) => {
                      const dateStr = formatDateToYYYYMMDD(day);
                      const runsForDay = runsByDate[dateStr] || [];
                      const cellClass = getCellClasses(runsForDay);
                      
                      return (
                        <div
                          key={dIndex}
                          onMouseEnter={(e) => handleMouseEnter(day, runsForDay, e)}
                          onMouseLeave={handleMouseLeave}
                          className={`w-[14px] h-[14px] rounded-[2px] transition-all duration-150 hover:scale-110 hover:border-neutral-400 cursor-pointer z-10 ${cellClass}`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Floating Tooltip */}
        {hoveredDay && (
          <div
            style={tooltipStyle}
            className="absolute z-50 bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 shadow-2xl pointer-events-none w-64 space-y-2 text-xs backdrop-blur-md transition-all duration-100 ease-out"
          >
            <div className="border-b border-neutral-800 pb-1.5">
              <span className="text-[10px] text-neutral-500 font-semibold block uppercase tracking-wider">Fecha</span>
              <span className="font-bold text-neutral-200">{capitalizedDateStr}</span>
            </div>
            
            {hoveredDay.runs.length === 0 ? (
              <span className="text-neutral-500 block py-1 italic">Sin partidas registradas</span>
            ) : (
              <div className="space-y-2">
                <span className="text-[10px] text-neutral-500 font-semibold block uppercase tracking-wider">
                  Partidas ({hoveredDay.runs.length})
                </span>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {hoveredDay.runs.map((run) => {
                    const isWinner = run.yo < run.media;
                    const saving = run.ahorro;
                    
                    return (
                      <div key={run.id} className="bg-neutral-900/60 border border-neutral-800/40 rounded-lg p-2 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-neutral-300">{run.juego}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                            run.contexto === 'Máximo' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25' :
                            run.contexto === 'Anomalía' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/25' :
                            run.contexto === 'Cansancio' ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20' :
                            isWinner ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' :
                            'bg-orange-500/10 text-orange-400 border border-orange-500/25'
                          }`}>
                            {run.contexto}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-1 text-[11px] font-mono py-0.5 text-neutral-400">
                          <div>Yo: <strong className="text-white">{run.yo.toFixed(1)}s</strong></div>
                          <div>Media: <strong className="text-neutral-300">{run.media.toFixed(1)}s</strong></div>
                        </div>
                        
                        <div className="flex justify-between items-center text-[10px] pt-0.5 border-t border-neutral-800/50">
                          <span className="text-neutral-500">Ahorro Neto:</span>
                          <span className={`font-mono font-bold ${saving >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {saving >= 0 ? `+${saving.toFixed(1)}s` : `${saving.toFixed(1)}s`}
                          </span>
                        </div>
                        
                        {run.nota && (
                          <div className="text-[10px] text-neutral-500 italic mt-1 pt-1 border-t border-neutral-800/20">
                            "{run.nota}"
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-950/20 border border-neutral-900 rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-neutral-500 shrink-0" />
          <span className="text-[10px] text-neutral-400 leading-relaxed">
            Consejo: Pasa el cursor sobre cualquier casilla para inspeccionar los tiempos exactos, medias de comunidad y notas guardadas.
          </span>
        </div>

        {selectedGame === 'Todos' ? (
          <div className="flex items-center gap-1.5 text-[10px] text-neutral-500" id="heatmap-legend">
            <span>Menos</span>
            <div className="w-[11px] h-[11px] rounded-[2px] bg-neutral-900 border border-neutral-800/40" title="0 juegos" />
            <div className="w-[11px] h-[11px] rounded-[2px] bg-emerald-950 border border-emerald-900/30" title="1 juego" />
            <div className="w-[11px] h-[11px] rounded-[2px] bg-emerald-800/40 border border-emerald-700/30" title="2 juegos" />
            <div className="w-[11px] h-[11px] rounded-[2px] bg-emerald-600/70 border border-emerald-500/40" title="3 juegos" />
            <div className="w-[11px] h-[11px] rounded-[2px] bg-emerald-500 border border-emerald-400/50" title="4 juegos" />
            <span>Más (0 a 4 juegos)</span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-neutral-500" id="heatmap-legend">
            <div className="flex items-center gap-1">
              <div className="w-[11px] h-[11px] rounded-[2px] bg-neutral-900 border border-neutral-800/40" />
              <span>Sin partida</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-[11px] h-[11px] rounded-[2px] bg-amber-500 border border-amber-400/40" />
              <span>Máximo</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-[11px] h-[11px] rounded-[2px] bg-rose-600 border border-rose-500/40" />
              <span>Anomalía</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-[11px] h-[11px] rounded-[2px] bg-rose-500/70 border border-rose-400/30" />
              <span>Cansancio</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-[11px] h-[11px] rounded-[2px] bg-emerald-500 border border-emerald-400/40" />
              <span>Exploración (Yo &lt; Media)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-[11px] h-[11px] rounded-[2px] bg-orange-600 border border-orange-500/40" />
              <span>Exploración (Yo &ge; Media)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
