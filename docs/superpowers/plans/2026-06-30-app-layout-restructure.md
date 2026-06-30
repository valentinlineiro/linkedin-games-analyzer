# App Layout & Navigation Restructuring (Modern Drawer UI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the LinkedIn Games Tracker & Analyzer to use a unified dashboard with a slide-over input drawer and separate settings panel, dynamically handling both Chess and LinkedIn games.

**Architecture:** Centralize drawer open/close states in `App.tsx` and pass them to sub-components. Extract Chess and LinkedIn metrics calculations to the domain layer for testability. Build specialized modular UI components (`Header`, `InputDrawer`, `SettingsDrawer`, `ChessDashboard`, and `DashboardOverview`).

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Motion (framer-motion), Lucide React, Recharts, Vitest.

## Global Constraints

* Naming: Use Spanish terms for user-facing UI labels (e.g. "Registrar partida", "Cansancio", "Guardado", "Historial") to maintain consistency with existing codebase.
* Aesthetics: Maintain the premium deep-dark aesthetic (`bg-[#0a0a0a]`, `border-neutral-800`, emerald primary accents `#10b981`).
* Responsiveness: Ensure layout adjusts smoothly from desktop to mobile screens (drawer width `420px` to `100vw`).

---

## Tasks

### Task 1: Extract Chess Metrics to Domain and Add Unit Tests (TDD)

**Files:**
* Modify: `src/domain/metrics.ts`
* Modify: `src/domain/metrics.test.ts`

**Interfaces:**
* Produces:
  ```typescript
  export interface ChessStats {
    latest: number;
    max: number;
    min: number;
    avg: number;
    wins: number;
    draws: number;
    losses: number;
    total: number;
    winsAsB: number;
    totalAsB: number;
    winsAsN: number;
    totalAsN: number;
    delta: number | null;
  }
  export function calculateChessStats(runs: RawRun[]): ChessStats | null;
  ```

- [ ] **Step 1: Write the failing test**
  Add the following test case inside `src/domain/metrics.test.ts`:
  ```typescript
  describe('calculateChessStats', () => {
    it('calcula estadisticas de ajedrez correctamente', () => {
      const chessRuns: RawRun[] = [
        { id: 'c1', timestamp: '2026-06-01T10:00:00', juego: 'Chess', yo: 1400, media: 1500, ahorro: 0, contexto: 'Exploración', color: 'B', resultado: 'V' },
        { id: 'c2', timestamp: '2026-06-02T10:00:00', juego: 'Chess', yo: 1410, media: 1500, ahorro: 0, contexto: 'Exploración', color: 'N', resultado: 'D' },
        { id: 'c3', timestamp: '2026-06-03T10:00:00', juego: 'Chess', yo: 1420, media: 1500, ahorro: 0, contexto: 'Exploración', color: 'B', resultado: 'T' }
      ];
      // @ts-ignore
      const stats = calculateChessStats(chessRuns);
      expect(stats).not.toBeNull();
      expect(stats!.latest).toBe(1420);
      expect(stats!.max).toBe(1420);
      expect(stats!.min).toBe(1400);
      expect(stats!.avg).toBe(1410);
      expect(stats!.wins).toBe(1);
      expect(stats!.losses).toBe(1);
      expect(stats!.draws).toBe(1);
      expect(stats!.total).toBe(3);
      expect(stats!.winsAsB).toBe(1);
      expect(stats!.totalAsB).toBe(2);
      expect(stats!.winsAsN).toBe(0);
      expect(stats!.totalAsN).toBe(1);
      expect(stats!.delta).toBe(10); // 1420 - 1410
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run src/domain/metrics.test.ts`
  Expected: FAIL with "calculateChessStats is not defined" or similar.

- [ ] **Step 3: Write minimal implementation**
  Add the implementation in `src/domain/metrics.ts`:
  ```typescript
  export interface ChessStats {
    latest: number;
    max: number;
    min: number;
    avg: number;
    wins: number;
    draws: number;
    losses: number;
    total: number;
    winsAsB: number;
    totalAsB: number;
    winsAsN: number;
    totalAsN: number;
    delta: number | null;
  }

  export function calculateChessStats(runs: RawRun[]): ChessStats | null {
    const chessRuns = runs
      .filter(r => r.juego === 'Chess')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

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
      wins,
      draws,
      losses,
      total: chessRuns.length,
      winsAsB,
      totalAsB: asB.length,
      winsAsN,
      totalAsN: asN.length,
      delta,
    };
  }
  ```
  Ensure to import `ChessStats` and export it in `src/domain/metrics.ts`. Also export it or reference it in `src/domain/types.ts` if needed, but keeping it in `metrics.ts` is fine. Import it in the test file.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run src/domain/metrics.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit**
  ```bash
  git add src/domain/metrics.ts src/domain/metrics.test.ts
  git commit -m "feat(domain): extract Chess statistics calculations and add unit tests"
  ```

