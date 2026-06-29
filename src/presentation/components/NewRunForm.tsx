import React, { useState, useEffect } from 'react';
import { GameType, RawRun, GAME_CONFIGS } from '../../domain/types';
import { PlusCircle, Sparkles, AlertTriangle, ShieldCheck, Clipboard, Keyboard, Check } from 'lucide-react';

interface NewRunFormProps {
  onAddRun: (run: Omit<RawRun, 'id' | 'ahorro' | 'contexto'>) => void;
  onAddRuns: (runs: Omit<RawRun, 'id' | 'ahorro' | 'contexto'>[]) => Promise<void>;
  recordTimes: Record<GameType, number>;
  lastCommunityAverages: Record<GameType, number>;
}

// Parser helper to extract game type and time (MM:SS or SS) from LinkedIn timer copy
function parseLinkedInShareText(text: string, lastCommunityAverages: Record<GameType, number>): { juego: GameType; yo: number; media: number } | null {
  const normalized = text.toLowerCase();
  
  // 1. Detect game type
  let juego: GameType | null = null;
  if (normalized.includes('queens') || normalized.includes('reinas')) juego = 'Queens';
  else if (normalized.includes('sudoku')) juego = 'Sudoku';
  else if (normalized.includes('patches') || normalized.includes('mosaico') || normalized.includes('crossclimb') || normalized.includes('caminos')) juego = 'Patches';
  else if (normalized.includes('zip') || normalized.includes('pinpoint') || normalized.includes('enlace')) juego = 'Zip';
  
  if (!juego) return null;

  // 2. Parse times
  let yo: number | null = null;
  let media: number | null = null;

  // Pattern A: colon format (e.g. 0:22 or 1:45)
  const colonMatch = normalized.match(/\b(\d+):(\d+)\b/);
  if (colonMatch) {
    const mins = parseInt(colonMatch[1], 10);
    const secs = parseInt(colonMatch[2], 10);
    yo = mins * 60 + secs;
  }

  // Pattern B: stopwatch icon
  // ⏱️ 42s
  // ⏱️ 1m 45s
  if (yo === null) {
    const yoMatch = normalized.match(/⏱️\s*(?:(\d+)\s*m\s*)?(\d+)\s*s/);
    if (yoMatch) {
      const mins = parseInt(yoMatch[1] || '0', 10);
      const secs = parseInt(yoMatch[2], 10);
      yo = mins * 60 + secs;
    }
  }

  // Pattern C: community average line
  const mediaMatch = normalized.match(/(?:community average|media de la comunidad|media)\s*\(?(?:(\d+)\s*m\s*)?(\d+)\s*s\)?/);
  if (mediaMatch) {
    const mins = parseInt(mediaMatch[1] || '0', 10);
    const secs = parseInt(mediaMatch[2], 10);
    media = mins * 60 + secs;
  }

  // Pattern D: general number of seconds fallback
  if (yo === null) {
    const timesFound: number[] = [];
    const numberSecsRegex = /(?:(\d+)\s*m\s*)?(\d+)\s*(?:seconds|segundos|s)\b/g;
    let match;
    while ((match = numberSecsRegex.exec(normalized)) !== null) {
      const mins = parseInt(match[1] || '0', 10);
      const secs = parseInt(match[2], 10);
      timesFound.push(mins * 60 + secs);
    }
    
    if (timesFound.length >= 1) yo = timesFound[0];
    if (timesFound.length >= 2 && media === null) media = timesFound[1];
  }

  if (yo === null) return null;

  if (media === null) {
    media = lastCommunityAverages[juego];
  }

  return { juego, yo, media };
}

