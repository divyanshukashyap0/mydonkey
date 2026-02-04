export const vibrate = (pattern: number | number[] = 10) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern);
    }
};

export const HAPTIC_PATTERNS = {
    soft: 10,
    medium: 20,
    success: [10, 30, 10],
    error: [50, 30, 50, 30, 50]
};
