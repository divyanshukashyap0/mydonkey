import { useEffect, useState, type FormEvent } from 'react';
import {
  Armchair,
  ArrowRight,
  Ban,
  Bot,
  Check,
  CheckCircle2,
  ClipboardPaste,
  Copy,
  Crown,
  ExternalLink,
  Film,
  Globe2,
  Link,
  LoaderCircle,
  LogOut,
  Monitor,
  Play,
  Settings2,
  Share2,
  Sparkles,
  UserMinus,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { CinemaSnapshot, PlayerProfile } from '../cinema/types';
import type { WatchPartyController } from '../watch-party/useWatchParty';
import { inviteUrl } from '../watch-party/FirebaseParty';
import { cleanProfile } from '../watch-party/profile';
import { partyFirebaseReady } from '../watch-party/firebase';
import { PlayerAvatar } from './PlayerProfilePanel';

type Props = {
  party: WatchPartyController;
  profile: PlayerProfile;
  snapshot: CinemaSnapshot;
  ready: boolean;
  onProfile: (profile: PlayerProfile) => void;
  onPlayer: () => void;
  onScreen: () => void;
  onPickFilm: () => void;
  onSeats: () => void;
  onStart: () => void;
  onClose: () => void;
};

function readDraft(): { name: string; title: string; tab: 'create' | 'join' } | null {
  try {
    const value = JSON.parse(localStorage.getItem('mydonkey-party-draft') ?? 'null') as {
      name?: unknown;
      title?: unknown;
      tab?: unknown;
    } | null;
    if (value && typeof value === 'object') {
      return {
        name: typeof value.name === 'string' ? value.name.slice(0, 24) : '',
        title: typeof value.title === 'string' ? value.title.slice(0, 48) : '',
        tab: value.tab === 'join' ? 'join' : 'create',
      };
    }
  } catch {
    // Draft is optional
  }
  return null;
}

function writeDraft(draft: { name: string; title: string; tab: 'create' | 'join' }) {
  try {
    localStorage.setItem('mydonkey-party-draft', JSON.stringify(draft));
  } catch {
    // Draft is optional
  }
}

function clearDraft() {
  try {
    localStorage.removeItem('mydonkey-party-draft');
  } catch {
    // Draft is optional
  }
}

export default function WatchPartyPanel(props: Props) {
  const { party, profile, snapshot, ready } = props;
  const { state } = party;
  const initialCode = new URLSearchParams(window.location.search).get('party') ?? '';
  const draft = readDraft();
  const [tab, setTab] = useState<'create' | 'join'>(initialCode ? 'join' : draft?.tab ?? 'create');
  const [name, setName] = useState(draft?.name || profile.name || 'Divyanshu');
  const [title, setTitle] = useState(draft?.title ?? 'Cinema Night Feature');
  const [code, setCode] = useState(initialCode);
  const connected = state.status === 'connected' && state.room;

  useEffect(() => {
    if (!connected) writeDraft({ name, title, tab });
  }, [name, title, tab, connected]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const isHost = state.room?.hostId === state.selfId;
  const self = state.members.find((member) => member.id === state.selfId);
  const readyCount = state.members.filter((member) => member.ready).length;
  const mediaReady = !snapshot.loading && !snapshot.playbackError && !party.mediaError && (!connected || state.source.id === snapshot.sourceId);
  const isFirebase = partyFirebaseReady();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Please enter your display name to enter the watch party.');
      return;
    }
    setError('');
    setBusy(true);
    const player = cleanProfile({ ...profile, name: name.trim() });
    props.onProfile(player);

    try {
      if (tab === 'create') {
        await party.create(title, player);
      } else {
        if (!code.trim()) {
          setError('Please enter a valid room code or invitation URL.');
          setBusy(false);
          return;
        }
        await party.join(code, player);
      }
      clearDraft();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Could not start watch party. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const copyCodeOnly = async () => {
    if (!state.room) return;
    setError('');
    try {
      await navigator.clipboard.writeText(state.room.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2200);
    } catch {
      setError('Could not access clipboard.');
    }
  };

  const copyInvitation = async () => {
    if (!state.room) return;
    setError('');
    try {
      await navigator.clipboard.writeText(inviteUrl(state.room.code));
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    } catch {
      setError('Could not access clipboard. Select link and copy manually.');
    }
  };

  const shareInvitation = async () => {
    if (!state.room) return;
    setError('');
    try {
      if (typeof navigator.share !== 'function') throw new Error('unavailable');
      await navigator.share({
        title: 'MyDonkey 3D Cinema Watch Party',
        text: `Join my private cinema screening (Room code: ${state.room.code})`,
        url: inviteUrl(state.room.code),
      });
    } catch {
      void copyInvitation();
    }
  };

  const botsOn = state.members.some((member) => member.bot);
  const [botCount, setBotCount] = useState(3);

  // ════════════════════════════════════════════════════════════════════════
  // 1. SETUP VIEW (Create or Join Room)
  // ════════════════════════════════════════════════════════════════════════
  if (!connected) {
    return (
      <div className="party-panel-root">
        <div className="panel-heading party-setup-heading">
          <span className="eyebrow">
            <span className="party-live-indicator" />
            MY DONKEY · 3D CINEMA WATCH PARTY
          </span>
          <h2 id="panel-heading">
            Good stories.<br />Better company.
          </h2>
          <p>One private 3D cinema. Ten places. Real-time synchronized viewing.</p>
        </div>

        <div className="party-segmented-tabs" role="tablist" aria-label="Watch party setup options">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'create'}
            className={`party-tab-pill ${tab === 'create' ? 'is-active' : ''}`}
            onClick={() => {
              setTab('create');
              setError('');
            }}
            disabled={busy}
          >
            <Users size={14} />
            <span>Create a party</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'join'}
            className={`party-tab-pill ${tab === 'join' ? 'is-active' : ''}`}
            onClick={() => {
              setTab('join');
              setError('');
            }}
            disabled={busy}
          >
            <Link size={14} />
            <span>Join a party</span>
          </button>
        </div>

        <form className="party-setup-form" id="party-setup-form" onSubmit={submit}>
          {/* USER NAME ROW */}
          <div className="party-field-group">
            <label className="field-label" htmlFor="party-display-name">
              YOUR NAME IN THE CINEMA
            </label>
            <div className="party-name-row">
              <PlayerAvatar profile={{ ...profile, name }} className="party-name-avatar" />
              <input
                id="party-display-name"
                className="party-name-input-field"
                placeholder="What should guests call you?"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError('');
                }}
                maxLength={24}
                autoComplete="nickname"
                required
                disabled={busy}
              />
            </div>
          </div>

          {tab === 'create' ? (
            <>
              {/* SESSION TITLE */}
              <div className="party-field-group">
                <label className="field-label" htmlFor="party-title">
                  GIVE YOUR SCREENING A NAME
                </label>
                <input
                  id="party-title"
                  className="cinema-input party-styled-input"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={48}
                  placeholder="e.g. Friday Movie Night"
                  disabled={busy}
                />
              </div>

              {/* MEDIA PREVIEW CARD */}
              <div className="party-media-card">
                <div className="party-media-icon">
                  <Film size={20} />
                </div>
                <div className="party-media-content">
                  <span className="party-media-badge">ON YOUR 3D SCREEN</span>
                  <strong>{snapshot.filmTitle || 'Afterlight Cinema'}</strong>
                  <small>
                    {snapshot.embed ? 'External Streaming Provider' : 'Native 3D Cinema Stream'}
                  </small>
                </div>
                <button
                  type="button"
                  className="party-media-change-btn"
                  onClick={props.onPickFilm}
                  disabled={!ready || busy}
                  title="Choose another movie or series"
                >
                  <Globe2 size={13} />
                  <span>Catalog</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </>
          ) : (
            <>
              {/* JOIN CODE */}
              <div className="party-field-group">
                <div className="party-field-label-row">
                  <label className="field-label" htmlFor="party-code">
                    ROOM CODE OR INVITATION LINK
                  </label>
                  <button
                    type="button"
                    className="party-paste-btn"
                    onClick={async () => {
                      try {
                        const clip = await navigator.clipboard.readText();
                        if (clip) setCode(clip.trim());
                      } catch {
                        // Clipboard permission restricted
                      }
                    }}
                    title="Paste from clipboard"
                  >
                    <ClipboardPaste size={12} />
                    <span>Paste</span>
                  </button>
                </div>
                <input
                  id="party-code"
                  className="cinema-input room-code-input"
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value);
                    setError('');
                  }}
                  placeholder="e.g. K7MN2A"
                  autoComplete="off"
                  spellCheck={false}
                  required
                  disabled={busy}
                />
              </div>
            </>
          )}

          {/* SYNC ENGINE BADGE & NOTICE */}
          <div className="party-sync-notice">
            <div className="party-sync-header">
              <span className="party-sync-pill">
                <span className="party-sync-dot" />
                {isFirebase ? 'Cloud Synced (Firebase)' : 'Instant Real-time Sync'}
              </span>
              <span className="party-sync-devices">Multi-Tab &amp; Cross-Device</span>
            </div>
            <p>
              Guests take reserved seats in the 3D theatre, see each other moving in real-time, and watch together in sync.
              {snapshot.embed && ' External provider audio & playhead are managed locally on each viewer device.'}
            </p>
          </div>

          {error && (
            <div className="party-error-banner" role="alert">
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="primary-button full-width party-main-submit-btn"
            disabled={!ready || busy || snapshot.loading}
          >
            {busy ? (
              <LoaderCircle className="spin" size={17} />
            ) : tab === 'create' ? (
              <Sparkles size={16} />
            ) : (
              <Users size={16} />
            )}
            <span>
              {busy
                ? 'Preparing your cinema...'
                : tab === 'create'
                ? 'Launch Watch Party'
                : 'Join Watch Party'}
            </span>
            {!busy && <ArrowRight size={16} />}
          </button>
        </form>

        <p className="panel-footnote">No signup required. Keep your cinema tab open to stay connected.</p>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // 2. ACTIVE ROOM VIEW (Inside Watch Party)
  // ════════════════════════════════════════════════════════════════════════
  const room = state.room!;

  return (
    <div className="party-panel-root">
      {/* ROOM HEADER */}
      <div className="panel-heading party-room-heading">
        <span className="eyebrow">
          <span className="party-live-indicator pulse" />
          ACTIVE CINEMA ROOM · {room.code}
        </span>
        <h2 id="panel-heading">{room.title}</h2>
        <p>
          {room.screening
            ? 'The feature has begun. Take your seat in the 3D hall.'
            : 'Share the code with friends to fill the recliners.'}
        </p>
      </div>

      {/* CODE & INVITATION BAR */}
      <div className="party-code-card">
        <div className="party-code-display">
          <span className="party-code-sublabel">ROOM CODE</span>
          <strong className="party-room-code-digits">{room.code}</strong>
        </div>
        <div className="party-code-actions">
          <button
            type="button"
            className={`party-action-pill ${copiedCode ? 'is-success' : ''}`}
            onClick={() => void copyCodeOnly()}
            title="Copy room code"
          >
            {copiedCode ? <Check size={14} /> : <Copy size={14} />}
            <span>{copiedCode ? 'Code Copied' : 'Copy Code'}</span>
          </button>
          <button
            type="button"
            className="party-action-pill"
            onClick={() => void shareInvitation()}
            title="Share invite link"
          >
            <Share2 size={14} />
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* COPY FULL LINK BAR */}
      <div className="party-link-row">
        <input
          aria-label="Invitation URL"
          value={inviteUrl(room.code)}
          readOnly
          onFocus={(event) => event.target.select()}
          className="party-link-input"
        />
        <button
          type="button"
          className={`party-link-copy-btn ${copiedLink ? 'is-copied' : ''}`}
          onClick={() => void copyInvitation()}
        >
          {copiedLink ? <Check size={14} /> : <Copy size={14} />}
          <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
        </button>
        <a
          href={inviteUrl(room.code)}
          target="_blank"
          rel="noopener noreferrer"
          className="party-link-external-btn"
          title="Open in new tab"
        >
          <ExternalLink size={13} />
        </a>
      </div>

      {/* SHARED FILM BAR */}
      <div className="party-current-media-bar">
        <div className="party-media-icon">
          <Film size={18} />
        </div>
        <div className="party-media-info">
          <span className="party-media-tag">
            {snapshot.embed ? 'EXTERNAL PROVIDER' : isHost ? 'HOST CONTROLS FILM' : 'SHARED FILM'}
          </span>
          <strong className="party-media-title">{state.source.title}</strong>
        </div>
        <button
          type="button"
          className="party-catalog-link-btn"
          onClick={props.onPickFilm}
          title="Pick movie from catalog"
        >
          <span>Catalog</span>
          <ArrowRight size={12} />
        </button>
      </div>

      {/* MEMBERS ROSTER */}
      <div className="party-roster-header">
        <span className="field-label">IN THE CINEMA</span>
        <span className="party-roster-count">{state.members.length} / 10 places taken</span>
      </div>

      <ul className="party-members-list" aria-label="People in your watch party">
        {state.members.map((member) => (
          <li key={member.id} className="party-member-item">
            <PlayerAvatar profile={member} className="party-member-avatar" />
            <div className="party-member-info">
              <div className="party-member-name-row">
                <strong className="party-member-name">{member.name}</strong>
                {member.id === state.selfId && <span className="party-self-chip">you</span>}
                {member.bot && (
                  <span className="party-bot-chip">
                    <Bot size={11} /> BOT
                  </span>
                )}
                {member.id === room.hostId && (
                  <span className="party-host-crown" title="Room Host">
                    <Crown size={12} />
                  </span>
                )}
                {member.muted && (
                  <span className="party-muted-chip" title="Muted">
                    <VolumeX size={12} />
                  </span>
                )}
              </div>
              <small className="party-member-sub">
                {member.seatId ? (
                  <span className="party-seat-tag">
                    <Armchair size={11} /> Seat {member.seatId}
                  </span>
                ) : (
                  <span className="party-seat-tag exploring">Exploring Hall</span>
                )}
              </small>
            </div>

            {isHost && member.id !== state.selfId && !member.bot ? (
              <div className="party-host-controls">
                <button
                  type="button"
                  className="party-ctrl-btn"
                  title={member.muted ? 'Unmute guest' : 'Mute guest'}
                  aria-label={member.muted ? `Unmute ${member.name}` : `Mute ${member.name}`}
                  onClick={() => void party.mute(member.id, !member.muted)}
                >
                  {member.muted ? <Volume2 size={13} /> : <VolumeX size={13} />}
                </button>
                <button
                  type="button"
                  className="party-ctrl-btn"
                  title="Remove guest"
                  aria-label={`Remove ${member.name}`}
                  onClick={() => void party.kick(member.id)}
                >
                  <UserMinus size={13} />
                </button>
                <button
                  type="button"
                  className="party-ctrl-btn danger"
                  title="Ban guest"
                  aria-label={`Ban ${member.name}`}
                  onClick={() => void party.ban(member.id)}
                >
                  <Ban size={13} />
                </button>
              </div>
            ) : (
              <span className={`party-readiness-pill ${member.ready ? 'is-ready' : ''}`}>
                {member.ready ? <Check size={11} /> : null}
                <span>{member.ready ? 'Ready' : 'Settling in'}</span>
              </span>
            )}
          </li>
        ))}
      </ul>

      {/* COMPANION BOTS CONTROLLER */}
      {isHost && !room.screening && (
        <div className="party-bots-panel">
          <div className="party-bots-text">
            <strong>
              <Bot size={15} /> Companion Bots
            </strong>
            <p>
              Alone? Invite friendly companion bots to occupy 3D recliners and watch with you. Real guests can replace them anytime.
            </p>
          </div>
          <div className="party-bots-switches">
            <button
              className={`toggle-switch ${botsOn ? 'is-on' : ''}`}
              role="switch"
              aria-checked={botsOn}
              aria-label="Toggle companion bots"
              onClick={() => party.setBots(botsOn ? 0 : botCount || 3)}
            >
              <span />
            </button>
            {botsOn && (
              <div className="party-bot-pills" role="group" aria-label="Number of companion bots">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    aria-pressed={n === botCount}
                    className={`party-bot-pill ${n === botCount ? 'is-active' : ''}`}
                    onClick={() => {
                      setBotCount(n);
                      party.setBots(n);
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* QUICK ACTIONS BAR */}
      <div className="party-shortcuts-bar">
        <button type="button" className="party-shortcut-btn" onClick={props.onSeats}>
          <Armchair size={15} />
          <span>{snapshot.seatId ? `Seat: ${snapshot.seatId}` : 'Pick Seat'}</span>
          <ArrowRight size={12} />
        </button>
        <button
          type="button"
          className="party-shortcut-btn icon-btn"
          onClick={props.onScreen}
          title="Open screen controls"
        >
          <Monitor size={15} />
          <span>Screen</span>
        </button>
        <button
          type="button"
          className="party-shortcut-btn icon-btn"
          onClick={props.onPlayer}
          title="Customize your avatar"
        >
          <Settings2 size={15} />
          <span>Avatar</span>
        </button>
      </div>

      {/* READY STATUS TOGGLE */}
      {!room.screening && (
        <div className="party-ready-bar">
          <div className="party-ready-copy">
            <strong>{self?.ready ? 'You are settled in.' : 'Ready when you are.'}</strong>
            <p>
              {readyCount} of {state.members.length} {state.members.length === 1 ? 'viewer' : 'viewers'} ready.
            </p>
          </div>
          <button
            className={`toggle-switch ${self?.ready ? 'is-on' : ''}`}
            role="switch"
            aria-checked={!!self?.ready}
            aria-label="Toggle ready status"
            disabled={!mediaReady}
            onClick={() => party.setReady(!self?.ready)}
          >
            <span />
          </button>
        </div>
      )}

      {/* HOST LAUNCH / SCREENING BUTTON */}
      {!room.screening && isHost ? (
        <>
          <button
            type="button"
            className="primary-button full-width party-start-btn"
            disabled={!mediaReady || readyCount !== state.members.length}
            onClick={props.onStart}
          >
            <Play size={16} />
            <span>{snapshot.embed ? 'Enter Feature Screening' : 'Start Screening for Everyone'}</span>
            <ArrowRight size={16} />
          </button>
          <p className="panel-footnote">
            {snapshot.embed
              ? 'External video controls are local to each viewer tab.'
              : readyCount !== state.members.length
              ? 'Waiting for all guests in the cinema to toggle Ready.'
              : 'Host controls play, pause, and seek for everyone.'}
          </p>
        </>
      ) : room.screening ? (
        <button type="button" className="primary-button full-width party-start-btn" onClick={props.onClose}>
          <Play size={16} />
          <span>Return to 3D Cinema</span>
          <ArrowRight size={16} />
        </button>
      ) : (
        <p className="guest-waiting-notice">
          <CheckCircle2 size={16} />
          <span>
            {self?.ready
              ? 'You are ready! Your host will start the screening shortly.'
              : 'Toggle Ready above when you have settled into your seat.'}
          </span>
        </p>
      )}

      {/* LEAVE / END PARTY */}
      {confirmLeave ? (
        <div className="party-leave-confirm-box">
          <p>{isHost ? 'End watch party for everyone?' : 'Leave this cinema room?'}</p>
          <div className="party-leave-actions">
            <button
              type="button"
              className="party-leave-btn confirm"
              onClick={() => {
                party.leave();
                clearDraft();
                setConfirmLeave(false);
              }}
            >
              <LogOut size={13} />
              <span>{isHost ? 'End Party' : 'Leave Room'}</span>
            </button>
            <button
              type="button"
              className="party-leave-btn cancel"
              onClick={() => setConfirmLeave(false)}
            >
              <X size={14} />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="party-leave-trigger-btn"
          onClick={() => setConfirmLeave(true)}
        >
          <LogOut size={13} />
          <span>{isHost ? 'End Watch Party' : 'Leave Room'}</span>
        </button>
      )}
    </div>
  );
}