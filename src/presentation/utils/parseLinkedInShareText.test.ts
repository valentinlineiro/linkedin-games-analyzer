import { describe, it, expect } from 'vitest';
import { parseLinkedInShareText } from './parseLinkedInShareText';
import { GameType } from '../../domain/types';

const defaults: Record<GameType, number> = {
  Queens: 45,
  Sudoku: 120,
  Patches: 60,
  Zip: 30,
  Chess: 1500,
};

describe('parseLinkedInShareText', () => {
  describe('game detection', () => {
    it('detects Queens (English)', () => {
      const result = parseLinkedInShareText('👑 Queens\n⏱️ 0:22\nCommunity average 0:45', defaults);
      expect(result?.juego).toBe('Queens');
    });

    it('detects Queens (Spanish)', () => {
      const result = parseLinkedInShareText('👑 Reinas\n⏱️ 0:22\nMedia de la comunidad 0:45', defaults);
      expect(result?.juego).toBe('Queens');
    });

    it('detects Sudoku', () => {
      const result = parseLinkedInShareText('Sudoku\n⏱️ 1:30\nCommunity average 2:00', defaults);
      expect(result?.juego).toBe('Sudoku');
    });

    it('detects Patches (English)', () => {
      const result = parseLinkedInShareText('Patches\n⏱️ 0:45\nCommunity average 1:00', defaults);
      expect(result?.juego).toBe('Patches');
    });

    it('detects Patches (Spanish - Mosaico)', () => {
      const result = parseLinkedInShareText('Mosaico\n⏱️ 0:45\nMedia de la comunidad 1:00', defaults);
      expect(result?.juego).toBe('Patches');
    });

    it('detects Zip', () => {
      const result = parseLinkedInShareText('Zip\n⏱️ 0:15\nCommunity average 0:30', defaults);
      expect(result?.juego).toBe('Zip');
    });

    it('returns null for unrecognized text', () => {
      const result = parseLinkedInShareText('nothing here', defaults);
      expect(result).toBeNull();
    });
  });

  describe('colon format (mm:ss)', () => {
    it('parses player time from colon format', () => {
      const result = parseLinkedInShareText('Queens 0:22\nCommunity average 0:45', defaults);
      expect(result?.yo).toBe(22);
    });

    it('parses minutes and seconds', () => {
      const result = parseLinkedInShareText('Queens 1:30\nCommunity average 2:00', defaults);
      expect(result?.yo).toBe(90);
    });

    it('parses community average from its own line', () => {
      const result = parseLinkedInShareText('Queens 0:22\nCommunity average 1:45', defaults);
      expect(result?.media).toBe(105);
    });

    it('does not confuse community average colon time as player time', () => {
      const result = parseLinkedInShareText('Queens new record!\nCommunity average 1:30\nMy time 0:45', defaults);
      expect(result?.yo).toBe(45);
      expect(result?.media).toBe(90);
    });

    it('rejects seconds >= 60 in colon format', () => {
      const result = parseLinkedInShareText('Queens 0:99 0:22', defaults);
      expect(result?.yo).toBe(22);
    });

    it('returns null when only invalid colon times exist', () => {
      const result = parseLinkedInShareText('Queens 0:99', defaults);
      expect(result).toBeNull();
    });
  });

  describe('stopwatch emoji format', () => {
    it('parses ⏱️ seconds format', () => {
      const result = parseLinkedInShareText('👑 Queens\n⏱️ 22s\nCommunity average 45s', defaults);
      expect(result?.yo).toBe(22);
    });

    it('parses ⏱️ minutes and seconds format', () => {
      const result = parseLinkedInShareText('👑 Queens\n⏱️ 1 m 30 s\nCommunity average 2 m 0 s', defaults);
      expect(result?.yo).toBe(90);
    });

    it('parses ⏱️ compact format', () => {
      const result = parseLinkedInShareText('👑 Queens\n⏱️ 1m 30s\nCommunity average 2m', defaults);
      expect(result?.yo).toBe(90);
    });
  });

  describe('general seconds fallback', () => {
    it('parses "X seconds" format', () => {
      const result = parseLinkedInShareText('Queens 22 seconds\nCommunity average 45 seconds', defaults);
      expect(result?.yo).toBe(22);
    });

    it('parses "X segundos" format', () => {
      const result = parseLinkedInShareText('Reinas 22 segundos\nMedia de la comunidad 45 segundos', defaults);
      expect(result?.yo).toBe(22);
    });

    it('parses "Xs" format', () => {
      const result = parseLinkedInShareText('Queens 22s\nCommunity average 45s', defaults);
      expect(result?.yo).toBe(22);
    });

    it('extracts community average as second number when colon and stopwatch fail', () => {
      const result = parseLinkedInShareText('Queens 22 seconds 45 seconds', defaults);
      expect(result?.yo).toBe(22);
      expect(result?.media).toBe(45);
    });
  });

  describe('community average fallback', () => {
    it('uses lastCommunityAverages when no media found', () => {
      const result = parseLinkedInShareText('Queens 0:22', defaults);
      expect(result?.media).toBe(45);
    });

    it('falls back to 0 when no average available', () => {
      const result = parseLinkedInShareText('Queens 0:22', { Queens: 0, Sudoku: 0, Patches: 0, Zip: 0, Chess: 0 });
      expect(result?.media).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('returns null when no player time found', () => {
      const result = parseLinkedInShareText('I like Queens', defaults);
      expect(result).toBeNull();
    });

    it('parses single-line paste with just time', () => {
      const result = parseLinkedInShareText('Queens 0:22', defaults);
      expect(result?.yo).toBe(22);
    });

    it('handles extra whitespace and empty lines', () => {
      const text = '\n\n  Queens   \n  ⏱️  0:22  \n\n  Community average  0:45  \n\n';
      const result = parseLinkedInShareText(text, defaults);
      expect(result?.yo).toBe(22);
      expect(result?.media).toBe(45);
    });

    it('handles Spanish community average format', () => {
      const result = parseLinkedInShareText('Reinas 0:22\nMedia de la comunidad 0:45', defaults);
      expect(result?.media).toBe(45);
    });

    it('prefers community average from dedicated line over fallback', () => {
      const result = parseLinkedInShareText('Queens 0:22\nCommunity average 0:45', { ...defaults, Queens: 999 });
      expect(result?.media).toBe(45);
    });
  });
});
