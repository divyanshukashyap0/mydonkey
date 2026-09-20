import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Armchair,
  ArrowLeft,
  ArrowRight,
  BellRing,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Film,
  Grid2X2,
  LoaderCircle,
  Maximize,
  Minimize,
  Monitor,
  Mouse,
  Pause,
  PersonStanding,
  Play,
  RotateCcw,
  Smartphone,
  Users,
  X,
  Tv,
  Wifi,
  RefreshCw,
} from 'lucide-react';
import CinemaScene from './components/CinemaScene';
import TheatreControls from './components/TheatreControls';
import ExperiencePanels, { type Panel } from './components/ExperiencePanels';
import Joystick from './components/Joystick';
import { PlayerAvatar } from './components/PlayerProfilePanel';
import { formatTime, SeekBar } from './components/ScreenPlayerPanel';
import type { CatalogTitle, ServerKey } from './catalog/types';
import type { CinemaEngine } from './cinema/CinemaEngine';
import { makeEmbed, readServerPreferences, serversFor, serverName } from './catalog/servers';
import { getTitleById, resolveTmdbTitle } from './catalog/tmdb';
import { INITIAL_SNAPSHOT, type CinemaSnapshot, type MediaSelection, type PlayerProfile, type Quality } from './cinema/types';
import type { LayoutValidation } from './cinema/world';
import { useWatchParty } from './watch-party/useWatchParty';
import { cleanProfile, loadProfile, saveProfile } from './watch-party/profile';
import { Content } from '../../types';
import { useStore } from '../../context/StoreContext';
import { useAdShield } from '../../utils/useAdShield';
import { setTheatreTitle } from '../../utils/titleManager';
import './styles/experience.css';

interface TheatreViewProps {
  content?: Content | null;
  streamUrl?: string;
  season?: number;
  episode?: number;
  server?: ServerKey;
  onExit?: () => void;
}

function initialQuality(): Quality {
  try {
    const saved = localStorage.getItem('mydonkey-theatre-quality');
    if (saved === 'auto' || saved === 'high' || saved === 'performance') return saved;
  } catch { }
  return 'performance';
}

