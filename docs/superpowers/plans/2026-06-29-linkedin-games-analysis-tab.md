# Pestaña de Análisis Avanzado - Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the "Análisis" tab containing 4 sub-pestañas: Mapa de Calor (calendar heatmap), Rendimiento por Hora (intraday scatter + bars), Tendencia de Volatilidad (weekly coefficient of variation line chart), and Correlación Cruzada (4x4 Pearson matrix), all fully styled in dark mode.

**Architecture:** 
1. Add Vitest to the project to enable unit testing of domain functions.
2. Extend `src/domain/metrics.ts` with pure statistical functions for Pearson correlation, weekly volatility (Coefficient of Variation), and time-of-day aggregates.
3. Build the primary `AnalysisTabContainer` and secondary sub-tabs (`HeatmapPanel`, `TemporalAnalysisPanel`, `VolatilityTrendPanel`, `CrossGameCorrelationPanel`) using React 19 + Recharts + Vanilla CSS + Lucide Icons.
4. Integrate a tab selector in `App.tsx` to toggle between the main "Inicio" Dashboard and the new "Análisis" tab.

**Tech Stack:** React 19, TypeScript, Recharts, Lucide Icons, Vitest, Tailwind CSS (existing styling system).

## Global Constraints
- Naming rules: Spanish labels and descriptions for user-facing UI; English variable names and code.
- Responsive design: All widgets must scale properly on mobile/tablet viewports.
- Pure domain logic: Calculations must be tested independently of React rendering.
- No placeholders or unhandled NaN cases (e.g. dividing by zero or calculating std dev with < 2 elements).

---

### Task 1: Setup Testing & Implement Mathematical Utilities

