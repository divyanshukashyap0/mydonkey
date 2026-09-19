import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Armchair,
  ArrowRight,
  BellRing,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Film,
  Footprints,
  Info,
  LoaderCircle,
  Monitor,
  Mouse,
  Play,
  RotateCcw,
  Sparkles,
  Star,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { SEATS, type LayoutValidation } from '../cinema/world';
import type { CinemaSnapshot, PlayerProfile, Quality } from '../cinema/types';
import type { CinemaEngine } from '../cinema/CinemaEngine';
import type { WatchPartyController } from '../watch-party/useWatchParty';
import type { CatalogTitle, TitleDetails } from '../catalog/types';
import { backdropUrl, posterUrl, profileUrl, readEndpoint } from '../catalog/config';
import { getTitleDetails } from '../catalog/tmdb';
import type { Content } from '../../../types';
import PlayerProfilePanel from './PlayerProfilePanel';
import WatchPartyPanel from './WatchPartyPanel';
import ScreenPlayerPanel from './ScreenPlayerPanel';
import CatalogPanel, { TmdbAttribution } from './CatalogPanel';
import EpisodesPanel from './EpisodesPanel';

export type Panel = 'seats' | 'controls' | 'experience' | 'settings' | 'screen' | 'party' | 'player' | 'catalog' | 'episodes' | null;

function Dialog({ children, onClose, kind }: { children: ReactNode; onClose: () => void; kind: string }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.fullscreenElement) { event.preventDefault(); onClose(); }
      if (event.key !== 'Tab' || !panel.current) return;
      const scope = document.fullscreenElement && panel.current.contains(document.fullscreenElement) ? document.fullscreenElement : panel.current;
      const focusable = Array.from(scope.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"], a[href]')).filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previouslyFocused?.focus(); };
  }, [onClose, kind]);

  return (
    <div className={`modal-backdrop ${kind === 'catalog' || kind === 'episodes' ? 'catalog-backdrop' : ''}`} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={panel} className={`experience-panel panel-${kind}`} role="dialog" aria-modal="true" aria-labelledby="panel-heading">
        <button className="icon-button panel-close" onClick={onClose} aria-label="Close panel"><X size={19} /></button>
        {children}
      </div>
    </div>
  );
}

function PanelHeading({ eyebrow, title, description }: { eyebrow: string; title: ReactNode; description?: string }) {
  return <div className="panel-heading"><span className="eyebrow">{eyebrow}</span><h2 id="panel-heading">{title}</h2>{description && <p>{description}</p>}</div>;
}

function SeatPanel({ snapshot, onChoose, occupied }: { snapshot: CinemaSnapshot; onChoose: (id: string) => void; occupied: Map<string, string> }) {
  const [selected, setSelected] = useState(snapshot.seatId ?? (!occupied.has('B3') ? 'B3' : SEATS.find((item) => !occupied.has(item.id))?.id ?? 'B3'));
  const seat = SEATS.find((item) => item.id === selected)!;
  const isSeated = snapshot.mode === 'seated';
  const current = isSeated && snapshot.seatId === selected;
  const transitioning = snapshot.mode === 'sitting' || snapshot.mode === 'standing';
  return <>
    <PanelHeading eyebrow="MAKE YOURSELF COMFORTABLE" title="Find your favorite spot." description="Ten wide recliners. Not a bad seat in the house." />
    <div className="seat-plan" aria-label="Cinema seating plan, two rows of five seats">
      <div className="map-screen"><span />SCREEN</div>
      {(['A', 'B'] as const).map((row) => <div className={`map-row map-row-${row.toLowerCase()}`} key={row}>
        <span className="map-row-letter">{row}</span>
        <div className="map-seats">{SEATS.filter((item) => item.row === row).map((item) => <button key={item.id} className={`map-seat ${item.id === selected ? 'is-selected' : ''} ${(isSeated && snapshot.seatId === item.id) || occupied.has(item.id) ? 'is-occupied' : ''}`} disabled={occupied.has(item.id)} aria-pressed={selected === item.id} aria-label={occupied.has(item.id) ? `Seat ${item.id} is occupied by ${occupied.get(item.id)}` : `Select seat ${item.id}, ${row === 'A' ? 'main floor' : 'raised platform'}`} title={occupied.get(item.id) ? `Reserved by ${occupied.get(item.id)}` : undefined} onClick={() => setSelected(item.id)}>
          <Armchair size={31} strokeWidth={1.35} /><span>{item.id}</span>
          {isSeated && snapshot.seatId === item.id && <i aria-label="Your current seat" />}
          {occupied.has(item.id) && <i aria-label="Occupied" />}
        </button>)}</div>
        {row === 'B' && <><span className="map-stairs map-stairs-left" aria-hidden="true"><i /><i /><i /></span><span className="map-stairs map-stairs-right" aria-hidden="true"><i /><i /><i /></span></>}
      </div>)}
      <div className="map-rear"><span>RAISED PLATFORM</span><span>ENTRANCE <ChevronRight size={12} /></span></div>
    </div>
    <div className="seat-legend"><span><i />Available</span><span><i className="legend-selected" />Your selection</span>{occupied.size > 0 && <span><i className="legend-occupied" />Occupied</span>}</div>
    <div className="selected-seat-detail"><div><span className="detail-eyebrow">YOUR SPOT</span><h3>Seat {selected}</h3></div><p>{seat.row === 'A' ? 'Main floor' : 'Raised back row'}<br /><span>{seat.number === 3 ? 'A perfectly centered view' : seat.number === 1 || seat.number === 5 ? 'Easy side-aisle access' : 'A little closer to the center'}</span></p></div>
    <button className="primary-button full-width" disabled={current || transitioning || occupied.has(selected) || !!snapshot.reservingSeat} onClick={() => onChoose(selected)}><Armchair size={17} />{occupied.has(selected) ? 'This seat has just been taken' : current ? 'You are sitting here' : isSeated ? `Stand & move to ${selected}` : `Settle into ${selected}`}<ArrowRight size={17} /></button>
    <p className="panel-footnote">We will walk you there. You can take over at any time.</p>
  </>;
}

