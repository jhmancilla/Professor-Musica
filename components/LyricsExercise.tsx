import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LineData, WordToken, ExerciseMode } from '../types';
import { applyClozeLogic, applyDictationLogic, processLyrics } from '../utils/textUtils';
import confetti from 'canvas-confetti';

interface LyricsExerciseProps {
  rawLyrics: string[];
  title: string;
  artist: string;
  vocabulary?: { word: string; translation: string }[];
  onComplete?: (score: number, difficulty: number) => void;
  currentTime?: number; // Added to support syncing
}

const LyricsExercise: React.FC<LyricsExerciseProps> = ({ 
    rawLyrics, title, artist, vocabulary = [], onComplete, currentTime = 0 
}) => {
  // Generate a unique storage key for this specific song
  const storageKey = `pm_progress_${title.replace(/\s+/g, '')}_${artist.replace(/\s+/g, '')}`;

  // Config State
  const [difficulty, setDifficulty] = useState<number>(30); // 30% hidden default
  const [mode, setMode] = useState<ExerciseMode>('read');
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [isSyncMode, setIsSyncMode] = useState<boolean>(false); // Sync Mode
  const [isManualEdit, setIsManualEdit] = useState<boolean>(false); // Manual Blank Creation Mode
  
  // Exercise State
  const [lines, setLines] = useState<LineData[]>([]);
  const [userInputs, setUserInputs] = useState<Record<string, string>>({});
  const [isChecked, setIsChecked] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Refs for auto-scroll
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Initialize Lyrics & Restore from Storage
  useEffect(() => {
    const savedState = localStorage.getItem(storageKey);
    
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.lines && parsed.lines.length === rawLyrics.length) {
          setLines(parsed.lines);
          setDifficulty(parsed.difficulty ?? 30);
          setMode(parsed.mode);
          setUserInputs(parsed.userInputs || {});
          setIsChecked(parsed.isChecked || false);
          setScore(parsed.score || null);
          if (parsed.isFocusMode !== undefined) setIsFocusMode(parsed.isFocusMode);
          setIsLoaded(true);
          return;
        }
      } catch (e) {
        console.error("Failed to restore progress", e);
      }
    }

    const processed = processLyrics(rawLyrics);
    setLines(processed);
    setIsLoaded(true);
  }, [rawLyrics, storageKey]);

  // Save State on Change
  useEffect(() => {
    if (!isLoaded) return; 
    const stateToSave = {
      lines, // Includes startTimes and isHidden states
      difficulty,
      mode,
      userInputs,
      isChecked,
      score,
      isFocusMode
    };
    localStorage.setItem(storageKey, JSON.stringify(stateToSave));
  }, [lines, difficulty, mode, userInputs, isChecked, score, isFocusMode, storageKey, isLoaded]);

  // Generate exercise (resetting word visibility logic but trying to keep metadata if possible)
  const generateExercise = useCallback((overrideMode?: ExerciseMode) => {
    const targetMode = overrideMode || (mode === 'read' ? 'cloze' : mode);
    
    const freshProcessed = processLyrics(rawLyrics);
    
    // Preserve Timestamps from current state
    const linesWithTimestamps = freshProcessed.map((line, idx) => {
        if (lines[idx] && lines[idx].startTime !== undefined) {
            return { ...line, startTime: lines[idx].startTime };
        }
        return line;
    });

    let finalLines: LineData[];

    if (targetMode === 'dictation') {
        finalLines = applyDictationLogic(linesWithTimestamps);
    } else {
        // Default to cloze logic
        finalLines = applyClozeLogic(linesWithTimestamps, difficulty);
    }
    
    setLines(finalLines);
    setUserInputs({});
    setIsChecked(false);
    setScore(null);
    setMode(targetMode);
    setIsManualEdit(false); // Disable manual edit when regenerating
  }, [rawLyrics, difficulty, mode, lines]);

  const handleModeChange = (newMode: ExerciseMode) => {
    if (newMode === mode) return;

    if (newMode === 'read') {
      setMode('read');
      // Just unhide everything but keep the lines object structure (preserving startTime)
      const readModeLines = lines.map(line => ({
          ...line,
          words: line.words.map(w => ({ ...w, isHidden: false }))
      }));
      setLines(readModeLines);
      setIsChecked(false);
      setScore(null);
      setIsFocusMode(false);
      setIsManualEdit(false);
    } else {
      generateExercise(newMode);
    }
  };

  const handleInputChange = (id: string, value: string) => {
    setUserInputs(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const toggleWordVisibility = (lineIndex: number, wordIndex: number) => {
    setLines(prevLines => {
        const newLines = [...prevLines];
        const line = { ...newLines[lineIndex] };
        const words = [...line.words];
        const word = { ...words[wordIndex] };
        
        // Toggle visibility
        word.isHidden = !word.isHidden;
        
        // Update structure
        words[wordIndex] = word;
        line.words = words;
        newLines[lineIndex] = line;
        return newLines;
    });
    
    // If we hide a word, reset its check status if needed
    if (isChecked) setIsChecked(false);
  };

  const handleLineClick = useCallback((lineIndex: number) => {
      // Only useful in Sync Mode
      if (isSyncMode) {
          setLines(prevLines => {
            const updatedLines = [...prevLines];
            updatedLines[lineIndex] = {
                ...updatedLines[lineIndex],
                startTime: currentTime
            };
            return updatedLines;
          });
      }
  }, [isSyncMode, currentTime]);

  const clearSync = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Isso apagará todas as marcações de tempo sincronizadas. Deseja continuar?")) {
        // Use functional update to ensure we have the latest state and trigger re-render
        setLines(prevLines => prevLines.map(l => ({ ...l, startTime: undefined })));
    }
  };

  // Keyboard shortcut for Sync Mode (Spacebar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (isSyncMode && e.code === 'Space') {
            e.preventDefault(); 
            
            const nextIndex = lines.findIndex(l => l.startTime === undefined);
            
            if (nextIndex !== -1) {
                setLines(prevLines => {
                    const updatedLines = [...prevLines];
                    updatedLines[nextIndex] = {
                        ...updatedLines[nextIndex],
                        startTime: currentTime
                    };
                    return updatedLines;
                });
                
                if (lineRefs.current[nextIndex]) {
                    lineRefs.current[nextIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }
    };

    if (isSyncMode) {
        window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isSyncMode, lines, currentTime]);

  const checkAnswers = () => {
    let correct = 0;
    let totalBlanks = 0;

    lines.forEach(line => {
      line.words.forEach(word => {
        if (word.isHidden) {
          totalBlanks++;
          // Strict check: Trim whitespace and lowercase.
          // This ensures "exact" matching of the word characters.
          const val = userInputs[word.id]?.trim().toLowerCase() || '';
          if (val === word.cleanText.toLowerCase()) {
            correct++;
          }
        }
      });
    });

    // Score Logic:
    // Base 100 points.
    // Subtract 1 point for every error (Total Blanks - Correct Answers).
    // Minimum score is 0.
    const errors = totalBlanks - correct;
    const calculatedScore = Math.max(0, 100 - errors);

    setScore(calculatedScore);
    setIsChecked(true);
    setIsFocusMode(false); 
    setIsManualEdit(false); // Disable manual edit on check
    
    if (onComplete) {
        onComplete(calculatedScore, mode === 'dictation' ? 100 : difficulty);
    }

    if (calculatedScore > 80) {
        confetti({
            particleCount: 150,
            spread: 90,
            origin: { y: 0.6 },
            colors: ['#6366f1', '#ec4899', '#a855f7', '#ffffff']
        });
    }
  };

  // FIXED LOGIC: Determine active line correctly even with gaps
  const getActiveLineIndex = () => {
      if (isSyncMode) return -1;
      
      let currentActive = -1;
      
      // Iterate through ALL lines to find the best candidate
      for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          
          // If this line has a timestamp and that time has passed (or is now)
          if (line.startTime !== undefined && line.startTime <= currentTime) {
              currentActive = i;
          } 
          
          // Optimization: If we find a line that starts in the FUTURE, 
          // we stop looking. The 'currentActive' we found previously is the correct one.
          if (line.startTime !== undefined && line.startTime > currentTime) {
              break;
          }
      }
      
      return currentActive;
  };

  const activeLineIndex = getActiveLineIndex();

  useEffect(() => {
    if (activeLineIndex !== -1 && !isSyncMode) {
        const el = lineRefs.current[activeLineIndex];
        if (el) {
            el.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
        }
    }
  }, [activeLineIndex, isSyncMode]);

  if (!isLoaded) return <div className="p-12 text-center text-slate-400 font-medium">Carregando partitura...</div>;

  return (
    <div className="flex flex-col h-full font-sans">
      {/* Controls Header (Floating Glass) */}
      <div className="sticky top-4 mx-4 z-20 rounded-2xl bg-white/80 backdrop-blur-md border border-white/40 shadow-lg shadow-slate-200/50 p-2 transition-all duration-300">
        <div className="flex flex-col md:flex-row justify-between items-center gap-3">
          
          {/* Mode Switcher */}
          <div className="flex bg-slate-100/80 p-1 rounded-xl shrink-0 border border-slate-200/50">
            {(['read', 'cloze', 'dictation'] as const).map((m) => (
                <button
                    key={m}
                    onClick={() => handleModeChange(m)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                        mode === m 
                        ? 'bg-white text-indigo-600 shadow-sm transform scale-105' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`}
                >
                    {m === 'read' ? 'Ler' : m === 'cloze' ? 'Completar' : 'Ditado'}
                </button>
            ))}
          </div>

          {/* Center Area: Difficulty, Focus, Sync, Manual Edit */}
          <div className="flex items-center justify-center gap-2 flex-1 flex-wrap">
             {/* Sync Toggle */}
             <button
                onClick={() => setIsSyncMode(!isSyncMode)}
                disabled={isManualEdit}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border transition-all ${
                    isSyncMode
                    ? 'bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/30' 
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
             >
                <div className={`w-2 h-2 rounded-full ${isSyncMode ? 'bg-white animate-pulse' : 'bg-slate-400'}`}></div>
                {isSyncMode ? 'Gravando' : 'Sincronizar'}
             </button>

             {/* Manual Edit Toggle */}
             {!isSyncMode && (
                 <button
                    onClick={() => setIsManualEdit(!isManualEdit)}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border transition-all ${
                        isManualEdit
                        ? 'bg-amber-400 text-white border-amber-400 shadow-lg shadow-amber-400/30' 
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                 >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    {isManualEdit ? 'Editando' : 'Editar'}
                 </button>
             )}

             {/* Focus Mode */}
             {mode !== 'read' && !isSyncMode && !isManualEdit && (
                <button
                    onClick={() => setIsFocusMode(!isFocusMode)}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border transition-all ${
                        isFocusMode 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/30' 
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                >
                    Foco
                </button>
             )}

             {/* Difficulty Slider */}
             {mode === 'cloze' && !isSyncMode && !isManualEdit && (
                <div className="flex items-center gap-2 flex-1 max-w-[140px] px-2 bg-slate-50 rounded-full border border-slate-200 h-8">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Dif</span>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="10"
                    value={difficulty}
                    onChange={(e) => setDifficulty(Number(e.target.value))}
                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    disabled={isChecked === false && Object.keys(userInputs).length > 0} 
                  />
                  <span className="text-xs font-bold text-indigo-600 w-6 text-right">{difficulty}%</span>
                </div>
              )}
          </div>

          {/* Actions */}
          {!isSyncMode && !isManualEdit && mode !== 'read' && (
            <div className="flex items-center gap-3">
              {isChecked && score !== null && (
                 <div className={`font-bold text-xl px-2 ${score > 70 ? 'text-green-500' : 'text-orange-500'}`}>
                   {score}
                 </div>
              )}
              <button
                onClick={isChecked ? () => generateExercise() : checkAnswers}
                className={`px-5 py-2 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${
                    isChecked 
                    ? 'bg-slate-700 hover:bg-slate-800' 
                    : 'bg-gradient-to-r from-indigo-500 to-fuchsia-600 hover:shadow-indigo-500/30'
                }`}
              >
                {isChecked ? 'Reiniciar' : 'Verificar'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sync Mode Instructions */}
      {isSyncMode && (
         <div className="mt-4 mx-4 bg-rose-50 border border-rose-100 rounded-xl p-3 text-center animate-in slide-in-from-top duration-300">
            <p className="text-rose-800 text-sm font-medium">
                🔴 <strong>REC:</strong> Clique na linha ou aperte <strong>ESPAÇO</strong> ao ouvir a frase.
                <button onClick={clearSync} className="ml-4 underline text-rose-600 hover:text-rose-900 text-xs font-bold uppercase">Limpar tudo</button>
            </p>
         </div>
      )}

      {/* Manual Edit Instructions */}
      {isManualEdit && (
         <div className="mt-4 mx-4 bg-amber-50 border border-amber-100 rounded-xl p-3 text-center animate-in slide-in-from-top duration-300">
            <p className="text-amber-800 text-sm font-medium">
                ✏️ <strong>Editor:</strong> Clique nas palavras para criar/remover lacunas.
            </p>
         </div>
      )}

      {/* Lyrics Content */}
      <div className={`flex-1 overflow-y-auto px-4 md:px-12 py-8 transition-colors duration-500 ${isFocusMode ? 'bg-slate-100' : 'bg-transparent'}`}>
        <div className="max-w-3xl mx-auto space-y-8 pb-32">
          {lines.map((line, index) => {
             const isActive = activeLineIndex === index;
             const hasTime = line.startTime !== undefined;
             
             return (
                <div 
                    key={line.id} 
                    ref={el => { lineRefs.current[index] = el; }}
                    onClick={() => handleLineClick(index)}
                    className={`
                        relative flex flex-wrap items-baseline leading-loose text-xl md:text-2xl gap-x-2 gap-y-2 p-4 rounded-2xl transition-all duration-500
                        ${isSyncMode ? 'cursor-pointer hover:bg-rose-50 border border-transparent hover:border-rose-200' : ''}
                        ${isActive 
                            ? 'bg-white shadow-xl shadow-indigo-200/50 scale-[1.02] -mx-4 px-8 border-l-4 border-l-indigo-500 z-10' 
                            : 'text-slate-600 hover:text-slate-900'
                        }
                    `}
                >
                  {/* Sync Indicator */}
                  {isSyncMode && (
                     <div className="absolute -left-12 top-1/2 -translate-y-1/2 w-10 text-right">
                         {hasTime ? (
                            <span className="text-[10px] font-mono font-bold bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-md border border-rose-200">{line.startTime?.toFixed(1)}s</span>
                         ) : (
                            <span className="text-slate-300 text-xs">--:--</span>
                         )}
                     </div>
                  )}

                  {line.words.map((word, wIdx) => (
                    <WordComponent
                      key={word.id}
                      word={word}
                      inputValue={userInputs[word.id] || ''}
                      onChange={(val) => handleInputChange(word.id, val)}
                      isChecked={isChecked}
                      vocabulary={vocabulary}
                      isFocusMode={isFocusMode}
                      isActive={isActive}
                      isManualEdit={isManualEdit}
                      onToggleVisibility={() => toggleWordVisibility(index, wIdx)}
                    />
                  ))}
                </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Sub-component for individual words
interface WordComponentProps {
  word: WordToken;
  inputValue: string;
  onChange: (val: string) => void;
  isChecked: boolean;
  vocabulary: { word: string; translation: string }[];
  isFocusMode?: boolean;
  isActive?: boolean;
  isManualEdit: boolean;
  onToggleVisibility: () => void;
}

const WordComponent: React.FC<WordComponentProps> = ({ 
    word, inputValue, onChange, isChecked, vocabulary, isFocusMode = false, isActive = false, isManualEdit, onToggleVisibility
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const vocabEntry = vocabulary.find(v => v.word.toLowerCase() === word.cleanText.toLowerCase());

  const Tooltip = () => (
    <span 
      className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-max max-w-[220px] bg-slate-800/90 backdrop-blur-sm text-white text-sm p-3 rounded-xl shadow-xl transition-all z-50 pointer-events-none transform -translate-y-1 ${
        showTooltip ? 'opacity-100 visible' : 'opacity-0 invisible'
      }`}
    >
      <strong className="block text-indigo-300 border-b border-white/10 pb-1 mb-1 font-serif italic text-lg">{vocabEntry?.word}</strong>
      <span className="text-slate-200 font-light">{vocabEntry?.translation}</span>
      <span className="absolute top-full left-1/2 -translate-x-1/2 border-6 border-transparent border-t-slate-800/90"></span>
    </span>
  );

  // LOGIC: Show Text if NOT hidden. 
  if (!word.isHidden) {
    const shouldDim = isFocusMode && !isActive;
    
    const dimmingClass = shouldDim
        ? "opacity-30 blur-[1px] hover:opacity-100 hover:blur-0 transition-all duration-500 grayscale" 
        : "opacity-100";

    const activeTextClass = isActive 
        ? "text-slate-900 font-semibold drop-shadow-sm" 
        : "font-normal";
    
    const vocabClass = (!isManualEdit && vocabEntry) 
        ? 'cursor-help decoration-indigo-300/50 decoration-wavy underline underline-offset-4 text-indigo-900' 
        : '';
        
    // In edit mode, highlight hover
    const editClass = isManualEdit ? "cursor-pointer hover:bg-amber-200 hover:text-amber-900 rounded px-1 transition-colors" : "";

    return (
      <span 
        className={`${activeTextClass} relative group ${vocabClass} ${dimmingClass} ${editClass}`}
        onClick={(e) => {
          if (isManualEdit) {
            e.preventDefault();
            e.stopPropagation();
            onToggleVisibility();
          } else if (vocabEntry) {
            e.stopPropagation();
            setShowTooltip(!showTooltip);
          }
        }}
        onMouseEnter={() => vocabEntry && !isManualEdit && setShowTooltip(true)}
        onMouseLeave={() => vocabEntry && !isManualEdit && setShowTooltip(false)}
      >
        {word.text}
        {!isManualEdit && vocabEntry && <Tooltip />}
      </span>
    );
  }

  // ---- INPUT FIELD (Hidden Word) ----
  
  const inputWidth = `${Math.max(word.cleanText.length * 16, 70)}px`;
  
  let statusClass = "border-slate-300 bg-slate-50 focus:border-indigo-500 focus:ring-indigo-200 text-slate-700";
  
  if (isChecked) {
    const isCorrect = inputValue.trim().toLowerCase() === word.cleanText.toLowerCase();
    statusClass = isCorrect 
      ? "border-green-400 bg-green-50 text-green-700 font-bold" 
      : "border-rose-400 bg-rose-50 text-rose-700 line-through decoration-rose-400";
  } else if (inputValue.length > 0) {
      statusClass = "border-indigo-300 bg-white text-indigo-900 font-medium shadow-sm";
  }

  const focusInputClass = (isFocusMode || isActive) ? "shadow-md scale-110 mx-1" : "";
  const editInputClass = isManualEdit ? "cursor-pointer ring-2 ring-amber-300" : "";

  return (
    <span 
        className={`inline-flex items-center group relative transition-transform duration-300 ${focusInputClass}`}
        onClick={isManualEdit ? (e) => { e.preventDefault(); e.stopPropagation(); onToggleVisibility(); } : undefined}
    >
      {word.pre}
      <div className="relative inline-block mx-0.5">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => onChange(e.target.value)}
          disabled={isChecked || isManualEdit} 
          style={{ width: inputWidth }}
          className={`px-2 py-1 text-center rounded-lg border-b-2 outline-none transition-all ${statusClass} ${editInputClass}`}
          autoComplete="off"
        />
        
        {isChecked && inputValue.trim().toLowerCase() !== word.cleanText.toLowerCase() && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-20 animate-bounce">
                <span className="text-xs font-bold text-white bg-rose-500 px-2 py-1 rounded-md shadow-lg whitespace-nowrap">
                    {word.cleanText}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-rose-500"></div>
                </span>
            </div>
        )}
      </div>
      {word.post}
    </span>
  );
};

export default LyricsExercise;