import React, { useRef, useState, useEffect } from 'react';

interface LocalVideoPlayerProps {
  onTimeUpdate?: (currentTime: number) => void;
}

const LocalVideoPlayer: React.FC<LocalVideoPlayerProps> = ({ onTimeUpdate }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Revoke previous URL to avoid memory leaks
      if (videoSrc) {
        URL.revokeObjectURL(videoSrc);
      }
      
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setFileName(file.name);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && onTimeUpdate) {
        onTimeUpdate(videoRef.current.currentTime);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoSrc) {
        URL.revokeObjectURL(videoSrc);
      }
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full pb-[56.25%] bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10 group ring-1 ring-white/5">
        {videoSrc ? (
          <video 
            ref={videoRef}
            src={videoSrc} 
            controls 
            className="absolute top-0 left-0 w-full h-full object-contain"
            onTimeUpdate={handleTimeUpdate}
          >
            Seu navegador não suporta a tag de vídeo.
          </video>
        ) : (
          <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-950/50 backdrop-blur-sm">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-3 animate-pulse">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
            </div>
            <p className="text-sm font-medium tracking-wide">Aguardando mídia...</p>
          </div>
        )}
      </div>

      <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-xl border border-white/5 shadow-inner relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-10 -right-10 w-20 h-20 bg-indigo-500/20 blur-2xl rounded-full"></div>
        
        <div className="flex items-center justify-between mb-3 relative z-10">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Arquivo Local</span>
            {fileName && <span className="text-xs text-indigo-300 font-mono truncate max-w-[150px] bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20" title={fileName}>{fileName}</span>}
        </div>
        
        <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="video/*,audio/*"
            className="hidden"
        />
        
        <button 
            onClick={() => fileInputRef.current?.click()}
            className="relative z-10 w-full flex items-center justify-center gap-3 bg-white/10 hover:bg-white/15 text-white py-3 px-4 rounded-lg transition-all text-sm font-medium border border-white/10 group"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400 group-hover:text-indigo-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Abrir MP3 ou MP4
        </button>
      </div>
    </div>
  );
};

export default LocalVideoPlayer;