import { GameType } from './types';

// The default record times for new runs (to evaluate "Máximo" context before user has run history)
export const DEFAULT_RECORD_TIMES: Record<GameType, number> = {
  Patches: 7,
  Zip: 7,
  Sudoku: 43,
  Queens: 25,
  Chess: 0, // record for Chess = highest rating achieved; starts at 0 (no data)
};
