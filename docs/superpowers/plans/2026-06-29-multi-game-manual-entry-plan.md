# Multi-Game Manual Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modify the manual entry form to support entering 4 games (Patches, Zip, Sudoku, Queens) simultaneously under a single date/time.

**Architecture:** Redesign the manual tab in `NewRunForm.tsx` to maintain input state as records keyed by `GameType` for times and media averages. Pass down `onImportRuns` from the hooks layer as an `onAddRuns` bulk action prop to save all entries concurrently, eliminating state-batching race conditions.

**Tech Stack:** React 19, TypeScript, Lucide Icons, Tailwind CSS / Vanilla CSS classes.

## Global Constraints
- Target workspace directory: `/home/valentin/code/linkedin-games-analyzer`
- Maintain TypeScript compilation type safety.
- Code must build clean without warnings (lint check: `npm run lint`).

---

### Task 1: Type Definitions and Prop Routing

**Files:**
- Modify: `src/presentation/components/NewRunForm.tsx:1-15`
- Modify: `src/presentation/App.tsx:80-92`

**Interfaces:**
- Consumes: `onImportRuns` from `useTracker.ts`
- Produces: Updated prop signatures in `NewRunFormProps` containing `onAddRuns: (runs: Omit<RawRun, 'id' | 'ahorro' | 'contexto'>[]) => Promise<void>`

