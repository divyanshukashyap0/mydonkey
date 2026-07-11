import { MoviPlayer } from 'movi-player/player';

export class MoviRenderer {
    constructor(private player: MoviPlayer) {}

    public configure(width: number, height: number) {
        // Expose renderer configuration if needed
    }

    public clearSubtitles() {
        // Clear rendered subtitles from canvas
    }
}
