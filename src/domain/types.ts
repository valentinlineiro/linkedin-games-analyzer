/**
 * Domain-specific type definitions for LinkedIn games tracking.
 * These are pure models and contain zero dependencies on external frameworks or databases.
 */

export type GameType = 'Patches' | 'Zip' | 'Sudoku' | 'Queens' | 'Chess';

export interface GameConfig {
  direction: 'lower' | 'higher'; // what "better" means for this game
  baselineLabel: string;          // label for the media/reference field
  unit: string;                   // 's' for seconds, '' for rating
}

export const GAME_CONFIGS: Record<GameType, GameConfig> = {
  Patches: { direction: 'lower',  baselineLabel: 'Media comunidad', unit: 's' },
  Zip:     { direction: 'lower',  baselineLabel: 'Media comunidad', unit: 's' },
  Sudoku:  { direction: 'lower',  baselineLabel: 'Media comunidad', unit: 's' },
  Queens:  { direction: 'lower',  baselineLabel: 'Media comunidad', unit: 's' },
  Chess:   { direction: 'higher', baselineLabel: 'Rating potencial', unit: '' },
};

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface SpreadsheetInfo {
  id: string;
  title: string;
  url: string;
}

export interface RawRun {
  id: string;
  timestamp: string;  // ISO date format
  juego: GameType;
  yo: number;         // Time in seconds (or ELO for Chess)
  media: number;      // Community average in seconds (or potential rating for Chess)
  mediaSemana?: number; // 7-day rolling average (seconds)
  ahorro: number;     // media - yo
  contexto: 'Máximo' | 'Exploración' | 'Anomalía' | 'Cansancio';
  nota?: string;
  color?: 'B' | 'N';           // Chess only: Blancas / Negras
  resultado?: 'V' | 'T' | 'D'; // Chess only: Victoria / Tablas / Derrota
}

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
  volatilidad: number; // Coefficient of variation or standard deviation
  deltaSemana: number | null; // avg last 7d minus avg prev 7d (negative = improving)
  totalPartidas: number;
}