function ControlsPanel({ onClose, onAbout }: { onClose: () => void; onAbout: () => void }) {
  return <>
    <PanelHeading eyebrow="A QUICK INTRODUCTION" title={<>Come in.<br />Make yourself at home.</>} description="There is no right way to explore. Just find a seat you love." />
    <div className="control-instructions">
      <div className="instruction-row"><Footprints size={23} /><div><h3>A little room to wander.</h3><p>Use WASD or the arrow keys to walk. On mobile, use the thumbstick on the left.</p></div></div>
      <div className="instruction-row"><Mouse size={23} /><div><h3>Take it all in.</h3><p>Click and drag to look around. On mobile, drag the room with your right thumb.</p></div></div>
      <div className="instruction-row"><Armchair size={23} /><div><h3>Your seat is waiting.</h3><p>Click any recliner, choose one on the seat map, or press E when you are close.</p></div></div>
      <div className="instruction-row"><Sun size={23} /><div><h3>Let the world fade away.</h3><p>Settle in and the lights will gently dim. Press E or Stand up whenever you like.</p></div></div>
      <div className="instruction-row"><BellRing size={23} /><div><h3>In-seat service.</h3><p>Sit down, then ring the bell on your armrest. A server walks over with popcorn and a drink, then hot meals. Finish, ring again, and she is back. Two servers work the floor and a small cafe waits just beyond the exit.</p></div></div>
    </div>
    <div className="extra-shortcuts"><span><kbd>Space</kbd> Native play / pause</span><span><kbd>R</kbd> Reset view</span></div>
    <p className="catalog-helper">External servers use their own controls. The TMDB collection lives inside the Watch Party panel.</p>
    <button className="primary-button full-width" onClick={onClose}>Let me look around<ArrowRight size={17} /></button>
    <button className="text-button about-cinema-link" onClick={onAbout}>About this cinema &amp; credits<ArrowRight size={15} /></button>
  </>;
}

