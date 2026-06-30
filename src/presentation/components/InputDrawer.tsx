import React, { useState, useEffect, useRef } from 'react';
import { X, Clock, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { GameType, RawRun } from '../../domain/types';
import { parseLinkedInShareText } from '../utils/parseLinkedInShareText';

interface InputDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRun: (run: Omit<RawRun, 'id' | 'ahorro' | 'contexto'>) => void;
  lastCommunityAverages: Record<GameType, number>;
}

const lastActiveTab = { current: 'paste' as 'paste' | 'manual' };

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

  // LinkedIn paste states
  const [activeEntryTab, setActiveEntryTab] = useState<'paste' | 'manual'>(lastActiveTab.current);
  const [pastedText, setPastedText] = useState('');

  // Validation error
  const [validationError, setValidationError] = useState('');

  // Refs for focus management
  const pasteTextareaRef = useRef<HTMLTextAreaElement>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const drawerTitleId = 'input-drawer-title';

  // Reset date and values on open
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setFecha(new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
      setYo('');
      const prefillVal = lastCommunityAverages[game];
      if (game === 'Chess') {
        setMedia(prefillVal && prefillVal !== 0 ? prefillVal.toString() : '');
      } else {
        setMedia(prefillVal?.toString() || '');
      }
      setPastedText('');
      setValidationError('');
    }
  }, [isOpen]);

  // Focus first input when drawer opens and tab changes
  useEffect(() => {
    if (!isOpen) return;
    const raf = requestAnimationFrame(() => {
      if (game === 'Chess') return;
      if (activeEntryTab === 'paste') {
        pasteTextareaRef.current?.focus();
      } else {
        manualInputRef.current?.focus();
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [isOpen, activeEntryTab, game]);

  // Real-time parsing effect (paste tab only)
  useEffect(() => {
    if (game === 'Chess' || activeEntryTab !== 'paste') return;
    if (!pastedText.trim()) return;

    const parsed = parseLinkedInShareText(pastedText, lastCommunityAverages);
    if (parsed) {
      setGame(parsed.juego);
      setYo(parsed.yo.toString());
      setMedia(parsed.media.toString());
      setValidationError('');
    }
  }, [pastedText, lastCommunityAverages, activeEntryTab, game]);

  // Escape key handler for accessibility
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (activeEntryTab === 'paste' && game !== 'Chess') {
      if (!pastedText.trim()) {
        setValidationError('Pega el texto de LinkedIn o cambia a modo Manual para introducir los datos.');
        return;
      }
      if (!parseLinkedInShareText(pastedText, lastCommunityAverages)) {
        setValidationError('No se pudo reconocer el formato. Cambia a modo Manual o verifica que el texto incluya el juego y el tiempo.');
        return;
      }
    }

    const scoreVal = parseFloat(yo);
    if (isNaN(scoreVal) || scoreVal <= 0) {
      setValidationError('Introduce un valor numérico válido para el tiempo o ELO.');
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

  const parsedResult = game !== 'Chess' && activeEntryTab === 'paste' ? parseLinkedInShareText(pastedText, lastCommunityAverages) : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="input-drawer-root"
          className="fixed inset-0 z-50 overflow-hidden flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby={drawerTitleId}
        >
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
            className="relative w-full max-w-[100vw] sm:max-w-[380px] md:max-w-[420px] bg-[#121212] border-l border-neutral-800 p-6 shadow-2xl flex flex-col h-full z-10"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <div className="flex justify-between items-center mb-6 border-b border-neutral-800 pb-4">
              <h2 id={drawerTitleId} className="font-display text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <span>Registrar Partida</span>
              </h2>
              <button onClick={onClose} className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-800 hover:text-white transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 flex-grow overflow-y-auto pr-1 text-sm">
              {/* Game Selector */}
              <div className="space-y-2">
                <label className="block text-neutral-400 font-semibold uppercase tracking-wider text-xs">Juego</label>
                <div className="flex flex-wrap gap-1.5">
                  {games.map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        setGame(g);
                        setYo('');
                        const prefillVal = lastCommunityAverages[g];
                        if (g === 'Chess') {
                          setMedia(prefillVal && prefillVal !== 0 ? prefillVal.toString() : '');
                        } else {
                          setMedia(prefillVal?.toString() || '');
                        }
                        setPastedText('');
                        setValidationError('');
                      }}
                      className={`min-h-[44px] px-4 py-2 rounded-full border transition-all cursor-pointer font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${
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
                <label className="block text-neutral-400 font-semibold uppercase tracking-wider text-xs">Fecha y Hora</label>
                <input
                  type="datetime-local"
                  value={fecha}
                  onChange={e => setFecha(e.target.value)}
                  className="w-full px-3.5 py-3 border border-neutral-800 rounded-xl bg-[#1a1a1a] text-neutral-200 focus:border-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600 font-sans min-h-[48px]"
                  required
                />
              </div>

              {/* LinkedIn Fields */}
              {game !== 'Chess' ? (
                <>
                  {/* Tab Selector */}
                  <div className="flex bg-[#1a1a1a] p-1 rounded-xl border border-neutral-800">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveEntryTab('paste');
                        lastActiveTab.current = 'paste';
                        setValidationError('');
                      }}
                      className={`flex-1 py-2.5 text-center rounded-lg font-semibold transition-all cursor-pointer text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500/50 ${
                        activeEntryTab === 'paste'
                          ? 'bg-neutral-800 text-white shadow-sm'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      Pegar texto
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveEntryTab('manual');
                        lastActiveTab.current = 'manual';
                        setValidationError('');
                      }}
                      className={`flex-1 py-2.5 text-center rounded-lg font-semibold transition-all cursor-pointer text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500/50 ${
                        activeEntryTab === 'manual'
                          ? 'bg-neutral-800 text-white shadow-sm'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      Manual
                    </button>
                  </div>

                  {activeEntryTab === 'paste' ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="block text-neutral-400 font-semibold uppercase tracking-wider text-xs">
                          Pegar texto de LinkedIn
                        </label>
                        <textarea
                          ref={pasteTextareaRef}
                          value={pastedText}
                          onChange={e => setPastedText(e.target.value)}
                          rows={4}
                          className="w-full px-3.5 py-3 border border-neutral-800 rounded-xl bg-[#1a1a1a] text-neutral-200 focus:border-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600 font-sans min-h-[48px]"
                          placeholder="Pega el texto compartido de LinkedIn aquí..."
                        />
                      </div>
                      {parsedResult && (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center gap-2 font-medium text-sm">
                          <Sparkles className="w-4 h-4 shrink-0 text-emerald-400" />
                          <span>
                            Detectado: <strong className="text-white">{parsedResult.juego}</strong> —{' '}
                            Tiempo: <strong className="text-white">{parsedResult.yo}s</strong>{' '}
                            {parsedResult.media > 0 && (
                              <>— Media: <strong className="text-white">{parsedResult.media}s</strong></>
                            )}
                          </span>
                        </div>
                      )}
                      {pastedText.trim() && !parsedResult && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl flex items-center gap-2 font-medium text-sm">
                          <span>No se pudo detectar el juego automáticamente. Prueba el modo Manual o verifica el formato del texto.</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-neutral-400 font-semibold uppercase tracking-wider text-xs flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-neutral-500" />
                          Tiempo (segundos)
                        </label>
                        <input
                          ref={manualInputRef}
                          type="number"
                          inputMode="numeric"
                          value={yo}
                          onChange={e => setYo(e.target.value)}
                          className="w-full px-3.5 py-3 border border-neutral-800 rounded-xl bg-[#1a1a1a] text-neutral-200 focus:border-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600 font-mono min-h-[48px]"
                          placeholder="ej. 85"
                          min="1"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-neutral-400 font-semibold uppercase tracking-wider text-xs">Media Comunidad</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={media}
                          onChange={e => setMedia(e.target.value)}
                          className="w-full px-3.5 py-3 border border-neutral-800 rounded-xl bg-[#1a1a1a] text-neutral-200 focus:border-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600 font-mono min-h-[48px]"
                          placeholder="ej. 110"
                          min="0"
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                // Chess Fields
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-neutral-400 font-semibold uppercase tracking-wider text-xs">Nuevo ELO</label>
                      <input
                        ref={manualInputRef}
                        type="number"
                        inputMode="numeric"
                        value={yo}
                        onChange={e => setYo(e.target.value)}
                        className="w-full px-3.5 py-3 border border-neutral-800 rounded-xl bg-[#1a1a1a] text-neutral-200 focus:border-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600 font-mono min-h-[48px]"
                        placeholder="ej. 1450"
                        min="1"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-neutral-400 font-semibold uppercase tracking-wider text-xs">Rating Objetivo</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={media}
                        onChange={e => setMedia(e.target.value)}
                        className="w-full px-3.5 py-3 border border-neutral-800 rounded-xl bg-[#1a1a1a] text-neutral-200 focus:border-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600 font-mono min-h-[48px]"
                        placeholder="ej. 1600"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-neutral-400 font-semibold uppercase tracking-wider text-xs">Color de Piezas</label>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setColor('B')}
                          className={`flex-1 py-3 rounded-xl border transition-all cursor-pointer font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500/50 ${
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
                          className={`flex-1 py-3 rounded-xl border transition-all cursor-pointer font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500/50 ${
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
                      <label className="block text-neutral-400 font-semibold uppercase tracking-wider text-xs">Resultado</label>
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
                              className={`flex-1 py-3 rounded-xl border transition-all text-xs font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500/50 min-h-[44px] ${
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
                <label className="block text-neutral-400 font-semibold uppercase tracking-wider text-xs">Notas (opcional)</label>
                <textarea
                  value={nota}
                  onChange={e => setNota(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-3 border border-neutral-800 rounded-xl bg-[#1a1a1a] text-neutral-200 focus:border-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-600 font-sans min-h-[48px]"
                  placeholder="ej. partida rápida antes de desayunar"
                />
              </div>

              {/* Validation Error */}
              {validationError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl flex items-center gap-2 font-medium text-sm" role="alert">
                  <span>{validationError}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4 border-t border-neutral-800 flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 border border-neutral-800 rounded-xl text-neutral-400 hover:bg-neutral-900 hover:text-white transition-all cursor-pointer font-bold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`flex-1 py-3 rounded-xl font-bold text-black transition-all cursor-pointer text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212] ${
                    game === 'Chess' ? 'bg-rose-400 hover:bg-rose-300 focus-visible:ring-rose-400' : 'bg-emerald-400 hover:bg-emerald-300 focus-visible:ring-emerald-400'
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
