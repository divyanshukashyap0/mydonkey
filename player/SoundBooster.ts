/**
 * SoundBooster.ts
 * Web Audio API based audio booster and processor for browser playback.
 * Capable of boosting audio cleanly up to 400% (4x) without clipping.
 */

interface AttachedElementState {
    sourceNode: MediaElementAudioSourceNode;
    gainNode: GainNode;
    dialogueFilter: BiquadFilterNode;
    compressorNode: DynamicsCompressorNode;
    connected: boolean;
}

export class SoundBooster {
    private static instance: SoundBooster | null = null;
    private audioCtx: AudioContext | null = null;
    private boostFactor: number = 1.0; // 1.0 = 100%, 2.0 = 200%, 4.0 = 400%
    private isDialogueClarityEnabled: boolean = false;
    private isLimiterEnabled: boolean = true;
    private attachedElements: WeakMap<HTMLMediaElement, AttachedElementState> = new WeakMap();
    private activeElements: Set<HTMLMediaElement> = new Set();
    private activeMoviPlayers: Set<any> = new Set();
    private testSourceNode: AudioBufferSourceNode | null = null;
    private testGainNode: GainNode | null = null;
    private isTestPlaying: boolean = false;

    private constructor() {
        // Lazy initialize AudioContext on user interaction
    }

    public static getInstance(): SoundBooster {
        if (!SoundBooster.instance) {
            SoundBooster.instance = new SoundBooster();
        }
        return SoundBooster.instance;
    }

