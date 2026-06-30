import React, { useState, useEffect } from 'react';
import { X, Clock, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { GameType, RawRun } from '../../domain/types';

interface InputDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRun: (run: Omit<RawRun, 'id' | 'ahorro' | 'contexto'>) => void;
  lastCommunityAverages: Record<GameType, number>;
}

export default function InputDrawer({
  isOpen,
  onClose,
  onAddRun,
  lastCommunityAverages,
}: InputDrawerProps) {
  const [game, setGame] = useState<GameType>('Sudoku');
  const [fecha, setFecha] = useState('');
  const [yo, setYo] = useState('');
  const [media, setMedia] = useState('');
  const [nota, setNota] = useState('');
  
  // Chess special states
  const [color, setColor] = useState<'B' | 'N'>('B');
  const [resultado, setResultado] = useState<'V' | 'T' | 'D'>('V');

  // Reset date to current local time on open
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setFecha(new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
      setYo('');
      // Autofill community average from lastCommunityAverages
      const prefillVal = lastCommunityAverages[game];
      if (game === 'Chess') {
        setMedia(prefillVal && prefillVal !== 0 ? prefillVal.toString() : '');
      } else {
        setMedia(prefillVal?.toString() || '');
      }
    }
  }, [isOpen, game, lastCommunityAverages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const scoreVal = parseFloat(yo);
    if (isNaN(scoreVal) || scoreVal <= 0) {
      alert('Por favor introduce un valor numérico válido.');
      return;
    }

    const mediaVal = parseFloat(media) || lastCommunityAverages[game] || scoreVal;

    const baseRun: Omit<RawRun, 'id' | 'ahorro' | 'contexto'> = {
      timestamp: new Date(fecha).toISOString(),
      juego: game,
      yo: scoreVal,
      media: mediaVal,
      nota: nota.trim() || undefined,
    };

    if (game === 'Chess') {
      baseRun.color = color;
      baseRun.resultado = resultado;
    }

    onAddRun(baseRun);
    onClose();
  };

  const games: GameType[] = ['Sudoku', 'Queens', 'Patches', 'Zip', 'Chess'];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div key="input-drawer-root" className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <motion.div 
            className="absolute inset-0 bg-black/60" 
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          
          {/* Drawer Pane */}
          <motion.div 
            className="relative w-full max-w-[420px] bg-[#121212] border-l border-neutral-800 p-6 shadow-2xl flex flex-col h-full z-10"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
        <div className="flex justify-between items-center mb-6 border-b border-neutral-800 pb-4">
          <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <span>Registrar Partida</span>
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg text-neutral-500 hover:bg-neutral-800 hover:text-white transition-all cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 flex-grow overflow-y-auto pr-1 text-xs">
          {/* Game Selector */}
          <div className="space-y-2">
            <label className="block text-neutral-400 font-semibold uppercase tracking-wider">Juego</label>
            <div className="flex flex-wrap gap-1.5">
              {games.map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGame(g)}
                  className={`px-3 py-1.5 rounded-full border transition-all cursor-pointer font-semibold ${
                    game === g
                      ? g === 'Chess' 
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' 
                        : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-[#1a1a1a] border-neutral-800 text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Date Input */}
          <div className="space-y-2">
            <label className="block text-neutral-400 font-semibold uppercase tracking-wider">Fecha y Hora</label>
            <input
              type="datetime-local"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-neutral-800 rounded-xl bg-[#1a1a1a] text-neutral-200 focus:border-neutral-700 focus:outline-none font-sans"
              required
            />
          </div>

          {/* LinkedIn Fields */}
          {game !== 'Chess' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-neutral-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-neutral-500" />
                    Tiempo (segundos)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={yo}
                    onChange={e => setYo(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-neutral-800 rounded-xl bg-[#1a1a1a] text-neutral-200 focus:border-neutral-700 focus:outline-none font-mono"
                    placeholder="ej. 85"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-neutral-400 font-semibold uppercase tracking-wider">Media Comunidad</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={media}
                    onChange={e => setMedia(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-neutral-800 rounded-xl bg-[#1a1a1a] text-neutral-200 focus:border-neutral-700 focus:outline-none font-mono"
                    placeholder="ej. 110"
                  />
                </div>
              </div>
            </>
          ) : (
            // Chess Fields
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-neutral-400 font-semibold uppercase tracking-wider">Nuevo ELO</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={yo}
                    onChange={e => setYo(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-neutral-800 rounded-xl bg-[#1a1a1a] text-neutral-200 focus:border-neutral-700 focus:outline-none font-mono"
                    placeholder="ej. 1450"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-neutral-400 font-semibold uppercase tracking-wider">Rating Objetivo</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={media}
                    onChange={e => setMedia(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-neutral-800 rounded-xl bg-[#1a1a1a] text-neutral-200 focus:border-neutral-700 focus:outline-none font-mono"
                    placeholder="ej. 1600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-neutral-400 font-semibold uppercase tracking-wider">Color de Piezas</label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setColor('B')}
                      className={`flex-1 py-2 rounded-xl border transition-all cursor-pointer font-semibold ${
                        color === 'B'
                          ? 'bg-white text-black border-white'
                          : 'bg-[#1a1a1a] border-neutral-800 text-neutral-500 hover:text-neutral-300'
                      }`}
                    >
                      Blancas
                    </button>
                    <button
                      type="button"
                      onClick={() => setColor('N')}
                      className={`flex-1 py-2 rounded-xl border transition-all cursor-pointer font-semibold ${
                        color === 'N'
                          ? 'bg-neutral-800 text-white border-neutral-700'
                          : 'bg-[#1a1a1a] border-neutral-800 text-neutral-500 hover:text-neutral-300'
                      }`}
                    >
                      Negras
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-neutral-400 font-semibold uppercase tracking-wider">Resultado</label>
                  <div className="flex gap-1">
                    {(['V', 'T', 'D'] as const).map(res => {
                      const labels = { V: 'Victoria', T: 'Tablas', D: 'Derrota' };
                      const styles = {
                        V: resultado === 'V' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : '',
                        T: resultado === 'T' ? 'bg-neutral-500/20 border-neutral-500/40 text-neutral-300' : '',
                        D: resultado === 'D' ? 'bg-rose-500/20 border-rose-500/40 text-rose-300' : '',
                      };
                      return (
                        <button
                          key={res}
                          type="button"
                          onClick={() => setResultado(res)}
                          className={`flex-1 py-2 rounded-xl border transition-all text-[10px] font-bold cursor-pointer ${
                            resultado === res
                              ? styles[res]
                              : 'bg-[#1a1a1a] border-neutral-800 text-neutral-500 hover:text-neutral-300'
                          }`}
                        >
                          {labels[res]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <label className="block text-neutral-400 font-semibold uppercase tracking-wider">Notas (opcional)</label>
            <textarea
              value={nota}
              onChange={e => setNota(e.target.value)}
              rows={3}
              className="w-full px-3.5 py-2.5 border border-neutral-800 rounded-xl bg-[#1a1a1a] text-neutral-200 focus:border-neutral-700 focus:outline-none font-sans"
              placeholder="ej. partida rápida antes de desayunar"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-neutral-800 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-neutral-800 rounded-xl text-neutral-400 hover:bg-neutral-900 hover:text-white transition-all cursor-pointer font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={`flex-1 py-2.5 rounded-xl font-bold text-black transition-all cursor-pointer ${
                game === 'Chess' ? 'bg-rose-400 hover:bg-rose-300' : 'bg-emerald-400 hover:bg-emerald-300'
              }`}
            >
              Guardar Partida
            </button>
          </div>
        </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
