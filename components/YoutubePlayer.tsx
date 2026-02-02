import React, { useEffect, useRef, useState } from 'react';

// Extend window interface for YouTube API
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YoutubePlayerProps {
  videoId: string;
}

const YoutubePlayer: React.FC<YoutubePlayerProps> = ({ videoId }) => {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showDownloadInfo, setShowDownloadInfo] = useState(false);

  // Initialize Youtube API
  useEffect(() => {
    // 1. Load API Script if not present
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    // Function to create player instance
    const initPlayer = () => {
      if (!containerRef.current) return;
      
      // Prevent double initialization
      if (playerRef.current) {
          if (playerRef.current.loadVideoById) {
             playerRef.current.loadVideoById(videoId);
          }
          return;
      }

      const playerVars = {
          playsinline: 1,
          modestbranding: 1,
          rel: 0,
          origin: window.location.origin,
          // We keep native controls (1) so users can change quality/fullscreen, 
          // but we provide our own external controls for convenience.
          controls: 1, 
      };

      playerRef.current = new window.YT.Player(containerRef.current, {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars,
        events: {
          onReady: (event: any) => {
             const dur = event.target.getDuration();
             if (dur) setDuration(dur);
          },
          onStateChange: (event: any) => {
             // -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 video cued
             const state = event.data;
             setIsPlaying(state === 1);
             if (state === 1) { // Playing
                 const dur = event.target.getDuration();
                 if (dur) setDuration(dur);
             }
          }
        }
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      // Setup global callback
      const existingCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (existingCallback) existingCallback();
        initPlayer();
      };
    }
  }, []); 

  // Handle videoId change specifically
  useEffect(() => {
      if (playerRef.current && playerRef.current.loadVideoById) {
          playerRef.current.loadVideoById(videoId);
          setIsPlaying(false);
          setCurrentTime(0);
      }
  }, [videoId]);

  // Clean up on unmount
  useEffect(() => {
      return () => {
          if (playerRef.current && playerRef.current.destroy) {
              playerRef.current.destroy();
              playerRef.current = null;
          }
      };
  }, []);

  // Timer for progress bar updates
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying) {
      interval = setInterval(() => {
        if (playerRef.current && playerRef.current.getCurrentTime) {
           setCurrentTime(playerRef.current.getCurrentTime());
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime); // Optimistic UI update
    if (playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(newTime, true);
    }
  };
  
  const handleRewind = () => {
       if (!playerRef.current) return;
       const newTime = Math.max(0, currentTime - 10);
       playerRef.current.seekTo(newTime, true);
       setCurrentTime(newTime);
  };

  const handleDownloadClick = () => {
    setShowDownloadInfo(true);
    // Auto hide after 5 seconds
    setTimeout(() => setShowDownloadInfo(false), 5000);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
      <div className="flex flex-col gap-3">
        {/* Video Container */}
        <div className="relative w-full pb-[56.25%] bg-black rounded-lg overflow-hidden shadow-md group border border-slate-800">
             {/* The ref element is replaced by the iframe by YT API */}
             <div ref={containerRef} className="absolute top-0 left-0 w-full h-full" />
             
             {/* Download Info Overlay */}
             {showDownloadInfo && (
                <div 
                  className="absolute inset-0 bg-black/85 z-20 flex items-center justify-center p-6 text-center animate-[fadeIn_0.3s_ease-out]"
                  onClick={() => setShowDownloadInfo(false)}
                >
                  <div className="max-w-xs">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-amber-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                     </svg>
                     <p className="text-white font-bold mb-2">Download Direto Indisponível</p>
                     <p className="text-slate-300 text-sm leading-relaxed">
                        Devido às restrições do YouTube, não é possível baixar o áudio diretamente pelo app.
                     </p>
                     <div className="mt-4 p-3 bg-slate-800 rounded border border-slate-700">
                        <p className="text-teal-400 text-xs font-bold uppercase mb-1">Dica para uso offline:</p>
                        <p className="text-slate-400 text-xs">
                           Baixe o arquivo externamente e use a aba <strong>"Arquivo Local (PC)"</strong>.
                        </p>
                     </div>
                  </div>
                </div>
             )}
        </div>

        {/* Custom Audio Controls */}
        <div className="bg-slate-800 p-3 rounded-lg flex flex-col gap-2 border border-slate-700 shadow-sm">
             <div className="flex items-center gap-3">
                {/* Play/Pause Button */}
                <button 
                  onClick={togglePlay}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-teal-600 hover:bg-teal-500 text-white transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  aria-label={isPlaying ? "Pause" : "Play"}
                >
                   {isPlaying ? (
                       <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                       </svg>
                   ) : (
                       <svg className="w-5 h-5 translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                       </svg>
                   )}
                </button>
                
                {/* Rewind 10s Button */}
                <button 
                  onClick={handleRewind}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
                  title="Voltar 10s"
                  aria-label="Voltar 10 segundos"
                >
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                   </svg>
                </button>

                {/* Progress Bar & Time */}
                <div className="flex-1 flex flex-col justify-center gap-1">
                    <input
                       type="range"
                       min="0"
                       max={duration}
                       step="0.1"
                       value={currentTime}
                       onChange={handleSeek}
                       className="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-teal-500 hover:accent-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/50"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>

                {/* Download Button (Trigger Info) */}
                <button 
                  onClick={handleDownloadClick}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500"
                  title="Download / Offline Info"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                </button>
             </div>
        </div>
      </div>
  );
};

export default YoutubePlayer;