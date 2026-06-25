/**
 * Types representing LinkedIn games tracking data.
 */

export type GameType = 'Patches' | 'Zip' | 'Sudoku' | 'Queens';

export interface GameSummary {
  juego: GameType;
  yo: number;          // Average time (seconds)
  media: number;       // Community average time (seconds)
  diferenciaPct: number; // Percent difference (e.g. -43%)
  ahorroS: number;     // Time saved in seconds
  ahorroPct: number;   // Percent saved
  victoriasPct: number; // Win rate percentage (0.0 to 1.0)
  record: number;      // Best time (seconds)
  peor: number;        // Worst time (seconds)
  contexto: string;    // e.g. "Máximo", "Exploración", "Anomalía"
  rendimiento: number; // media / yo
  volatilidad: number; // Standard deviation or coefficient of variation
}

export interface RawRun {
  id: string;
  timestamp: string;  // ISO date format
  juego: GameType;
  yo: number;         // Time in seconds
  media: number;      // Community average in seconds
  mediaSemana?: number; // 7-day rolling average (seconds)
  ahorro: number;     // media - yo
  contexto: 'Máximo' | 'Exploración' | 'Anomalía' | 'Estándar';
  nota?: string;
}