---

### Task 2: Create Layout Header Component

**Files:**
* Create: `src/presentation/components/Header.tsx`

**Interfaces:**
* Consumes:
  * `user`: `AuthUser | null`
  * `isSyncingLive`: `boolean`
  * `activeSpreadsheet`: `{ id: string; title: string; url: string } | null`
  * `onOpenSettings`: `() => void`
  * `onOpenDrawer`: `() => void`

- [ ] **Step 1: Write header file**
  Create `src/presentation/components/Header.tsx` with:
  ```typescript
  import React from 'react';
  import { Layers, Cloud, CloudOff, Settings, Plus } from 'lucide-react';
  import { AuthUser } from '../../domain/types';

  interface HeaderProps {
    user: AuthUser | null;
    isSyncingLive: boolean;
    activeSpreadsheet: { id: string; title: string; url: string } | null;
    onOpenSettings: () => void;
    onOpenDrawer: () => void;
  }

  export default function Header({
    user,
    isSyncingLive,
    activeSpreadsheet,
    onOpenSettings,
    onOpenDrawer,
  }: HeaderProps) {
    return (
      <header className="bg-[#111111] border-b border-neutral-800 sticky top-0 z-40 px-6 py-4" id="app-header">
        <div className="max-w-4xl mx-auto flex justify-between items-center gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500 text-black font-bold rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <h1 className="font-display text-lg font-bold tracking-tight text-white hidden sm:block">
              LinkedIn Games Tracker
            </h1>
            <h1 className="font-display text-lg font-bold tracking-tight text-white sm:hidden">
              LIG
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {activeSpreadsheet ? (
              <button
                onClick={onOpenSettings}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 cursor-pointer hover:bg-emerald-500/20 transition-all"
              >
                <Cloud className="w-3.5 h-3.5" /> <span>{isSyncingLive ? 'Guardando…' : 'Nube activa'}</span>
              </button>
            ) : (
              <button
                onClick={onOpenSettings}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border bg-neutral-900 text-neutral-500 border-neutral-800 cursor-pointer hover:bg-neutral-850 hover:text-neutral-300 transition-all"
              >
                <CloudOff className="w-3.5 h-3.5" /> <span>Local</span>
              </button>
            )}

            <button
              onClick={onOpenDrawer}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-emerald-950/20"
            >
              <Plus className="w-4 h-4" /> <span>Registrar partida</span>
            </button>

            <button
              onClick={onOpenSettings}
              className="p-2 border border-neutral-850 rounded-xl text-neutral-400 hover:bg-neutral-900 hover:text-white transition-all cursor-pointer"
              title="Configuración"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>
    );
  }
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add src/presentation/components/Header.tsx
  git commit -m "feat(ui): add layout header component"
  ```

---

### Task 3: Create Unified Slide-over Input Drawer Component

**Files:**
* Create: `src/presentation/components/InputDrawer.tsx`

**Interfaces:**
* Consumes:
  * `isOpen`: `boolean`
  * `onClose`: `() => void`
  * `onAddRun`: `(run: Omit<RawRun, 'id' | 'ahorro' | 'contexto'>) => void`
  * `lastCommunityAverages`: `Record<GameType, number>`

