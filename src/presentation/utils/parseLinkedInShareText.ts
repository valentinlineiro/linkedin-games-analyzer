import { GameType } from '../../domain/types';

function parseTime(text: string): number | null {
  const colonMatches = text.matchAll(/\b(\d+):(\d+)\b/g);
  for (const m of colonMatches) {
    const secs = parseInt(m[2], 10);
    if (secs < 60) return parseInt(m[1], 10) * 60 + secs;
  }
  return null;
}

function parseTimeMs(text: string): number | null {
  const match = text.match(/(?:(\d+)\s*m\s*)?(\d+)\s*s(?:econds|egundos)?\b/);
  if (match) {
    return (parseInt(match[1] || '0', 10) * 60) + parseInt(match[2], 10);
  }
  return null;
}

function detectGame(text: string): GameType | null {
  if (text.includes('queens') || text.includes('reinas')) return 'Queens';
  if (text.includes('sudoku')) return 'Sudoku';
  if (text.includes('patches') || text.includes('mosaico') || text.includes('crossclimb') || text.includes('caminos')) return 'Patches';
  if (text.includes('zip') || text.includes('pinpoint') || text.includes('enlace')) return 'Zip';
  return null;
}

function findCommunityAverageLine(lines: string[]): string | null {
  for (const line of lines) {
    if (/community\s*average|media\s*(de\s*la\s*)?comunidad/i.test(line)) return line;
  }
  return null;
}

export function parseLinkedInShareText(
  text: string,
  lastCommunityAverages: Record<GameType, number>,
): { juego: GameType; yo: number; media: number } | null {
  const normalized = text.toLowerCase();
  const lines = normalized.split('\n');

  const juego = detectGame(normalized);
  if (!juego) return null;

  let yo: number | null = null;
  let media: number | null = null;

  // Parse community average from its dedicated line first
  const communityLine = findCommunityAverageLine(lines);
  if (communityLine) {
    media = parseTime(communityLine) ?? parseTimeMs(communityLine) ?? null;
  }

  // Parse player time from lines that aren't the community average line
  const playerText = communityLine
    ? lines.filter(l => l !== communityLine).join('\n')
    : normalized;

  // Pattern A: colon format (e.g. 0:22 or 1:45)
  yo = parseTime(playerText);

  // Pattern B: stopwatch icon
  if (yo === null) {
    const yoMatch = normalized.match(/⏱️\s*(?:(\d+)\s*m\s*)?(\d+)\s*s/);
    if (yoMatch) {
      yo = (parseInt(yoMatch[1] || '0', 10) * 60) + parseInt(yoMatch[2], 10);
    }
  }

  // Pattern D: general seconds format fallback
  if (yo === null) {
    const timesFound: number[] = [];
    const regex = /(?:(\d+)\s*m\s*)?(\d+)\s*(?:seconds|segundos|s)\b/g;
    let match;
    while ((match = regex.exec(normalized)) !== null) {
      const mins = parseInt(match[1] || '0', 10);
      const secs = parseInt(match[2], 10);
      timesFound.push(mins * 60 + secs);
    }
    if (timesFound.length >= 1) yo = timesFound[0];
    if (timesFound.length >= 2 && media === null) media = timesFound[1];
  }

  if (yo === null) return null;
  if (media === null) media = lastCommunityAverages[juego] || 0;

  return { juego, yo, media };
}
