import React, { useState, useEffect } from 'react';
import SearchBar from './components/SearchBar';
import LyricsExercise from './components/LyricsExercise';
import LocalVideoPlayer from './components/LocalVideoPlayer';
import { fetchSongLyrics } from './services/geminiService';
import { AppState, SongData, HistoryEntry } from './types';

const App: React.FC = () => {
  // State: App Flow
  const [appState, setAppState] = useState<AppState>(AppState.SEARCHING);
  const [songData, setSongData] = useState<SongData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // State: Media Playback
  const [currentMediaTime, setCurrentMediaTime] = useState<number>(0);

  // State: User & History
  const [studentName, setStudentName] = useState<string>('');
  const [showNameModal, setShowNameModal] = useState<boolean>(true);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  // Load User & History on Mount
  useEffect(() => {
    const storedName = localStorage.getItem('pm_student_name');
    if (storedName) {
      setStudentName(storedName);
      setShowNameModal(false);
    }

    const storedHistory = localStorage.getItem('pm_student_history');
    if (storedHistory) {
      try {
        setHistory(JSON.parse(storedHistory));
      } catch (e) { console.error("History parse error", e); }
    }
  }, []);

  const handleSaveName = (name: string) => {
    if (!name.trim()) return;
    setStudentName(name);
    localStorage.setItem('pm_student_name', name);
    setShowNameModal(false);
  };

  const handleSaveProgress = (score: number, difficulty: number) => {
    if (!songData) return;
    
    const newEntry: HistoryEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      songTitle: songData.title,
      artist: songData.artist,
      score,
      difficulty
    };

    const newHistory = [newEntry, ...history];
    setHistory(newHistory);
    localStorage.setItem('pm_student_history', JSON.stringify(newHistory));
  };

  const handleSearch = async (query: string, customLyrics?: string) => {
    setAppState(AppState.LOADING);
    setErrorMessage(null);
    
    try {
      const data = await fetchSongLyrics(query, customLyrics);
      setSongData(data);
      setAppState(AppState.WORKSPACE);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred.");
      setAppState(AppState.ERROR);
    }
  };

  const handleReset = () => {
    setAppState(AppState.SEARCHING);
    setSongData(null);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      
      {/* Name Modal */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 transition-all duration-300">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full animate-[fadeIn_0.4s_ease-out] border border-white/20 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-2 musical-gradient"></div>
             <div className="text-center mb-6">
                <span className="text-4xl mb-2 block">👋</span>
                <h2 className="text-3xl font-bold text-slate-800">¡Hola!</h2>
                <p className="text-slate-500 mt-2">Vamos personalizar sua experiência.</p>
             </div>
             <form onSubmit={(e) => { e.preventDefault(); const val = (e.target as any).elements.name.value; handleSaveName(val); }}>
                <div className="relative group">
                    <input 
                      name="name" 
                      autoFocus 
                      className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 outline-none text-lg text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-center font-medium"
                      placeholder="Qual é o seu nome?"
                    />
                </div>
                <button type="submit" className="w-full mt-6 musical-gradient text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all">
                  Começar a Aula
                </button>
             </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={() => setShowHistory(false)}>
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-[fadeIn_0.2s_ease-out] overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Histórico de {studentName}</h3>
                 </div>
                 <button onClick={() => setShowHistory(false)} className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>
              <div className="overflow-y-auto p-6 space-y-3 bg-slate-50/30">
                  {history.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4 grayscale opacity-30">🎵</div>
                        <p className="text-slate-400 font-medium">Nenhum exercício concluído ainda.</p>
                    </div>
                  ) : (
                    history.map(entry => (
                      <div key={entry.id} className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                         <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold ${entry.score >= 70 ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                                {entry.score}
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 text-lg leading-tight">{entry.songTitle}</p>
                                <p className="text-sm text-slate-500 font-medium">{entry.artist}</p>
                            </div>
                         </div>
                         <div className="text-right hidden sm:block">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Dificuldade</span>
                            <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                              {entry.difficulty}%
                            </span>
                            <p className="text-[10px] text-slate-400 mt-1">{new Date(entry.timestamp).toLocaleDateString('pt-BR')}</p>
                         </div>
                      </div>
                    ))
                  )}
              </div>
           </div>
        </div>
      )}

      {/* Header */}
      <header className="musical-gradient text-white p-4 shadow-lg flex justify-between items-center shrink-0 z-20 relative overflow-hidden">
        {/* Decorative Circles */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-black opacity-10 rounded-full translate-x-1/3 translate-y-1/3 blur-xl pointer-events-none"></div>

        <div className="flex items-center gap-3 cursor-pointer relative z-10 group" onClick={handleReset}>
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30 shadow-inner group-hover:scale-110 transition-transform duration-300">
             <span className="text-2xl drop-shadow-md">🇪🇸</span>
          </div>
          <div>
              <h1 className="text-xl font-bold tracking-tight">ProfeMusic</h1>
              <p className="text-[10px] text-indigo-100 font-medium tracking-widest uppercase opacity-80">Espanhol com Música</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 relative z-10">
           {studentName && (
             <div 
               className="flex items-center gap-3 pl-4 pr-2 py-1.5 bg-black/10 hover:bg-black/20 backdrop-blur-sm rounded-full cursor-pointer transition-all border border-white/10"
               onClick={() => setShowHistory(true)}
               title="Ver Histórico"
             >
                <div className="hidden sm:block text-right">
                   <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-wider">Aluno</p>
                   <p className="text-sm font-semibold leading-none text-white">{studentName}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-white text-indigo-600 flex items-center justify-center text-sm font-bold shadow-sm">
                  {studentName.charAt(0).toUpperCase()}
                </div>
             </div>
           )}

           {appState === AppState.WORKSPACE && (
             <button 
               onClick={handleReset}
               className="hidden md:flex items-center gap-2 text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 rounded-lg transition-all backdrop-blur-sm uppercase tracking-wider"
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
               </svg>
               Nova Busca
             </button>
           )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        {/* Searching */}
        {appState === AppState.SEARCHING && (
          <div className="h-full flex flex-col justify-center items-center p-4 relative">
             {/* Background decoration */}
             <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{animationDelay: '1s'}}></div>
             </div>
            <SearchBar onSearch={handleSearch} appState={appState} />
          </div>
        )}

        {/* Loading */}
        {appState === AppState.LOADING && (
          <div className="h-full flex flex-col justify-center items-center p-4">
            <SearchBar onSearch={() => {}} appState={appState} />
          </div>
        )}

        {/* Error */}
        {appState === AppState.ERROR && (
          <div className="h-full flex flex-col justify-center items-center p-4">
             <div className="glass-panel rounded-2xl p-8 max-w-md text-center shadow-xl border-l-4 border-l-rose-500">
                <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 className="text-slate-800 font-bold text-xl mb-2">Ops! Algo deu errado.</h3>
                <p className="text-slate-500 mb-6 leading-relaxed">{errorMessage}</p>
                <button 
                    onClick={handleReset}
                    className="bg-rose-600 text-white px-6 py-3 rounded-xl hover:bg-rose-700 shadow-lg shadow-rose-500/30 transition-all font-semibold"
                >
                    Tentar Novamente
                </button>
             </div>
          </div>
        )}

        {/* Workspace */}
        {appState === AppState.WORKSPACE && songData && (
          <div className="flex flex-col md:flex-row h-full">
            {/* Left Panel: Media & Info (Dark Theme) */}
            <div className="w-full md:w-[400px] bg-slate-900 text-white flex flex-col border-r border-slate-800 shrink-0 relative z-10 shadow-2xl">
              
              <div className="p-8 border-b border-slate-800 bg-slate-900/50">
                <div className="inline-block px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-widest mb-3 border border-indigo-500/20">
                    Tocando Agora
                </div>
                <h2 className="text-3xl font-bold text-white mb-2 leading-tight">{songData.title}</h2>
                <p className="text-slate-400 text-lg flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    {songData.artist}
                </p>
              </div>

              <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar-dark">
                {/* Local Player */}
                <div className="flex-1 flex flex-col">
                    <LocalVideoPlayer onTimeUpdate={setCurrentMediaTime} />
                    
                    <div className="mt-8 p-5 bg-slate-800/40 rounded-xl border border-slate-700/50 text-sm text-slate-400 leading-relaxed backdrop-blur-sm">
                        <p className="mb-3 text-indigo-400 font-bold uppercase text-xs tracking-wider flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Instruções
                        </p>
                        <ol className="list-decimal list-inside space-y-2 ml-1 marker:text-slate-600">
                            <li>Carregue o arquivo de áudio/vídeo.</li>
                            <li>Use o player para controlar a música.</li>
                            <li className="text-white font-medium">Use a <span className="text-rose-400">Sincronização</span> para destacar a letra em tempo real.</li>
                        </ol>
                    </div>
                </div>
              </div>
            </div>

            {/* Right Panel: Lyrics Exercise (Light Theme) */}
            <div className="flex-1 h-full overflow-hidden bg-slate-50 relative">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none"></div>
              <LyricsExercise 
                  rawLyrics={songData.lyrics} 
                  title={songData.title}
                  artist={songData.artist}
                  vocabulary={songData.vocabulary}
                  onComplete={handleSaveProgress}
                  currentTime={currentMediaTime}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;