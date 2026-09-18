import { get, onDisconnect, onValue, ref, remove, runTransaction, serverTimestamp, set, update, type Unsubscribe } from 'firebase/database';
import { AMBIENT_MEDIA, playbackPosition, type MediaSelection, type PlaybackChange, type PlaybackState, type PlayerPose, type PlayerProfile } from '../cinema/types';
import { SEATS } from '../cinema/world';
import { validateEmbed } from '../catalog/servers';
import { ensureFirebaseUser, partyDb, partyFirebaseReady, partySetupHint } from './firebase';
import { cleanProfile } from './profile';
import type { PartyMember, PartyRoom, PartyState } from './types';

function partyFailureMessage(error: unknown) {
  const hint = partySetupHint();
  if (hint) return hint;
  const code = (error as { code?: string } | null)?.code ?? '';
  if (code === 'auth/configuration-not-found' || code === 'auth/operation-not-allowed') {
    return 'Anonymous sign-in is turned off for the Watch Party project. Enable Anonymous auth in Firebase Console.';
  }
  if (code === 'auth/invalid-api-key' || code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.') {
    return 'The Watch Party API key is not valid for this project.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network error reaching Firebase. Using local multi-tab sync.';
  }
  return error instanceof Error ? error.message : 'Sign-in failed. Falling back to local mesh.';
}

type Callbacks = {
  onState: (state: PartyState) => void;
  onMedia: (media: MediaSelection) => void;
  onPlayback: (playback: PlaybackState, forceSeek?: boolean) => void;
  onPose: (id: string, pose: PlayerPose) => void;
  onNotice: (message: string) => void;
  onMuted: (muted: boolean) => void;
};

const BOT_PRESETS = [
  { name: 'Mira', color: '#8a6f9e' },
  { name: 'Kenji', color: '#4f7d8a' },
  { name: 'Zara', color: '#a46a52' },
  { name: 'Ryu', color: '#5d7a4f' },
];

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join('');
}

export function parseRoomCode(input: string): string {
  let value = input.trim();
  if (value.includes('://')) {
    try {
      value = new URL(value).searchParams.get('party') ?? '';
    } catch {
      return '';
    }
  }
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export function inviteUrl(code: string): string {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('party', code);
    return url.toString();
  } catch {
    return `${window.location.origin}/?party=${code}`;
  }
}

export function emptyFirebaseParty(selfId = ''): PartyState {
  return { status: 'idle', selfId, room: null, members: [], source: AMBIENT_MEDIA, playback: null, error: '' };
}

function serializableMedia(media: MediaSelection): MediaSelection {
  if (media.kind === 'file') {
    throw new Error('Local files cannot be sent to other devices. Use a direct video link or a catalogue provider for an online party.');
  }
  return media;
}

function validMedia(value: unknown): value is MediaSelection {
  if (!value || typeof value !== 'object') return false;
  const media = value as MediaSelection;
  if (typeof media.id !== 'string' || typeof media.title !== 'string') return false;
  if (media.kind === 'ambient') return media.id === AMBIENT_MEDIA.id;
  if (media.kind === 'url') return typeof media.url === 'string' && media.url.length <= 8192;
  if (media.kind === 'embed') return validateEmbed(media);
  return false;
}

function validPose(value: unknown): value is PlayerPose {
  if (!value || typeof value !== 'object') return false;
  const pose = value as PlayerPose;
  return [pose.x, pose.y, pose.z, pose.yaw, pose.sit, pose.phase, pose.speed].every(Number.isFinite)
    && Math.abs(pose.x) < 20 && Math.abs(pose.z) < 12;
}

interface LocalRoomRecord {
  meta: PartyRoom;
  members: Record<string, PartyMember>;
  seats: Record<string, string>;
  media: MediaSelection;
  playback: PlaybackState;
  bans: Record<string, boolean>;
  controls: Record<string, { muted?: boolean; kick?: boolean; banned?: boolean }>;
  updatedAt: number;
}

const LOCAL_ROOMS_KEY = 'mydonkey_theatre_party_rooms_v1';