**Files:**
- Modify: [package.json](file:///home/valentin/code/linkedin-games-analyzer/package.json)
- Create: [metrics.test.ts](file:///home/valentin/code/linkedin-games-analyzer/src/domain/metrics.test.ts)
- Modify: [metrics.ts](file:///home/valentin/code/linkedin-games-analyzer/src/domain/metrics.ts)

**Interfaces:**
- Consumes: `RawRun` and `GameType` from `src/domain/types.ts`
- Produces: 
  - `calculatePearsonCorrelation(runs: RawRun[], gameA: GameType, gameB: GameType): number`
  - `calculateWeeklyVolatility(runs: RawRun[]): { week: string; Patches?: number; Zip?: number; Sudoku?: number; Queens?: number; }[]`
  - `groupRunsByTimeOfDay(runs: RawRun[], game: GameType): { block: string; avgYo: number; count: number; avgRatio: number; }[]`

- [ ] **Step 1: Write test setups and dependencies**
  Install `vitest` as a devDependency and configure `npm test` script in `package.json`.
  Run command: `npm install -D vitest`
  Add `"test": "vitest run"` to scripts in [package.json](file:///home/valentin/code/linkedin-games-analyzer/package.json).

- [ ] **Step 2: Create unit tests for calculations**
  Write test cases in [metrics.test.ts](file:///home/valentin/code/linkedin-games-analyzer/src/domain/metrics.test.ts) validating:
  1. Pearson correlation between games.
  2. Weekly volatility (Coefficient of Variation) calculation.
  3. Intraday time-of-day aggregates.
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { calculatePearsonCorrelation, calculateWeeklyVolatility, groupRunsByTimeOfDay } from './metrics';
  import { RawRun } from './types';

  const mockRuns: RawRun[] = [
    { id: '1', timestamp: '2026-06-01T08:30:00Z', juego: 'Patches', yo: 20, media: 40, ahorro: 20, contexto: 'Exploración' },
    { id: '2', timestamp: '2026-06-01T09:15:00Z', juego: 'Queens', yo: 40, media: 80, ahorro: 40, contexto: 'Exploración' },
    { id: '3', timestamp: '2026-06-02T10:00:00Z', juego: 'Patches', yo: 30, media: 40, ahorro: 10, contexto: 'Exploración' },
    { id: '4', timestamp: '2026-06-02T14:20:00Z', juego: 'Queens', yo: 60, media: 80, ahorro: 20, contexto: 'Exploración' },
  ];

  describe('Análisis Estadístico Avanzado', () => {
    it('calcula correlación de Pearson correctamente', () => {
      const corr = calculatePearsonCorrelation(mockRuns, 'Patches', 'Queens');
      // Con dos puntos de datos correlacionados perfectamente en ratio (ambos ratios son 2.0 en dia 1, y 1.33 en dia 2):
      expect(corr).toBeCloseTo(1.0, 2);
    });

    it('calcula volatilidad semanal correctamente', () => {
      const vol = calculateWeeklyVolatility(mockRuns);
      expect(vol.length).toBeGreaterThan(0);
    });
  });
  ```

- [ ] **Step 3: Run tests to verify they fail**
  Run: `npm test`
  Expected: Compile errors/failures due to missing functions in `src/domain/metrics.ts`.

- [ ] **Step 4: Implement mathematical functions**
  Modify [metrics.ts](file:///home/valentin/code/linkedin-games-analyzer/src/domain/metrics.ts) to export:
  ```typescript
  // Helper to extract YYYY-MM-DD from ISO timestamp
  function getLocalDate(isoString: string): string {
    return isoString.split('T')[0];
  }

  // Helper to get ISO Week number
  function getWeekYearKey(date: Date): string {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
  }

  export function calculatePearsonCorrelation(runs: RawRun[], gameA: GameType, gameB: GameType): number {
    const dates: Record<string, { a?: number; b?: number }> = {};
    
    runs.forEach(r => {
      const date = getLocalDate(r.timestamp);
      if (!dates[date]) dates[date] = {};
      const ratio = r.media / r.yo;
      if (r.juego === gameA) dates[date].a = ratio;
      if (r.juego === gameB) dates[date].b = ratio;
    });

    const pairs: { x: number; y: number }[] = [];
    Object.values(dates).forEach(d => {
      if (d.a !== undefined && d.b !== undefined) {
        pairs.push({ x: d.a, y: d.b });
      }
    });

    if (pairs.length < 2) return 0;

    const n = pairs.length;
    const meanX = pairs.reduce((sum, p) => sum + p.x, 0) / n;
    const meanY = pairs.reduce((sum, p) => sum + p.y, 0) / n;

    let num = 0;
    let denX = 0;
    let denY = 0;

    pairs.forEach(p => {
      const dx = p.x - meanX;
      const dy = p.y - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    });

    const den = Math.sqrt(denX * denY);
    if (den === 0) return 0;
    return Number((num / den).toFixed(2));
  }

  export function calculateWeeklyVolatility(runs: RawRun[]): { week: string; Patches?: number; Zip?: number; Sudoku?: number; Queens?: number; }[] {
    const weeklyData: Record<string, Record<string, number[]>> = {};

    runs.forEach(r => {
      const d = new Date(r.timestamp);
      const weekKey = getWeekYearKey(d);
      if (!weeklyData[weekKey]) weeklyData[weekKey] = {};
      if (!weeklyData[weekKey][r.juego]) weeklyData[weekKey][r.juego] = [];
      weeklyData[weekKey][r.juego].push(r.yo);
    });

    const results = Object.entries(weeklyData).map(([week, games]) => {
      const row: any = { week };
      Object.entries(games).forEach(([juego, times]) => {
        if (times.length < 2) {
          row[juego] = 0; // standard deviation is 0 if only 1 game
          return;
        }
        const mean = times.reduce((s, val) => s + val, 0) / times.length;
        const variance = times.reduce((s, val) => s + Math.pow(val - mean, 2), 0) / times.length;
        const stdDev = Math.sqrt(variance);
        row[juego] = Number((stdDev / mean).toFixed(3)); // Coefficient of Variation
      });
      return row;
    });

    return results.sort((a, b) => a.week.localeCompare(b.week));
  }

  export function groupRunsByTimeOfDay(runs: RawRun[], game: GameType): { block: string; avgYo: number; count: number; avgRatio: number; }[] {
    const filtered = runs.filter(r => r.juego === game && r.contexto !== 'Anomalía');
    const blocks = [
      { name: 'Madrugada (00-06)', min: 0, max: 6, runs: [] as RawRun[] },
      { name: 'Mañana (06-12)', min: 6, max: 12, runs: [] as RawRun[] },
      { name: 'Tarde (12-18)', min: 12, max: 18, runs: [] as RawRun[] },
      { name: 'Noche (18-00)', min: 18, max: 24, runs: [] as RawRun[] },
    ];

    filtered.forEach(r => {
      const hour = new Date(r.timestamp).getHours();
      const block = blocks.find(b => hour >= b.min && hour < b.max);
      if (block) block.runs.push(r);
    });

    return blocks.map(b => {
      const count = b.runs.length;
      const avgYo = count > 0 ? Number((b.runs.reduce((s, r) => s + r.yo, 0) / count).toFixed(1)) : 0;
      const avgRatio = count > 0 ? Number((b.runs.reduce((s, r) => s + (r.media / r.yo), 0) / count).toFixed(2)) : 0;
      return {
        block: b.name,
        avgYo,
        count,
        avgRatio,
      };
    });
  }
  ```

- [ ] **Step 5: Run tests to verify they pass**
  Run: `npm test`
  Expected: PASS

- [ ] **Step 6: Commit**
  ```bash
  git add package.json src/domain/metrics.ts src/domain/metrics.test.ts
  git commit -m "feat: add advanced math utilities and unit tests"
  ```

---

### Task 2: Core Analysis Tab Layout & Dashboard Toggle

**Files:**
- Create: [AnalysisTabContainer.tsx](file:///home/valentin/code/linkedin-games-analyzer/src/presentation/components/AnalysisTabContainer.tsx)
- Modify: [App.tsx](file:///home/valentin/code/linkedin-games-analyzer/src/presentation/App.tsx)

**Interfaces:**
- Consumes: `runs: RawRun[]` and `summaries: GameSummary[]` from parent state.
- Produces: Visual sub-tab toggles and placeholder screen renders.

- [ ] **Step 1: Create Analysis Container**
  Create [AnalysisTabContainer.tsx](file:///home/valentin/code/linkedin-games-analyzer/src/presentation/components/AnalysisTabContainer.tsx) with a secondary sub-tab bar to select between the 4 components.
  ```typescript
  import React, { useState } from 'react';
  import { RawRun, GameSummary } from '../../domain/types';
  import { Calendar, Clock, Activity, BarChart2 } from 'lucide-react';

  interface AnalysisTabContainerProps {
    runs: RawRun[];
    summaries: GameSummary[];
  }

  type SubTabType = 'heatmap' | 'temporal' | 'volatility' | 'correlation';

  export default function AnalysisTabContainer({ runs, summaries }: AnalysisTabContainerProps) {
    const [activeTab, setActiveTab] = useState<SubTabType>('heatmap');

    const subTabs = [
      { id: 'heatmap', label: 'Mapa de Calor', icon: Calendar },
      { id: 'temporal', label: 'Rendimiento por Hora', icon: Clock },
      { id: 'volatility', label: 'Tendencia de Volatilidad', icon: Activity },
      { id: 'correlation', label: 'Correlación Cruzada', icon: BarChart2 },
    ] as const;

    return (
      <div className="space-y-6" id="analysis-tab-container">
        {/* Navigation bar */}
        <div className="flex flex-wrap gap-2 p-1.5 bg-neutral-950 border border-neutral-800 rounded-2xl w-fit" id="analysis-sub-tabs">
          {subTabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-neutral-800 text-white shadow-sm border border-neutral-700'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content area */}
        <div className="bg-[#111111] border border-neutral-800 rounded-3xl p-6 min-h-[400px]">
          {activeTab === 'heatmap' && <div id="subtab-heatmap">Mapa de Calor (Placeholder)</div>}
          {activeTab === 'temporal' && <div id="subtab-temporal">Rendimiento por Hora (Placeholder)</div>}
          {activeTab === 'volatility' && <div id="subtab-volatility">Tendencia de Volatilidad (Placeholder)</div>}
          {activeTab === 'correlation' && <div id="subtab-correlation">Correlación Cruzada (Placeholder)</div>}
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: Update App.tsx layout to support Tab Selector**
  Modify [App.tsx](file:///home/valentin/code/linkedin-games-analyzer/src/presentation/App.tsx):
  1. Add a `useState<'dashboard' | 'analysis'>` state.
  2. In the header or right below the header, add navigation buttons for "Inicio" and "Análisis" (called "Análisis" as requested).
  3. Condition render based on active tab.
  ```typescript
  // In App.tsx:
  const [activeMainTab, setActiveMainTab] = React.useState<'dashboard' | 'analysis'>('dashboard');
  
  // Tab Bar HTML right under header or in header:
  <div className="flex bg-[#111111] border border-neutral-800 p-1 rounded-xl text-xs gap-1">
    <button
      onClick={() => setActiveMainTab('dashboard')}
      className={`px-4 py-1.5 rounded-lg font-semibold transition-all ${
        activeMainTab === 'dashboard' ? 'bg-neutral-800 text-white border border-neutral-700' : 'text-neutral-400 hover:text-white'
      }`}
    >
      Inicio
    </button>
    <button
      onClick={() => setActiveMainTab('analysis')}
      className={`px-4 py-1.5 rounded-lg font-semibold transition-all ${
        activeMainTab === 'analysis' ? 'bg-neutral-800 text-white border border-neutral-700' : 'text-neutral-400 hover:text-white'
      }`}
    >
      Análisis
    </button>
  </div>
  ```

- [ ] **Step 3: Run compiler checks to verify TypeScript builds**
  Run: `npm run lint`
  Expected: Successful compilation.

- [ ] **Step 4: Commit**
  ```bash
  git add src/presentation/components/AnalysisTabContainer.tsx src/presentation/App.tsx
  git commit -m "feat: add main Analysis tab container and navigation bar"
  ```

---

### Task 3: Calendar Heatmap Component (`HeatmapPanel.tsx`)

**Files:**
- Create: [HeatmapPanel.tsx](file:///home/valentin/code/linkedin-games-analyzer/src/presentation/components/HeatmapPanel.tsx)
- Modify: [AnalysisTabContainer.tsx](file:///home/valentin/code/linkedin-games-analyzer/src/presentation/components/AnalysisTabContainer.tsx)

**Interfaces:**
- Consumes: `runs: RawRun[]` from parent state.

- [ ] **Step 1: Create HeatmapPanel component**
  Write [HeatmapPanel.tsx](file:///home/valentin/code/linkedin-games-analyzer/src/presentation/components/HeatmapPanel.tsx) with a calendar rendering logic:
  - Generate calendar grid days for the last 6 months (26 weeks) or full year (52 weeks).
  - Calculate color intensity based on selected dropdown: "Todos" or specific game.
  - Expose tooltip details.
  - Implement full styling.

- [ ] **Step 2: Integrate in AnalysisTabContainer**
  Modify [AnalysisTabContainer.tsx](file:///home/valentin/code/linkedin-games-analyzer/src/presentation/components/AnalysisTabContainer.tsx) to import and render `HeatmapPanel`:
  ```typescript
  import HeatmapPanel from './HeatmapPanel';
  // replace placeholder:
  {activeTab === 'heatmap' && <HeatmapPanel runs={runs} />}
  ```

- [ ] **Step 3: Run compiler checks**
  Run: `npm run lint`
  Expected: Successful compilation.

- [ ] **Step 4: Commit**
  ```bash
  git add src/presentation/components/HeatmapPanel.tsx src/presentation/components/AnalysisTabContainer.tsx
  git commit -m "feat: implement Calendar Heatmap sub-panel component"
  ```

---

### Task 4: Hourly Performance Component (`TemporalAnalysisPanel.tsx`)

**Files:**
- Create: [TemporalAnalysisPanel.tsx](file:///home/valentin/code/linkedin-games-analyzer/src/presentation/components/TemporalAnalysisPanel.tsx)
- Modify: [AnalysisTabContainer.tsx](file:///home/valentin/code/linkedin-games-analyzer/src/presentation/components/AnalysisTabContainer.tsx)

**Interfaces:**
- Consumes: `runs: RawRun[]`

- [ ] **Step 1: Create TemporalAnalysisPanel component**
  Implement [TemporalAnalysisPanel.tsx](file:///home/valentin/code/linkedin-games-analyzer/src/presentation/components/TemporalAnalysisPanel.tsx):
  - Game selector dropdown.
  - Recharts Scatter Plot showing points of runs mapped to exact hours (`Date.getHours()`).
  - Bar chart showing average performance per time block (Madrugada, Mañana, Tarde, Noche) using `groupRunsByTimeOfDay` utility.
  - Text summary highlighting the fastest and slowest slots.

- [ ] **Step 2: Integrate in AnalysisTabContainer**
  Replace temporal placeholder in [AnalysisTabContainer.tsx](file:///home/valentin/code/linkedin-games-analyzer/src/presentation/components/AnalysisTabContainer.tsx):
  ```typescript
  import TemporalAnalysisPanel from './TemporalAnalysisPanel';
  {activeTab === 'temporal' && <TemporalAnalysisPanel runs={runs} />}
  ```

- [ ] **Step 3: Run compiler checks**
  Run: `npm run lint`
  Expected: Successful compilation.

- [ ] **Step 4: Commit**
  ```bash
  git add src/presentation/components/TemporalAnalysisPanel.tsx src/presentation/components/AnalysisTabContainer.tsx
  git commit -m "feat: implement Temporal Performance (hourly scatter/bar) sub-panel"
  ```

---

### Task 5: Volatility Trend Component (`VolatilityTrendPanel.tsx`)

**Files:**
- Create: [VolatilityTrendPanel.tsx](file:///home/valentin/code/linkedin-games-analyzer/src/presentation/components/VolatilityTrendPanel.tsx)
- Modify: [AnalysisTabContainer.tsx](file:///home/valentin/code/linkedin-games-analyzer/src/presentation/components/AnalysisTabContainer.tsx)

**Interfaces:**
- Consumes: `runs: RawRun[]`

- [ ] **Step 1: Create VolatilityTrendPanel component**
  Implement [VolatilityTrendPanel.tsx](file:///home/valentin/code/linkedin-games-analyzer/src/presentation/components/VolatilityTrendPanel.tsx):
  - Weekly volatility data retriever using `calculateWeeklyVolatility`.
  - Recharts `LineChart` showing weekly Coefficient of Variation lines for selected games (with toggle checkboxes to show/hide lines).
  - Interpretative box explaining what Coefficient of Variation means.

- [ ] **Step 2: Integrate in AnalysisTabContainer**
  Replace volatility placeholder in [AnalysisTabContainer.tsx](file:///home/valentin/code/linkedin-games-analyzer/src/presentation/components/AnalysisTabContainer.tsx):
  ```typescript
  import VolatilityTrendPanel from './VolatilityTrendPanel';
  {activeTab === 'volatility' && <VolatilityTrendPanel runs={runs} />}
  ```

- [ ] **Step 3: Run compiler checks**
  Run: `npm run lint`
  Expected: Successful compilation.

- [ ] **Step 4: Commit**
  ```bash
  git add src/presentation/components/VolatilityTrendPanel.tsx src/presentation/components/AnalysisTabContainer.tsx
  git commit -m "feat: implement Volatility Trend weekly line chart sub-panel"
  ```

---

### Task 6: Cross-Game Correlation Matrix Component (`CrossGameCorrelationPanel.tsx`)

**Files:**
- Create: [CrossGameCorrelationPanel.tsx](file:///home/valentin/code/linkedin-games-analyzer/src/presentation/components/CrossGameCorrelationPanel.tsx)
- Modify: [AnalysisTabContainer.tsx](file:///home/valentin/code/linkedin-games-analyzer/src/presentation/components/AnalysisTabContainer.tsx)

**Interfaces:**
- Consumes: `runs: RawRun[]`

- [ ] **Step 1: Create CrossGameCorrelationPanel component**
  Implement [CrossGameCorrelationPanel.tsx](file:///home/valentin/code/linkedin-games-analyzer/src/presentation/components/CrossGameCorrelationPanel.tsx):
  - Calculate 4x4 correlation matrix using `calculatePearsonCorrelation` on all game pairs.
  - Style the matrix utilizing grid layout, with background colors corresponding to Pearson $r$ intensity (Emerald positive, dark neutral no-correlation, rose negative).
  - Add text cards describing the strongest positive/negative correlations dynamically based on calculations.

- [ ] **Step 2: Integrate in AnalysisTabContainer**
  Replace correlation placeholder in [AnalysisTabContainer.tsx](file:///home/valentin/code/linkedin-games-analyzer/src/presentation/components/AnalysisTabContainer.tsx):
  ```typescript
  import CrossGameCorrelationPanel from './CrossGameCorrelationPanel';
  {activeTab === 'correlation' && <CrossGameCorrelationPanel runs={runs} />}
  ```

- [ ] **Step 3: Run compiler checks and production build to verify full correctness**
  Run: `npm run lint && npm run build`
  Expected: Successful compilation and build bundles without errors.

- [ ] **Step 4: Commit**
  ```bash
  git add src/presentation/components/CrossGameCorrelationPanel.tsx src/presentation/components/AnalysisTabContainer.tsx
  git commit -m "feat: implement Cross Game Correlation matrix sub-panel"
  ```
