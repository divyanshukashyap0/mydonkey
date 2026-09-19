import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Film,
  LoaderCircle,
  Play,
  RotateCcw,
  Search,
  Tv,
  X,
  Check,
} from 'lucide-react';
import type { CatalogTitle, Episode, TitleDetails } from '../catalog/types';
import type { CinemaEngine } from '../cinema/CinemaEngine';
import type { CinemaSnapshot } from '../cinema/types';
import type { WatchPartyController } from '../watch-party/useWatchParty';
import { getEpisodes, getTitleDetails } from '../catalog/tmdb';
import { posterUrl, readEndpoint } from '../catalog/config';
import { makeEmbed, readServerPreferences } from '../catalog/servers';
import type { Content } from '../../../types';

interface EpisodesPanelProps {
  engine: CinemaEngine | null;
  snapshot: CinemaSnapshot;
  party: WatchPartyController;
  currentContent?: Content | null;
  catalogTitle?: CatalogTitle | null;
  onClose: () => void;
}

export default function EpisodesPanel({
  engine,
  snapshot,
  party,
  currentContent,
  catalogTitle,
  onClose,
}: EpisodesPanelProps) {
  // Determine the active series title object
  const activeTitle: CatalogTitle | null = useMemo(() => {
    if (snapshot.embed?.catalog) return snapshot.embed.catalog;
    if (catalogTitle) return catalogTitle;
    if (currentContent) {
      const isAnime = Boolean(currentContent.genres?.some((g) => g.toLowerCase().includes('anime')));
      const tmdbIdNum =
        Number(currentContent.tmdbId) ||
        Number(String(currentContent.id).replace(/^(tmdb_|imdb_)/, '')) ||
        1;
      return {
        id: tmdbIdNum,
        mediaType: 'tv',
        title: currentContent.title || 'TV Series',
        originalTitle: currentContent.title || 'TV Series',
        overview: currentContent.overview || '',
        posterPath: currentContent.poster_path || null,
        backdropPath: currentContent.backdrop_path || null,
        year: String(currentContent.year || ''),
        rating: Number(currentContent.vote_average || 0),
        anime: isAnime,
      };
    }
    return null;
  }, [snapshot.embed?.catalog, catalogTitle, currentContent]);

  const currentActiveSeason = snapshot.embed?.selection.season ?? 1;
  const currentActiveEpisode = snapshot.embed?.selection.episode ?? 1;

  const [selectedSeason, setSelectedSeason] = useState<number>(currentActiveSeason);
  const [details, setDetails] = useState<TitleDetails | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [switchingEp, setSwitchingEp] = useState<number | null>(null);

  const endpoint = useMemo(() => readEndpoint(), []);

  // Fetch title details (seasons list)
  useEffect(() => {
    if (!activeTitle) {
      setLoadingDetails(false);
      return;
    }

    const controller = new AbortController();
    setLoadingDetails(true);
    setError('');

    getTitleDetails(activeTitle, endpoint, controller.signal)
      .then((val) => {
        if (controller.signal.aborted) return;
        setDetails(val);
        // Verify season exists in details
        const availableSeasons = val.seasons?.filter((s) => s.number > 0) || [];
        if (availableSeasons.length > 0 && !availableSeasons.some((s) => s.number === selectedSeason)) {
          setSelectedSeason(availableSeasons[0].number);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.warn('EpisodesPanel details lookup failed:', err);
          setError('Could not load seasons. Please check your connection.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingDetails(false);
      });

    return () => controller.abort();
  }, [activeTitle, endpoint]);

  // Fetch episodes when selected season changes
  useEffect(() => {
    if (!activeTitle?.id) return;

    const controller = new AbortController();
    setLoadingEpisodes(true);
    setEpisodes([]);

    getEpisodes(activeTitle.id, selectedSeason, endpoint, controller.signal)
      .then((list) => {
        if (controller.signal.aborted) return;
        setEpisodes(list);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.warn('Failed to load episodes for season', selectedSeason, err);
          // Fallback if TMDB fails: generate placeholders based on season count
          const seasonObj = details?.seasons?.find((s) => s.number === selectedSeason);
          const count = seasonObj?.episodeCount || 12;
          const fallbackList: Episode[] = Array.from({ length: count }, (_, i) => ({
            number: i + 1,
            name: `Episode ${i + 1}`,
            airDate: null,
          }));
          setEpisodes(fallbackList);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingEpisodes(false);
      });

    return () => controller.abort();
  }, [activeTitle?.id, selectedSeason, endpoint, details?.seasons]);

  // Handle switching to chosen episode
  const handleSelectEpisode = async (epNum: number) => {
    if (!activeTitle || !engine || switchingEp !== null) return;
    setSwitchingEp(epNum);

    try {
      if (snapshot.embed) {
        // We already have an embed playing: preserve its server & preferences
        const media = makeEmbed(snapshot.embed.catalog, {
          ...snapshot.embed.selection,
          season: selectedSeason,
          episode: epNum,
          animeEpisode: epNum,
        });

        if (party.state.status === 'connected') {
          await party.loadMedia(media);
        } else {
          await engine.loadMedia(media, true);
        }
      } else {
        // Start streaming fresh on Bingr default
        const media = makeEmbed(activeTitle, {
          server: 'bingr',
          anime: activeTitle.anime,
          season: selectedSeason,
          episode: epNum,
          animeId: null,
          animeEpisode: epNum,
          animeEdition: '',
          preferences: readServerPreferences('bingr'),
        });

        if (party.state.status === 'connected') {
          await party.loadMedia(media);
        } else {
          await engine.loadMedia(media, true);
        }
      }

      if (snapshot.mode !== 'seated') {
        engine.takeSeat('B3');
      }

      onClose();
    } catch (err) {
      console.error('Error switching episode:', err);
      setError('Could not open this episode. Please try another.');
    } finally {
      setSwitchingEp(null);
    }
  };

  // Filtered episodes based on search query
  const filteredEpisodes = useMemo(() => {
    if (!searchQuery.trim()) return episodes;
    const q = searchQuery.toLowerCase().trim();
    return episodes.filter(
      (ep) =>
        String(ep.number).includes(q) ||
        ep.name.toLowerCase().includes(q) ||
        `episode ${ep.number}`.includes(q)
    );
  }, [episodes, searchQuery]);

  const seasonsList = useMemo(() => {
    if (!details?.seasons || details.seasons.length === 0) {
      return [{ number: selectedSeason, name: `Season ${selectedSeason}`, episodeCount: episodes.length || 10 }];
    }
    const filtered = details.seasons.filter((s) => s.number > 0);
    return filtered.length > 0 ? filtered : details.seasons;
  }, [details?.seasons, selectedSeason, episodes.length]);

  const posterSrc = posterUrl(activeTitle?.posterPath || null);

  return (
    <div className="episodes-panel-content">
      {/* Panel Header */}
      <div className="episodes-panel-header">
        <div className="episodes-show-badge">
          {posterSrc ? (
            <img src={posterSrc} alt="" className="episodes-show-thumb" />
          ) : (
            <div className="episodes-show-thumb-fallback">
              <Tv size={20} />
            </div>
          )}
          <div className="episodes-show-text">
            <span className="eyebrow">
              <Tv size={12} className="inline mr-1 text-amber-400" />
              EPISODES & SEASONS
            </span>
            <h2 id="panel-heading" className="episodes-show-title">
              {activeTitle?.title || 'TV Series'}
            </h2>
            <div className="episodes-meta-pill">
              <span>Now Playing: Season {currentActiveSeason} • Episode {currentActiveEpisode}</span>
            </div>
          </div>
        </div>

        {/* Quick Episode Stepper */}
        <div className="episodes-header-stepper">
          <button
            type="button"
            className="episodes-stepper-btn"
            disabled={currentActiveEpisode <= 1 || !!switchingEp}
            onClick={() => handleSelectEpisode(currentActiveEpisode - 1)}
            title="Play Previous Episode"
          >
            <ChevronLeft size={16} />
            <span>Prev</span>
          </button>
          <button
            type="button"
            className="episodes-stepper-btn"
            disabled={!!switchingEp}
            onClick={() => handleSelectEpisode(currentActiveEpisode + 1)}
            title="Play Next Episode"
          >
            <span>Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Season Pill Selector */}
      <div className="episodes-seasons-row" role="tablist" aria-label="Select Season">
        {seasonsList.map((s) => {
          const isSelected = selectedSeason === s.number;
          return (
            <button
              key={s.number}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`season-pill-button ${isSelected ? 'is-selected' : ''}`}
              onClick={() => setSelectedSeason(s.number)}
            >
              <span className="season-pill-name">{s.name || `Season ${s.number}`}</span>
              {s.episodeCount > 0 && (
                <span className="season-pill-count">{s.episodeCount} eps</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Episode Filter Bar */}
      <div className="episodes-filter-bar">
        <div className="episodes-search-input-wrap">
          <Search size={15} className="text-stone-400" />
          <input
            type="text"
            placeholder="Search episode by name or number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="episodes-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="episodes-search-clear"
              aria-label="Clear filter"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <span className="episodes-count-label">
          {filteredEpisodes.length} {filteredEpisodes.length === 1 ? 'Episode' : 'Episodes'}
        </span>
      </div>

      {/* Episodes Grid / List */}
      <div className="episodes-cards-container">
        {loadingEpisodes ? (
          <div className="episodes-loading-state">
            <LoaderCircle className="spin text-amber-400" size={28} />
            <span>Loading Season {selectedSeason} episodes...</span>
          </div>
        ) : error ? (
          <div className="episodes-error-state">
            <p>{error}</p>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setSelectedSeason((prev) => prev)}
            >
              <RotateCcw size={14} /> Retry
            </button>
          </div>
        ) : filteredEpisodes.length === 0 ? (
          <div className="episodes-empty-state">
            <p>No episodes found matching "{searchQuery}".</p>
          </div>
        ) : (
          <div className="episodes-grid">
            {filteredEpisodes.map((ep) => {
              const isCurrent =
                selectedSeason === currentActiveSeason && ep.number === currentActiveEpisode;
              const isPending = switchingEp === ep.number;

              return (
                <button
                  key={ep.number}
                  type="button"
                  className={`episode-card-item ${isCurrent ? 'is-active' : ''} ${
                    isPending ? 'is-pending' : ''
                  }`}
                  onClick={() => handleSelectEpisode(ep.number)}
                  disabled={isPending}
                >
                  <div className="episode-card-badge">
                    <span>EP {ep.number}</span>
                    {isCurrent && <Check size={12} className="text-emerald-400" />}
                  </div>

                  <div className="episode-card-content">
                    <span className="episode-card-title">{ep.name || `Episode ${ep.number}`}</span>
                    {ep.airDate && (
                      <span className="episode-card-airdate">{ep.airDate}</span>
                    )}
                  </div>

                  <div className="episode-card-action">
                    {isPending ? (
                      <LoaderCircle size={16} className="spin text-amber-400" />
                    ) : isCurrent ? (
                      <span className="episode-playing-tag">PLAYING</span>
                    ) : (
                      <span className="episode-play-icon">
                        <Play size={14} fill="currentColor" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
