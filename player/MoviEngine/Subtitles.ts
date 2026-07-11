import { MoviPlayer } from 'movi-player/player';

export class MoviSubtitles {
    constructor(private player: MoviPlayer) {}

    public getSubtitleTracks() {
        return this.player.trackManager.getSubtitleTracks();
    }

    public selectSubtitleTrack(trackId: number | null): Promise<boolean> {
        return this.player.selectSubtitleTrack(trackId);
    }

    public setSubtitleDelay(seconds: number): void {
        this.player.setSubtitleDelay(seconds);
    }
}