function initialMotion() {
  try {
    const saved = localStorage.getItem('mydonkey-theatre-motion');
    if (saved !== null) return saved === 'true';
  } catch { }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const TheatreView: React.FC<TheatreViewProps> = ({
  content: propContent,
  streamUrl: propStreamUrl,
  season: propSeason = 1,
  episode: propEpisode = 1,
  server: propServer,
  onExit,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { currentProfile, currentUser, addToWatchHistory } = useStore();

  const content = propContent || (location.state as { content?: Content })?.content || null;

  // AdShield: Suppress external popups and top-level redirects
  useAdShield({
    defaultEnabled: true,
    defaultMode: 'strict',
    isActive: true,
  });

  const isMobile = useMemo(() => {
    return typeof navigator !== 'undefined' && (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || ('ontouchstart' in window && window.innerWidth < 1024));
  }, []);

  const isTV = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /TV|SmartTV|GoogleTV|HbbTV|CrKey|Tizen|WebOS|POV_TV|Bravia|BRAVIA|Viera|AppleTV/i.test(navigator.userAgent) ||
      (typeof window !== 'undefined' && window.innerWidth >= 1920 && window.matchMedia('(any-pointer: none)').matches);
  }, []);

  const [isPortrait, setIsPortrait] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(orientation: portrait)').matches : false
  );
  const [dismissRotatePrompt, setDismissRotatePrompt] = useState(false);

  // Automatically lock smartphone orientation to landscape when Theatre opens
  useEffect(() => {
    if (!isMobile) return;

    const tryLockLandscape = async () => {
      try {
        if (screen.orientation && (screen.orientation as any).lock) {
          await (screen.orientation as any).lock('landscape');
        }
      } catch (_) {
        // Browser may require user gesture or fullscreen first
      }
    };

    void tryLockLandscape();

    const mq = window.matchMedia('(orientation: portrait)');
    const checkOrientation = () => {
      setIsPortrait(mq.matches);
    };
    mq.addEventListener?.('change', checkOrientation);
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      mq.removeEventListener?.('change', checkOrientation);
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      try {
        if (screen.orientation && (screen.orientation as any).unlock) {
          (screen.orientation as any).unlock();
        }
      } catch (_) { }
    };
  }, [isMobile]);

  const engine = useRef<CinemaEngine | null>(null);
  const pendingSeat = useRef<string | null>(null);
  const pendingAutoPlay = useRef<{
    playKey?: string;
    title: CatalogTitle;
    season: number;
    episode: number;
    server: ServerKey;
    streamUrl?: string;
  } | null>(null);

  const hasContentOrParty = Boolean(
    content ||
    propStreamUrl ||
    searchParams.get('id') ||
    searchParams.get('url') ||
    searchParams.get('streamUrl') ||
    searchParams.get('title') ||
    searchParams.has('party')
  );

  const [snapshot, setSnapshot] = useState<CinemaSnapshot>(INITIAL_SNAPSHOT);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [panel, setPanel] = useState<Panel>(() => {
    if (searchParams.has('party')) return 'party';
    if (!hasContentOrParty) return 'catalog';
    return null;
  });
  const [catalogReturn, setCatalogReturn] = useState<Panel | null>(null);
  const [catalogTitle, setCatalogTitle] = useState<CatalogTitle | null>(null);
  const [hudVisible, setHudVisible] = useState(true);
  const [movieHint, setMovieHint] = useState(false);
  const hudTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const movieMode = snapshot.mode === 'seated' || snapshot.mode === 'sitting';
  const transitioning = snapshot.mode === 'sitting' || snapshot.mode === 'standing';

  // Auto-hiding Topbar & HUD: hides after 4s inactivity ONLY during seated movieMode, and immediately reappears on any pointer/touch interaction
  const [topbarVisible, setTopbarVisible] = useState(true);
  const topbarTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTopbarHovered = useRef(false);

  const showControls = useCallback(() => {
    setTopbarVisible(true);
    setHudVisible(true);
    engine.current?.reportActivity();
    if (topbarTimer.current) clearTimeout(topbarTimer.current);
    if (movieMode && !isTopbarHovered.current && panel === null) {
      topbarTimer.current = setTimeout(() => {
        if (!isTopbarHovered.current && panel === null) {
          setTopbarVisible(false);
          setHudVisible(false);
        }
      }, 4000);
    }
  }, [movieMode, panel]);

  useEffect(() => {
    showControls();
    return () => {
      if (topbarTimer.current) clearTimeout(topbarTimer.current);
    };
  }, [showControls]);

  // Global user activity detection (mouse move, touch tap, keypress) keeps controls accessible and clickable
  useEffect(() => {
    const handleActivity = () => {
      showControls();
    };
    window.addEventListener('pointermove', handleActivity, { passive: true });
    window.addEventListener('pointerdown', handleActivity, { passive: true });
    window.addEventListener('touchstart', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handleActivity);
      window.removeEventListener('pointerdown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, [showControls]);

  const [profile, setProfile] = useState<PlayerProfile>(() => {
    const saved = loadProfile();
    if (currentProfile?.name) {
      return { ...saved, name: currentProfile.name };
    }
    return saved;
  });

  const [quality, setQuality] = useState<Quality>(initialQuality);
  const [reducedMotion, setReducedMotion] = useState(initialMotion);
  const [refreshTarget, setRefreshTarget] = useState(() => {
    try {
      return localStorage.getItem('mydonkey-theatre-high-refresh') === 'on';
    } catch {
      return false;
    }
  });
  const [waitersOn, setWaitersOn] = useState(true);
  const [validation, setValidation] = useState<LayoutValidation | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 5200);
  }, []);

  const watchParty = useWatchParty({ engine, ready, profile, notify });
  const inParty = watchParty.state.status === 'connected';
  const canControlPlayback = !inParty || watchParty.state.room?.hostId === watchParty.state.selfId;

  const rawMediaType =
    (searchParams.get('type') as 'movie' | 'tv' | null) ||
    content?.type ||
    snapshot.embed?.catalog.mediaType ||
    catalogTitle?.mediaType;

  const isMovie = rawMediaType === 'movie';

  const isSeries = !isMovie && Boolean(
    rawMediaType === 'tv' ||
    content?.type === 'tv' ||
    searchParams.get('type') === 'tv' ||
    snapshot.embed?.catalog.mediaType === 'tv' ||
    catalogTitle?.mediaType === 'tv'
  );

  const currentSeasonNum = snapshot.embed?.selection.season ?? propSeason ?? 1;
  const currentEpisodeNum = snapshot.embed?.selection.episode ?? propEpisode ?? 1;

  const handleStepEpisode = useCallback(async (delta: number) => {
    if (!snapshot.embed || !engine.current) return;
    const currentEp = snapshot.embed.selection.episode || 1;
    const nextEp = Math.max(1, currentEp + delta);
    try {
      const media = makeEmbed(snapshot.embed.catalog, {
        ...snapshot.embed.selection,
        episode: nextEp,
        animeEpisode: nextEp,
      });
      if (watchParty.state.status === 'connected') {
        await watchParty.loadMedia(media);
      } else {
        await engine.current.loadMedia(media, true);
      }
      notify(`Screening Season ${snapshot.embed.selection.season} • Episode ${nextEp}`);
    } catch (err) {
      console.warn('Failed to switch episode:', err);
    }
  }, [snapshot.embed, watchParty, notify]);

  const addToWatchHistoryRef = useRef(addToWatchHistory);
  addToWatchHistoryRef.current = addToWatchHistory;
  const autoPlayedKey = useRef<string | null>(null);

  const executePendingPlay = useCallback(() => {
    if (!pendingAutoPlay.current || !engine.current) return;
    const pending = pendingAutoPlay.current;
    pendingAutoPlay.current = null;

    try {
      if (pending.playKey) {
        autoPlayedKey.current = pending.playKey;
      }

      if (pending.streamUrl && (pending.streamUrl.endsWith('.mp4') || pending.streamUrl.endsWith('.m3u8') || pending.streamUrl.includes('drive.google.com'))) {
        // Direct video or direct stream
        const media: MediaSelection = {
          id: `direct-${Date.now()}`,
          kind: 'url',
          title: pending.title.title,
          url: pending.streamUrl,
        };
        void engine.current.loadMedia(media, true);
      } else {
        const selection = {
          server: pending.server,
          anime: pending.title.anime,
          season: pending.season,
          episode: pending.episode,
          animeId: null,
          animeEpisode: pending.episode,
          animeEdition: '',
          preferences: readServerPreferences(pending.server),
        };
        const media = makeEmbed(pending.title, selection);
        void engine.current.loadMedia(media, true);
      }

      if (engine.current && 'sitDirectly' in engine.current) {
        (engine.current as any).sitDirectly('B3');
      } else {
        engine.current?.takeSeat('B3');
      }

      setTimeout(() => {
        if (engine.current && 'sitDirectly' in engine.current) {
          (engine.current as any).sitDirectly('B3');
        } else {
          engine.current?.takeSeat('B3');
        }
      }, 350);

      if (pending.title) {
        const p = pending.title.posterPath || searchParams.get('poster') || content?.poster_path || content?.poster_path_mobile || null;
        engine.current?.setPoster(p, pending.title.title);
      }

      // Record in browser cache watch history
      if (pending.title) {
        try {
          const theatreContent: Content = {
            id: String(pending.title.id),
            title: pending.title.title,
            overview: pending.title.overview || '',
            poster_path: pending.title.posterPath || '',
            backdrop_path: pending.title.backdropPath || '',
            youtubeId: '',
            type: pending.title.mediaType === 'tv' ? 'tv' : 'movie',
            genres: pending.title.anime ? ['Anime'] : [],
            release_date: pending.title.year || '',
            vote_average: pending.title.rating || 7.5,
            createdAt: new Date().toISOString()
          };
          addToWatchHistoryRef.current(theatreContent).catch(() => {});
        } catch (_) {}
      }

      notify(`Playing “${pending.title.title}” on the 3D cinema screen.`);
    } catch (err) {
      console.warn('Failed to autoplay media:', err);
    }
  }, [notify]);

  // Handle incoming movie/show prop or location state from mydonkey
  useEffect(() => {
    if (!content) return;

    const targetId = content.tmdbId || content.id;
    const serverKey: ServerKey = propServer || 'bingr';
    const season = propSeason || 1;
    const episode = propEpisode || 1;
    const playKey = `content-${targetId}-${season}-${episode}-${serverKey}`;

    if (autoPlayedKey.current === playKey) return;
    if (pendingAutoPlay.current?.playKey === playKey) return;
    if (snapshot.embed && String(snapshot.embed.catalog.id) === String(targetId).replace(/^(tmdb_|imdb_)/, '') && snapshot.embed.selection.season === season && snapshot.embed.selection.episode === episode) {
      return;
    }

    const isAnime = Boolean(content.genres?.some(g => g.toLowerCase().includes('anime')));
    const stream = propStreamUrl || content.videoUrl;
    const tmdbIdNum = Number(content.tmdbId)
      || Number(String(content.id).replace(/^(tmdb_|imdb_)/, ''))
      || 1;

    const immediateTitle: CatalogTitle = {
      id: tmdbIdNum,
      mediaType: content.type === 'tv' ? 'tv' : 'movie',
      title: content.title || 'Untitled',
      originalTitle: content.title || 'Untitled',
      overview: content.overview || '',
      posterPath: content.poster_path || null,
      backdropPath: content.backdrop_path || null,
      year: String(content.year || ''),
      rating: Number(content.vote_average || content.rating || 0),
      anime: isAnime,
    };

    setCatalogTitle(immediateTitle);

    pendingAutoPlay.current = {
      playKey,
      title: immediateTitle,
      season,
      episode,
      server: serverKey,
      streamUrl: stream,
    };

    if (engine.current) {
      executePendingPlay();
    }

    // Background enrichment without blocking playback or being cancelled on remount
    resolveTmdbTitle(targetId, content.type === 'tv' ? 'tv' : 'movie', content.title, 'standard')
      .then((resolved) => {
        if (resolved) {
          setCatalogTitle((prev) => (prev ? { ...prev, ...resolved } : resolved));
        }
      })
      .catch((err) => {
        console.warn('Background TMDB title enrichment failed:', err);
      });
  }, [content, propStreamUrl, propSeason, propEpisode, propServer, executePendingPlay, snapshot.embed]);

  const searchParamsString = searchParams.toString();

  // Deep-link query parameters (?id=...&type=...)
  useEffect(() => {
    if (content) return; // Prop / state takes precedence

    const type = (searchParams.get('type') === 'tv' ? 'tv' : 'movie') as 'movie' | 'tv';
    const idParam = searchParams.get('id');
    const titleParam = searchParams.get('title') || '';
    const directUrl = searchParams.get('url');

    if (directUrl) {
      const playKey = `direct-${directUrl}`;
      if (autoPlayedKey.current === playKey) return;
      if (pendingAutoPlay.current?.playKey === playKey) return;
      autoPlayedKey.current = playKey;

      const titleObj: CatalogTitle = {
        id: 1,
        mediaType: 'movie',
        title: titleParam || 'My Screening',
        originalTitle: titleParam || 'My Screening',
        overview: '',
        posterPath: searchParams.get('poster') || null,
        backdropPath: null,
        year: '',
        rating: 7.5,
        anime: false,
      };
      setCatalogTitle(titleObj);

      pendingAutoPlay.current = {
        playKey,
        title: titleObj,
        season: 1,
        episode: 1,
        server: 'bingr',
        streamUrl: directUrl,
      };

      if (engine.current) {
        executePendingPlay();
      }
      return;
    }

    if (!idParam) return;

    const season = Math.max(1, Number(searchParams.get('s')) || 1);
    const episode = Math.max(1, Number(searchParams.get('e')) || 1);
    const srvIndex = Number(searchParams.get('srv'));
    const playKey = `deeplink-${idParam}-${type}-${season}-${episode}-${srvIndex}`;

    if (autoPlayedKey.current === playKey) return;
    if (pendingAutoPlay.current?.playKey === playKey) return;
    if (snapshot.embed && String(snapshot.embed.catalog.id) === String(idParam).replace(/^(tmdb_|imdb_)/, '') && snapshot.embed.selection.season === season && snapshot.embed.selection.episode === episode) {
      return;
    }

    const cleanId = String(idParam).replace(/^(tmdb_|imdb_)/, '');
    const isImdb = cleanId.startsWith('tt') || String(idParam).startsWith('tt');
    const options = serversFor(false);
    const serverKey =
      (Number.isInteger(srvIndex) && options[srvIndex] ? options[srvIndex].key : 'bingr') ??
      'bingr';

    if (!isImdb) {
      const tmdbIdNum = parseInt(cleanId, 10) || 1;
      const immediateTitle: CatalogTitle = {
        id: tmdbIdNum,
        mediaType: type,
        title: titleParam || 'Cinema Feature',
        originalTitle: titleParam || 'Cinema Feature',
        overview: '',
        posterPath: searchParams.get('poster') || null,
        backdropPath: null,
        year: '',
        rating: 7.5,
        anime: false,
      };

      setCatalogTitle(immediateTitle);

      pendingAutoPlay.current = {
        playKey,
        title: immediateTitle,
        season,
        episode,
        server: serverKey,
      };

      if (engine.current) {
        executePendingPlay();
      }

      // Enrich metadata in background without blocking playback
      resolveTmdbTitle(idParam, type, titleParam, 'standard')
        .then((resolvedTitle) => {
          if (resolvedTitle) {
            setCatalogTitle((prev) => (prev ? { ...prev, ...resolvedTitle } : resolvedTitle));
          }
        })
        .catch((err) => {
          console.warn('Background TMDB title lookup failed:', err);
        });
    } else {
      // For IMDb IDs, resolve numeric TMDB ID first
      resolveTmdbTitle(idParam, type, titleParam, 'standard')
        .then((resolvedTitle) => {
          const tmdbIdNum = resolvedTitle?.id || 1;
          const title: CatalogTitle = resolvedTitle || {
            id: tmdbIdNum,
            mediaType: type,
            title: titleParam || 'Cinema Feature',
            originalTitle: titleParam || 'Cinema Feature',
            overview: '',
            posterPath: resolvedTitle?.posterPath || searchParams.get('poster') || null,
            backdropPath: null,
            year: '',
            rating: 7.5,
            anime: false,
          };
          setCatalogTitle(title);
          const animeOptions = serversFor(title.anime);
          const finalServerKey =
            (Number.isInteger(srvIndex) && animeOptions[srvIndex] ? animeOptions[srvIndex].key : 'bingr') ??
            'bingr';

          pendingAutoPlay.current = {
            playKey,
            title,
            season,
            episode,
            server: finalServerKey,
          };

          if (engine.current) {
            executePendingPlay();
          }
        })
        .catch((err) => {
          console.warn('Deep-link IMDb lookup failed, using fallback:', err);
          const fallbackTitle: CatalogTitle = {
            id: 1,
            mediaType: type,
            title: titleParam || 'Cinema Feature',
            originalTitle: titleParam || 'Cinema Feature',
            overview: '',
            posterPath: searchParams.get('poster') || null,
            backdropPath: null,
            year: '',
            rating: 7.5,
            anime: false,
          };
          setCatalogTitle(fallbackTitle);

          pendingAutoPlay.current = {
            playKey,
            title: fallbackTitle,
            season,
            episode,
            server: serverKey,
          };

          if (engine.current) {
            executePendingPlay();
          }
        });
    }
  }, [searchParamsString, content, executePendingPlay, snapshot.embed]);

  // Keep document title synced with active 3D content
  useEffect(() => {
    const rawTitle =
      (snapshot.embed?.title && snapshot.embed.title !== 'Afterlight' ? snapshot.embed.title : null) ||
      (snapshot.filmTitle && snapshot.filmTitle !== 'Afterlight' ? snapshot.filmTitle : null) ||
      catalogTitle?.title ||
      content?.title ||
      searchParams.get('title');

    setTheatreTitle(rawTitle);
  }, [catalogTitle?.title, snapshot.embed?.title, snapshot.filmTitle, content?.title, searchParams]);

  // Sync 3D auditorium wall posters with active movie or show content
  useEffect(() => {
    if (!engine.current) return;
    const activePoster =
      catalogTitle?.posterPath ||
      content?.poster_path ||
      content?.poster_path_mobile ||
      snapshot.embed?.catalog.posterPath ||
      (location.state as { content?: Content })?.content?.poster_path ||
      (location.state as { content?: Content })?.content?.poster_path_mobile ||
      searchParams.get('poster') ||
      null;

    const activeTitle =
      catalogTitle?.title ||
      content?.title ||
      snapshot.embed?.catalog.title ||
      snapshot.embed?.title ||
      (location.state as { content?: Content })?.content?.title ||
      searchParams.get('title') ||
      null;

    if (activePoster || activeTitle) {
      engine.current.setPoster(activePoster, activeTitle);
    }
  }, [
    catalogTitle?.posterPath,
    catalogTitle?.title,
    content?.poster_path,
    content?.poster_path_mobile,
    content?.title,
    snapshot.embed?.catalog.posterPath,
    snapshot.embed?.catalog.title,
    snapshot.embed?.title,
    searchParamsString,
    ready,
  ]);

  // ── Auto-Fallback Server Switcher for 3D Theatre ──────────────────────────
  const triedTheatreServers = useRef<Set<ServerKey>>(new Set());
  const [switchingServer, setSwitchingServer] = useState(false);
  const theatreWatchdogTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear tried servers when media changes
  useEffect(() => {
    triedTheatreServers.current.clear();
  }, [snapshot.embed?.catalog.id]);

  const switchToNextTheatreServer = useCallback((reason?: string) => {
    if (!engine.current || !snapshot.embed || switchingServer) return;
    const currentEmbed = snapshot.embed;
    const currentServer = currentEmbed.selection.server;
    triedTheatreServers.current.add(currentServer);

    const isAnime = Boolean(currentEmbed.selection.anime || currentEmbed.catalog.anime);
    const allServers = serversFor(isAnime);
    const nextServer = allServers.find((s) => !triedTheatreServers.current.has(s.key));

    if (!nextServer) {
      notify(`All servers have been tried. Settle in or open Screen Controls to select.`);
      return;
    }

    const curName = serverName(currentServer);
    notify(`${curName} ${reason || 'is not playing'}. Switching to ${nextServer.name}…`);
    setSwitchingServer(true);

    try {
      const nextSelection = {
        ...currentEmbed.selection,
        server: nextServer.key,
        preferences: readServerPreferences(nextServer.key),
      };
      const nextMedia = makeEmbed(currentEmbed.catalog, nextSelection);
      void engine.current.loadMedia(nextMedia, true);
    } catch (e) {
      console.warn('Failed to switch theatre server:', e);
    } finally {
      setTimeout(() => setSwitchingServer(false), 2500);
    }
  }, [snapshot.embed, switchingServer, notify]);

  // Reactive fallback on providerStatus ('slow' or 'error')
  useEffect(() => {
    if (!snapshot.embed || switchingServer) return;
    if (snapshot.providerStatus === 'error') {
      switchToNextTheatreServer('failed to load');
    }
  }, [snapshot.providerStatus, snapshot.embed, switchingServer, switchToNextTheatreServer]);

  // Watchdog: If provider takes >20s to open and isn't playing, auto-try next server
  useEffect(() => {
    if (!snapshot.embed || switchingServer) return;
    if (snapshot.providerStatus === 'opening') {
      if (theatreWatchdogTimer.current) clearTimeout(theatreWatchdogTimer.current);
      theatreWatchdogTimer.current = setTimeout(() => {
        if (snapshot.providerStatus === 'opening') {
          switchToNextTheatreServer('is not responding');
        }
      }, 20000);
    } else {
      if (theatreWatchdogTimer.current) clearTimeout(theatreWatchdogTimer.current);
    }
    return () => {
      if (theatreWatchdogTimer.current) clearTimeout(theatreWatchdogTimer.current);
    };
  }, [snapshot.providerStatus, snapshot.embed, switchingServer, switchToNextTheatreServer]);

  const onEngine = useCallback((instance: CinemaEngine | null) => {
    engine.current = instance;
    if (instance) {
      instance.setQuality(quality);
      instance.setReducedMotion(reducedMotion);
      instance.setInputEnabled(panel === null);
      instance.setProfile(profile);
      instance.setServiceVisible(waitersOn);
      if (pendingAutoPlay.current) {
        executePendingPlay();
      }
    }
  }, [quality, reducedMotion, panel, profile, waitersOn, executePendingPlay]);

  // Ensure media plays as soon as engine and ready state are achieved
  useEffect(() => {
    if (ready && engine.current && pendingAutoPlay.current) {
      executePendingPlay();
    }
  }, [ready, executePendingPlay]);

  const onSnapshot = useCallback((next: CinemaSnapshot) => {
    setSnapshot(next);
    watchParty.receiveSnapshot(next);
    if (next.mode === 'explore' && pendingSeat.current) {
      const id = pendingSeat.current;
      pendingSeat.current = null;
      queueMicrotask(() => engine.current?.takeSeat(id));
    }
  }, [watchParty]);

  useEffect(() => {
    engine.current?.setQuality(quality);
    try {
      localStorage.setItem('mydonkey-theatre-quality', quality);
    } catch { }
  }, [quality]);

  useEffect(() => {
    engine.current?.setReducedMotion(reducedMotion);
    try {
      localStorage.setItem('mydonkey-theatre-motion', String(reducedMotion));
    } catch { }
  }, [reducedMotion]);

  useEffect(() => {
    engine.current?.setRefreshTarget(refreshTarget);
    try {
      localStorage.setItem('mydonkey-theatre-high-refresh', refreshTarget ? 'on' : 'off');
    } catch { }
  }, [refreshTarget]);

  useEffect(() => {
    engine.current?.setInputEnabled(panel === null);
  }, [panel]);

  useEffect(() => {
    if (movieMode) {
      setMovieHint(true);
      const hintTimer = setTimeout(() => setMovieHint(false), 7000);
      return () => clearTimeout(hintTimer);
    }
    setMovieHint(false);
  }, [movieMode]);

  const toggleWaiters = useCallback(() => {
    setWaitersOn((v) => {
      const next = !v;
      engine.current?.setServiceVisible(next);
      return next;
    });
  }, []);

  const updateProfile = useCallback((val: PlayerProfile) => {
    const next = cleanProfile(val);
    setProfile(next);
    saveProfile(next);
    notify('Player updated. Make yourself comfortable.');
  }, [notify]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      notify('Fullscreen not supported in this window.');
    }
  }, [notify]);

  useEffect(() => {
    const onFsChange = () => setFullscreen(Boolean(document.fullscreenElement));
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement)?.tagName) || panel) return;
      if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        void toggleFullscreen();
      }
      if (e.key === '?') {
        e.preventDefault();
        setPanel('controls');
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [panel, toggleFullscreen]);

  const reset = () => {
    pendingSeat.current = null;
    engine.current?.resetView();
    setPanel(null);
  };

  const chooseSeat = (id: string) => {
    setPanel(null);
    if (snapshot.mode === 'seated') {
      if (snapshot.seatId === id) return;
      pendingSeat.current = id;
      engine.current?.stand();
    } else {
      engine.current?.takeSeat(id);
    }
  };

  const primaryAction = () => {
    if (snapshot.mode === 'seated') engine.current?.stand();
    else if (snapshot.mode === 'walking') engine.current?.cancelWalk();
    else if (snapshot.mode === 'explore') engine.current?.takeSeat();
  };

  const handleExit = () => {
    if (onExit) {
      onExit();
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleClosePanel = useCallback(() => {
    setPanel(null);
  }, []);

  const handleOpenCatalog = useCallback(() => {
    setCatalogReturn('party');
    setPanel('catalog');
  }, []);

  const handleCloseCatalog = useCallback(() => {
    setCatalogReturn((prev) => {
      setPanel(prev);
      return null;
    });
  }, []);

  const nearSeat = Boolean(snapshot.nearbySeatId && !snapshot.overview);
  const showSitStand = movieMode || snapshot.mode === 'walking' || snapshot.mode === 'standing' || Boolean(snapshot.reservingSeat) || nearSeat;
  let actionLabel = nearSeat ? `Sit ${snapshot.nearbySeatId}` : 'Sit';
  if (snapshot.mode === 'walking') actionLabel = 'Cancel';
  if (snapshot.mode === 'sitting') actionLabel = 'Sit';
  if (snapshot.mode === 'seated') actionLabel = 'Stand';
  if (snapshot.mode === 'standing') actionLabel = 'Stand';
  if (snapshot.reservingSeat) actionLabel = 'Wait';

  return (
    <div className="theatre-viewport fixed inset-0 z-[500] bg-[#0c0e0f] text-[#e8e5df] overflow-hidden select-none">
      <div
        className={`app-shell ${ready ? 'is-ready' : ''} ${movieMode ? 'movie-session' : ''} ${movieMode && !hudVisible ? 'hud-hidden' : ''
          } ${reducedMotion ? 'reduced-motion' : ''}`}
      >
        {/* Top edge hover sensor: only active when topbar is hidden */}
        {!topbarVisible && (
          <div
            className="fixed top-0 left-0 right-0 h-4 z-[35] pointer-events-auto"
            onPointerEnter={showControls}
          />
        )}

        {/* Header Bar */}
        <header
          className={`site-header ${!topbarVisible ? 'is-hidden' : ''}`}
          onMouseEnter={() => {
            isTopbarHovered.current = true;
            setTopbarVisible(true);
            if (topbarTimer.current) clearTimeout(topbarTimer.current);
          }}
          onMouseLeave={() => {
            isTopbarHovered.current = false;
            showControls();
          }}
        >
          <div className="header-left">
            <button
              className="back-to-site"
              onClick={handleExit}
              title="Exit 3D Theatre"
              aria-label="Exit 3D Theatre"
            >
              <ArrowLeft size={15} />
              <span>Exit Theatre</span>
            </button>
            <div className="nav-divider" />
            <button className="brand" onClick={reset} aria-label="MY DONKEY 3D Theatre">
              <img src="/logo.png" alt="MY DONKEY" className="h-7 w-auto object-contain" />
              <span className="brand-name">
                3D VIRTUAL CINEMA
              </span>
            </button>
          </div>

          <nav className="main-nav hidden md:flex" aria-label="Experience navigation">
            <button className={`nav-link ${panel === null ? 'is-active' : ''}`} onClick={() => setPanel(null)}>
              Auditorium
            </button>
            <button className={`nav-link ${panel === 'experience' ? 'is-active' : ''}`} onClick={() => setPanel('experience')}>
              About Cinema
            </button>
          </nav>

          <div className="header-right">
            {isSeries && (
              <button
                className={`topbar-episodes-btn ${panel === 'episodes' ? 'is-active' : ''}`}
                onClick={() => setPanel('episodes')}
                title={`Season ${currentSeasonNum} Episode ${currentEpisodeNum} • Choose Episode`}
                style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  borderRadius: '999px',
                  background: panel === 'episodes' ? '#d6bb90' : 'rgba(255,255,255,0.06)',
                  color: panel === 'episodes' ? '#1a1c1b' : '#f0eae0',
                  border: panel === 'episodes' ? '1px solid #d6bb90' : '1px solid rgba(255,255,255,0.14)',
                  cursor: 'pointer',
                  transition: 'all 180ms ease',
                }}
              >
                <Tv size={13} className={panel === 'episodes' ? 'text-black' : 'text-amber-400'} />
                <span>S{currentSeasonNum}:E{currentEpisodeNum}</span>
              </button>
            )}

            <button
              className={`watch-party-button ${inParty ? 'is-connected' : ''}`}
              onClick={() => setPanel('party')}
              title="Watch Party: shared screening & chat"
            >
              <Users size={15} strokeWidth={1.5} />
              <span>Watch Party</span>
              {inParty && <span className="party-button-count">{watchParty.state.members.length}/10</span>}
            </button>

            <button
              className="profile-button"
              onClick={() => setPanel('player')}
              aria-label={`Customize player, ${profile.name}`}
              title="Your Player Avatar"
            >
              <PlayerAvatar profile={profile} />
            </button>
          </div>
        </header>

        {/* 3D Auditorium Canvas Stage */}
        <main className="cinema-stage relative flex-1" aria-label="3D Cinema Auditorium">
          <Suspense fallback={null}>
            <CinemaScene
              onEngine={onEngine}
              onUpdate={onSnapshot}
              onReady={() => {
                setReady(true);
                executePendingPlay();
                if (engine.current) {
                  const p =
                    catalogTitle?.posterPath ||
                    content?.poster_path ||
                    content?.poster_path_mobile ||
                    (location.state as { content?: Content })?.content?.poster_path ||
                    (location.state as { content?: Content })?.content?.poster_path_mobile ||
                    searchParams.get('poster') ||
                    null;
                  const t =
                    catalogTitle?.title ||
                    content?.title ||
                    (location.state as { content?: Content })?.content?.title ||
                    searchParams.get('title') ||
                    null;
                  if (p || t) {
                    engine.current.setPoster(p, t);
                  }
                  if ('sitDirectly' in engine.current) {
                    (engine.current as any).sitDirectly('B3');
                  }
                }
              }}
              onMessage={notify}
              onError={setError}
              onValidation={setValidation}
            />
          </Suspense>

          <div className="stage-top-shade" aria-hidden="true" />
          <div className="stage-bottom-shade" aria-hidden="true" />
          <div className="stage-vignette" aria-hidden="true" />

          {/* Floating Controls HUD */}
          <TheatreControls
            engine={engine.current}
            snapshot={snapshot}
            movieMode={movieMode}
            hudVisible={hudVisible}
            waitersOn={waitersOn}
            quality={quality}
            onToggleWaiters={toggleWaiters}
            onQuality={setQuality}
            onNotify={notify}
          />

          {/* Scene Introduction */}
          <div className={`scene-intro ${!snapshot.overview ? 'is-hidden' : ''}`}>
            <span className="eyebrow">
              <span className="intro-line" />
              PREMIUM 3D AUDITORIUM
            </span>
            <h1>
              Welcome to the Theatre<span>.</span>
            </h1>
            <p>Pick a recliner, call concessions, or wander around. The big screen is yours.</p>
          </div>

          {/* On-Stage Walk / Sit Controls */}
          <div className="scene-controls">
            <div className="desktop-controls">
              {movieMode ? (
                <>
                  <span className="control-hint">
                    <kbd>E</kbd>
                    <span>Stand up anytime</span>
                  </span>
                  <span className="control-hint">
                    {snapshot.embed ? (
                      <>
                        <Mouse size={16} />
                        <span>Use screen controls</span>
                      </>
                    ) : (
                      <>
                        <kbd className="wide-key">Space</kbd>
                        <span>Play / pause</span>
                      </>
                    )}
                  </span>
                </>
              ) : (
                <>
                  <span className="control-hint">
                    <span className="key-group">
                      <kbd>W</kbd>
                      <kbd>A</kbd>
                      <kbd>S</kbd>
                      <kbd>D</kbd>
                    </span>
                    <span>Walk</span>
                  </span>
                  <span className="control-hint look-control">
                    <Mouse size={16} strokeWidth={1.4} />
                    <span>Drag to look</span>
                  </span>
                  <span className="control-hint interact-control">
                    <kbd>E</kbd>
                    <span>Sit / Stand</span>
                  </span>
                </>
              )}
            </div>

            {/* Mobile Touch Joystick */}
            {!movieMode && !transitioning && ready && (
              <Joystick onMove={(x, y) => engine.current?.setJoystick(x, y)} />
            )}

            {/* Seat Action & Service Bell */}
            <div className="seat-action">
              <div className="seat-action-buttons">
                {(movieMode || snapshot.eatingProgress !== null) && (
                  <button
                    className={`service-bell-button ${snapshot.eatingProgress !== null ? 'is-eating' : ''}`}
                    onClick={() => engine.current?.ringBell()}
                    disabled={!ready || !!error || snapshot.servicePhase !== 'idle' || snapshot.eatingProgress !== null}
                    title={
                      snapshot.eatingProgress !== null
                        ? snapshot.foodName
                        : snapshot.servicePhase !== 'idle'
                          ? 'Server on the way'
                          : 'Ring for Waiter Service'
                    }
                    aria-label="Ring for Waiter"
                  >
                    {snapshot.eatingProgress !== null ? (
                      <LoaderCircle className="spin" size={15} />
                    ) : (
                      <BellRing size={16} strokeWidth={1.5} />
                    )}
                  </button>
                )}

                {showSitStand && (
                  <button
                    className={`primary-button take-seat-button ${snapshot.mode === 'seated' ? 'stand-button' : ''
                      }`}
                    onClick={primaryAction}
                    disabled={!ready || !!error || transitioning || Boolean(snapshot.reservingSeat)}
                    title={actionLabel}
                    aria-label={actionLabel}
                  >
                    {transitioning || snapshot.mode === 'walking' || snapshot.reservingSeat ? (
                      <LoaderCircle className="spin" size={16} />
                    ) : snapshot.mode === 'seated' || snapshot.mode === 'standing' ? (
                      <PersonStanding size={18} />
                    ) : (
                      <Armchair size={17} strokeWidth={1.65} />
                    )}
                  </button>
                )}

                <button
                  className="seat-map-button"
                  onClick={() => setPanel('seats')}
                  disabled={!ready || !!error}
                  aria-label="Open 2D Seat Map"
                  title="Choose Recliner Seat"
                >
                  <Grid2X2 size={16} strokeWidth={1.5} />
                </button>

                <button
                  className="change-server-button"
                  onClick={() => setPanel('screen')}
                  disabled={!ready || !!error}
                  aria-label="Change Streaming Server"
                  title="Change Server"
                >
                  <Wifi size={16} strokeWidth={1.5} />
                </button>

                {snapshot.embed && (
                  <button
                    className="change-server-button"
                    onClick={() => switchToNextTheatreServer('requested next server')}
                    disabled={!ready || !!error || switchingServer}
                    aria-label="Try Next Server"
                    title="Try Next Server if buffering or not playing"
                  >
                    <RefreshCw size={15} strokeWidth={1.5} className={switchingServer ? 'spin text-amber-400' : 'text-amber-400'} />
                  </button>
                )}
              </div>

              {snapshot.eatingProgress !== null && (
                <span className="service-progress" aria-hidden="true">
                  <i style={{ width: `${Math.round(snapshot.eatingProgress * 100)}%` }} />
                </span>
              )}

              <span className="seat-action-caption">
                {movieMode
                  ? `Seat ${snapshot.seatId || 'Recliner'}. Enjoy the screening.`
                  : snapshot.mode === 'walking'
                    ? 'Moving to seat...'
                    : snapshot.mode === 'standing'
                      ? 'Auditorium is yours to explore.'
                      : 'Settle into any recliner.'}
              </span>
            </div>

            <button
              className="reset-view"
              onClick={reset}
              disabled={!ready || !!error}
              title="Return to the rear entrance"
            >
              <RotateCcw size={14} strokeWidth={1.5} />
              <span>Reset view</span>
            </button>
            <span className="mobile-look-hint">Drag room to look around</span>
          </div>

          {/* Loading Screen */}
          {!error && (
            <div className={`cinema-loading ${ready ? 'is-loaded' : ''}`} aria-hidden={ready} role="status">
              <img src="/logo.png" alt="" className="h-12 w-auto mb-6 animate-pulse" />
              <span className="loading-overline">INITIALIZING 3D PROJECTION</span>
              <h2>Preparing your private cinema.</h2>
              <span className="loading-track">
                <i />
              </span>
            </div>
          )}

          {/* Error Screen */}
          {error && (
            <div className="cinema-error" role="alert">
              <Monitor size={35} strokeWidth={1} />
              <h2>Cinema Unavailable</h2>
              <p>{error}</p>
              <button className="primary-button" onClick={() => window.location.reload()}>
                Try again <RotateCcw size={16} />
              </button>
            </div>
          )}

          {movieMode && movieHint && !hudVisible && (
            <span className="movie-tap-hint" role="status">
              Tap anywhere for controls · Press E to stand
            </span>
          )}
        </main>

        {/* Bottom Playback Bar */}
        <footer className="playback-bar">
          {snapshot.duration > 0 && (
            <div className="footer-film-timeline">
              <SeekBar
                compact
                snapshot={snapshot}
                disabled={!canControlPlayback || snapshot.loading}
                onSeek={(time) => engine.current?.seek(time)}
              />
            </div>
          )}

          <div className="now-playing">
            <button
              className="playback-toggle"
              onClick={() => (snapshot.embed ? setPanel('screen') : engine.current?.togglePlayback())}
              disabled={!ready || !!error || snapshot.loading || (!snapshot.embed && !canControlPlayback && !snapshot.autoplayBlocked)}
              aria-label={snapshot.playing ? 'Pause' : 'Play'}
            >
              {snapshot.embed ? (
                <Monitor size={14} />
              ) : snapshot.playing && !snapshot.autoplayBlocked ? (
                <Pause size={14} fill="currentColor" />
              ) : (
                <Play size={14} fill="currentColor" />
              )}
            </button>

            <button
              className="film-button"
              onClick={() => (snapshot.embed ? setPanel('screen') : setPanel('catalog'))}
              disabled={!ready || !!error}
              aria-label={`Screen player, ${snapshot.filmTitle}`}
            >
              <span className="footer-eyebrow">
                {snapshot.loading
                  ? 'PREPARING SCREEN'
                  : snapshot.embed
                    ? 'STREAMING PROVIDER'
                    : inParty
                      ? 'SHARED SCREEN'
                      : 'SELECT CONTENT'}
              </span>
              <span className="film-meta">
                <strong>{snapshot.embed ? snapshot.filmTitle : 'Pick a Movie or Series'}</strong>
                <span className="film-kind">
                  {snapshot.embed
                    ? 'Provider Stream'
                    : snapshot.mediaKind === 'file'
                      ? 'Local Video'
                      : snapshot.mediaKind === 'url'
                        ? 'Direct Video'
                        : 'Click to choose content'}
                </span>
                <ChevronDown size={12} />
              </span>
            </button>
          </div>

          {isSeries && snapshot.embed ? (
            <div className="footer-center footer-episodes-stepper">
              <button
                type="button"
                className="footer-ep-step-btn"
                disabled={currentEpisodeNum <= 1 || snapshot.loading}
                onClick={() => void handleStepEpisode(-1)}
                title="Previous Episode"
                aria-label="Previous Episode"
              >
                <ChevronLeft size={14} />
                <span className="hidden md:inline">Prev</span>
              </button>

              <button
                type="button"
                className="footer-ep-current-btn"
                onClick={() => setPanel('episodes')}
                title="Open Episodes & Seasons Menu"
              >
                <Tv size={13} className="text-amber-400" />
                <span>S{currentSeasonNum}:E{currentEpisodeNum}</span>
                <span className="footer-ep-label hidden sm:inline">Episodes</span>
              </button>

              <button
                type="button"
                className="footer-ep-step-btn"
                disabled={snapshot.loading}
                onClick={() => void handleStepEpisode(1)}
                title="Next Episode"
                aria-label="Next Episode"
              >
                <span className="hidden md:inline">Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          ) : inParty ? (
            <button className="footer-center party-footer-presence" onClick={() => setPanel('party')}>
              <Users size={14} />
              <span>{watchParty.state.members.length} in watch party</span>
              <span className="footer-local-label">ONLINE</span>
            </button>
          ) : snapshot.duration > 0 ? (
            <button className="footer-center footer-timecode" onClick={() => setPanel('screen')}>
              <span>
                {formatTime(snapshot.currentTime)}
                <span> / {formatTime(snapshot.duration)}</span>
              </span>
              <span>
                Open controls <ArrowRight size={11} />
              </span>
            </button>
          ) : null}

          <div className="experience-tools">
            {movieMode && (
              <>
                <button
                  className="waiters-toggle tool-button"
                  onClick={toggleWaiters}
                  aria-pressed={waitersOn}
                  title={waitersOn ? 'Hide waiters' : 'Show waiters'}
                >
                  <BellRing size={15} strokeWidth={1.5} />
                  <span>Waiters {waitersOn ? 'on' : 'off'}</span>
                </button>
                <span className="tool-divider" />
              </>
            )}

            <button
              className="icon-button fullscreen-button"
              onClick={() => void toggleFullscreen()}
              aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              title={fullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
            >
              {fullscreen ? <Minimize size={17} strokeWidth={1.5} /> : <Maximize size={17} strokeWidth={1.5} />}
            </button>
          </div>
        </footer>
      </div>

      {/* Experience Dialog Panels */}
      {panel && (
        <ExperiencePanels
          panel={panel}
          onClose={handleClosePanel}
          snapshot={snapshot}
          onChooseSeat={chooseSeat}
          quality={quality}
          onQuality={setQuality}
          reducedMotion={reducedMotion}
          onReducedMotion={setReducedMotion}
          refreshTarget={refreshTarget}
          onRefreshTarget={setRefreshTarget}
          validation={validation}
          onReset={reset}
          engine={engine.current}
          party={watchParty}
          profile={profile}
          onProfile={updateProfile}
          onOpenPanel={setPanel}
          onOpenCatalog={handleOpenCatalog}
          onCloseCatalog={handleCloseCatalog}
          initialCatalogTitle={catalogTitle}
          cinemaReady={ready && !error}
          currentContent={content}
        />
      )}

      {/* Mobile Landscape Orientation Helper Overlay */}
      {isMobile && isPortrait && !dismissRotatePrompt && (
        <div className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300 select-none">
          <div className="relative mb-5">
            <div className="w-16 h-16 rounded-2xl bg-brand-red/10 border border-brand-red/30 flex items-center justify-center text-brand-red shadow-[0_0_35px_rgba(229,9,20,0.35)]">
              <RotateCcw size={32} className="animate-spin duration-1000" />
            </div>
            <Smartphone size={26} className="absolute -top-1 -right-1 text-white animate-pulse" />
          </div>
          <h3 className="text-xl md:text-2xl font-black text-white mb-2 tracking-tight">Rotate to Landscape</h3>
          <p className="text-gray-300 text-xs md:text-sm max-w-xs mb-6 leading-relaxed">
            The 3D Virtual Cinema is optimized for widescreen landscape view. Please rotate your phone for the best experience.
          </p>
          <div className="flex flex-col gap-2.5 w-full max-w-xs">
            <button
              onClick={async () => {
                try {
                  if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                  }
                } catch (_) { }
                try {
                  if (screen.orientation && (screen.orientation as any).lock) {
                    await (screen.orientation as any).lock('landscape');
                  }
                } catch (_) { }
                setDismissRotatePrompt(true);
              }}
              className="bg-brand-red hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              <Maximize size={16} /> Enter Landscape Cinema
            </button>
            <button
              onClick={() => setDismissRotatePrompt(true)}
              className="text-xs text-gray-400 hover:text-white py-2 transition cursor-pointer"
            >
              Continue in Portrait
            </button>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {toast && (
        <div className="notification-toast" role="status" key={toast}>
          <Check size={16} />
          <span>{toast}</span>
          <button aria-label="Dismiss message" onClick={() => setToast('')}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
};

export default TheatreView;
