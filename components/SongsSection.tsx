/**
 * SongsSection.tsx
 * Main orchestrator for the Songs tab — fetches, tabs, and renders player + list.
 * Three tabs: Top Songs | Full Album | Trending
 * Falls back gracefully when API key is missing or quota is exceeded.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Music2, ExternalLink, AlertCircle } from 'lucide-react';
import { fetchMovieSongs, getFallbackSearchUrl } from '../services/youtubeService';
import type { YouTubeSongResult, SongsApiResponse } from '../services/youtubeService';
import SongsPlayer from './SongsPlayer';
import SongsList from './SongsList';

interface SongsSectionProps {
  movieName: string;
  contentType: 'movie' | 'tv' | string;
}

type SongsTab = 'top' | 'album' | 'trending';

const TABS: { id: SongsTab; label: string }[] = [
  { id: 'top', label: '🎵 Top Songs' },
  { id: 'album', label: '💿 Full Album' },
  { id: 'trending', label: '🔥 Trending' },
];

const SongsSection: React.FC<SongsSectionProps> = ({ movieName, contentType }) => {
  const [loading, setLoading] = useState(false);
  const [apiData, setApiData] = useState<SongsApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSong, setActiveSong] = useState<YouTubeSongResult | null>(null);
  const [activeTab, setActiveTab] = useState<SongsTab>('top');
  const [hasFetched, setHasFetched] = useState(false);

  const type = (contentType === 'tv' ? 'tv' : 'movie') as 'movie' | 'tv';
  const fallbackUrl = getFallbackSearchUrl(movieName, type);

  // Fetch on first render
  useEffect(() => {
    if (hasFetched) return;
    setHasFetched(true);
    setLoading(true);
    setError(null);

    fetchMovieSongs(movieName, type)
      .then((data) => {
        setApiData(data);
        if (data.results.length > 0) {
          setActiveSong(data.results[0]); // auto-select first song
        }
      })
      .catch((e) => {
        setError(e.message || 'Failed to load songs');
      })
      .finally(() => setLoading(false));
  }, [movieName, type, hasFetched]);

  const allSongs = apiData?.results || [];
  const isQuotaExceeded = apiData?.quota_exceeded || apiData?.source === 'quota_exceeded';
  const noApiKey = apiData?.source === 'no_api_key';

  // Tab filtering
  const tabSongs = useMemo((): YouTubeSongResult[] => {
    if (activeTab === 'top') return allSongs.slice(0, 6);
    if (activeTab === 'album') return allSongs;
    if (activeTab === 'trending') return [...allSongs].sort((a, b) => a.title.localeCompare(b.title));
    return allSongs;
  }, [allSongs, activeTab]);

  const activeIndex = useMemo(
    () => tabSongs.findIndex((s) => s.videoId === activeSong?.videoId),
    [tabSongs, activeSong]
  );

  const handleNext = useCallback(() => {
    if (activeIndex < tabSongs.length - 1) {
      setActiveSong(tabSongs[activeIndex + 1]);
    } else {
      setActiveSong(tabSongs[0]); // loop
    }
  }, [activeIndex, tabSongs]);

  const handleShuffle = useCallback(() => {
    const pool = tabSongs.filter((s) => s.videoId !== activeSong?.videoId);
    if (pool.length > 0) {
      setActiveSong(pool[Math.floor(Math.random() * pool.length)]);
    }
  }, [tabSongs, activeSong]);

  // Fallback UI — no API key or quota exceeded
  if (!loading && (isQuotaExceeded || noApiKey || (hasFetched && !error && allSongs.length === 0))) {
    const reason = noApiKey
      ? 'YouTube API key not configured.'
      : isQuotaExceeded
      ? 'Daily YouTube API quota reached.'
      : 'No songs found for this title.';

    return (
      <div className="py-6">
        <div className="flex flex-col items-center justify-center gap-4 py-10 bg-white/[0.03] rounded-2xl border border-dashed border-white/10">
          <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
            <AlertCircle size={22} className="text-yellow-400" />
          </div>
          <div className="text-center">
            <p className="text-gray-300 font-semibold text-sm">{reason}</p>
            <p className="text-gray-500 text-xs mt-1">Try searching directly on YouTube</p>
          </div>
          <a
            href={fallbackUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 bg-red-600/90 hover:bg-red-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition shadow-lg shadow-red-900/30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
            Search on YouTube
            <ExternalLink size={13} />
          </a>
        </div>
      </div>
    );
  }

  // Error UI
  if (error && !loading) {
    return (
      <div className="py-10 text-center text-sm text-gray-500">
        <Music2 size={32} className="mx-auto mb-3 text-gray-700" />
        <p>{error}</p>
        <a href={fallbackUrl} target="_blank" rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-red-400 hover:underline text-xs font-bold">
          Search on YouTube <ExternalLink size={12} />
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      {/* Cache badge */}
      {apiData?.source === 'cache' && (
        <div className="flex items-center gap-1.5 text-[10px] text-green-400/70 font-bold uppercase tracking-widest">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400/60 inline-block" />
          Served from cache
        </div>
      )}

      {/* Player */}
      <SongsPlayer
        song={activeSong}
        onNext={handleNext}
        onShuffle={handleShuffle}
        hasNext={tabSongs.length > 1}
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10 pb-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'text-white border-red-500'
                : 'text-gray-500 border-transparent hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Songs List */}
      <SongsList
        songs={tabSongs}
        activeSongId={activeSong?.videoId || null}
        onSelect={(song) => setActiveSong(song)}
        loading={loading}
      />
    </div>
  );
};

export default SongsSection;
