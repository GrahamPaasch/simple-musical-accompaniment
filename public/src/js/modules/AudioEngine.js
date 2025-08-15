/**
 * Audio Engine for Musical Accompanist Tool
 * Handles Tone.js initialization and audio synthesis
 */
export class AudioEngine {
    constructor(errorLogger) {
        this.errorLogger = errorLogger;
        this.synth = null;
        this.metronome = null;
        this.audioInitialized = false;
        this.volume = 0.5;
        
        // Bind methods to preserve context
        this.initialize = this.errorLogger.wrapAsync(this.initialize.bind(this), { module: 'AudioEngine' });
        this.playChord = this.errorLogger.wrap(this.playChord.bind(this), { module: 'AudioEngine' });
        this.playMetronome = this.errorLogger.wrap(this.playMetronome.bind(this), { module: 'AudioEngine' });
    }

    /**
     * Initialize the audio system using Tone.js
     */
    async initialize() {
        if (this.audioInitialized) {
            return true;
        }

        try {
            // Check if Tone.js is available
            if (typeof Tone === 'undefined') {
                throw new Error('Tone.js is not loaded');
            }

            // Start audio context
            if (Tone.context.state === 'suspended') {
                await Tone.start();
            }

            // Create polyphonic synthesizer for chords
            this.synth = new Tone.PolySynth(Tone.Synth, {
                oscillator: {
                    type: 'sine',
                    partials: [1, 0.5, 0.3, 0.1] // Add harmonics for richer sound
                },
                envelope: {
                    attack: 0.05,
                    decay: 0.2,
                    sustain: 0.8,
                    release: 0.5
                }
            }).toDestination();

            // Set initial volume
            this.synth.volume.value = this.volumeToDecibels(this.volume);

            // Create metronome
            this.metronome = new Tone.Synth({
                oscillator: { type: 'square' },
                envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 }
            }).toDestination();

            this.metronome.volume.value = this.volumeToDecibels(0.3); // Quieter metronome

            this.audioInitialized = true;
            
            this.errorLogger.logWarning('Audio engine initialized successfully', {
                contextState: Tone.context.state,
                sampleRate: Tone.context.sampleRate
            });

            return true;

        } catch (error) {
            this.errorLogger.logError(error, { 
                module: 'AudioEngine', 
                method: 'initialize',
                contextState: Tone.context?.state 
            });
            throw new Error(`Failed to initialize audio engine: ${error.message}`);
        }
    }

    /**
     * Ensure audio is initialized before use
     */
    async ensureInitialized() {
        if (!this.audioInitialized) {
            await this.initialize();
        }
        return this.audioInitialized;
    }

    /**
     * Convert volume (0-1) to decibels
     */
    volumeToDecibels(volume) {
        if (volume <= 0) return -Infinity;
        return 20 * Math.log10(volume);
    }

    /**
     * Set master volume
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        
        if (this.synth) {
            this.synth.volume.value = this.volumeToDecibels(this.volume);
        }
    }

    /**
     * Play a chord with given frequencies
     */
    playChord(frequencies, duration = '4n', velocity = 0.8) {
        if (!this.audioInitialized || !this.synth) {
            this.errorLogger.logWarning('Attempted to play chord before audio initialization');
            return;
        }

        if (!Array.isArray(frequencies) || frequencies.length === 0) {
            this.errorLogger.logWarning('Invalid frequencies provided to playChord', { frequencies });
            return;
        }

        try {
            // Filter out invalid frequencies
            const validFreqs = frequencies.filter(freq => 
                typeof freq === 'number' && freq > 0 && freq < 20000
            );

            if (validFreqs.length === 0) {
                this.errorLogger.logWarning('No valid frequencies to play', { originalFreqs: frequencies });
                return;
            }

            this.synth.triggerAttackRelease(validFreqs, duration, undefined, velocity);

        } catch (error) {
            this.errorLogger.logError(error, {
                module: 'AudioEngine',
                method: 'playChord',
                frequencies,
                duration,
                velocity
            });
        }
    }

    /**
     * Play metronome click
     */
    playMetronome(pitch = 800, duration = '16n') {
        if (!this.audioInitialized || !this.metronome) {
            return;
        }

        try {
            this.metronome.triggerAttackRelease(pitch, duration);
        } catch (error) {
            this.errorLogger.logError(error, {
                module: 'AudioEngine',
                method: 'playMetronome',
                pitch,
                duration
            });
        }
    }

    /**
     * Stop all audio
     */
    stopAll() {
        try {
            if (this.synth) {
                this.synth.releaseAll();
            }
            if (this.metronome) {
                this.metronome.releaseAll();
            }
        } catch (error) {
            this.errorLogger.logError(error, {
                module: 'AudioEngine',
                method: 'stopAll'
            });
        }
    }

    /**
     * Get current audio context state
     */
    getContextState() {
        return {
            state: Tone.context?.state || 'unknown',
            sampleRate: Tone.context?.sampleRate || null,
            initialized: this.audioInitialized,
            currentTime: Tone.context?.currentTime || null
        };
    }

    /**
     * Dispose of audio resources
     */
    dispose() {
        try {
            if (this.synth) {
                this.synth.dispose();
                this.synth = null;
            }
            if (this.metronome) {
                this.metronome.dispose();
                this.metronome = null;
            }
            this.audioInitialized = false;
        } catch (error) {
            this.errorLogger.logError(error, {
                module: 'AudioEngine',
                method: 'dispose'
            });
        }
    }

    /**
     * Get audio diagnostics
     */
    getDiagnostics() {
        return {
            ...this.getContextState(),
            synthExists: !!this.synth,
            metronomeExists: !!this.metronome,
            volume: this.volume,
            synthVolume: this.synth?.volume.value || null
        };
    }
}

/**
 * Custom audio errors
 */
export class AudioInitializationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AudioInitializationError';
    }
}

export class AudioPlaybackError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AudioPlaybackError';
    }
}
