import React, { useState } from 'react';
import { GameType, RawRun } from '../../domain/types';
import { PlusCircle, Info, Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react';

interface NewRunFormProps {
  onAddRun: (run: Omit<RawRun, 'id' | 'ahorro' | 'contexto'>) => void;
  recordTimes: Record<GameType, number>;
  isLiveMode?: boolean;
}

export default function NewRunForm({ onAddRun, recordTimes, isLiveMode }: NewRunFormProps) {
  const [juego, setJuego] = useState<GameType>('Patches');
  const [yo, setYo] = useState('');
  const [media, setMedia] = useState('');
  const [nota, setNota] = useState('');
  const [fecha, setFecha] = useState(() => {
    // Default to current date in YYYY-MM-DDTHH:MM local format
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000; // offset in milliseconds
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
  React.useEffect(() => {
    handleGameChange('Patches');
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const playerTime = parseFloat(yo.replace(',', '.'));
    const communityAverage = parseFloat(media.replace(',', '.'));

    if (isNaN(playerTime) || playerTime <= 0) {
      alert('Por favor, introduce un tiempo válido para ti.');
      return;
    }
    if (isNaN(communityAverage) || communityAverage <= 0) {
      alert('Por favor, introduce un tiempo de comunidad válido.');
      return;
    }

    // Submit the run
    onAddRun({
      timestamp: new Date(fecha).toISOString(),
      juego,
      yo: playerTime,
      media: communityAverage,
      nota: nota.trim() || undefined
    });

    // Determine visual toast message
    let toastType: 'success' | 'warning' | 'info' = 'success';
    let toastText = `Partida de ${juego} agregada con éxito. ¡Sincronizado!`;

    const currentRecord = recordTimes[juego];
    if (playerTime <= currentRecord) {
      toastType = 'info';
      toastText = `🏆 ¡BRUTAL! Has batido o igualado tu récord personal en ${juego} (${playerTime}s). Guardado en contexto: Máximo.`;
    } else if (playerTime > communityAverage * 1.5) {
      toastType = 'warning';
      toastText = `⚠️ ¡Alerta de Anomalía! Tu tiempo de ${playerTime}s es significativamente superior a la media. Contexto asignado: Anomalía.`;
    }

    setNotification({ text: toastText, type: toastType });

    // Reset fields
    setYo('');
    setNota('');

    // Clear notification after 6 seconds
    setTimeout(() => {
      setNotification(null);
    }, 6000);
  };

  return (
    <div className="bg-[#111111] border border-neutral-800 rounded-2xl p-6 space-y-6" id="new-run-form-panel">
      <div>
        <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-emerald-400" /> Registro de Tiempos
        </h3>
        <p className="text-xs text-neutral-500">
          Registra tus partidas diarias para calcular de inmediato tus estadísticas de consistencia y volatilidad.
        </p>
      </div>

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

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
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
            <label className="block text-neutral-400 font-semibold uppercase tracking-wider">Fecha y Hora de la Sesión</label>
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
              {juego && (
                <span className="text-[10px] text-neutral-500 font-mono">
                  Récord: {recordTimes[juego]}s
                </span>
              )}
            </div>
            <input
              type="text"
              placeholder="Ej: 24.5 o 24,5"
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
          <label className="block text-neutral-400 font-semibold uppercase tracking-wider">Notas / Eventos Especiales (Opcional)</label>
          <input
            type="text"
            placeholder="Ej: Patrón de tablero complejo, error de click en celda 4, etc."
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
          <PlusCircle className="w-4 h-4" /> {isLiveMode ? 'Guardar en Google Sheets' : 'Registrar Partida (Local)'}
        </button>

        {/* Micro guide */}
        <div className="flex gap-1.5 items-start text-[10px] text-neutral-400 bg-[#1a1a1a] p-3 rounded-lg border border-neutral-800">
          <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <p className="leading-normal">
            {isLiveMode ? (
              <span>
                <strong>Conexión Activa (Google Drive)</strong>: Al hacer clic, guardamos la partida instantáneamente en tu hoja de Google Sheets (pestaña <code className="bg-neutral-950 text-neutral-300 border border-neutral-800 px-1 py-0.5 rounded font-mono">Respuestas de formulario 1</code>) en tiempo real.
              </span>
            ) : (
              <span>
                <strong>Guardado Local Persistente</strong>: Tus partidas se registran en la memoria del navegador (Local Storage). Conecta tu cuenta en el panel inferior para subirlas y guardarlas directamente en Google Sheets.
              </span>
            )}
          </p>
        </div>
      </form>
    </div>
  );
}
