import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { MoviEngine } from '../player/MoviEngine';

export interface MoviVideoProps {
    src?: string;
    autoPlay?: boolean;
    loop?: boolean;
    muted?: boolean;
    playsInline?: boolean;
    className?: string;
    onClick?: (e: React.MouseEvent<HTMLCanvasElement>) => void;
    onLoadedMetadata?: (e: any) => void;
    onPlay?: () => void;
    onPause?: () => void;
    onTimeUpdate?: (e: any) => void;
    onEnded?: () => void;
    onError?: (err: Error) => void;
}

export const MoviVideo = forwardRef<any, MoviVideoProps>(({
    src,
    autoPlay = false,
    loop = false,
    muted = false,
    className,
    onClick,
    onLoadedMetadata,
    onPlay,
    onPause,
    onTimeUpdate,
    onEnded,
    onError
}, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<MoviEngine | null>(null);
    const srcRef = useRef<string | undefined>(src);
    const activeRef = useRef<boolean>(true);

    const volumeRef = useRef<number>(1.0);
    const mutedRef = useRef<boolean>(muted);
    const loopRef = useRef<boolean>(loop);

    useEffect(() => {
        loopRef.current = loop;
    }, [loop]);

    useEffect(() => {
        activeRef.current = true;
        return () => {
            activeRef.current = false;
            if (engineRef.current) {
                engineRef.current.destroy();
                engineRef.current = null;
            }
        };
    }, []);

    const loadSource = async (url: string) => {
        if (!canvasRef.current || !activeRef.current) return;

        try {
            if (!engineRef.current) {
                engineRef.current = new MoviEngine();
                
                engineRef.current.on('play', () => {
                    if (activeRef.current && onPlay) onPlay();
                });

                engineRef.current.on('pause', () => {
                    if (activeRef.current && onPause) onPause();
                });

                engineRef.current.on('timeUpdate', (time: number) => {
                    if (activeRef.current && onTimeUpdate) {
                        onTimeUpdate({ target: { currentTime: time } } as any);
                    }
                });

                engineRef.current.on('durationChange', (dur: number) => {
                    if (activeRef.current && onLoadedMetadata) {
                        onLoadedMetadata({ target: { duration: dur } } as any);
                    }
                });

                engineRef.current.on('ended', () => {
                    if (activeRef.current) {
                        if (loopRef.current && engineRef.current) {
                            engineRef.current.seek(0)
                                .then(() => engineRef.current?.play())
                                .catch(console.error);
                        } else if (onEnded) {
                            onEnded();
                        }
                    }
                });

                engineRef.current.on('error', (err: any) => {
                    if (activeRef.current && onError) onError(err);
                });
            }

            await engineRef.current.load({ type: 'url', url }, canvasRef.current);
            
            if (activeRef.current && engineRef.current) {
                engineRef.current.setVolume(volumeRef.current);
                engineRef.current.player?.setMuted(mutedRef.current);
                if (autoPlay) {
                    await engineRef.current.play().catch(console.error);
                }
            }
        } catch (err: any) {
            console.warn('MoviVideo load error:', err);
            if (activeRef.current && onError) onError(err);
        }
    };

    useEffect(() => {
        srcRef.current = src;
        if (src) {
            loadSource(src);
        } else if (engineRef.current) {
            engineRef.current.destroy();
            engineRef.current = null;
        }
    }, [src]);

    useEffect(() => {
        mutedRef.current = muted;
        if (engineRef.current) {
            engineRef.current.player?.setMuted(muted);
        }
    }, [muted]);

    useImperativeHandle(ref, () => ({
        play: async () => {
            if (engineRef.current) {
                await engineRef.current.play();
            }
        },
        pause: () => {
            if (engineRef.current) {
                engineRef.current.pause();
            }
        },
        canPlayType: (type: string) => {
            return 'probably';
        },
        addEventListener: (event: string, callback: any) => {
            const mappedEvent = event === 'loadedmetadata' ? 'durationChange' : event;
            if (engineRef.current) {
                engineRef.current.on(mappedEvent, callback);
            }
        },
        removeEventListener: (event: string, callback: any) => {
            const mappedEvent = event === 'loadedmetadata' ? 'durationChange' : event;
            if (engineRef.current) {
                engineRef.current.off(mappedEvent, callback);
            }
        },
        get currentTime() {
            return engineRef.current ? engineRef.current.getCurrentTime() : 0;
        },
        set currentTime(time: number) {
            if (engineRef.current) {
                engineRef.current.seek(time).catch(console.error);
            }
        },
        get duration() {
            return engineRef.current ? engineRef.current.getDuration() : 0;
        },
        get volume() {
            return volumeRef.current;
        },
        set volume(vol: number) {
            volumeRef.current = vol;
            if (engineRef.current) {
                engineRef.current.setVolume(vol);
            }
        },
        get muted() {
            return mutedRef.current;
        },
        set muted(isMute: boolean) {
            mutedRef.current = isMute;
            if (engineRef.current) {
                engineRef.current.player?.setMuted(isMute);
            }
        },
        get src() {
            return srcRef.current || '';
        },
        set src(newSrc: string) {
            srcRef.current = newSrc;
            if (newSrc) {
                loadSource(newSrc);
            } else if (engineRef.current) {
                engineRef.current.destroy();
                engineRef.current = null;
            }
        },
        setSubtitle: (trackId: number | null) => {
            if (engineRef.current) {
                engineRef.current.setSubtitle(trackId);
            }
        },
        setAudioTrack: (trackId: number) => {
            if (engineRef.current) {
                engineRef.current.setAudioTrack(trackId);
            }
        },
        getSubtitleTracks: () => {
            return engineRef.current && engineRef.current.subtitles ? engineRef.current.subtitles.getSubtitleTracks() : [];
        },
        getAudioTracks: () => {
            return engineRef.current && engineRef.current.audio ? engineRef.current.audio.getAudioTracks() : [];
        },
        getActiveAudioTrack: () => {
            return engineRef.current && engineRef.current.decoder ? engineRef.current.decoder.getActiveAudioTrack() : null;
        },
        getActiveSubtitleTrack: () => {
            return engineRef.current && engineRef.current.decoder ? engineRef.current.decoder.getActiveSubtitleTrack() : null;
        }
    }));

    return (
        <canvas
            ref={canvasRef}
            className={className}
            onClick={onClick}
            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }}
        />
    );
});

MoviVideo.displayName = 'MoviVideo';