- [ ] **Step 1: Write Input Drawer Component**
  Create `src/presentation/components/InputDrawer.tsx` to handle dynamic field switching when `Chess` vs LinkedIn games are selected.
  ```typescript
  import React, { useState, useEffect } from 'react';
  import { X, Play, Clock, Sparkles } from 'lucide-react';
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
    const [contextoFatiga, setContextoFatiga] = useState<'Máximo' | 'Exploración' | 'Anomalía' | 'Cansancio'>('Exploración');
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
        setMedia(lastCommunityAverages[game]?.toString() || '');
      }
    }, [isOpen, game, lastCommunityAverages]);

    if (!isOpen) return null;

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
      } else {
        baseRun.contexto = contextoFatiga;
      }

      onAddRun(baseRun);
      onClose();
    };

    const games: GameType[] = ['Sudoku', 'Queens', 'Patches', 'Zip', 'Chess'];

    return (
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/60 transition-opacity" 
          onClick={onClose}
        />
        
        {/* Drawer Pane */}
        <div className="relative w-full max-w-md bg-[#121212] border-l border-neutral-800 p-6 shadow-2xl flex flex-col h-full z-10">
          <div className="flex justify-between items-center mb-6 border-b border-neutral-850 pb-4">
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
                        : 'bg-[#1a1a1a] border-neutral-800 text-neutral-500 hover:text-neutral-350'
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

                <div className="space-y-2">
                  <label className="block text-neutral-400 font-semibold uppercase tracking-wider">Contexto</label>
                  <div className="flex flex-wrap gap-1.5">
                    {(['Máximo', 'Exploración', 'Anomalía', 'Cansancio'] as const).map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setContextoFatiga(c)}
                        className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer font-semibold ${
                          contextoFatiga === c
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-[#1a1a1a] border-neutral-800 text-neutral-500 hover:text-neutral-350'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
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
                            ? 'bg-neutral-850 text-white border-neutral-750'
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
                                : 'bg-[#1a1a1a] border-neutral-800 text-neutral-500 hover:text-neutral-350'
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
            <div className="pt-4 border-t border-neutral-850 flex gap-2">
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
                  game === 'Chess' ? 'bg-rose-400 hover:bg-rose-350' : 'bg-emerald-400 hover:bg-emerald-350'
                }`}
              >
                Guardar Partida
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add src/presentation/components/InputDrawer.tsx
  git commit -m "feat(ui): add unified slide-over input drawer component"
  ```

---

### Task 4: Create Settings & Sheets Sync Drawer Component

**Files:**
* Create: `src/presentation/components/SettingsDrawer.tsx`

**Interfaces:**
* Consumes:
  * `isOpen`: `boolean`
  * `onClose`: `() => void`
  * `runs`: `RawRun[]`
  * `user`: `AuthUser | null`
  * `authLoading`: `boolean`
  * `activeSpreadsheet`: `{ id: string; title: string; url: string } | null`
  * `isSyncingLive`: `boolean`
  * `onSignIn`: `() => Promise<void>`
  * `onSignOut`: `() => Promise<void>`
  * `onConnectSheet`: `() => void`
  * `onDisconnectSheet`: `() => void`
  * `onCreateNewSheet`: `() => void`
  * `onPullFromSheet`: `() => Promise<void>`
  * `onPushToSheet`: `() => Promise<void>`
  * `onImportRuns`: `(runs: Omit<RawRun, 'id' | 'ahorro' | 'contexto'>[]) => Promise<void>`
  * `onResetData`: `() => void`

- [ ] **Step 1: Write Settings Drawer Component**
  Create `src/presentation/components/SettingsDrawer.tsx` by wrapping the Google Sheets sync configuration panel.
  ```typescript
  import React from 'react';
  import { X, Settings, Trash2 } from 'lucide-react';
  import GoogleSheetsSyncPanel from './GoogleSheetsSyncPanel';
  import { AuthUser, RawRun } from '../../domain/types';

  interface SettingsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    runs: RawRun[];
    user: AuthUser | null;
    authLoading: boolean;
    activeSpreadsheet: { id: string; title: string; url: string } | null;
    isSyncingLive: boolean;
    onSignIn: () => Promise<void>;
    onSignOut: () => Promise<void>;
    onConnectSheet: () => void;
    onDisconnectSheet: () => void;
    onCreateNewSheet: () => void;
    onPullFromSheet: () => Promise<void>;
    onPushToSheet: () => Promise<void>;
    onImportRuns: (runs: Omit<RawRun, 'id' | 'ahorro' | 'contexto'>[]) => Promise<void>;
    onResetData: () => void;
  }

  export default function SettingsDrawer({
    isOpen,
    onClose,
    runs,
    user,
    authLoading,
    activeSpreadsheet,
    isSyncingLive,
    onSignIn,
    onSignOut,
    onConnectSheet,
    onDisconnectSheet,
    onCreateNewSheet,
    onPullFromSheet,
    onPushToSheet,
    onImportRuns,
    onResetData,
  }: SettingsDrawerProps) {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 transition-opacity" onClick={onClose} />

        {/* Settings Pane */}
        <div className="relative w-full max-w-md bg-[#121212] border-l border-neutral-800 p-6 shadow-2xl flex flex-col h-full z-10">
          <div className="flex justify-between items-center mb-6 border-b border-neutral-850 pb-4">
            <h2 className="font-display text-base font-bold text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-neutral-400" />
              <span>Configuración y Sincronización</span>
            </h2>
            <button onClick={onClose} className="p-1 rounded-lg text-neutral-500 hover:bg-neutral-800 hover:text-white transition-all cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-grow overflow-y-auto space-y-6 pr-1">
            <GoogleSheetsSyncPanel
              runs={runs}
              user={user}
              authLoading={authLoading}
              activeSpreadsheet={activeSpreadsheet}
              isSyncingLive={isSyncingLive}
              onSignIn={onSignIn}
              onSignOut={onSignOut}
              onConnectSheet={onConnectSheet}
              onDisconnectSheet={onDisconnectSheet}
              onCreateNewSheet={onCreateNewSheet}
              onPullFromSheet={onPullFromSheet}
              onPushToSheet={onPushToSheet}
              onImportRuns={onImportRuns}
            />

            <div className="border-t border-neutral-850 pt-4 space-y-2">
              <h3 className="text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" /> Peligro
              </h3>
              <p className="text-[11px] text-neutral-500">
                Al limpiar el historial borrarás todos los registros. Si estás sincronizado con la nube, las partidas guardadas allí persistirán hasta que las borres de forma explícita.
              </p>
              <button
                onClick={() => {
                  onResetData();
                  onClose();
                }}
                className="px-3 py-1.5 border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 hover:text-rose-350 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Limpiar Historial Local
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add src/presentation/components/SettingsDrawer.tsx
  git commit -m "feat(ui): add Settings Drawer component wrapping Sheet sync panel"
  ```

---

### Task 5: Create Chess Dashboard Sub-Dashboard Component

**Files:**
* Create: `src/presentation/components/ChessDashboard.tsx`

**Interfaces:**
* Consumes:
  * `runs`: `RawRun[]`
  * `onDeleteRun`: `(id: string) => void`

- [ ] **Step 1: Write ChessDashboard Component**
  Create `src/presentation/components/ChessDashboard.tsx` displaying ELO progress charts, chess ELO KPIs, and list table logs.
  ```typescript
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
            <div className="text-sm font-semibold text-neutral-350 font-mono mt-2">
              {stats.total} <span className="text-[10px] text-neutral-500">({stats.wins}v / {stats.draws}t / {stats.losses}d)</span>
            </div>
          </div>
        </div>

        {/* Splits White/Black */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#111] border border-neutral-850 p-4 rounded-2xl flex justify-between items-center">
            <div className="space-y-1">
              <span className="font-semibold text-neutral-450 uppercase text-[9px] tracking-wider">Rendimiento Blancas</span>
              <div className="font-bold text-white text-base font-mono">
                {stats.totalAsB > 0 ? `${Math.round((stats.winsAsB / stats.totalAsB) * 100)}%` : '—'}
              </div>
            </div>
            <span className="text-neutral-600 text-[10px] font-mono">{stats.winsAsB} victorias / {stats.totalAsB} partidas</span>
          </div>
          <div className="bg-[#111] border border-neutral-850 p-4 rounded-2xl flex justify-between items-center">
            <div className="space-y-1">
              <span className="font-semibold text-neutral-450 uppercase text-[9px] tracking-wider">Rendimiento Negras</span>
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
          <div className="px-6 py-4 border-b border-neutral-850 flex justify-between items-center">
            <h3 className="font-bold text-neutral-200 uppercase tracking-wider">Registro de Partidas</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-neutral-850 text-neutral-500 font-semibold text-[10px] uppercase tracking-wider bg-neutral-950/30">
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
                    <td className="px-6 py-3.5 text-neutral-550">
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
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add src/presentation/components/ChessDashboard.tsx
  git commit -m "feat(ui): add chess analytics sub-dashboard component"
  ```

---

### Task 6: Create Unified Dashboard Overview Component

**Files:**
* Create: `src/presentation/components/DashboardOverview.tsx`

**Interfaces:**
* Consumes:
  * `runs`: `RawRun[]`
  * `sortedRuns`: `RawRun[]`
  * `summaries`: `GameSummary[]`
  * `onDeleteRun`: `(id: string) => void`

- [ ] **Step 1: Write DashboardOverview Component**
  Create `src/presentation/components/DashboardOverview.tsx` containing top KPI summary cards and sub-tabs for switching between LinkedIn dashboard, Chess stats, and heatmaps.
  ```typescript
  import React, { useState } from 'react';
  import { RawRun, GameSummary } from '../../domain/types';
  import { BarChart3, Swords, Compass } from 'lucide-react';
  import DashboardMetrics from './DashboardMetrics';
  import PerformanceCharts from './PerformanceCharts';
  import AnalysisTabContainer from './AnalysisTabContainer';
  import ChessDashboard from './ChessDashboard';

  interface DashboardOverviewProps {
    runs: RawRun[];
    sortedRuns: RawRun[];
    summaries: GameSummary[];
    onDeleteRun: (id: string) => void;
  }

  type SubTabType = 'linkedin' | 'chess' | 'advanced';

  export default function DashboardOverview({
    runs,
    sortedRuns,
    summaries,
    onDeleteRun,
  }: DashboardOverviewProps) {
    const [activeTab, setActiveTab] = useState<SubTabType>('linkedin');

    const totalRuns = runs.length;
    
    // Calculate global stats (LinkedIn specific)
    const linkedinSummaries = summaries.filter(s => s.juego !== 'Chess');
    const totalAhorro = linkedinSummaries.reduce((acc, s) => acc + (s.totalPartidas * s.ahorroS), 0);
    const avgDiff = linkedinSummaries.length > 0 
      ? Number((linkedinSummaries.reduce((acc, s) => acc + s.diferenciaPct, 0) / linkedinSummaries.length).toFixed(1))
      : 0;

    const tabs = [
      { id: 'linkedin', label: 'Juegos LinkedIn', icon: BarChart3 },
      { id: 'chess', label: 'Ajedrez ELO', icon: Swords },
      { id: 'advanced', label: 'Análisis Avanzado', icon: Compass },
    ] as const;

    return (
      <div className="space-y-6 text-xs">
        {/* Global KPIs overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#111] border border-neutral-800 p-5 rounded-3xl">
            <div className="text-[10px] font-bold text-neutral-550 uppercase tracking-wider">Partidas Registradas</div>
            <div className="text-2xl font-bold text-white font-mono mt-1">{totalRuns}</div>
          </div>
          <div className="bg-[#111] border border-neutral-800 p-5 rounded-3xl">
            <div className="text-[10px] font-bold text-neutral-550 uppercase tracking-wider">Diferencia Promedio (LIG)</div>
            <div className={`text-2xl font-bold font-mono mt-1 ${avgDiff > 0 ? 'text-emerald-400' : 'text-neutral-400'}`}>
              {avgDiff > 0 ? `+${avgDiff}%` : `${avgDiff}%`}
            </div>
          </div>
          <div className="bg-[#111] border border-neutral-800 p-5 rounded-3xl">
            <div className="text-[10px] font-bold text-neutral-550 uppercase tracking-wider">Tiempo Total Ahorrado</div>
            <div className="text-2xl font-bold text-white font-mono mt-1">
              {totalAhorro > 0 ? `${(totalAhorro / 3600).toFixed(1)} Hrs` : '0.0 Hrs'}
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-neutral-950 border border-neutral-800 p-1.5 rounded-2xl w-fit gap-1" id="dashboard-tab-selector">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-neutral-800 text-white border border-neutral-700'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Sub View Content */}
        <div className="space-y-6">
          {activeTab === 'linkedin' && (
            <>
              {runs.filter(r => r.juego !== 'Chess').length > 0 ? (
                <>
                  <DashboardMetrics summaries={summaries.filter(s => s.juego !== 'Chess')} />
                  <PerformanceCharts runs={sortedRuns.filter(r => r.juego !== 'Chess')} />
                </>
              ) : (
                <div className="text-center py-12 border border-neutral-800 rounded-3xl bg-[#111] text-neutral-500">
                  Aquí aparecerán tus estadísticas de LinkedIn cuando registres la primera partida.
                </div>
              )}
            </>
          )}

          {activeTab === 'chess' && (
            <ChessDashboard 
              runs={runs} 
              onDeleteRun={onDeleteRun} 
            />
          )}

          {activeTab === 'advanced' && (
            <>
              {runs.filter(r => r.juego !== 'Chess').length > 0 ? (
                <AnalysisTabContainer
                  runs={runs.filter(r => r.juego !== 'Chess')}
                  summaries={summaries.filter(s => s.juego !== 'Chess')}
                />
              ) : (
                <div className="text-center py-12 border border-neutral-800 rounded-3xl bg-[#111] text-neutral-550">
                  Registra partidas de juegos de LinkedIn para habilitar análisis avanzados.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add src/presentation/components/DashboardOverview.tsx
  git commit -m "feat(ui): add unified dashboard overview and tab coordinate component"
  ```

---

### Task 7: Integrate Components and Drawers in `src/presentation/App.tsx`

**Files:**
* Modify: `src/presentation/App.tsx`

- [ ] **Step 1: Write integration changes**
  Modify `src/presentation/App.tsx` to mount `Header`, `InputDrawer`, `SettingsDrawer`, and `DashboardOverview`, and wire open/close state logic.
  ```typescript
  import React, { useState } from 'react';
  import { useTracker } from './hooks/useTracker';
  import Header from './components/Header';
  import InputDrawer from './components/InputDrawer';
  import SettingsDrawer from './components/SettingsDrawer';
  import DashboardOverview from './components/DashboardOverview';

  export default function App() {
    const {
      runs,
      sortedRuns,
      summaries,
      lastCommunityAverages,
      user,
      authLoading,
      activeSpreadsheet,
      isSyncingLive,
      onSignIn,
      onSignOut,
      onConnectSheet,
      onDisconnectSheet,
      onCreateNewSheet,
      onPullFromSheet,
      onPushToSheet,
      onAddRun,
      onDeleteRun,
      onResetData,
      onImportRuns,
    } = useTracker();

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    return (
      <div className="min-h-screen bg-[#0a0a0a] text-neutral-200 font-sans selection:bg-emerald-500/20" id="app-root-container">
        {/* New Modular Header */}
        <Header
          user={user}
          isSyncingLive={isSyncingLive}
          activeSpreadsheet={activeSpreadsheet}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenDrawer={() => setIsDrawerOpen(true)}
        />

        {/* Global Slide-over Data Entry Drawer */}
        <InputDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onAddRun={onAddRun}
          lastCommunityAverages={lastCommunityAverages}
        />

        {/* Sheets Sync and System Settings Drawer */}
        <SettingsDrawer
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          runs={runs}
          user={user}
          authLoading={authLoading}
          activeSpreadsheet={activeSpreadsheet}
          isSyncingLive={isSyncingLive}
          onSignIn={onSignIn}
          onSignOut={onSignOut}
          onConnectSheet={onConnectSheet}
          onDisconnectSheet={onDisconnectSheet}
          onCreateNewSheet={onCreateNewSheet}
          onPullFromSheet={onPullFromSheet}
          onPushToSheet={onPushToSheet}
          onImportRuns={onImportRuns}
          onResetData={onResetData}
        />

        {/* Main Workspace Dashboard Content */}
        <main className="max-w-4xl mx-auto p-6 space-y-6" id="app-main-content">
          <DashboardOverview
            runs={runs}
            sortedRuns={sortedRuns}
            summaries={summaries}
            onDeleteRun={onDeleteRun}
          />
        </main>

        <footer className="text-center py-8 text-xs text-neutral-700 max-w-4xl mx-auto border-t border-neutral-850" id="app-footer">
          <p>© 2026 LinkedIn Games Tracker</p>
        </footer>
      </div>
    );
  }
  ```

- [ ] **Step 2: Verify lint and build**
  Run: `npm run lint`
  Expected: Command succeeds with zero errors (verifying typescript validation checks).

- [ ] **Step 3: Run project tests**
  Run: `npm run test`
  Expected: All tests pass.

- [ ] **Step 4: Commit**
  ```bash
  git add src/presentation/App.tsx
  git commit -m "feat(ui): integrate new layout headers, sub-tabs, and drawer overlays into main App"
  ```
