import { MoviPlayer } from 'movi-player/player';

export class MoviAudio {
    constructor(private player: MoviPlayer) {}

    public getAudioTracks() {
        return this.player.trackManager.getAudioTracks();
    }

    public selectAudioTrack(trackId: number): boolean {
        return this.player.selectAudioTrack(trackId);
    }

    public setVolume(volume: number): void {
        this.player.setVolume(volume);
    }

    public getVolume(): number {
        return (this.player as any).audioRenderer.getVolume();
    }

    public mute(): void {
        this.player.setMuted(true);
    }

    public unmute(): void {
        this.player.setMuted(false);
    }

    public getMuted(): boolean {
        return this.player.getMuted();
    }
}
