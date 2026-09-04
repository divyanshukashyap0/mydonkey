/**
 * SongsList.tsx
 * Playlist-style song list with skeleton loading and active-song highlighting.
 */

import React from 'react';
import { Play } from 'lucide-react';
import type { YouTubeSongResult } from '../services/youtubeService';

interface SongsListProps {
  songs: YouTubeSongResult[];
  activeSongId: string | null;
  onSelect: (song: YouTubeSongResult) => void;
  loading?: boolean;
}

const SkeletonCard: React.FC = () => (
  <div className="flex items-center gap-3 p-2.5 rounded-xl animate-pulse">
    <div className="w-20 aspect-video flex-shrink-0 bg-white/10 rounded-lg" />
    <div className="flex-1 space-y-2">
      <div className="h-3 bg-white/10 rounded w-3/4" />
      <div className="h-2.5 bg-white/5 rounded w-1/2" />
    </div>
  </div>
);

const SongsList: React.FC<SongsListProps> = ({ songs, activeSongId, onSelect, loading }) => {
  if (loading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <p className="text-center text-sm text-gray-500 py-8">No songs found.</p>
    );
  }

  return (
    <div className="space-y-1">
      {songs.map((song, idx) => {
        const isActive = song.videoId === activeSongId;
        return (
          <button
            key={song.videoId}
            onClick={() => onSelect(song)}
            className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition group border ${
              isActive
                ? 'bg-red-600/15 border-red-500/40 shadow-sm shadow-red-900/20'
                : 'border-transparent hover:bg-white/5 hover:border-white/10'
            }`}
          >
            {/* Thumbnail */}
            <div className="w-20 aspect-video flex-shrink-0 rounded-lg overflow-hidden relative bg-black/40">
              <img
                src={song.thumbnail || (song.videoId ? `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg` : undefined)}
                alt={song.title}
                loading="lazy"
                className="w-full h-full object-cover"
                onError={(e) => {
                  if (song.videoId) {
                    (e.currentTarget as HTMLImageElement).src = `https://i.ytimg.com/vi/${song.videoId}/hqdefault.jpg`;
                  }
                }}
              />
              <div className={`absolute inset-0 flex items-center justify-center transition-opacity bg-black/50 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <Play size={16} fill="white" className="text-white ml-0.5" />
              </div>
              {/* Track number badge */}
              {!isActive && (
                <span className="absolute bottom-0.5 right-1 text-[10px] font-bold text-white/60 group-hover:hidden">
                  {idx + 1}
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold leading-snug line-clamp-2 ${isActive ? 'text-red-400' : 'text-gray-200 group-hover:text-white'}`}>
                {song.title}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5 truncate">{song.channelTitle}</p>
            </div>

            {isActive && (
              <div className="flex-shrink-0 flex gap-[3px] items-end h-4 pr-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-[3px] rounded-full bg-red-400"
                    style={{
                      height: '100%',
                      animation: `bounce-bar 0.8s ease-in-out infinite`,
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default SongsList;