function loadLocalRooms(): Record<string, LocalRoomRecord> {
  try {
    const raw = localStorage.getItem(LOCAL_ROOMS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalRoom(code: string, data: LocalRoomRecord) {
  try {
    const all = loadLocalRooms();
    all[code] = { ...data, updatedAt: Date.now() };
    localStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(all));
  } catch {
    // Local storage unavailable or full
  }
}

function removeLocalRoom(code: string) {
  try {
    const all = loadLocalRooms();
    delete all[code];
    localStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(all));
  } catch {
    // Ignored
  }
}

type LocalMeshMessage =
  | { type: 'sync'; code: string }
  | { type: 'pose'; code: string; id: string; pose: PlayerPose }
  | { type: 'playback'; code: string; playback: PlaybackState; force?: boolean }
  | { type: 'media'; code: string; media: MediaSelection }
  | { type: 'kick'; code: string; id: string; ban?: boolean }
  | { type: 'mute'; code: string; id: string; muted: boolean }
  | { type: 'leave'; code: string; id: string }
  | { type: 'ended'; code: string };

export class FirebaseParty {
  private uid = '';
  private profile: PlayerProfile;
  private callbacks: Callbacks;
  private state = emptyFirebaseParty();
  private media: MediaSelection = AMBIENT_MEDIA;
  private subscriptions: Unsubscribe[] = [];
  private code = '';
  private lastMediaId = '';
  private lastPlaybackUpdated = 0;
  private disposed = false;
  private botTimer: ReturnType<typeof setInterval> | null = null;
  private useFirebase = false;
  private localChannel: BroadcastChannel | null = null;
  private storageListener: ((event: StorageEvent) => void) | null = null;

  constructor(profile: PlayerProfile, callbacks: Callbacks) {
    this.profile = cleanProfile(profile);
    this.callbacks = callbacks;
    this.useFirebase = partyFirebaseReady();

    if (this.useFirebase) {
      void ensureFirebaseUser().then((user) => {
        if (this.disposed) return;
        this.uid = user.uid;
        this.state.selfId = user.uid;
        this.publish();
      }).catch((error: unknown) => {
        console.warn('[WatchParty] Firebase auth failed, falling back to local mesh:', error);
        this.useFirebase = false;
        this.setupLocalMesh();
      });
    } else {
      this.setupLocalMesh();
    }
  }

  private setupLocalMesh() {
    let localUid = '';
    try {
      localUid = sessionStorage.getItem('mydonkey_theatre_uid') ?? '';
    } catch {
      // Private browsing
    }
    if (!localUid) {
      localUid = `u-${Math.random().toString(36).slice(2, 9)}`;
      try {
        sessionStorage.setItem('mydonkey_theatre_uid', localUid);
      } catch {
        // Ignored
      }
    }
    this.uid = localUid;
    this.state.selfId = localUid;
    this.initLocalChannel();
    this.publish();
  }

  private initLocalChannel() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.localChannel = new BroadcastChannel('mydonkey_party_channel');
        this.localChannel.onmessage = (event: MessageEvent<LocalMeshMessage>) => {
          this.handleLocalMessage(event.data);
        };
      } catch {
        this.localChannel = null;
      }
    }

    this.storageListener = (event: StorageEvent) => {
      if (event.key === LOCAL_ROOMS_KEY && this.code && !this.useFirebase) {
        this.syncFromLocalStorage();
      }
    };
    window.addEventListener('storage', this.storageListener);
  }

  private broadcastLocal(msg: LocalMeshMessage) {
    if (this.localChannel) {
      try {
        this.localChannel.postMessage(msg);
      } catch {
        // Ignored
      }
    }
  }

  private handleLocalMessage(msg: LocalMeshMessage) {
    if (this.disposed || !this.code || msg.code !== this.code) return;
    switch (msg.type) {
      case 'sync':
        this.syncFromLocalStorage();
        break;
      case 'pose':
        if (msg.id !== this.uid && validPose(msg.pose)) {
          this.callbacks.onPose(msg.id, msg.pose);
        }
        break;
      case 'playback':
        if (msg.playback) {
          this.lastPlaybackUpdated = msg.playback.updatedAt;
          this.state.playback = msg.playback;
          this.callbacks.onPlayback(msg.playback, !!msg.force);
          this.publish();
        }
        break;
      case 'media':
        if (validMedia(msg.media)) {
          this.media = msg.media;
          this.state.source = { id: msg.media.id, title: msg.media.title, kind: msg.media.kind };
          if (msg.media.id !== this.lastMediaId) {
            this.lastMediaId = msg.media.id;
            this.callbacks.onMedia(msg.media);
          }
          this.publish();
        }
        break;
      case 'kick':
        if (msg.id === this.uid) {
          this.fail(msg.ban ? 'You were banned from this room by its host.' : 'You were removed from this room by its host.');
        }
        break;
      case 'mute':
        if (msg.id === this.uid) {
          this.callbacks.onMuted(msg.muted);
        }
        break;
      case 'ended':
        if (this.connected) {
          this.fail('The host ended this watch party.');
        }
        break;
      case 'leave':
        this.syncFromLocalStorage();
        break;
    }
  }

  private syncFromLocalStorage() {
    if (!this.code) return;
    const rooms = loadLocalRooms();
    const room = rooms[this.code];
    if (!room) {
      if (this.connected) this.fail('The host ended this watch party.');
      return;
    }

    if (room.bans && room.bans[this.uid]) {
      this.fail('You have been banned from this room by its host.');
      return;
    }

    const members = Object.values(room.members).slice(0, 10);
    if (this.connected && !members.some((m) => m.id === this.uid)) {
      this.fail('The host removed you from this room.');
      return;
    }

    this.state.room = room.meta;
    this.state.members = members;

    if (validMedia(room.media)) {
      this.media = room.media;
      this.state.source = { id: room.media.id, title: room.media.title, kind: room.media.kind };
      if (room.media.id !== this.lastMediaId) {
        this.lastMediaId = room.media.id;
        this.callbacks.onMedia(room.media);
      }
    }

    if (room.playback && Number.isFinite(room.playback.updatedAt)) {
      const force = room.playback.updatedAt !== this.lastPlaybackUpdated && Math.abs(room.playback.time - (this.state.playback?.time ?? 0)) > 0.5;
      this.lastPlaybackUpdated = room.playback.updatedAt;
      this.state.playback = room.playback;
      this.callbacks.onPlayback(room.playback, force);
    }

    const selfMember = members.find((m) => m.id === this.uid);
    this.callbacks.onMuted(!!selfMember?.muted);

    this.publish();
  }

  get isHost() { return this.state.room?.hostId === this.uid; }
  get connected() { return this.state.status === 'connected'; }
  get snapshot() { return this.state; }
  get currentMedia() { return this.media; }
  get isCloud() { return this.useFirebase; }

  private async ready() {
    if (this.useFirebase) {
      const user = await ensureFirebaseUser();
      this.uid = user.uid;
      this.state.selfId = user.uid;
      return user;
    }
    return { uid: this.uid };
  }

  private publish() {
    if (!this.disposed) {
      this.callbacks.onState({
        ...this.state,
        room: this.state.room ? { ...this.state.room } : null,
        members: this.state.members.map((member) => ({ ...member })),
        source: { ...this.state.source },
        playback: this.state.playback ? { ...this.state.playback } : null,
      });
    }
  }

  async create(title: string, media: MediaSelection, playback: PlaybackState): Promise<void> {
    await this.leave(false);
    await this.ready();
    const sharedMedia = serializableMedia(media);

    if (this.useFirebase) {
      let code = '';
      for (let attempt = 0; attempt < 8; attempt++) {
        const candidate = randomCode();
        const meta: PartyRoom = { code: candidate, title: title.trim().slice(0, 48) || 'A little movie night', hostId: this.uid, screening: false, online: true };
        const result = await runTransaction(ref(partyDb(), `rooms/${candidate}/meta`), (current) => current === null ? meta : undefined, { applyLocally: false });
        if (result.committed) { code = candidate; break; }
      }
      if (!code) throw new Error('Could not reserve a room code. Please try again.');
      this.code = code;
      this.media = sharedMedia;
      const member: PartyMember = { ...this.profile, id: this.uid, ready: false, seatId: null, joinedAt: Date.now(), muted: false };
      const nextPlayback = { ...playback, sourceId: sharedMedia.id, time: playbackPosition(playback), playing: false, updatedAt: Date.now() };
      await Promise.all([
        set(ref(partyDb(), `rooms/${code}/members/${this.uid}`), member),
        set(ref(partyDb(), `rooms/${code}/media`), sharedMedia),
        set(ref(partyDb(), `rooms/${code}/playback`), nextPlayback),
      ]);
      await onDisconnect(ref(partyDb(), `rooms/${code}`)).remove();
      this.state = {
        status: 'connected',
        selfId: this.uid,
        room: { code, title: title.trim().slice(0, 48) || 'A little movie night', hostId: this.uid, screening: false, online: true },
        members: [member],
        source: { id: sharedMedia.id, title: sharedMedia.title, kind: sharedMedia.kind },
        playback: nextPlayback,
        error: '',
      };
      this.lastMediaId = sharedMedia.id;
      this.lastPlaybackUpdated = nextPlayback.updatedAt;
      this.subscribe();
      this.callbacks.onPlayback(nextPlayback);
      this.publish();
      return;
    }

    // Local Mesh mode (instant, multi-tab sync, no external credentials needed)
    const code = randomCode();
    this.code = code;
    this.media = sharedMedia;
    const member: PartyMember = { ...this.profile, id: this.uid, ready: false, seatId: null, joinedAt: Date.now(), muted: false };
    const nextPlayback = { ...playback, sourceId: sharedMedia.id, time: playbackPosition(playback), playing: false, updatedAt: Date.now() };
    const roomMeta: PartyRoom = {
      code,
      title: title.trim().slice(0, 48) || 'A little movie night',
      hostId: this.uid,
      screening: false,
      online: true,
    };

    const roomRecord: LocalRoomRecord = {
      meta: roomMeta,
      members: { [this.uid]: member },
      seats: {},
      media: sharedMedia,
      playback: nextPlayback,
      bans: {},
      controls: {},
      updatedAt: Date.now(),
    };

    saveLocalRoom(code, roomRecord);
    this.broadcastLocal({ type: 'sync', code });

    this.state = {
      status: 'connected',
      selfId: this.uid,
      room: roomMeta,
      members: [member],
      source: { id: sharedMedia.id, title: sharedMedia.title, kind: sharedMedia.kind },
      playback: nextPlayback,
      error: '',
    };
    this.lastMediaId = sharedMedia.id;
    this.lastPlaybackUpdated = nextPlayback.updatedAt;
    this.callbacks.onPlayback(nextPlayback);
    this.publish();
  }

  async join(input: string): Promise<void> {
    const code = parseRoomCode(input);
    if (!/^[A-Z0-9]{6}$/.test(code)) throw new Error('Enter the six-character room code or paste the invitation link.');
    await this.leave(false);
    await this.ready();

    if (this.useFirebase) {
      this.state = { ...emptyFirebaseParty(this.uid), status: 'connecting', room: { code, title: 'Joining your cinema', hostId: '', screening: false, online: true } };
      this.publish();
      const [metaSnap, banSnap, membersSnap] = await Promise.all([
        get(ref(partyDb(), `rooms/${code}/meta`)), get(ref(partyDb(), `rooms/${code}/bans/${this.uid}`)), get(ref(partyDb(), `rooms/${code}/members`)),
      ]);
      if (!metaSnap.exists()) throw this.failError('Room not found. Check the code and make sure the host is still online.');
      if (banSnap.exists()) throw this.failError('You have been banned from this room by its host.');
      const membersValue = membersSnap.val() as Record<string, PartyMember> | null;
      if (membersValue && Object.keys(membersValue).length >= 10) throw this.failError('All ten places are taken.');
      const meta = metaSnap.val() as PartyRoom;
      this.code = code;
      const member: PartyMember = { ...this.profile, id: this.uid, ready: false, seatId: null, joinedAt: Date.now(), muted: false };
      await set(ref(partyDb(), `rooms/${code}/members/${this.uid}`), member);
      await Promise.all([
        onDisconnect(ref(partyDb(), `rooms/${code}/members/${this.uid}`)).remove(),
        onDisconnect(ref(partyDb(), `rooms/${code}/poses/${this.uid}`)).remove(),
      ]);
      this.state = { ...emptyFirebaseParty(this.uid), status: 'connected', room: meta, members: [member], error: '' };
      this.subscribe();
      this.publish();
      return;
    }

    // Local Mesh mode
    const rooms = loadLocalRooms();
    const roomRecord = rooms[code];
    if (!roomRecord) {
      throw this.failError('Room not found. Make sure the room code is correct and the host tab is still open.');
    }
    if (roomRecord.bans && roomRecord.bans[this.uid]) {
      throw this.failError('You have been banned from this room by its host.');
    }
    const memberCount = Object.keys(roomRecord.members).length;
    if (memberCount >= 10 && !roomRecord.members[this.uid]) {
      throw this.failError('All ten places are taken.');
    }

    this.code = code;
    const member: PartyMember = { ...this.profile, id: this.uid, ready: false, seatId: null, joinedAt: Date.now(), muted: false };
    roomRecord.members[this.uid] = member;
    saveLocalRoom(code, roomRecord);
    this.broadcastLocal({ type: 'sync', code });

    this.media = roomRecord.media;
    this.lastMediaId = roomRecord.media.id;
    this.state = {
      status: 'connected',
      selfId: this.uid,
      room: roomRecord.meta,
      members: Object.values(roomRecord.members),
      source: { id: roomRecord.media.id, title: roomRecord.media.title, kind: roomRecord.media.kind },
      playback: roomRecord.playback,
      error: '',
    };
    this.callbacks.onMedia(roomRecord.media);
    if (roomRecord.playback) this.callbacks.onPlayback(roomRecord.playback, true);
    this.publish();
  }

  private subscribe() {
    this.unsubscribe();
    const base = `rooms/${this.code}`;
    this.subscriptions.push(onValue(ref(partyDb(), `${base}/meta`), (snap) => {
      if (!snap.exists()) { if (this.connected) this.fail('The host ended this watch party.'); return; }
      this.state.room = snap.val() as PartyRoom;
      this.publish();
    }));
    this.subscriptions.push(onValue(ref(partyDb(), `${base}/members`), (snap) => {
      const value = snap.val() as Record<string, PartyMember> | null;
      const members = value ? Object.values(value).filter((member) => member && typeof member.id === 'string').slice(0, 10) : [];
      if (this.connected && !members.some((member) => member.id === this.uid)) { this.fail('The host removed you from this room.'); return; }
      this.state.members = members;
      const self = members.find((member) => member.id === this.uid);
      this.callbacks.onMuted(!!self?.muted);
      this.publish();
    }));
    this.subscriptions.push(onValue(ref(partyDb(), `${base}/media`), (snap) => {
      const value: unknown = snap.val();
      if (!validMedia(value)) return;
      this.media = value;
      this.state.source = { id: value.id, title: value.title, kind: value.kind };
      if (value.id !== this.lastMediaId) { this.lastMediaId = value.id; this.callbacks.onMedia(value); }
      this.publish();
    }));
    this.subscriptions.push(onValue(ref(partyDb(), `${base}/playback`), (snap) => {
      const playback = snap.val() as PlaybackState | null;
      if (!playback || !Number.isFinite(playback.updatedAt)) return;
      const force = playback.updatedAt !== this.lastPlaybackUpdated && Math.abs(playback.time - (this.state.playback?.time ?? 0)) > 0.5;
      this.lastPlaybackUpdated = playback.updatedAt;
      this.state.playback = playback;
      this.callbacks.onPlayback(playback, force);
      this.publish();
    }));
    this.subscriptions.push(onValue(ref(partyDb(), `${base}/poses`), (snap) => {
      const value = snap.val() as Record<string, unknown> | null;
      if (!value) return;
      Object.entries(value).forEach(([id, pose]) => { if (id !== this.uid && validPose(pose)) this.callbacks.onPose(id, pose); });
    }));
    this.subscriptions.push(onValue(ref(partyDb(), `${base}/controls/${this.uid}`), (snap) => {
      const control = snap.val() as { kick?: boolean; banned?: boolean; muted?: boolean } | null;
      if (!control) return;
      if (control.banned) this.fail('You were banned from this room by its host.');
      else if (control.kick) this.fail('You were removed from this room by its host.');
      else if (typeof control.muted === 'boolean') this.callbacks.onMuted(control.muted);
    }));
  }

  updateProfile(profile: PlayerProfile) {
    this.profile = cleanProfile(profile);
    if (!this.connected) return;
    if (this.useFirebase) {
      void update(ref(partyDb(), `rooms/${this.code}/members/${this.uid}`), this.profile);
    } else {
      const rooms = loadLocalRooms();
      const room = rooms[this.code];
      if (room && room.members[this.uid]) {
        room.members[this.uid] = { ...room.members[this.uid], ...this.profile };
        saveLocalRoom(this.code, room);
        this.broadcastLocal({ type: 'sync', code: this.code });
        this.syncFromLocalStorage();
      }
    }
  }

  setReady(ready: boolean) {
    if (!this.connected) return;
    if (this.useFirebase) {
      void update(ref(partyDb(), `rooms/${this.code}/members/${this.uid}`), { ready });
    } else {
      const rooms = loadLocalRooms();
      const room = rooms[this.code];
      if (room && room.members[this.uid]) {
        room.members[this.uid].ready = ready;
        saveLocalRoom(this.code, room);
        this.broadcastLocal({ type: 'sync', code: this.code });
        this.syncFromLocalStorage();
      }
    }
  }

  async reserveSeat(seatId: string): Promise<boolean> {
    if (!this.connected || !/^[AB][1-5]$/.test(seatId)) return !this.connected;
    if (this.useFirebase) {
      const oldSeat = this.state.members.find((member) => member.id === this.uid)?.seatId;
      const result = await runTransaction(ref(partyDb(), `rooms/${this.code}/seats/${seatId}`), (current) => current === null || current === this.uid ? this.uid : undefined, { applyLocally: false });
      if (!result.committed) return false;
      if (oldSeat && oldSeat !== seatId) await remove(ref(partyDb(), `rooms/${this.code}/seats/${oldSeat}`));
      await update(ref(partyDb(), `rooms/${this.code}/members/${this.uid}`), { seatId });
      return true;
    }

    // Local Mesh
    const rooms = loadLocalRooms();
    const room = rooms[this.code];
    if (!room) return false;
    const currentOccupant = room.seats[seatId];
    if (currentOccupant && currentOccupant !== this.uid) return false;

    const oldSeat = room.members[this.uid]?.seatId;
    if (oldSeat && oldSeat !== seatId && room.seats[oldSeat] === this.uid) {
      delete room.seats[oldSeat];
    }
    room.seats[seatId] = this.uid;
    if (room.members[this.uid]) {
      room.members[this.uid].seatId = seatId;
    }
    saveLocalRoom(this.code, room);
    this.broadcastLocal({ type: 'sync', code: this.code });
    this.syncFromLocalStorage();
    return true;
  }

  releaseSeat(seatId?: string) {
    if (!this.connected) return;
    if (this.useFirebase) {
      const current = seatId ?? this.state.members.find((member) => member.id === this.uid)?.seatId;
      if (current) void remove(ref(partyDb(), `rooms/${this.code}/seats/${current}`));
      void update(ref(partyDb(), `rooms/${this.code}/members/${this.uid}`), { seatId: null });
      return;
    }

    const rooms = loadLocalRooms();
    const room = rooms[this.code];
    if (!room) return;
    const current = seatId ?? room.members[this.uid]?.seatId;
    if (current && room.seats[current] === this.uid) {
      delete room.seats[current];
    }
    if (room.members[this.uid]) {
      room.members[this.uid].seatId = null;
    }
    saveLocalRoom(this.code, room);
    this.broadcastLocal({ type: 'sync', code: this.code });
    this.syncFromLocalStorage();
  }

  sendPose(pose: PlayerPose) {
    if (!this.connected || !validPose(pose)) return;
    if (this.useFirebase) {
      void set(ref(partyDb(), `rooms/${this.code}/poses/${this.uid}`), pose);
    } else {
      this.broadcastLocal({ type: 'pose', code: this.code, id: this.uid, pose });
    }
  }

  changePlayback(change: PlaybackChange) {
    if (!this.isHost || !this.state.playback || this.media.kind === 'embed') return;
    const next = { ...this.state.playback, time: playbackPosition(this.state.playback), ...change, updatedAt: Date.now() };
    if (this.useFirebase) {
      void set(ref(partyDb(), `rooms/${this.code}/playback`), next);
    } else {
      const rooms = loadLocalRooms();
      const room = rooms[this.code];
      if (room) {
        room.playback = next;
        saveLocalRoom(this.code, room);
        this.broadcastLocal({ type: 'playback', code: this.code, playback: next, force: true });
        this.state.playback = next;
        this.publish();
      }
    }
  }

  setDuration(sourceId: string, duration: number) {
    if (this.isHost && this.state.playback?.sourceId === sourceId && Number.isFinite(duration) && duration > 0) {
      if (this.useFirebase) {
        void update(ref(partyDb(), `rooms/${this.code}/playback`), { duration });
      } else {
        const rooms = loadLocalRooms();
        const room = rooms[this.code];
        if (room && room.playback.sourceId === sourceId) {
          room.playback.duration = duration;
          saveLocalRoom(this.code, room);
        }
      }
    }
  }

  shareMedia(media: MediaSelection, duration: number) {
    if (!this.isHost) return;
    const shared = serializableMedia(media);
    this.media = shared;
    this.lastMediaId = shared.id;
    const playback: PlaybackState = { sourceId: shared.id, playing: false, time: 0, duration, rate: 1, loop: true, updatedAt: Date.now() };

    if (this.useFirebase) {
      void update(ref(partyDb(), `rooms/${this.code}`), { media: shared, playback, 'meta/screening': false });
      this.state.members.forEach((member) => { void update(ref(partyDb(), `rooms/${this.code}/members/${member.id}`), { ready: !!member.bot }); });
    } else {
      const rooms = loadLocalRooms();
      const room = rooms[this.code];
      if (room) {
        room.media = shared;
        room.playback = playback;
        room.meta.screening = false;
        Object.values(room.members).forEach((m) => { m.ready = !!m.bot; });
        saveLocalRoom(this.code, room);
        this.broadcastLocal({ type: 'media', code: this.code, media: shared });
        this.broadcastLocal({ type: 'playback', code: this.code, playback, force: true });
        this.broadcastLocal({ type: 'sync', code: this.code });
        this.syncFromLocalStorage();
      }
    }
  }

  startScreening() {
    if (!this.isHost || this.state.members.some((member) => !member.ready)) return false;
    if (this.useFirebase) {
      void update(ref(partyDb(), `rooms/${this.code}/meta`), { screening: true });
      if (this.media.kind !== 'embed') this.changePlayback({ playing: true });
    } else {
      const rooms = loadLocalRooms();
      const room = rooms[this.code];
      if (room) {
        room.meta.screening = true;
        saveLocalRoom(this.code, room);
        this.broadcastLocal({ type: 'sync', code: this.code });
        this.syncFromLocalStorage();
        if (this.media.kind !== 'embed') this.changePlayback({ playing: true });
      }
    }
    return true;
  }

  async kick(id: string, ban = false) {
    if (!this.isHost || id === this.uid) return;
    const member = this.state.members.find((item) => item.id === id);
    if (!member || member.bot) {
      if (member?.bot) await this.removeBot(id);
      return;
    }

    if (this.useFirebase) {
      await set(ref(partyDb(), `rooms/${this.code}/controls/${id}`), ban ? { banned: true } : { kick: true });
      if (ban) await set(ref(partyDb(), `rooms/${this.code}/bans/${id}`), { by: this.uid, at: serverTimestamp() });
      const updates: Record<string, null> = { [`members/${id}`]: null, [`poses/${id}`]: null };
      if (member.seatId) updates[`seats/${member.seatId}`] = null;
      await update(ref(partyDb(), `rooms/${this.code}`), updates);
    } else {
      const rooms = loadLocalRooms();
      const room = rooms[this.code];
      if (room) {
        delete room.members[id];
        if (member.seatId && room.seats[member.seatId] === id) {
          delete room.seats[member.seatId];
        }
        if (ban) room.bans[id] = true;
        saveLocalRoom(this.code, room);
        this.broadcastLocal({ type: 'kick', code: this.code, id, ban });
        this.broadcastLocal({ type: 'sync', code: this.code });
        this.syncFromLocalStorage();
      }
    }
    this.callbacks.onNotice(`${member.name} was ${ban ? 'banned' : 'removed'}.`);
  }

  async mute(id: string, muted: boolean) {
    if (!this.isHost || id === this.uid) return;
    if (this.useFirebase) {
      await Promise.all([
        update(ref(partyDb(), `rooms/${this.code}/members/${id}`), { muted }),
        set(ref(partyDb(), `rooms/${this.code}/controls/${id}`), { muted }),
      ]);
    } else {
      const rooms = loadLocalRooms();
      const room = rooms[this.code];
      if (room && room.members[id]) {
        room.members[id].muted = muted;
        saveLocalRoom(this.code, room);
        this.broadcastLocal({ type: 'mute', code: this.code, id, muted });
        this.broadcastLocal({ type: 'sync', code: this.code });
        this.syncFromLocalStorage();
      }
    }
  }

  setBots(count: number) {
    if (!this.isHost) return;
    void this.replaceBots(Math.max(0, Math.min(4, Math.floor(count))));
  }

  private async replaceBots(count: number) {
    const existing = this.state.members.filter((member) => member.bot);
    await Promise.all(existing.map((member) => this.removeBot(member.id)));
    const occupied = new Set(this.state.members.filter((member) => !member.bot).map((member) => member.seatId).filter(Boolean));
    const seats = SEATS.filter((seat) => !occupied.has(seat.id));

    for (let i = 0; i < count && i < seats.length; i++) {
      const id = `bot-${i + 1}-${Date.now()}`;
      const preset = BOT_PRESETS[i % BOT_PRESETS.length];
      const member: PartyMember = { ...preset, id, bot: true, ready: true, seatId: seats[i].id, joinedAt: Date.now(), muted: false };
      const pose: PlayerPose = { x: seats[i].x, y: seats[i].elevation, z: seats[i].z - 0.09, yaw: 0, sit: 1, phase: 0, speed: 0 };

      if (this.useFirebase) {
        await Promise.all([
          set(ref(partyDb(), `rooms/${this.code}/members/${id}`), member),
          set(ref(partyDb(), `rooms/${this.code}/poses/${id}`), pose),
          set(ref(partyDb(), `rooms/${this.code}/seats/${seats[i].id}`), id),
        ]);
      } else {
        const rooms = loadLocalRooms();
        const room = rooms[this.code];
        if (room) {
          room.members[id] = member;
          room.seats[seats[i].id] = id;
          saveLocalRoom(this.code, room);
        }
        // Send pose to the 3D theatre
        this.callbacks.onPose(id, pose);
      }
    }

    if (!this.useFirebase) {
      this.broadcastLocal({ type: 'sync', code: this.code });
      this.syncFromLocalStorage();
    }
  }

  private async removeBot(id: string) {
    const member = this.state.members.find((item) => item.id === id);
    if (this.useFirebase) {
      const updates: Record<string, null> = { [`members/${id}`]: null, [`poses/${id}`]: null };
      if (member?.seatId) updates[`seats/${member.seatId}`] = null;
      await update(ref(partyDb(), `rooms/${this.code}`), updates);
    } else {
      const rooms = loadLocalRooms();
      const room = rooms[this.code];
      if (room) {
        delete room.members[id];
        if (member?.seatId && room.seats[member.seatId] === id) {
          delete room.seats[member.seatId];
        }
        saveLocalRoom(this.code, room);
      }
    }
  }

  async leave(notify = true): Promise<void> {
    this.unsubscribe();
    if (this.code && this.uid) {
      if (this.useFirebase) {
        if (this.isHost) {
          await remove(ref(partyDb(), `rooms/${this.code}`)).catch(() => undefined);
        } else {
          const member = this.state.members.find((item) => item.id === this.uid);
          const updates: Record<string, null> = { [`members/${this.uid}`]: null, [`poses/${this.uid}`]: null, [`controls/${this.uid}`]: null };
          if (member?.seatId) updates[`seats/${member.seatId}`] = null;
          await update(ref(partyDb(), `rooms/${this.code}`), updates).catch(() => undefined);
        }
      } else {
        const rooms = loadLocalRooms();
        const room = rooms[this.code];
        if (room) {
          if (this.isHost) {
            removeLocalRoom(this.code);
            this.broadcastLocal({ type: 'ended', code: this.code });
          } else {
            delete room.members[this.uid];
            const member = this.state.members.find((item) => item.id === this.uid);
            if (member?.seatId && room.seats[member.seatId] === this.uid) {
              delete room.seats[member.seatId];
            }
            saveLocalRoom(this.code, room);
            this.broadcastLocal({ type: 'leave', code: this.code, id: this.uid });
          }
        }
      }
    }
    this.code = '';
    this.media = AMBIENT_MEDIA;
    this.state = emptyFirebaseParty(this.uid);
    if (notify) this.publish();
  }

  private unsubscribe() {
    this.subscriptions.forEach((stop) => stop());
    this.subscriptions = [];
    if (this.botTimer) clearInterval(this.botTimer);
    this.botTimer = null;
  }

  private failError(message: string) {
    this.state = { ...emptyFirebaseParty(this.uid), status: 'error', error: message };
    this.publish();
    return new Error(message);
  }

  private fail(message: string) {
    void this.leave(false).finally(() => {
      this.state = { ...emptyFirebaseParty(this.uid), status: 'error', error: message };
      this.publish();
    });
  }

  dispose() {
    this.disposed = true;
    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
      this.storageListener = null;
    }
    if (this.localChannel) {
      try {
        this.localChannel.close();
      } catch {
        // Ignored
      }
      this.localChannel = null;
    }
    void this.leave(false);
  }
}