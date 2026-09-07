import { useState, useEffect, useCallback, useRef } from 'react';

export type SlowNetworkReason = 'low_bandwidth' | 'high_latency' | 'slow_type' | 'buffering_stall';

export interface NetworkSpeedDetails {
    downlink?: number; // Estimated Mbps
    rtt?: number; // Round trip time in ms
    effectiveType?: string; // 'slow-2g' | '2g' | '3g' | '4g'
    saveData?: boolean;
    reason?: SlowNetworkReason;
}

interface UseNetworkSpeedOptions {
    isBufferingOrLoading?: boolean;
    bufferingStallThresholdMs?: number;
}

export function useNetworkSpeed(options: UseNetworkSpeedOptions = {}) {
    const { isBufferingOrLoading = false, bufferingStallThresholdMs = 7000 } = options;

    const [isSlow, setIsSlow] = useState<boolean>(false);
    const [speedDetails, setSpeedDetails] = useState<NetworkSpeedDetails>({});
    const [isDismissed, setIsDismissed] = useState<boolean>(false);

    const stallTimerRef = useRef<any>(null);

    // 1. Evaluate Network Information API (Chrome / Edge / Android)
    const checkConnectionApi = useCallback(() => {
        const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
        const conn = nav?.connection || nav?.mozConnection || nav?.webkitConnection;

        if (conn) {
            const effectiveType: string = conn.effectiveType || '';
            const downlink: number | undefined = typeof conn.downlink === 'number' ? conn.downlink : undefined;
            const rtt: number | undefined = typeof conn.rtt === 'number' ? conn.rtt : undefined;
            const saveData: boolean = Boolean(conn.saveData);

            let detectedSlow = false;
            let reason: SlowNetworkReason = 'low_bandwidth';

            if (effectiveType === 'slow-2g' || effectiveType === '2g') {
                detectedSlow = true;
                reason = 'slow_type';
            } else if (effectiveType === '3g' || (downlink !== undefined && downlink < 2.0)) {
                detectedSlow = true;
                reason = 'low_bandwidth';
            } else if (rtt !== undefined && rtt > 500) {
                detectedSlow = true;
                reason = 'high_latency';
            }

            if (detectedSlow) {
                setIsSlow(true);
                setSpeedDetails({
                    effectiveType,
                    downlink,
                    rtt,
                    saveData,
                    reason,
                });
            }
        }
    }, []);

    // Listen to connection changes
    useEffect(() => {
        checkConnectionApi();

        const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
        const conn = nav?.connection || nav?.mozConnection || nav?.webkitConnection;

        if (conn && conn.addEventListener) {
            conn.addEventListener('change', checkConnectionApi);
            return () => conn.removeEventListener('change', checkConnectionApi);
        }
    }, [checkConnectionApi]);

    // 2. Active Latency Probe (Fallback for Safari / Firefox / Desktop browsers without NetworkInformation API)
    useEffect(() => {
        let isCancelled = false;

        const probeLatency = async () => {
            const startTime = performance.now();
            try {
                // Fetch lightweight static asset with cache busting
                const response = await fetch(`/manifest.json?_t=${Date.now()}`, {
                    method: 'GET',
                    cache: 'no-store',
                });
                const elapsedMs = performance.now() - startTime;

                if (!isCancelled && response.ok) {
                    // If round trip took longer than 1500ms on a tiny static file, connection is slow
                    if (elapsedMs > 1500) {
                        setIsSlow(true);
                        setSpeedDetails(prev => ({
                            ...prev,
                            rtt: Math.round(elapsedMs),
                            reason: 'high_latency',
                        }));
                    }
                }
            } catch {
                // Ignore probe network errors
            }
        };

        const timer = setTimeout(probeLatency, 2500);
        return () => {
            isCancelled = true;
            clearTimeout(timer);
        };
    }, []);

    // 3. Playback / Buffering Stall Detection
    useEffect(() => {
        if (isBufferingOrLoading) {
            stallTimerRef.current = setTimeout(() => {
                setIsSlow(true);
                setSpeedDetails(prev => ({
                    ...prev,
                    reason: 'buffering_stall',
                }));
            }, bufferingStallThresholdMs);
        } else {
            if (stallTimerRef.current) {
                clearTimeout(stallTimerRef.current);
                stallTimerRef.current = null;
            }
        }

        return () => {
            if (stallTimerRef.current) {
                clearTimeout(stallTimerRef.current);
                stallTimerRef.current = null;
            }
        };
    }, [isBufferingOrLoading, bufferingStallThresholdMs]);

    const dismiss = useCallback(() => {
        setIsDismissed(true);
    }, []);

    const reopen = useCallback(() => {
        setIsDismissed(false);
    }, []);

    return {
        isSlow: isSlow && !isDismissed,
        hasSlowSpeed: isSlow,
        speedDetails,
        isDismissed,
        dismiss,
        reopen,
    };
}