export default function NewRunForm({ onAddRun, onAddRuns, recordTimes, lastCommunityAverages }: NewRunFormProps) {
  const [activeTab, setActiveTab] = useState<'pasted' | 'manual'>('pasted');
  const [pastedText, setPastedText] = useState('');
  
  // Parsed states from copy
  const [parsedGame, setParsedGame] = useState<GameType | null>(null);
  const [parsedYo, setParsedYo] = useState<number | null>(null);
  const [pastedMedia, setPastedMedia] = useState('');

  // Manual states (LinkedIn games only — Chess has its own tab)
  const [manualTimes, setManualTimes] = useState({ Patches: '', Zip: '', Sudoku: '', Queens: '' });
  const [manualMedias, setManualMedias] = useState({ Patches: '', Zip: '', Sudoku: '', Queens: '' });
  const [nota, setNota] = useState('');
  const [fecha, setFecha] = useState(() => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now.getTime() - tzOffset)).toISOString().slice(0, 16);
    return localISOTime;
  });

  const [notification, setNotification] = useState<{
    text: string;
    type: 'success' | 'warning' | 'info';
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);



  // Monitor text paste to extract values in real-time
  useEffect(() => {
    if (!pastedText.trim()) {
      setParsedGame(null);
      setParsedYo(null);
      setPastedMedia('');
      return;
    }

    const parsed = parseLinkedInShareText(pastedText, lastCommunityAverages);
    if (parsed) {
      setParsedGame(parsed.juego);
      setParsedYo(parsed.yo);
      setPastedMedia(parsed.media.toString());
    } else {
      setParsedGame(null);
      setParsedYo(null);
      setPastedMedia('');
    }
  }, [pastedText, lastCommunityAverages]);

  const triggerToast = (playerTime: number, communityAverage: number, selectedGame: GameType) => {
    let toastType: 'success' | 'warning' | 'info' = 'success';
    let toastText = `Partida de ${selectedGame} registrada.`;

    const currentRecord = recordTimes[selectedGame];
    if (playerTime <= currentRecord && currentRecord > 0) {
      toastType = 'info';
      toastText = `🏆 ¡Nuevo récord en ${selectedGame}! (${playerTime}s)`;
    } else if (playerTime > communityAverage * 1.3) {
      toastType = 'warning';
      toastText = `⚠️ Rendimiento atenuado en ${selectedGame} (${playerTime}s). Clasificado como Anomalía.`;
    }

    setNotification({ text: toastText, type: toastType });
    setTimeout(() => {
      setNotification(null);
    }, 6000);
  };

  // Direct Submission from LinkedIn Share Text
  const handlePastedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedGame || parsedYo === null) return;

    const finalMedia = parseFloat(pastedMedia.replace(',', '.'));
    if (isNaN(finalMedia) || finalMedia <= 0) {
      setFormError('Introduce una media de comunidad válida.');
      return;
    }
    setFormError(null);

    onAddRun({
      timestamp: new Date().toISOString(),
      juego: parsedGame,
      yo: parsedYo,
      media: finalMedia,
      nota: 'Pegado desde LinkedIn'
    });

    triggerToast(parsedYo, finalMedia, parsedGame);
    
    // Reset states
    setPastedText('');
    setParsedGame(null);
    setParsedYo(null);
    setPastedMedia('');
  };

  // Manual Submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const games: GameType[] = ['Patches', 'Zip', 'Sudoku', 'Queens'];
    const parsedRuns: { game: GameType; yo: number; media: number }[] = [];

    for (const g of games) {
      const timeStr = manualTimes[g as keyof typeof manualTimes].trim();
      if (!timeStr) continue;

      const playerTime = parseFloat(timeStr.replace(',', '.'));
      const communityAverage = parseFloat(manualMedias[g as keyof typeof manualMedias].replace(',', '.'));

      if (isNaN(playerTime) || playerTime <= 0) {
        setFormError(`Tiempo inválido para ${g}.`);
        return;
      }
      if (isNaN(communityAverage) || communityAverage <= 0) {
        setFormError(`Media de comunidad inválida para ${g}.`);
        return;
      }

      parsedRuns.push({ game: g, yo: playerTime, media: communityAverage });
    }

    if (parsedRuns.length === 0) {
      setFormError('Introduce al menos un tiempo.');
      return;
    }
    setFormError(null);

    try {
      const ts = new Date(fecha).toISOString();
      const n = nota.trim() || '';
      const runsToAdd: Omit<RawRun, 'id' | 'ahorro' | 'contexto'>[] = parsedRuns.map(r => ({
        timestamp: ts, juego: r.game, yo: r.yo, media: r.media, nota: n,
      }));

      await onAddRuns(runsToAdd);

      // Trigger consolidated toast notification
      let toastType: 'success' | 'warning' | 'info' = 'success';
      let toastText = `${parsedRuns.length} partida${parsedRuns.length > 1 ? 's' : ''} registrada${parsedRuns.length > 1 ? 's' : ''}.`;

      const brokenRecords: string[] = [];
      const anomalies: string[] = [];

      parsedRuns.forEach((r) => {
        const currentRecord = recordTimes[r.game];
        if (r.yo <= currentRecord && currentRecord > 0) {
          brokenRecords.push(`${r.game} (${r.yo}s)`);
        } else if (r.yo > r.media * 1.3) {
          anomalies.push(r.game);
        }
      });

      if (brokenRecords.length > 0 && anomalies.length > 0) {
        toastType = 'info';
        toastText = `🏆 Nuevo récord en: ${brokenRecords.join(', ')}. ⚠️ Anomalía en: ${anomalies.join(', ')}.`;
      } else if (brokenRecords.length > 0) {
        toastType = 'info';
        toastText = `🏆 ¡Nuevo récord en: ${brokenRecords.join(', ')}!`;
      } else if (anomalies.length > 0) {
        toastType = 'warning';
        toastText = `⚠️ Rendimiento atenuado en: ${anomalies.join(', ')}.`;
      }

      setNotification({ text: toastText, type: toastType });
      setTimeout(() => {
        setNotification(null);
      }, 6000);

      setManualTimes({ Patches: '', Zip: '', Sudoku: '', Queens: '' });
      setManualMedias({ Patches: '', Zip: '', Sudoku: '', Queens: '' });
      setNota('');
    } catch (err: any) {
      setFormError(`Error al registrar las partidas: ${err.message}`);
    }
  };

  return (
    <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-6 space-y-6" id="new-run-form-panel">
      <h3 className="font-display text-base font-bold text-white flex items-center gap-2">
        <PlusCircle className="w-4 h-4 text-emerald-400" /> Registrar partida
      </h3>

      {/* Tabs */}
      <div className="flex bg-[#1a1a1a] p-1 rounded-xl border border-neutral-800 text-xs">
        <button
          onClick={() => setActiveTab('pasted')}
          className={`flex-1 py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'pasted' 
              ? 'bg-neutral-800 text-white shadow-sm' 
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Clipboard className="w-3.5 h-3.5" /> Pegar Compartido
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex-1 py-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'manual' 
              ? 'bg-neutral-800 text-white shadow-sm' 
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Keyboard className="w-3.5 h-3.5" /> Entrada Manual
        </button>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div 
          className={`p-4 rounded-xl border text-xs flex gap-2 items-start animate-fade-in ${
            notification.type === 'warning' 
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' 
              : notification.type === 'info'
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
          }`}
          id="toast-notification"
        >
          {notification.type === 'warning' && <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
          {notification.type === 'info' && <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
          {notification.type === 'success' && <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
          <div>{notification.text}</div>
        </div>
      )}

      {/* Tab content 1: Direct Clipboard Submit */}
      {activeTab === 'pasted' && (
        <form onSubmit={handlePastedSubmit} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="block text-neutral-400 font-semibold uppercase tracking-wider">Copiar y Pegar</label>
            <textarea
              rows={3}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Pega el resultado aquí...&#10;&#10;Ej: Patches #100 | 0:22 🧶"
              required
              className="w-full px-3.5 py-2.5 border border-neutral-800 rounded-xl bg-[#161616] text-neutral-200 placeholder-neutral-600 focus:border-neutral-700 focus:outline-none transition-all resize-none text-xs font-sans leading-relaxed"
            />
          </div>

          {/* Real-time parsing details & Community average controller */}
          {parsedGame && parsedYo !== null && (
            <div className="space-y-3 animate-fade-in">
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-3.5 py-2.5 rounded-xl flex items-center justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  Juego: <strong className="text-white">{parsedGame}</strong>
                </span>
                <span>
                  Tiempo: <strong className="text-white">{parsedYo}s</strong>
                </span>
              </div>

              {/* Editable Community average field since it is not in the clipboard string */}
              <div className="bg-[#161616] border border-neutral-800 rounded-xl p-3.5 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <label className="block font-semibold text-neutral-300">Media Comunidad ({parsedGame})</label>
                  <p className="text-[10px] text-neutral-500">Pre-rellenado con el último valor conocido. Ajusta si difiere.</p>
                </div>
                <input
                  type="text"
                  value={pastedMedia}
                  onChange={(e) => setPastedMedia(e.target.value)}
                  required
                  className="w-24 px-3 py-1.5 border border-neutral-800 bg-[#1e1e1e] text-neutral-200 text-center font-mono rounded-lg focus:border-neutral-700 focus:outline-none"
                />
              </div>
            </div>
          )}

          {formError && (
            <p className="text-rose-400 text-[11px] bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{formError}</p>
          )}
          <button
            type="submit"
            disabled={!parsedGame || parsedYo === null}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold py-2.5 rounded-xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" /> Guardar partida
          </button>
        </form>
      )}

      {/* Tab content 2: Manual Registration */}
      {activeTab === 'manual' && (
        <form onSubmit={handleManualSubmit} className="space-y-4 text-xs">
          {/* Date selector */}
          <div className="space-y-1.5">
            <label className="block text-neutral-400 font-semibold uppercase tracking-wider">Fecha y Hora</label>
            <input
              type="datetime-local"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
              className="w-full px-3.5 py-2 border border-neutral-800 rounded-xl bg-[#1a1a1a] text-neutral-200 focus:border-neutral-700 focus:outline-none transition-all font-sans"
            />
          </div>

          <div className="border-t border-neutral-800/80 my-3"></div>

          {/* One row per game */}
          <div className="space-y-2">
            <div className="grid grid-cols-[88px_1fr_1fr] gap-2 text-[10px] text-neutral-500 uppercase tracking-wider px-1">
              <span>Juego</span><span>Tú</span><span>Referencia</span>
            </div>
            {(['Patches', 'Zip', 'Sudoku', 'Queens'] as const).map((gameName) => {
              const { baselineLabel } = GAME_CONFIGS[gameName];
              const isFirst = recordTimes[gameName] === 0;
              return (
                <div key={gameName} className="space-y-0.5">
                  <div className="grid grid-cols-[88px_1fr_1fr] gap-2 items-center">
                    <span className="text-xs font-semibold text-neutral-300">{gameName}</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="s"
                      value={manualTimes[gameName]}
                      onChange={(e) => setManualTimes(prev => ({ ...prev, [gameName]: e.target.value }))}
                      className="px-3 py-2 border border-neutral-800 rounded-lg bg-[#1a1a1a] text-neutral-200 focus:border-neutral-700 focus:outline-none text-xs font-mono w-full"
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder={baselineLabel}
                      value={manualMedias[gameName]}
                      onChange={(e) => setManualMedias(prev => ({ ...prev, [gameName]: e.target.value }))}
                      className="px-3 py-2 border border-neutral-800 rounded-lg bg-[#1a1a1a] text-neutral-200 focus:border-neutral-700 focus:outline-none text-xs font-mono w-full"
                    />
                  </div>
                  {isFirst && (manualTimes[gameName] || manualMedias[gameName]) && (
                    <p className="text-[10px] text-emerald-500/70 pl-[96px]">primera entrada · punto de partida</p>
                  )}
                </div>
              );
            })}

          </div>

          {/* Note / Memo */}
          <div className="space-y-1.5">
            <label className="block text-neutral-400 font-semibold uppercase tracking-wider">Notas / Eventos (Opcional)</label>
            <input
              type="text"
              placeholder="Ej: Sesión matutina en el tren"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="w-full px-3.5 py-2 border border-neutral-800 rounded-xl bg-[#1a1a1a] text-neutral-200 focus:border-neutral-700 focus:outline-none transition-all"
            />
          </div>

          {/* Submit */}
          {formError && (
            <p className="text-rose-400 text-[11px] bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{formError}</p>
          )}
          <button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2.5 rounded-xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" /> Guardar partidas
          </button>
        </form>
      )}
    </div>
  );
}