    /**
     * Initializes or returns the existing AudioContext.
     */
    public getAudioContext(): AudioContext | null {
        if (typeof window === 'undefined') return null;

        if (!this.audioCtx) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                try {
                    this.audioCtx = new AudioContextClass();
                } catch (e) {
                    console.warn('[SoundBooster] Could not create AudioContext:', e);
                }
            }
        }

        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().catch(() => {});
        }

        return this.audioCtx;
    }

    /**
     * Ensure AudioContext is resumed after user interaction.
     */
    public resumeContext(): Promise<void> {
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            return this.audioCtx.resume().catch(() => {});
        }
        return Promise.resolve();
    }

    /**
     * Attach an HTMLMediaElement (<video> or <audio>) to the booster pipeline.
     */
    public attachMediaElement(element: HTMLMediaElement): boolean {
        if (!element || typeof window === 'undefined') return false;

        const ctx = this.getAudioContext();
        if (!ctx) return false;

        if (this.attachedElements.has(element)) {
            const existing = this.attachedElements.get(element)!;
            this.applyBoostToNode(existing);
            this.activeElements.add(element);
            return true;
        }

        try {
            // Note: createMediaElementSource can only be called once per element
            const sourceNode = ctx.createMediaElementSource(element);
            const gainNode = ctx.createGain();
            const dialogueFilter = ctx.createBiquadFilter();
            const compressorNode = ctx.createDynamicsCompressor();

            // Setup Dialogue Clarity Filter (peaking EQ around 2.4kHz, voice intelligibility band)
            dialogueFilter.type = 'peaking';
            dialogueFilter.frequency.setValueAtTime(2400, ctx.currentTime);
            dialogueFilter.Q.setValueAtTime(1.2, ctx.currentTime);
            dialogueFilter.gain.setValueAtTime(this.isDialogueClarityEnabled ? 3.5 : 0, ctx.currentTime);

            // Setup Dynamics Compressor as safety limiter to prevent digital clipping when boosted
            compressorNode.threshold.setValueAtTime(-12, ctx.currentTime);
            compressorNode.knee.setValueAtTime(8, ctx.currentTime);
            compressorNode.ratio.setValueAtTime(16, ctx.currentTime);
            compressorNode.attack.setValueAtTime(0.003, ctx.currentTime);
            compressorNode.release.setValueAtTime(0.2, ctx.currentTime);

            // Audio Graph:
            // source -> gainNode -> dialogueFilter -> (compressor or bypass) -> destination
            sourceNode.connect(gainNode);
            gainNode.connect(dialogueFilter);

            if (this.isLimiterEnabled) {
                dialogueFilter.connect(compressorNode);
                compressorNode.connect(ctx.destination);
            } else {
                dialogueFilter.connect(ctx.destination);
            }

            const state: AttachedElementState = {
                sourceNode,
                gainNode,
                dialogueFilter,
                compressorNode,
                connected: true
            };

            this.attachedElements.set(element, state);
            this.activeElements.add(element);

            this.applyBoostToNode(state);
            return true;
        } catch (err) {
            console.warn('[SoundBooster] Failed to attach media element (might already be connected or CORS restricted):', err);
            return false;
        }
    }

    /**
     * Attach a MoviPlayer instance to sound boost software/audioRenderer tracks.
     */
    public attachMoviPlayer(player: any): void {
        if (!player) return;
        this.activeMoviPlayers.add(player);
        this.applyBoostToMoviPlayer(player);
    }

    /**
     * Detach a MoviPlayer instance.
     */
    public detachMoviPlayer(player: any): void {
        if (!player) return;
        this.activeMoviPlayers.delete(player);
    }

    /**
     * Set booster factor (e.g. 1.0 = 100%, 1.5 = 150%, 2.0 = 200%, 3.0 = 300%, 4.0 = 400%).
     */
    public setBoost(factor: number): void {
        this.boostFactor = Math.max(1.0, Math.min(4.0, factor));
        this.resumeContext();

        // Update all attached media elements
        for (const el of this.activeElements) {
            const state = this.attachedElements.get(el);
            if (state) {
                this.applyBoostToNode(state);
            }
        }

        // Update all attached MoviPlayers
        for (const player of this.activeMoviPlayers) {
            this.applyBoostToMoviPlayer(player);
        }

        // Update test sound gain if active
        if (this.testGainNode && this.audioCtx) {
            try {
                this.testGainNode.gain.setTargetAtTime(this.boostFactor, this.audioCtx.currentTime, 0.05);
            } catch {
                this.testGainNode.gain.value = this.boostFactor;
            }
        }
    }

    /**
     * Current boost factor (1.0 = normal, >1.0 = boosted).
     */
    public getBoost(): number {
        return this.boostFactor;
    }

    /**
     * Toggle or set Dialogue Clarity enhancement.
     */
    public setDialogueClarity(enabled: boolean): void {
        this.isDialogueClarityEnabled = enabled;
        const ctx = this.audioCtx;
        if (!ctx) return;

        const gainDb = enabled ? 3.5 : 0;
        for (const el of this.activeElements) {
            const state = this.attachedElements.get(el);
            if (state && state.dialogueFilter) {
                try {
                    state.dialogueFilter.gain.setTargetAtTime(gainDb, ctx.currentTime, 0.05);
                } catch {
                    state.dialogueFilter.gain.value = gainDb;
                }
            }
        }
    }

    public getDialogueClarity(): boolean {
        return this.isDialogueClarityEnabled;
    }

    /**
     * Toggle or set Anti-Distortion Limiter.
     */
    public setLimiter(enabled: boolean): void {
        this.isLimiterEnabled = enabled;
        const ctx = this.audioCtx;
        if (!ctx) return;

        for (const el of this.activeElements) {
            const state = this.attachedElements.get(el);
            if (state) {
                try {
                    state.dialogueFilter.disconnect();
                    state.compressorNode.disconnect();
                    if (enabled) {
                        state.dialogueFilter.connect(state.compressorNode);
                        state.compressorNode.connect(ctx.destination);
                    } else {
                        state.dialogueFilter.connect(ctx.destination);
                    }
                } catch (e) {
                    console.warn('[SoundBooster] Error re-routing limiter node:', e);
                }
            }
        }
    }

    public getLimiter(): boolean {
        return this.isLimiterEnabled;
    }

    /**
     * Scan document for all media elements and attach them.
     */
    public scanAndAttach(): void {
        if (typeof document === 'undefined') return;
        const els = document.querySelectorAll<HTMLMediaElement>('video, audio');
        els.forEach(el => this.attachMediaElement(el));
    }

    private applyBoostToNode(state: AttachedElementState): void {
        const ctx = this.audioCtx;
        if (!ctx || !state.gainNode) return;

        try {
            // Smooth ramp to prevent clicks/pops
            state.gainNode.gain.setTargetAtTime(this.boostFactor, ctx.currentTime, 0.05);
        } catch {
            state.gainNode.gain.value = this.boostFactor;
        }
    }

    private applyBoostToMoviPlayer(player: any): void {
        try {
            if (typeof player?.setVolume === 'function') {
                // MoviPlayer supports up to 2.0 (200%) in its internal volume API
                player.setVolume(this.boostFactor);
            }
            if (player?.audioRenderer?.gainNode?.gain) {
                const ctx = player.audioRenderer.audioContext;
                const currentTime = ctx ? ctx.currentTime : 0;
                const targetGain = this.boostFactor;
                if (ctx) {
                    player.audioRenderer.gainNode.gain.setTargetAtTime(targetGain, currentTime, 0.05);
                } else {
                    player.audioRenderer.gainNode.gain.value = targetGain;
                }
            }
            // If streamWrapper has videoElement, ensure it is attached
            const videoEl = player?.streamWrapper?.videoElement || (player as any)?.videoElement || (player as any)?.nativeAudioEl;
            if (videoEl && !this.attachedElements.has(videoEl)) {
                this.attachMediaElement(videoEl);
            }
        } catch (e) {
            console.warn('[SoundBooster] Error boosting MoviPlayer:', e);
        }
    }

    /**
     * Toggles a rich audio preview chime that routes directly through the booster pipeline.
     * Allows the user to hear real-time 100% to 400% amplification immediately on any device.
     */
    public toggleTestSound(onStateChange?: (playing: boolean) => void): boolean {
        if (this.isTestPlaying) {
            this.stopTestSound();
            if (onStateChange) onStateChange(false);
            return false;
        }

        const ctx = this.getAudioContext();
        if (!ctx) return false;

        try {
            this.resumeContext();

            const sampleRate = ctx.sampleRate;
            const duration = 3.0; // 3 seconds per loop
            const buffer = ctx.createBuffer(2, sampleRate * duration, sampleRate);

            // Rich warm chord progression (A minor9 & F major7 synth pad)
            const chords = [
                [220.00, 261.63, 329.63, 392.00, 493.88], // Am9: A3, C4, E4, G4, B4
                [174.61, 261.63, 329.63, 392.00, 523.25]  // Fmaj7: F3, C4, E4, G4, C5
            ];

            for (let channel = 0; channel < 2; channel++) {
                const data = buffer.getChannelData(channel);
                for (let i = 0; i < data.length; i++) {
                    const t = i / sampleRate;
                    const chordIdx = Math.floor(t / 1.5) % 2;
                    const chord = chords[chordIdx];
                    const chordT = (t % 1.5) / 1.5;
                    const env = Math.sin(Math.PI * chordT); // smooth bell envelope

                    let sample = 0;
                    for (let n = 0; n < chord.length; n++) {
                        const freq = chord[n];
                        // Detuned stereo shimmer
                        const detune = channel === 0 ? 0.998 : 1.002;
                        sample += Math.sin(2 * Math.PI * freq * detune * t) * (0.07 / (n + 1));
                    }
                    data[i] = sample * env;
                }
            }

            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.loop = true;

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(this.boostFactor, ctx.currentTime);

            const filter = ctx.createBiquadFilter();
            filter.type = 'peaking';
            filter.frequency.setValueAtTime(2400, ctx.currentTime);
            filter.Q.setValueAtTime(1.2, ctx.currentTime);
            filter.gain.setValueAtTime(this.isDialogueClarityEnabled ? 3.5 : 0, ctx.currentTime);

            const limiter = ctx.createDynamicsCompressor();
            limiter.threshold.setValueAtTime(-12, ctx.currentTime);
            limiter.knee.setValueAtTime(8, ctx.currentTime);
            limiter.ratio.setValueAtTime(16, ctx.currentTime);

            source.connect(gain);
            gain.connect(filter);
            if (this.isLimiterEnabled) {
                filter.connect(limiter);
                limiter.connect(ctx.destination);
            } else {
                filter.connect(ctx.destination);
            }

            source.start();
            this.testSourceNode = source;
            this.testGainNode = gain;
            this.isTestPlaying = true;

            if (onStateChange) onStateChange(true);
            return true;
        } catch (e) {
            console.warn('[SoundBooster] Could not play test audio preview:', e);
            return false;
        }
    }

    public stopTestSound(): void {
        if (this.testSourceNode) {
            try {
                this.testSourceNode.stop();
                this.testSourceNode.disconnect();
            } catch {}
            this.testSourceNode = null;
        }
        if (this.testGainNode) {
            try {
                this.testGainNode.disconnect();
            } catch {}
            this.testGainNode = null;
        }
        this.isTestPlaying = false;
    }

    public isTestingSound(): boolean {
        return this.isTestPlaying;
    }

    /**
     * Reset or cleanup all nodes
     */
    public destroy(): void {
        this.stopTestSound();
        for (const el of this.activeElements) {
            const state = this.attachedElements.get(el);
            if (state) {
                try {
                    state.sourceNode.disconnect();
                    state.gainNode.disconnect();
                    state.dialogueFilter.disconnect();
                    state.compressorNode.disconnect();
                } catch {}
            }
        }
        this.activeElements.clear();
        this.activeMoviPlayers.clear();
        if (this.audioCtx && this.audioCtx.state !== 'closed') {
            this.audioCtx.close().catch(() => {});
            this.audioCtx = null;
        }
    }
}

export const soundBooster = SoundBooster.getInstance();
