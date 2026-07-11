import { MoviPlayer } from 'movi-player/player';

export class MoviPlayback {
    constructor(private player: MoviPlayer) {}

    public play(): Promise<void> {
        return this.player.play();
    }

    public pause(): void {
        this.player.pause();
    }

    public seek(seconds: number): Promise<void> {
        return this.player.seek(seconds);
    }

    public getCurrentTime(): number {
        return this.player.getCurrentTime();
    }

    public getDuration(): number {
        return this.player.getDuration();
    }

    public setPlaybackRate(rate: number): void {
        this.player.setPlaybackRate(rate);
    }

    public isPlaying(): boolean {
        return this.player.getState() === 'playing';
    }
}
