import React, { useState } from 'react';
import { useRoom } from '../../context/RoomContext';
import { VideoParticipantTile } from './VideoParticipantTile';
import { RoomControls } from './RoomControls';
import { RoomChat } from './RoomChat';
import { InviteModal } from './InviteModal';
import { Users, X, Crown, Shield, ShieldAlert, Mic, MicOff } from 'lucide-react';

export const VideoCallView: React.FC = () => {
  const {
    room,
    participants,
    currentUserId,
    localVideoTrack,
    remoteTracks,
    isHost,
    canControlPlayback,
    kickParticipant,
    promoteCoHost,
    demoteCoHost,
    viewMode,
    setViewMode
  } = useRoom();

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [pinnedUid, setPinnedUid] = useState<string | null>(null);

  // Filter out any screen share tracks to display in main stage if active
  let activeScreenTrack: any = null;
  let screenSharingUid: string | null = null;
  remoteTracks.forEach((val, uid) => {
    if (val.screenTrack) {
      activeScreenTrack = val.screenTrack;
      screenSharingUid = uid;
    }
  });

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col justify-between select-none">
      {/* Top Header Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 sm:px-8 py-4 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-white text-base sm:text-lg font-bold tracking-wide flex items-center gap-2">
              {room?.name || 'Private Video Call'}
              {room?.isLocked && (
                <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Locked
                </span>
              )}
            </span>
            <span className="text-zinc-400 text-xs">
              {participants.length} {participants.length === 1 ? 'participant' : 'participants'}
            </span>
          </div>
        </div>

      </div>

      {/* Center Media Area */}
      <div className="flex-1 flex overflow-hidden pt-16 pb-24 px-4 sm:px-6">
        <div className="flex-1 h-full flex flex-col items-center justify-center relative">
          {/* Active Screen Share View */}
          {activeScreenTrack ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-2">
              <div className="relative w-full max-h-[75vh] aspect-video bg-zinc-950 rounded-2xl overflow-hidden border border-white/20 shadow-2xl">
                <video
                  ref={(el) => {
                    if (el && activeScreenTrack) {
                      activeScreenTrack.attach(el);
                    }
                  }}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-3 left-3 bg-black/70 px-2.5 py-1 rounded-lg text-xs text-white border border-white/10">
                  Screen presentation
                </div>
              </div>
            </div>
          ) : (
            /* Responsive Video Grid */
            <div
              className={`w-full h-full max-w-7xl mx-auto grid gap-3 sm:gap-4 p-2 items-center justify-center ${
                participants.length <= 1
                  ? 'grid-cols-1 max-w-2xl'
                  : participants.length === 2
                  ? 'grid-cols-1 sm:grid-cols-2 max-w-4xl'
                  : participants.length <= 4
                  ? 'grid-cols-2 max-w-5xl'
                  : participants.length <= 6
                  ? 'grid-cols-2 sm:grid-cols-3 max-w-6xl'
                  : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 max-w-7xl'
              }`}
            >
              {participants.map((p) => {
                const isLocal = p.uid === currentUserId;
                const trackInfo = remoteTracks.get(p.uid);
                const videoTrack = isLocal ? localVideoTrack : trackInfo?.videoTrack;

                return (
                  <VideoParticipantTile
                    key={p.uid}
                    participant={p}
                    isLocal={isLocal}
                    videoTrack={videoTrack}
                    audioTrack={isLocal ? undefined : trackInfo?.audioTrack}
                    isPinned={pinnedUid === p.uid}
                    onPin={() => setPinnedUid(pinnedUid === p.uid ? null : p.uid)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side Drawers */}
        {isChatOpen && (
          <div className="animate-slideLeft">
            <RoomChat onClose={() => setIsChatOpen(false)} />
          </div>
        )}

        {isParticipantsOpen && (
          <div className="animate-slideLeft w-full sm:w-80 bg-zinc-950 border-l border-white/10 text-white flex flex-col h-full shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-brand-red" />
                <h3 className="text-sm font-bold tracking-wide">Participants</h3>
                <span className="text-xs text-zinc-400">({participants.length})</span>
              </div>
              <button
                onClick={() => setIsParticipantsOpen(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10"
              >
                <X size={18} />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {participants.map((p) => (
                <div
                  key={p.uid}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/60 border border-white/5"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-xs font-bold">
                      {p.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-white truncate max-w-[120px]">
                        {p.displayName}
                      </span>
                      <span className="text-[10px] text-zinc-400 capitalize flex items-center gap-1">
                        {p.role === 'host' && <Crown size={10} className="text-amber-400" />}
                        {p.role === 'co_host' && <Shield size={10} className="text-blue-400" />}
                        {p.role}
                      </span>
                    </div>
                  </div>

                  {/* Actions for Host */}
                  <div className="flex items-center gap-1">
                    {canControlPlayback && p.uid !== room?.hostId && (
                      <>
                        {p.role === 'participant' ? (
                          <button
                            onClick={() => promoteCoHost(p.uid)}
                            title="Make Co-Host"
                            className="p-1.5 text-zinc-400 hover:text-blue-400 hover:bg-white/10 rounded-lg text-xs transition"
                          >
                            <Shield size={14} />
                          </button>
                        ) : (
                          <button
                            onClick={() => demoteCoHost(p.uid)}
                            title="Remove Co-Host"
                            className="p-1.5 text-blue-400 hover:text-zinc-400 hover:bg-white/10 rounded-lg text-xs transition"
                          >
                            <ShieldAlert size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            if (window.confirm(`Remove ${p.displayName} from the room?`)) {
                              kickParticipant(p.uid);
                            }
                          }}
                          title="Remove Participant"
                          className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-white/10 rounded-lg text-xs transition"
                        >
                          <X size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Bottom Toolbar */}
      <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center pointer-events-none">
        <div className="pointer-events-auto">
          <RoomControls
            isChatOpen={isChatOpen}
            onToggleChat={() => {
              setIsChatOpen(!isChatOpen);
              if (!isChatOpen) setIsParticipantsOpen(false);
            }}
            isParticipantsOpen={isParticipantsOpen}
            onToggleParticipants={() => {
              setIsParticipantsOpen(!isParticipantsOpen);
              if (!isParticipantsOpen) setIsChatOpen(false);
            }}
            onOpenInvite={() => setIsInviteOpen(true)}
          />
        </div>
      </div>

      {/* Invite Modal */}
      <InviteModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} />
    </div>
  );
};
