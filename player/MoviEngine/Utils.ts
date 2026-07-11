import { Logger, LogLevel } from 'movi-player/player';

export class MoviUtils {
    public static setLogLevel(level: LogLevel): void {
        Logger.setLevel(level);
    }
}