- [ ] **Step 1: Update NewRunFormProps interface**
  
  In [NewRunForm.tsx](file:///home/valentin/code/linkedin-games-analyzer/src/presentation/components/NewRunForm.tsx), modify the `NewRunFormProps` interface to accept `onAddRuns` in place of or in addition to `onAddRun`.
  
  ```typescript
  interface NewRunFormProps {
    onAddRun: (run: Omit<RawRun, 'id' | 'ahorro' | 'contexto'>) => void;
    onAddRuns: (runs: Omit<RawRun, 'id' | 'ahorro' | 'contexto'>[]) => Promise<void>;
    recordTimes: Record<GameType, number>;
    lastCommunityAverages: Record<GameType, number>;
    isLiveMode?: boolean;
  }
  ```

- [ ] **Step 2: Connect onImportRuns in App.tsx**
  
  In [App.tsx](file:///home/valentin/code/linkedin-games-analyzer/src/presentation/App.tsx), update the `<NewRunForm>` instance on lines 88-90 to pass `onImportRuns` to the `onAddRuns` prop.
  
  ```typescript
  <NewRunForm 
    onAddRun={onAddRun} 
    onAddRuns={onImportRuns}
    recordTimes={recordTimes} 
    lastCommunityAverages={lastCommunityAverages} 
    isLiveMode={!!activeSpreadsheet} 
  />
  ```

- [ ] **Step 3: Run compiler to verify prop mismatch / compilation**
  
  Run: `npm run lint`
  Expected: Error complaining that `onAddRuns` is missing or not provided when destructuring in `NewRunForm` (since it's not destructured yet).

- [ ] **Step 4: Update destructuring in NewRunForm.tsx**
  
  Update `NewRunForm` parameter destructuring at lines 81-83 in `NewRunForm.tsx` to include `onAddRuns`.
  
  ```typescript
  export default function NewRunForm({ onAddRun, onAddRuns, recordTimes, lastCommunityAverages, isLiveMode }: NewRunFormProps) {
  ```

- [ ] **Step 5: Run compiler to verify success**
  
  Run: `npm run lint`
  Expected: Compilation passes.

- [ ] **Step 6: Commit changes**
  
  ```bash
  git add src/presentation/components/NewRunForm.tsx src/presentation/App.tsx
  git commit -m "feat: define and wire onAddRuns bulk handler in App and NewRunForm props"
  ```

---

### Task 2: Refactor State, Submit Logic, and UI Layout in NewRunForm.tsx

**Files:**
- Modify: `src/presentation/components/NewRunForm.tsx:90-425`

**Interfaces:**
- Consumes: `onAddRuns` prop from Task 1.

- [ ] **Step 1: Replace states with multi-game structure**
  
  In [NewRunForm.tsx](file:///home/valentin/code/linkedin-games-analyzer/src/presentation/components/NewRunForm.tsx), replace single-game manual states (lines 91-94) with record state structures.
  
  ```typescript
  // Manual states
  const [manualTimes, setManualTimes] = useState<Record<GameType, string>>({
    Patches: '',
    Zip: '',
    Sudoku: '',
    Queens: ''
  });
  const [manualMedias, setManualMedias] = useState<Record<GameType, string>>({
    Patches: '',
    Zip: '',
    Sudoku: '',
    Queens: ''
  });
  const [nota, setNota] = useState('');
  const [fecha, setFecha] = useState(() => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now.getTime() - tzOffset)).toISOString().slice(0, 16);
    return localISOTime;
  });
  ```

- [ ] **Step 2: Update handleManualSubmit logic to support bulk saving**
  
  In [NewRunForm.tsx](file:///home/valentin/code/linkedin-games-analyzer/src/presentation/components/NewRunForm.tsx), completely refactor `handleManualSubmit` to loop over all 4 games, validate and parse times/averages, call `onAddRuns`, trigger a custom bulk toast, and reset inputs.
  
  ```typescript
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const games: GameType[] = ['Patches', 'Zip', 'Sudoku', 'Queens'];
    const parsedRuns: { game: GameType; yo: number; media: number }[] = [];

    for (const g of games) {
      const playerTime = parseFloat(manualTimes[g].replace(',', '.'));
      const communityAverage = parseFloat(manualMedias[g].replace(',', '.'));

      if (isNaN(playerTime) || playerTime <= 0) {
        alert(`Por favor, introduce un tiempo válido para ${g}.`);
        return;
      }
      if (isNaN(communityAverage) || communityAverage <= 0) {
        alert(`Por favor, introduce una media de comunidad válida para ${g}.`);
        return;
      }

      parsedRuns.push({ game: g, yo: playerTime, media: communityAverage });
    }

    const runsToAdd = parsedRuns.map((r) => ({
      timestamp: new Date(fecha).toISOString(),
      juego: r.game,
      yo: r.yo,
      media: r.media,
      nota: nota.trim() || undefined
    }));

    try {
      await onAddRuns(runsToAdd);

      // Trigger consolidated toast notification
      let toastType: 'success' | 'warning' | 'info' = 'success';
      let toastText = `Las 4 partidas se han registrado con éxito.`;

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

      if (brokenRecords.length > 0) {
        toastType = 'info';
        toastText = `🏆 ¡BRUTAL! Has batido récord en: ${brokenRecords.join(', ')}.`;
      } else if (anomalies.length > 0) {
        toastType = 'warning';
        toastText = `⚠️ Rendimiento atenuado en: ${anomalies.join(', ')}. Guardados como Anomalía/Cansancio.`;
      }

      setNotification({ text: toastText, type: toastType });
      setTimeout(() => {
        setNotification(null);
      }, 6000);

      // Reset manual values
      setManualTimes({ Patches: '', Zip: '', Sudoku: '', Queens: '' });
      setManualMedias({ Patches: '', Zip: '', Sudoku: '', Queens: '' });
      setNota('');
    } catch (err: any) {
      alert(`Error al registrar las partidas: ${err.message}`);
    }
  };
  ```

- [ ] **Step 3: Update manual tab JSX Form structure**
  
  Replace the JSX manual tab block (lines 338-421) to show a date-time picker at the top, a grid of 4 game blocks, and notes at the bottom. Apply premium design aesthetics matching the rest of the application (glassmorphism/border stylings, structured layouts).
  
  ```tsx
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

      {/* Grid of 4 games */}
      <div className="space-y-3.5">
        {(['Patches', 'Zip', 'Sudoku', 'Queens'] as GameType[]).map((gameName) => (
          <div key={gameName} className="p-3 bg-[#161616] border border-neutral-800/60 rounded-xl space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-white uppercase tracking-wider">{gameName}</span>
              {recordTimes[gameName] > 0 && (
                <span className="text-[10px] text-neutral-500 font-mono">
                  Récord: {recordTimes[gameName]}s
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[10px] text-neutral-400 font-medium uppercase tracking-wider">Tu Tiempo (s)</label>
                <input
                  type="text"
                  placeholder="Ej: 25.4"
                  value={manualTimes[gameName]}
                  onChange={(e) => setManualTimes(prev => ({ ...prev, [gameName]: e.target.value }))}
                  required
                  className="w-full px-3 py-1.5 border border-neutral-850 rounded-lg bg-[#1e1e1e] text-neutral-200 focus:border-neutral-700 focus:outline-none transition-all font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] text-neutral-400 font-medium uppercase tracking-wider">Media Comunidad (s)</label>
                <input
                  type="text"
                  placeholder="Ej: 45.7"
                  value={manualMedias[gameName]}
                  onChange={(e) => setManualMedias(prev => ({ ...prev, [gameName]: e.target.value }))}
                  required
                  className="w-full px-3 py-1.5 border border-neutral-855 rounded-lg bg-[#1e1e1e] text-neutral-200 focus:border-neutral-700 focus:outline-none transition-all font-mono"
                />
              </div>
            </div>
          </div>
        ))}
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
      <button
        type="submit"
        className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2.5 rounded-xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
      >
        <PlusCircle className="w-4 h-4" /> Registrar 4 Partidas (Manual)
      </button>
    </form>
  )}
  ```

- [ ] **Step 4: Run compiler to verify success**
  
  Run: `npm run lint`
  Expected: Compilation passes successfully without errors.

- [ ] **Step 5: Run production build check**
  
  Run: `npm run build`
  Expected: Vite builds the bundle successfully.

- [ ] **Step 6: Commit changes**
  
  ```bash
  git add src/presentation/components/NewRunForm.tsx
  git commit -m "feat: implement 4-game manual input fields, state, validation, and layout in NewRunForm"
  ```
