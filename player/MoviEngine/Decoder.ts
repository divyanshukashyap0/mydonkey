import { MoviPlayer } from 'movi-player/player';

export class MoviDecoder {
    constructor(private player: MoviPlayer) {}

    // Expose any decoder-specific configurations if needed
    public getActiveVideoTrack() {
        return this.player.trackManager.getActiveVideoTrack();
    }

    public getActiveAudioTrack() {
        return this.player.trackManager.getActiveAudioTrack();
    }

    public getActiveSubtitleTrack() {
        return this.player.trackManager.getActiveSubtitleTrack();
    }
}
