import React, { useState, useRef } from 'react';
import { AppState } from '../types';

interface SearchBarProps {
  onSearch: (query: string, customLyrics?: string) => void;
  appState: AppState;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, appState }) => {
  const [query, setQuery] = useState('');
  const [customLyrics, setCustomLyrics] = useState('');
  const [showLyricsInput, setShowLyricsInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query && !customLyrics) return;
    
    const effectiveQuery = query || "Unknown Song";
    
    onSearch(effectiveQuery, customLyrics);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "text/plain" && !file.name.endsWith('.txt')) {
        alert("Por favor, selecione um arquivo de texto (.txt)");
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === 'string') {
            setCustomLyrics(text);
            setShowLyricsInput(true);
        }
    };
    reader.readAsText(file);
    
    // Reset value to allow selecting the same file again if needed
    e.target.value = '';
  };

  const isLoading = appState === AppState.LOADING;

  return (
    <div className="w-full max-w-2xl mx-auto relative">
      {/* Decorative Blur Background behind the card */}
      <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl blur opacity-20"></div>

      <div className="relative p-8 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-fuchsia-600 mb-3">
                Prepare sua Aula
            </h1>
            <p className="text-slate-500 text-lg font-light">
                Crie exercícios de espanhol com música em segundos.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Nome da música ou Artista
              </label>
              <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-indigo-400 group-focus-within:text-indigo-600 transition-colors" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ex: Despacito - Luis Fonsi"
                    className="w-full pl-12 pr-4 py-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-lg text-slate-800 placeholder:text-slate-400"
                    disabled={isLoading}
                  />
              </div>
            </div>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-200 dashed"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-white/90 text-[10px] text-slate-400 font-bold uppercase tracking-widest">Opções Avançadas</span>
              </div>
            </div>

            <div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        type="button"
                        onClick={() => setShowLyricsInput(!showLyricsInput)}
                        className={`flex-1 py-3 px-4 rounded-xl border-2 font-medium transition-all flex items-center justify-center gap-2 ${
                            showLyricsInput || customLyrics 
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        {showLyricsInput || customLyrics ? 'Esconder Letra Manual' : 'Digitar Letra Manualmente'}
                    </button>
                    
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden" 
                        accept=".txt"
                        onChange={handleFileUpload}
                    />
                    
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="py-3 px-5 rounded-xl border-2 border-slate-200 bg-white text-slate-600 font-medium hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2"
                        title="Importar letra de arquivo .txt"
                        disabled={isLoading}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4 4m0 0l-4-4m4 4V4" /></svg>
                        <span className="hidden sm:inline">Importar .txt</span>
                        <span className="sm:hidden">.txt</span>
                    </button>
                </div>
            </div>

            {/* Custom Lyrics Area */}
            {(showLyricsInput || customLyrics) && (
                <div className="animate-[fadeIn_0.3s_ease-out] bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="block text-xs font-bold text-indigo-600 uppercase mb-2 flex justify-between items-center">
                        <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                            Editor de Letra
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">Uso Obrigatório</span>
                    </label>
                    <textarea
                        value={customLyrics}
                        onChange={(e) => setCustomLyrics(e.target.value)}
                        placeholder="Cole a letra completa da música aqui..."
                        rows={8}
                        className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none text-sm leading-relaxed font-mono bg-white"
                        disabled={isLoading}
                    />
                </div>
            )}

            <button
              type="submit"
              disabled={isLoading || (!query && !customLyrics)}
              className={`w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg transition-all mt-6 relative overflow-hidden group
                ${isLoading 
                  ? 'bg-slate-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:shadow-indigo-500/40 hover:scale-[1.01] active:scale-[0.99]'
                }`}
            >
               <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Criando Mágica...
                    </>
                  ) : (
                    <>
                        <span>Criar Exercício</span>
                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </>
                  )}
               </span>
               {/* Shine effect */}
               {!isLoading && <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:animate-shine"></div>}
            </button>
          </form>
      </div>
    </div>
  );
};

export default SearchBar;