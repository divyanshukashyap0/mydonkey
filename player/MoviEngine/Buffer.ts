import { MoviPlayer } from 'movi-player/player';

export class MoviBuffer {
    constructor(private player: MoviPlayer) {}

    public getBufferedTime(): number {
        return this.player.getBufferedTime();
    }
}
