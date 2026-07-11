import { MoviPlayer } from 'movi-player/player';
import { MoviDecoder } from './Decoder';
import { MoviRenderer } from './Renderer';
import { MoviSubtitles } from './Subtitles';
import { MoviAudio } from './Audio';
import { MoviBuffer } from './Buffer';
import { MoviPlayback } from './Playback';

export interface MoviEngineConfig {
    decoder?: 'auto' | 'software';
    audioOnly?: boolean;
}

export class MoviEngine {
    public player: MoviPlayer | null = null;
    public decoder: MoviDecoder | null = null;
    public renderer: MoviRenderer | null = null;
    public subtitles: MoviSubtitles | null = null;
    public audio: MoviAudio | null = null;
    public buffer: MoviBuffer | null = null;
    public playback: MoviPlayback | null = null;

    private eventListeners: Map<string, Set<Function>> = new Map();
    private config: MoviEngineConfig;

    constructor(config: MoviEngineConfig = {}) {
        this.config = config;
    }

    public async load(source: { type: 'url'; url: string; headers?: Record<string, string> }, canvas: HTMLCanvasElement): Promise<void> {
        if (this.player) {
            this.destroy();
        }

        this.player = new MoviPlayer({
            canvas,
            renderer: 'canvas',
            decoder: this.config.decoder || 'auto',
            audioOnly: this.config.audioOnly || false
        });

        // Instantiate modules
        this.decoder = new MoviDecoder(this.player);
        this.renderer = new MoviRenderer(this.player);
        this.subtitles = new MoviSubtitles(this.player);
        this.audio = new MoviAudio(this.player);
        this.buffer = new MoviBuffer(this.player);
        this.playback = new MoviPlayback(this.player);

        // Forward all registered event listeners to the new MoviPlayer instance
        for (const [event, listeners] of this.eventListeners.entries()) {
            for (const listener of listeners) {
                this.player.on(event as any, listener as any);
            }
        }

        await this.player.load(source);
    }

    public play(): Promise<void> {
        if (!this.playback) return Promise.resolve();
        return this.playback.play();
    }

    public pause(): void {
        if (this.playback) this.playback.pause();
    }

    public stop(): void {
        if (this.playback) {
            this.playback.pause();
            this.playback.seek(0);
        }
    }

    public seek(seconds: number): Promise<void> {
        if (!this.playback) return Promise.resolve();
        return this.playback.seek(seconds);
    }

    public setVolume(volume: number): void {
        if (this.audio) this.audio.setVolume(volume);
    }

    public mute(): void {
        if (this.audio) this.audio.mute();
    }

    public unmute(): void {
        if (this.audio) this.audio.unmute();
    }

    public setPlaybackRate(rate: number): void {
        if (this.playback) this.playback.setPlaybackRate(rate);
    }

    public enterFullscreen(container: HTMLElement): void {
        if (container.requestFullscreen) {
            container.requestFullscreen().catch(console.error);
        } else if ((container as any).webkitRequestFullscreen) {
            (container as any).webkitRequestFullscreen();
        } else if ((container as any).mozRequestFullScreen) {
            (container as any).mozRequestFullScreen();
        }
    }

    public exitFullscreen(): void {
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(console.error);
        } else if ((document as any).webkitExitFullscreen) {
            (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
            (document as any).mozCancelFullScreen();
        }
    }

    public setSubtitle(trackId: number | null): Promise<boolean> {
        if (!this.subtitles) return Promise.resolve(false);
        return this.subtitles.selectSubtitleTrack(trackId);
    }

    public disableSubtitle(): Promise<boolean> {
        if (!this.subtitles) return Promise.resolve(false);
        return this.subtitles.selectSubtitleTrack(null);
    }

    public setAudioTrack(trackId: number): boolean {
        if (!this.audio) return false;
        return this.audio.selectAudioTrack(trackId);
    }

    public destroy(): void {
        if (this.player) {
            this.player.destroy();
            this.player = null;
        }
        this.decoder = null;
        this.renderer = null;
        this.subtitles = null;
        this.audio = null;
        this.buffer = null;
        this.playback = null;
    }

    public getCurrentTime(): number {
        return this.playback ? this.playback.getCurrentTime() : 0;
    }

    public getDuration(): number {
        return this.playback ? this.playback.getDuration() : 0;
    }

    public getBuffered(): { length: number; start: (idx: number) => number; end: (idx: number) => number } {
        const bufferedTime = this.buffer ? this.buffer.getBufferedTime() : 0;
        return {
            length: 1,
            start: (idx: number) => 0,
            end: (idx: number) => bufferedTime
        };
    }

    public isPlaying(): boolean {
        return this.playback ? this.playback.isPlaying() : false;
    }

    // Event listener registration
    public on(event: string, fn: Function): void {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event)!.add(fn);

        if (this.player) {
            this.player.on(event as any, fn as any);
        }
    }

    public off(event: string, fn: Function): void {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.delete(fn);
            if (listeners.size === 0) {
                this.eventListeners.delete(event);
            }
        }

        if (this.player) {
            this.player.off(event as any, fn as any);
        }
    }
}
