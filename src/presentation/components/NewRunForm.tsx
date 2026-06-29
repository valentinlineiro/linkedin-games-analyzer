import React, { useState, useEffect } from 'react';
import { GameType, RawRun } from '../../domain/types';
import { PlusCircle, Info, Sparkles, AlertTriangle, ShieldCheck, Clipboard, Keyboard, Check } from 'lucide-react';

interface NewRunFormProps {
  onAddRun: (run: Omit<RawRun, 'id' | 'ahorro' | 'contexto'>) => void;
  onAddRuns: (runs: Omit<RawRun, 'id' | 'ahorro' | 'contexto'>[]) => Promise<void>;
  recordTimes: Record<GameType, number>;
  lastCommunityAverages: Record<GameType, number>;
  isLiveMode?: boolean;
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

export default function NewRunForm({ onAddRun, onAddRuns, recordTimes, lastCommunityAverages, isLiveMode }: NewRunFormProps) {
  const [activeTab, setActiveTab] = useState<'pasted' | 'manual'>('pasted');
  const [pastedText, setPastedText] = useState('');
  
  // Parsed states from copy
  const [parsedGame, setParsedGame] = useState<GameType | null>(null);
  const [parsedYo, setParsedYo] = useState<number | null>(null);
  const [pastedMedia, setPastedMedia] = useState('');

  // Manual states
  const [juego, setJuego] = useState<GameType>('Patches');
  const [yo, setYo] = useState('');
  const [media, setMedia] = useState('');
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

  // Suggest typical community averages based on game
  const handleGameChange = (selected: GameType) => {
    setJuego(selected);
    if (selected === 'Patches') setMedia('45.7');
    if (selected === 'Zip') setMedia('31.5');
    if (selected === 'Sudoku') setMedia('118.4');
    if (selected === 'Queens') setMedia('84.0');
  };

  // Set default community average on load if empty
  useEffect(() => {
    handleGameChange('Patches');
  }, []);

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
    let toastText = `Partida de ${selectedGame} registrada con éxito en la base de datos.`;

    const currentRecord = recordTimes[selectedGame];
    if (playerTime <= currentRecord && currentRecord > 0) {
      toastType = 'info';
      toastText = `🏆 ¡BRUTAL! Has batido tu récord en ${selectedGame} (${playerTime}s). Guardado como Máximo.`;
    } else if (playerTime > communityAverage * 1.3) {
      toastType = 'warning';
      toastText = `⚠️ Rendimiento atenuado en ${selectedGame} (${playerTime}s). Asignado a: Anomalía/Cansancio.`;
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
      alert('Por favor, introduce una media de comunidad válida.');
      return;
    }

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
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const playerTime = parseFloat(yo.replace(',', '.'));
    const communityAverage = parseFloat(media.replace(',', '.'));

    if (isNaN(playerTime) || playerTime <= 0) {
      alert('Por favor, introduce un tiempo válido.');
      return;
    }
    if (isNaN(communityAverage) || communityAverage <= 0) {
      alert('Por favor, introduce un tiempo de comunidad válido.');
      return;
    }

    onAddRun({
      timestamp: new Date(fecha).toISOString(),
      juego,
      yo: playerTime,
      media: communityAverage,
      nota: nota.trim() || undefined
    });

    triggerToast(playerTime, communityAverage, juego);

    // Reset manual values
    setYo('');
    setNota('');
  };

  return (
    <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-6 space-y-6" id="new-run-form-panel">
      {/* Title */}
      <div>
        <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-emerald-400" /> Registro Directo
        </h3>
        <p className="text-xs text-neutral-500">
          Agrega tus partidas directamente pegando el texto compartido de LinkedIn o de forma manual.
        </p>
      </div>

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
                  <p className="text-[10px] text-neutral-500">Completa con la media mostrada en LinkedIn.</p>
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

          <button
            type="submit"
            disabled={!parsedGame || parsedYo === null}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold py-2.5 rounded-xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" /> Registrar en la Base de Datos
          </button>
          
          <div className="flex gap-1.5 items-start text-[10px] text-neutral-400 bg-[#161616] p-3 rounded-lg border border-neutral-800">
            <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <p className="leading-normal">
              <strong>Cómo funciona</strong>: Pega el texto que copiaste al terminar tu partida. El app detectará el juego y tu tiempo automáticamente. Como el texto de LinkedIn no contiene la media, la pre-llenamos con tu último valor registrado para que solo tengas que revisarla y hacer clic en registrar.
            </p>
          </div>
        </form>
      )}

      {/* Tab content 2: Manual Registration */}
      {activeTab === 'manual' && (
        <form onSubmit={handleManualSubmit} className="space-y-4 text-xs">
          {/* Game selection and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-neutral-400 font-semibold uppercase tracking-wider">Juego de LinkedIn</label>
              <select
                value={juego}
                onChange={(e) => handleGameChange(e.target.value as GameType)}
                className="w-full px-3.5 py-2 border border-neutral-800 rounded-xl bg-[#1a1a1a] text-neutral-200 focus:border-neutral-700 focus:outline-none transition-all"
              >
                <option value="Patches" className="bg-[#111111] text-neutral-200">Patches</option>
                <option value="Zip" className="bg-[#111111] text-neutral-200">Zip</option>
                <option value="Sudoku" className="bg-[#111111] text-neutral-200">Sudoku</option>
                <option value="Queens" className="bg-[#111111] text-neutral-200">Queens</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-neutral-400 font-semibold uppercase tracking-wider">Fecha y Hora</label>
              <input
                type="datetime-local"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full px-3.5 py-2 border border-neutral-800 rounded-xl bg-[#1a1a1a] text-neutral-200 focus:border-neutral-700 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Scores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="block text-neutral-400 font-semibold uppercase tracking-wider">Tu Tiempo (Yo)</label>
                {juego && recordTimes[juego] > 0 && (
                  <span className="text-[10px] text-neutral-500 font-mono">
                    Récord: {recordTimes[juego]}s
                  </span>
                )}
              </div>
              <input
                type="text"
                placeholder="Ej: 24.5"
                value={yo}
                onChange={(e) => setYo(e.target.value)}
                required
                className="w-full px-3.5 py-2 border border-neutral-800 rounded-xl bg-[#1a1a1a] text-neutral-200 focus:border-neutral-700 focus:outline-none transition-all font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-neutral-400 font-semibold uppercase tracking-wider">Media Comunidad (s)</label>
              <input
                type="text"
                placeholder="Ej: 45.7"
                value={media}
                onChange={(e) => setMedia(e.target.value)}
                required
                className="w-full px-3.5 py-2 border border-neutral-800 rounded-xl bg-[#1a1a1a] text-neutral-200 focus:border-neutral-700 focus:outline-none transition-all font-mono"
              />
            </div>
          </div>

          {/* Note / Memo */}
          <div className="space-y-1.5">
            <label className="block text-neutral-400 font-semibold uppercase tracking-wider">Notas / Eventos (Opcional)</label>
            <input
              type="text"
              placeholder="Ej: Patrón complejo, error de click, etc."
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="w-full px-3.5 py-2 border border-neutral-800 rounded-xl bg-[#1a1a1a] text-neutral-200 focus:border-neutral-700 focus:outline-none transition-all"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2.5 rounded-xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" /> Registrar Partida (Manual)
          </button>
        </form>
      )}
    </div>
  );
}
