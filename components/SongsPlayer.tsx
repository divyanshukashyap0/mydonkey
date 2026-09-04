/**
 * SongsPlayer.tsx
 * YouTube embed player with custom overlay controls (play/pause, next, shuffle).
 * Uses youtube-nocookie.com for privacy. Lazily mounts iframe only when a song is selected.
 */

import React, { useRef, useCallback, useState } from 'react';
import { Play, SkipForward, Shuffle, Music2, ExternalLink } from 'lucide-react';
import type { YouTubeSongResult } from '../services/youtubeService';

interface SongsPlayerProps {
  song: YouTubeSongResult | null;
  onNext: () => void;
  onShuffle: () => void;
  hasNext: boolean;
}

const SongsPlayer: React.FC<SongsPlayerProps> = ({ song, onNext, onShuffle, hasNext }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeReady, setIframeReady] = useState(false);

  const sendYTCommand = useCallback((command: 'playVideo' | 'pauseVideo') => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func: command, args: [] }),
      '*'
    );
  }, []);

  if (!song) {
    return (
      <div className="flex flex-col items-center justify-center h-48 bg-black/40 rounded-2xl border border-white/5 gap-3">
        <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center">
          <Music2 size={26} className="text-gray-600" />
        </div>
        <p className="text-gray-500 text-sm">Select a song to start listening</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/60 shadow-2xl">
      {/* Iframe */}
      <div className="relative w-full aspect-video bg-black">
        {!iframeReady && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black cursor-pointer group z-10"
            onClick={() => setIframeReady(true)}
          >
            <img
              src={song.thumbnail || (song.videoId ? `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg` : undefined)}
              alt={song.title}
              className="absolute inset-0 w-full h-full object-cover opacity-60"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="relative z-10 w-16 h-16 rounded-full bg-red-600/90 group-hover:bg-red-500 flex items-center justify-center shadow-2xl transition-all transform group-hover:scale-110">
              <Play size={28} fill="white" className="text-white ml-1" />
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={
            iframeReady
              ? `https://www.youtube-nocookie.com/embed/${song.videoId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1&iv_load_policy=3`
              : undefined
          }
          title={song.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-0"
          loading="lazy"
        />
      </div>

      {/* Info & Controls */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h4 className="font-bold text-white text-sm leading-snug line-clamp-2">{song.title}</h4>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{song.channelTitle}</p>
          </div>
          <a
            href={`https://www.youtube.com/watch?v=${song.videoId}`}
            target="_blank"
            rel="noreferrer"
            title="Open on YouTube"
            className="flex-shrink-0 p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/5 transition"
          >
            <ExternalLink size={15} />
          </a>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {iframeReady && (
            <>
              <button
                onClick={() => sendYTCommand('playVideo')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white transition"
              >
                <Play size={13} fill="white" /> Play
              </button>
            </>
          )}
          <button
            onClick={onShuffle}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-gray-300 hover:text-white transition"
          >
            <Shuffle size={13} /> Shuffle
          </button>
          {hasNext && (
            <button
              onClick={onNext}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-gray-300 hover:text-white transition"
            >
              <SkipForward size={13} /> Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SongsPlayer;
