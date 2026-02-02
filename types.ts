export interface SongData {
  title: string;
  artist: string;
  lyrics: string[]; // Array of lines
  vocabulary?: { word: string; translation: string }[]; // Vocabulary hints
}

export interface WordToken {
  id: string;
  text: string;
  cleanText: string; // Text without punctuation for checking
  pre: string; // Punctuation before
  post: string; // Punctuation after
  isHidden: boolean;
}

export interface LineData {
  id: string;
  words: WordToken[];
  startTime?: number; // Timestamp in seconds for when this line starts in the audio
}

export enum AppState {
  SEARCHING = 'SEARCHING',
  LOADING = 'LOADING',
  WORKSPACE = 'WORKSPACE',
  ERROR = 'ERROR'
}

export type ExerciseMode = 'read' | 'cloze' | 'dictation'; // Read, Fill in blanks, or Dictation

export interface HistoryEntry {
  id: string;
  timestamp: number;
  songTitle: string;
  artist: string;
  score: number;
  difficulty: number;
}
