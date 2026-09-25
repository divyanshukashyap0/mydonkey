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

  const loadSongs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchMovieSongs(movieName, type);
      setApiData(data);
      if (data.results && data.results.length > 0) {
        setActiveSong(data.results[0]); // auto-select first song
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load songs');
    } finally {
      setLoading(false);
      setHasFetched(true);
    }
  }, [movieName, type]);

  // Fetch when movie or type changes
  useEffect(() => {
    setHasFetched(false);
    setApiData(null);
    setActiveSong(null);
    loadSongs();
  }, [loadSongs]);

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

  // Fallback UI — when songs are empty or unavailable
  if (!loading && (isQuotaExceeded || noApiKey || error || (hasFetched && allSongs.length === 0))) {
    return (
      <div className="py-6">
        <div className="flex flex-col items-center justify-center gap-3 py-8 px-4 bg-white/[0.02] rounded-2xl border border-white/10 text-center">
          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
            <Music2 size={20} className="text-gray-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">Official Soundtrack</h3>
            <p className="text-gray-400 text-xs mt-0.5">Explore full album and OST for {movieName} on YouTube</p>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <a
              href={fallbackUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#E50914] hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition shadow-lg active:scale-95"
            >
              <ExternalLink size={14} /> Search on YouTube
            </a>
            <button
              onClick={loadSongs}
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-gray-300 font-medium px-4 py-2.5 rounded-xl text-xs transition active:scale-95"
            >
              Retry
            </button>
          </div>
        </div>
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

      {/* Tabs & Search on YouTube */}
      <div className="flex items-center justify-between border-b border-white/10 pb-0 gap-2">
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-bold rounded-t-lg transition border-b-2 -mb-px whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-white border-red-500'
                  : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <a
          href={fallbackUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition px-3 py-1.5 rounded-lg hover:bg-white/5 flex-shrink-0"
          title={`Search ${movieName} on YouTube`}
        >
          <ExternalLink size={13} />
          <span>Search on YouTube</span>
        </a>
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