function AboutPanel({
  snapshot,
  currentContent,
  catalogTitle,
  onClose,
  onOpenCatalog,
}: {
  snapshot: CinemaSnapshot;
  currentContent?: Content | null;
  catalogTitle?: CatalogTitle | null;
  onClose: () => void;
  onOpenCatalog: () => void;
}) {
  const [details, setDetails] = useState<TitleDetails | null>(null);

  const activeCatalog = snapshot.embed?.catalog || catalogTitle || null;

  useEffect(() => {
    const controller = new AbortController();

    if (activeCatalog) {
      getTitleDetails(activeCatalog, readEndpoint(), controller.signal)
        .then((res) => {
          if (!controller.signal.aborted) setDetails(res);
        })
        .catch(() => {});
      return () => controller.abort();
    }

    if (currentContent) {
      const tmdbNum = Number(currentContent.tmdbId) || Number(String(currentContent.id).replace(/^(tmdb_|imdb_)/, ''));
      if (Number.isInteger(tmdbNum) && tmdbNum > 0) {
        const mediaType = currentContent.type === 'tv' ? 'tv' : 'movie';
        getTitleDetails({
          id: tmdbNum,
          mediaType,
          title: currentContent.title || 'Untitled',
          originalTitle: currentContent.title || 'Untitled',
          overview: currentContent.overview || '',
          posterPath: currentContent.poster_path || null,
          backdropPath: currentContent.backdrop_path || null,
          year: String(currentContent.year || ''),
          rating: currentContent.vote_average || 0,
          anime: Boolean(currentContent.genres?.some((g) => g.toLowerCase().includes('anime'))),
        }, readEndpoint(), controller.signal)
          .then((res) => {
            if (!controller.signal.aborted) setDetails(res);
          })
          .catch(() => {});
        return () => controller.abort();
      }
    }
  }, [activeCatalog?.id, activeCatalog?.mediaType, currentContent?.id, currentContent?.tmdbId]);

  const isAmbient = snapshot.mediaKind === 'ambient' && !details && !currentContent && !activeCatalog;

  const title = details?.title || currentContent?.title || activeCatalog?.title || snapshot.filmTitle || 'Afterlight';
  const originalTitle = details?.originalTitle && details.originalTitle !== title ? details.originalTitle : undefined;
  const tagline = details?.tagline || (isAmbient ? 'Leave the everyday outside.' : undefined);
  const overview = details?.overview || currentContent?.overview || activeCatalog?.overview || (isAmbient
    ? 'Deep burgundy leather. Warm architectural light. High-fidelity spatial acoustics and an expansive 7.8m curved screen. Settle into any of the 10 luxury recliners, ring for in-seat concessions on your armrest, or pick any movie from the collection to watch on the big screen.'
    : 'Now streaming on the 3D cinema screen. Enjoy immersive audio and dynamic auditorium lighting.');

  const backdropSrc = backdropUrl(details?.backdropPath || activeCatalog?.backdropPath || null)
    || (currentContent?.backdrop_path ? (currentContent.backdrop_path.startsWith('http') ? currentContent.backdrop_path : `https://image.tmdb.org/t/p/w1280${currentContent.backdrop_path}`) : null)
    || '/images/afterlight.jpg';

  const posterSrc = posterUrl(details?.posterPath || activeCatalog?.posterPath || null)
    || (currentContent?.poster_path ? (currentContent.poster_path.startsWith('http') ? currentContent.poster_path : `https://image.tmdb.org/t/p/w500${currentContent.poster_path}`) : null);

  const year = details?.year || currentContent?.year || (currentContent?.release_date ? currentContent.release_date.slice(0, 4) : '') || (isAmbient ? 'Showcase' : '');
  const rating = details?.rating || currentContent?.vote_average || activeCatalog?.rating || null;
  const runtime = details?.runtime ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m` : currentContent?.duration ? String(currentContent.duration) : null;
  const mediaType = (details?.mediaType || currentContent?.type || activeCatalog?.mediaType || 'movie').toUpperCase();
  const serverName = snapshot.embed?.selection.server?.toUpperCase() || (snapshot.localFilm ? 'LOCAL' : snapshot.mediaKind === 'url' ? 'DIRECT' : 'BINGR (AUTO)');
  const tvSeasonEp = snapshot.embed?.selection.season ? `S${snapshot.embed.selection.season} · E${snapshot.embed.selection.episode}` : null;

  const genres = (details?.genres && details.genres.length > 0)
    ? details.genres
    : (currentContent?.genres && currentContent.genres.length > 0)
    ? currentContent.genres
    : (isAmbient ? ['Ambient Cinema', 'Architectural Showcase', 'Spatial Audio'] : ['Cinema Feature']);

  const castList = (details?.cast && details.cast.length > 0)
    ? details.cast
    : (currentContent?.cast && currentContent.cast.length > 0)
    ? currentContent.cast.slice(0, 18).map((name, i) => ({ id: i, name, character: '', profilePath: null, order: i }))
    : [];

  const crewList = (details?.crew && details.crew.length > 0)
    ? details.crew
    : isAmbient
    ? [
        { id: 1, name: 'Elias North', job: 'Director & Vision', department: 'Directing', profilePath: null },
        { id: 2, name: 'Studio Aethoflix', job: 'Spatial Audio Design', department: 'Sound', profilePath: null },
        { id: 3, name: 'Grand Palais Design', job: 'Auditorium Architecture', department: 'Art', profilePath: null },
      ]
    : [
        ...(currentContent?.director ? [{ id: 1, name: currentContent.director, job: 'Director', department: 'Directing', profilePath: null }] : []),
        ...(currentContent?.creators ? currentContent.creators.map((c, i) => ({ id: 10 + i, name: c, job: 'Creator', department: 'Writing', profilePath: null })) : []),
      ];

  return (
    <div className="about-content-wrapper">
      <PanelHeading
        eyebrow={isAmbient ? 'THE AETHOFLIX EXPERIENCE' : 'NOW SCREENING IN AUDITORIUM'}
        title={<>{title}</>}
        description={isAmbient ? 'For the stories that deserve your full attention.' : 'Feature presentation details, cast, and screening technicals.'}
      />

      {/* Cinematic Banner */}
      <div className="about-cinema-banner">
        <img src={backdropSrc} alt={title} />
        <div className="about-banner-overlay">
          <div className="about-banner-badges">
            <span className="about-live-pill">Screening</span>
            <span className="about-type-pill">{mediaType}</span>
            {tvSeasonEp && <span className="about-type-pill">{tvSeasonEp}</span>}
            <span className="about-server-pill">{serverName}</span>
          </div>
        </div>
      </div>

      {/* Header Info with Poster */}
      <div className="about-header-row">
        <div className="about-poster-thumb">
          {posterSrc ? (
            <img src={posterSrc} alt={`${title} poster`} />
          ) : (
            <div className="about-poster-fallback">
              <Film size={26} />
              <span>{title}</span>
            </div>
          )}
        </div>

        <div className="about-header-info">
          <span className="about-eyebrow">FEATURE PRESENTATION</span>
          <h1 className="about-title">{title}</h1>
          {originalTitle && <p className="about-original-title">Original: {originalTitle}</p>}
          {tagline && <blockquote className="about-tagline">“{tagline}”</blockquote>}

          <div className="about-meta-row">
            {rating !== null && Number(rating) > 0 && (
              <span className="about-meta-tag rating-gold">
                <Star size={11} fill="currentColor" /> {Number(rating).toFixed(1)} / 10
              </span>
            )}
            {year && (
              <span className="about-meta-tag">
                <Calendar size={11} /> {year}
              </span>
            )}
            {runtime && (
              <span className="about-meta-tag">
                <Clock size={11} /> {runtime}
              </span>
            )}
            <span className="about-meta-tag">
              <Armchair size={11} /> {snapshot.seatId ? `Seat ${snapshot.seatId}` : '10 Recliners'}
            </span>
          </div>
        </div>
      </div>

      {/* Genres */}
      {genres.length > 0 && (
        <div className="about-genres-bar" aria-label="Genres">
          {genres.map((g) => (
            <span key={g} className="about-genre-pill">
              {g}
            </span>
          ))}
        </div>
      )}

      {/* Synopsis / Description */}
      <div className="about-section">
        <div className="about-section-label">
          <Info size={13} />
          <span>SYNOPSIS &amp; OVERVIEW</span>
        </div>
        <p className="about-description-text">{overview}</p>
      </div>

      {/* Cast & Characters */}
      {castList.length > 0 && (
        <div className="about-section">
          <div className="about-section-label">
            <Users size={13} />
            <span>CAST &amp; CHARACTERS ({castList.length})</span>
          </div>
          <div className="about-cast-scroll">
            {castList.map((actor) => {
              const photo = actor.profilePath ? profileUrl(actor.profilePath) : null;
              const initials = actor.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('');
              return (
                <div key={`${actor.id}-${actor.name}`} className="about-cast-card" title={actor.character ? `${actor.name} as ${actor.character}` : actor.name}>
                  {photo ? (
                    <img src={photo} alt={actor.name} className="about-cast-avatar" loading="lazy" />
                  ) : (
                    <div className="about-cast-avatar">{initials}</div>
                  )}
                  <div className="about-cast-info">
                    <span className="about-cast-name">{actor.name}</span>
                    {actor.character && <span className="about-cast-char">{actor.character}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Crew & Production */}
      {crewList.length > 0 && (
        <div className="about-section">
          <div className="about-section-label">
            <Film size={13} />
            <span>CREW &amp; PRODUCTION</span>
          </div>
          <div className="about-crew-grid">
            {crewList.map((crew, idx) => (
              <div key={`${crew.id}-${crew.job}-${idx}`} className="about-crew-card">
                <span className="about-crew-role">{crew.job || crew.department || 'Filmmaker'}</span>
                <span className="about-crew-name">{crew.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cinema Screening Specs ("and all") */}
      <div className="about-section">
        <div className="about-section-label">
          <Sparkles size={13} />
          <span>3D CINEMA SCREENING SPECS</span>
        </div>
        <div className="about-specs-grid">
          <div className="about-spec-box">
            <span className="about-spec-label">CANVAS SCREEN</span>
            <span className="about-spec-value">7.8m × 4.4m Curved Display (16:9)</span>
          </div>
          <div className="about-spec-box">
            <span className="about-spec-label">CURRENT AUDIENCE SEAT</span>
            <span className="about-spec-value">
              {snapshot.mode === 'seated' && snapshot.seatId ? `Recliner ${snapshot.seatId} (Seated)` : 'Auditorium Floor · 10 Recliners'}
            </span>
          </div>
          <div className="about-spec-box">
            <span className="about-spec-label">STREAM PROVIDER</span>
            <span className="about-spec-value">{serverName}</span>
          </div>
          <div className="about-spec-box">
            <span className="about-spec-label">AUDIO REPRODUCTION</span>
            <span className="about-spec-value">Spatial Multi-frequency Simulation</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="about-actions-group">
        <button className="primary-button full-width" onClick={onClose}>
          <Play size={15} /> Return to Screening
        </button>
        <button className="about-secondary-btn" onClick={onOpenCatalog}>
          <Compass size={15} /> Browse &amp; Select Another Movie
        </button>
      </div>

      <TmdbAttribution />
    </div>
  );
}

const QUALITY_OPTIONS: { value: Quality; label: string; description: string }[] = [
  { value: 'performance', label: 'Performance', description: 'Default. Tuned for phones and low-end devices: lower pixel ratio, fewer lights, no heavy shadows, still smooth.' },
  { value: 'auto', label: 'Adaptive', description: 'Balances clarity and frame rate. Good for mid-range devices.' },
  { value: 'high', label: 'Ultra graphics', description: 'Maximum detail and high-DPI rendering. Best on strong GPUs only.' },
];

function SettingsPanel({ quality, onQuality, reducedMotion, onReducedMotion, refreshTarget, onRefreshTarget, snapshot, validation, onReset }: {
  quality: Quality; onQuality: (quality: Quality) => void; reducedMotion: boolean; onReducedMotion: (value: boolean) => void;
  refreshTarget: boolean; onRefreshTarget: (value: boolean) => void;
  snapshot: CinemaSnapshot; validation: LayoutValidation | null; onReset: () => void;
}) {
  const validated = validation?.seats === 10 && validation.reachableSeats === 10 && validation.circulation;
  return <>
    <PanelHeading eyebrow="THE FINER DETAILS" title="Your kind of comfortable." description="A few thoughtful adjustments. Nothing in the way." />
    <div className="settings-section"><div className="section-label"><Monitor size={15} /><span>RENDER QUALITY</span><span className="actual-fps">{snapshot.fps || '--'} FPS</span></div>
      <fieldset className="quality-options"><legend className="sr-only">Render quality</legend>{QUALITY_OPTIONS.map((option) => <label className="quality-option" key={option.value}>
        <input type="radio" name="quality" value={option.value} checked={quality === option.value} onChange={() => onQuality(option.value)} />
        <span className="radio-indicator">{quality === option.value && <span />}</span><span><strong>{option.label}</strong><small>{option.description}</small></span>
        {option.value === 'performance' && <span className="recommended-label">DEFAULT</span>}
      </label>)}</fieldset>
      <p className="settings-explanation">Uncapped rendering, including 120 Hz on capable displays. Actual frame rate depends on your device and browser.</p>
    </div>
    <div className="toggle-setting"><div><h3>High refresh target</h3><p>Off by default. Turn on only for strong 120 Hz devices. Performance mode stays smoother on phones and low-end laptops with this off.</p></div><button className={`toggle-switch ${refreshTarget ? 'is-on' : ''}`} role="switch" aria-checked={refreshTarget} aria-label="High refresh target" onClick={() => onRefreshTarget(!refreshTarget)}><span /></button></div>
    <div className="toggle-setting"><div><h3>Reduced motion</h3><p>Less ambient movement, shorter camera transitions.</p></div><button className={`toggle-switch ${reducedMotion ? 'is-on' : ''}`} role="switch" aria-checked={reducedMotion} aria-label="Reduced motion" onClick={() => onReducedMotion(!reducedMotion)}><span /></button></div>
    <div className="circulation-check"><div>{validation ? validated ? <CheckCircle2 size={18} /> : <Compass size={18} /> : <LoaderCircle className="spin" size={18} />}<h3>{validation ? validated ? 'A little breathing room, verified.' : 'Layout diagnostics' : 'Checking the walking paths...'}</h3></div>
      {validation && <p>{validation.reachableSeats} of 10 seat approaches reachable. {validation.circulation ? 'Both stairs and circulation paths connected.' : 'Some circulation paths need a closer look.'}<br />0.76 m seat gaps. 1.48 m clear side aisles.</p>}
    </div>
    <button className="text-button reset-settings" onClick={onReset}><RotateCcw size={15} />Return to the entrance<ArrowRight size={15} /></button>
  </>;
}

type Props = {
  panel: Exclude<Panel, null>;
  onClose: () => void;
  snapshot: CinemaSnapshot;
  onChooseSeat: (id: string) => void;
  quality: Quality;
  onQuality: (quality: Quality) => void;
  reducedMotion: boolean;
  onReducedMotion: (value: boolean) => void;
  refreshTarget: boolean;
  onRefreshTarget: (value: boolean) => void;
  validation: LayoutValidation | null;
  onReset: () => void;
  engine: CinemaEngine | null;
  party: WatchPartyController;
  profile: PlayerProfile;
  onProfile: (profile: PlayerProfile) => void;
  onOpenPanel: (panel: Panel) => void;
  onOpenCatalog: () => void;
  onCloseCatalog: () => void;
  initialCatalogTitle: CatalogTitle | null;
  cinemaReady: boolean;
  currentContent?: Content | null;
};

export default function ExperiencePanels(props: Props) {
  const occupied = new Map(props.party.state.members.filter((member) => member.id !== props.party.state.selfId && member.seatId).map((member) => [member.seatId!, member.name]));
  return <Dialog kind={props.panel} onClose={props.panel === 'catalog' ? props.onCloseCatalog : props.onClose}>
    {props.panel === 'seats' && <SeatPanel snapshot={props.snapshot} onChoose={props.onChooseSeat} occupied={occupied} />}
    {props.panel === 'controls' && <ControlsPanel onClose={props.onClose} onAbout={() => props.onOpenPanel('experience')} />}
    {props.panel === 'experience' && (
      <AboutPanel
        snapshot={props.snapshot}
        currentContent={props.currentContent}
        catalogTitle={props.initialCatalogTitle}
        onClose={props.onClose}
        onOpenCatalog={props.onOpenCatalog}
      />
    )}
    {props.panel === 'settings' && <SettingsPanel {...props} />}
    {props.panel === 'screen' && <ScreenPlayerPanel engine={props.engine} snapshot={props.snapshot} party={props.party} onClose={props.onClose} onSeats={() => props.onOpenPanel('seats')} />}
    {props.panel === 'catalog' && <CatalogPanel engine={props.engine} snapshot={props.snapshot} party={props.party} onFinish={props.onClose} onSeats={() => props.onOpenPanel('seats')} initialTitle={props.initialCatalogTitle} />}
    {props.panel === 'episodes' && (
      <EpisodesPanel
        engine={props.engine}
        snapshot={props.snapshot}
        party={props.party}
        currentContent={props.currentContent}
        catalogTitle={props.initialCatalogTitle}
        onClose={props.onClose}
      />
    )}
    {props.panel === 'player' && <PlayerProfilePanel profile={props.profile} snapshot={props.snapshot} canFollow={props.cinemaReady} onSave={props.onProfile} onClose={props.onClose} onFollow={() => { props.onClose(); props.engine?.followPlayer(); }} />}
    {props.panel === 'party' && <WatchPartyPanel party={props.party} profile={props.profile} snapshot={props.snapshot} ready={props.cinemaReady} onProfile={props.onProfile} onPlayer={() => props.onOpenPanel('player')} onScreen={() => props.onOpenPanel('screen')} onPickFilm={props.onOpenCatalog} onSeats={() => props.onOpenPanel('seats')} onClose={props.onClose} onStart={() => { if (props.party.start()) { props.onClose(); if (props.snapshot.mode === 'explore') void props.engine?.takeSeat(); } }} />}
    <div className="panel-brand"><span className="tiny-brand-mark" /><span>MY DONKEY</span><span>3D CINEMA</span></div>
  </Dialog>;
}