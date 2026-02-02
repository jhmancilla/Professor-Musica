import { LineData, WordToken } from '../types';

export const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * Parses raw lyric lines into structured LineData with WordTokens.
 * Handles punctuation separation to ensure students only type the word.
 * IDs are now deterministic (L{lineIndex}-W{wordIndex}) to allow state persistence.
 */
export const processLyrics = (lines: string[]): LineData[] => {
  return lines.map((line, lineIdx) => {
    // Split by spaces but keep structure
    const rawWords = line.split(/\s+/);
    
    const words: WordToken[] = rawWords.map((raw, wordIdx) => {
      // Regex to separate punctuation from the word
      // Matches: (starting non-word chars)(word chars)(ending non-word chars)
      const match = raw.match(/^([^\w\u00C0-\u017F]*)([\w\u00C0-\u017F]+)([^\w\u00C0-\u017F]*)$/);
      
      // Create a deterministic ID based on position
      const deterministicId = `L${lineIdx}-W${wordIdx}`;
      
      if (match) {
        return {
          id: deterministicId,
          text: raw,
          pre: match[1] || '',
          cleanText: match[2],
          post: match[3] || '',
          isHidden: false,
        };
      } else {
        // Fallback for symbols or weird formatting
        return {
          id: deterministicId,
          text: raw,
          pre: '',
          cleanText: raw,
          post: '',
          isHidden: false,
        };
      }
    }).filter(w => w.cleanText.length > 0); // Remove empty tokens

    return {
      id: `line-${lineIdx}`,
      words,
      startTime: undefined // Initialize without timestamp
    };
  });
};

/**
 * Applies the cloze (fill-in-the-blank) logic based on difficulty percentage.
 */
export const applyClozeLogic = (lines: LineData[], difficultyPercent: number): LineData[] => {
  // Deep copy to avoid mutating state directly in a bad way
  const newLines = JSON.parse(JSON.stringify(lines)) as LineData[];

  newLines.forEach(line => {
    line.words.forEach(word => {
      // Logic: Random chance to hide, but skip very short words (1-2 chars) usually, unless difficult
      const isShort = word.cleanText.length <= 2;
      const randomVal = Math.random() * 100;
      
      // Reduce probability for short words
      const adjustedDifficulty = isShort ? difficultyPercent * 0.5 : difficultyPercent;

      if (randomVal < adjustedDifficulty) {
        word.isHidden = true;
      } else {
        word.isHidden = false;
      }
    });
  });

  return newLines;
};

/**
 * Applies dictation logic: Hides all words regardless of length or difficulty.
 */
export const applyDictationLogic = (lines: LineData[]): LineData[] => {
  const newLines = JSON.parse(JSON.stringify(lines)) as LineData[];

  newLines.forEach(line => {
    line.words.forEach(word => {
      if (word.cleanText.length > 0) {
        word.isHidden = true;
      }
    });
  });

  return newLines;
};
