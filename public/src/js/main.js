/**
 * Musical Accompanist Tool - Main Application
 * Refactored modular version with improved error handling and loading states
 */

import { ErrorLogger, setupGlobalErrorHandling } from './modules/ErrorLogger.js';
import { LoadingManager } from './modules/LoadingManager.js';
import { AudioEngine } from './modules/AudioEngine.js';
import { ChordManager } from './modules/ChordManager.js';

class MusicalAccompanist {
    constructor() {
        // Initialize core services
        this.errorLogger = new ErrorLogger();
        this.loadingManager = new LoadingManager();
        this.audioEngine = new AudioEngine(this.errorLogger);
        this.chordManager = new ChordManager(this.errorLogger);
        
        // Application state
        this.state = {
            isPlaying: false,
            isPaused: false,
            currentChordIndex: 0,
            chordProgression: [],
            tempo: 120,
            volume: 0.5,
            loopMode: true,
            metronomeEnabled: true,
            timeSignature: 4,
            selectedNotes: [],
            targetChordIndex: null,
            key: { tonic: 'C', mode: 'major' }
        };

        // Transport and scheduling
        this.transport = null;
        this.playbackSchedule = null;

        // Setup global error handling
        setupGlobalErrorHandling(this.errorLogger);
        
        this.initialize();
    }

    /**
     * Initialize the application
     */
    async initialize() {
        try {
            this.loadingManager.setLoading('app-init', true, 'Initializing application...');
            
            // Show initial status
            this.showStatus('Click Play to enable audio and start');
            
            // Bind event handlers
            this.bindEvents();
            
            // Initialize UI elements
            this.initializeUI();
            
            // Initialize with empty progression
            this.displayChords();
            
            this.loadingManager.setLoading('app-init', false);
            this.showStatus('Ready to play');
            
        } catch (error) {
            this.errorLogger.logError(error, { module: 'MusicalAccompanist', method: 'initialize' });
            this.loadingManager.setLoading('app-init', false);
            this.showStatus('Initialization failed - please refresh the page');
        }
    }

    /**
     * Ensure audio is ready for playback
     */
    async ensureAudioReady() {
        try {
            await this.audioEngine.ensureInitialized();
            return true;
        } catch (error) {
            this.errorLogger.logError(error);
            this.showStatus('Audio initialization failed');
            return false;
        }
    }

    /**
     * Start playback with loading state
     */
    async startPlayback() {
        const startPlaybackWithLoading = this.loadingManager.withLoading(
            'playback-start',
            this.doStartPlayback.bind(this),
            'Starting playback...'
        );

        const playButton = document.getElementById('play-btn');
        const startPlaybackWithButtonLoading = this.loadingManager.withButtonLoading(
            playButton,
            startPlaybackWithLoading
        );

        await startPlaybackWithButtonLoading();
    }

    /**
     * Internal playback start logic
     */
    async doStartPlayback() {
        if (this.state.chordProgression.length === 0) {
            this.showStatus('No chords to play');
            return;
        }

        // Ensure audio is ready
        const audioReady = await this.ensureAudioReady();
        if (!audioReady) {
            return;
        }

        this.state.isPlaying = true;
        this.state.isPaused = false;
        this.state.currentChordIndex = 0;
        
        // Update UI
        this.updatePlaybackControls();
        
        // Set tempo
        if (typeof Tone !== 'undefined') {
            Tone.Transport.bpm.value = this.state.tempo;
            this.schedulePlayback();
            Tone.Transport.start();
        }

        this.showStatus('Playing...');
    }

    /**
     * Schedule chord progression playback
     */
    schedulePlayback() {
        // Clear any existing schedule
        if (this.playbackSchedule) {
            this.playbackSchedule.dispose();
        }

        // Calculate chord duration based on time signature
        const chordDuration = `${this.state.timeSignature}n`;
        
        this.playbackSchedule = new Tone.Sequence(
            (time, index) => {
                const chord = this.state.chordProgression[index];
                
                if (chord && !chord.isEmpty && !chord.isRest) {
                    const frequencies = this.chordManager.getChordFrequencies(chord);
                    this.audioEngine.playChord(frequencies, chordDuration);
                }

                // Play metronome if enabled
                if (this.state.metronomeEnabled) {
                    this.audioEngine.playMetronome();
                }

                // Update display
                Tone.Draw.schedule(() => {
                    this.state.currentChordIndex = index;
                    this.updateProgressionDisplay();
                }, time);

            },
            this.state.chordProgression.map((_, i) => i),
            chordDuration
        ).start(0);

        // Handle loop mode
        this.playbackSchedule.loop = this.state.loopMode;
    }

    /**
     * Stop playback
     */
    stopPlayback() {
        this.state.isPlaying = false;
        this.state.isPaused = false;
        this.state.currentChordIndex = 0;

        if (typeof Tone !== 'undefined') {
            Tone.Transport.stop();
            Tone.Transport.cancel();
        }

        if (this.playbackSchedule) {
            this.playbackSchedule.dispose();
            this.playbackSchedule = null;
        }

        this.audioEngine.stopAll();
        this.updatePlaybackControls();
        this.updateProgressionDisplay();
        this.showStatus('Stopped');
    }

    /**
     * Update playback control buttons
     */
    updatePlaybackControls() {
        const playBtn = document.getElementById('play-btn');
        const pauseBtn = document.getElementById('pause-btn');
        const stopBtn = document.getElementById('stop-btn');

        if (playBtn) playBtn.disabled = this.state.isPlaying;
        if (pauseBtn) pauseBtn.disabled = !this.state.isPlaying;
        if (stopBtn) stopBtn.disabled = !this.state.isPlaying && !this.state.isPaused;
    }

    /**
     * Display chord progression
     */
    displayChords() {
        const display = document.getElementById('chord-display');
        if (!display) return;

        display.innerHTML = '';

        if (this.state.chordProgression.length === 0) {
            const placeholder = document.createElement('div');
            placeholder.className = 'chord-item empty';
            placeholder.textContent = 'No chords loaded';
            display.appendChild(placeholder);
            return;
        }

        this.state.chordProgression.forEach((chord, index) => {
            const chordElement = this.createChordElement(chord, index);
            display.appendChild(chordElement);
        });
    }

    /**
     * Create a chord display element
     */
    createChordElement(chord, index) {
        const element = document.createElement('div');
        element.className = 'chord-item';
        element.dataset.index = index;

        if (chord.isEmpty) {
            element.classList.add('empty');
            element.textContent = `Slot ${index + 1}`;
        } else if (chord.isRest) {
            element.classList.add('rest');
            element.textContent = 'REST';
        } else {
            element.innerHTML = `
                <div class="chord-name">${chord.name}</div>
                <div class="chord-notes">${chord.notes.join('·')}</div>
            `;
        }

        // Highlight current chord
        if (index === this.state.currentChordIndex && this.state.isPlaying) {
            element.classList.add('current');
        }

        // Add click handler
        element.addEventListener('click', () => this.handleChordClick(chord, index));

        return element;
    }

    /**
     * Handle chord element click
     */
    handleChordClick(chord, index) {
        if (!chord.isEmpty && !chord.isRest) {
            this.previewChord(chord);
        }
        this.selectSlotForInput(index);
    }

    /**
     * Preview a chord by playing it briefly
     */
    async previewChord(chord) {
        try {
            await this.ensureAudioReady();
            const frequencies = this.chordManager.getChordFrequencies(chord);
            this.audioEngine.playChord(frequencies, '2n');
        } catch (error) {
            this.errorLogger.logError(error, { 
                module: 'MusicalAccompanist', 
                method: 'previewChord' 
            });
        }
    }

    /**
     * Select a slot for chord input
     */
    selectSlotForInput(index) {
        this.state.targetChordIndex = index;
        this.showStatus(`Selected slot ${index + 1} for input`);
    }

    /**
     * Update progression display highlighting
     */
    updateProgressionDisplay() {
        const chordElements = document.querySelectorAll('.chord-item');
        chordElements.forEach((element, index) => {
            element.classList.toggle('current', index === this.state.currentChordIndex);
        });
    }

    /**
     * Show status message
     */
    showStatus(message) {
        const statusDisplay = document.getElementById('status-display');
        if (statusDisplay) {
            statusDisplay.textContent = message;
        }
        console.log(`Status: ${message}`);
    }

    /**
     * Initialize UI elements
     */
    initializeUI() {
        // Sync UI with state
        const elements = {
            'tempo': this.state.tempo,
            'volume': Math.round(this.state.volume * 100),
            'loop': this.state.loopMode,
            'metronome-toggle': this.state.metronomeEnabled,
            'time-signature': this.state.timeSignature
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value;
                }
            }
        });

        // Update displays
        this.updateDisplay('tempo-display', this.state.tempo);
        this.updateDisplay('volume-display', `${Math.round(this.state.volume * 100)}%`);
    }

    /**
     * Update a display element
     */
    updateDisplay(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    /**
     * Bind event handlers
     */
    bindEvents() {
        // Playback controls
        this.bindButton('play-btn', () => this.startPlayback());
        this.bindButton('stop-btn', () => this.stopPlayback());
        
        // Settings controls
        this.bindRange('tempo', (value) => {
            this.state.tempo = parseInt(value);
            this.updateDisplay('tempo-display', this.state.tempo);
            if (this.state.isPlaying && typeof Tone !== 'undefined') {
                Tone.Transport.bpm.value = this.state.tempo;
            }
        });

        this.bindRange('volume', (value) => {
            this.state.volume = parseInt(value) / 100;
            this.audioEngine.setVolume(this.state.volume);
            this.updateDisplay('volume-display', `${Math.round(this.state.volume * 100)}%`);
        });

        this.bindCheckbox('loop', (checked) => {
            this.state.loopMode = checked;
        });

        this.bindCheckbox('metronome-toggle', (checked) => {
            this.state.metronomeEnabled = checked;
        });
    }

    /**
     * Bind button event handler
     */
    bindButton(id, handler) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', this.errorLogger.wrap(handler, { button: id }));
        }
    }

    /**
     * Bind range input event handler
     */
    bindRange(id, handler) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', this.errorLogger.wrap((e) => {
                handler(e.target.value);
            }, { range: id }));
        }
    }

    /**
     * Bind checkbox event handler
     */
    bindCheckbox(id, handler) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', this.errorLogger.wrap((e) => {
                handler(e.target.checked);
            }, { checkbox: id }));
        }
    }

    /**
     * Load preset chord progression
     */
    loadPreset(presetName) {
        const presets = {
            'ii-V-I': ['Dm7', 'G7', 'Cmaj7'],
            'vi-IV-I-V': ['Am', 'F', 'C', 'G'],
            'I-vi-ii-V': ['C', 'Am', 'Dm', 'G'],
            'blues': ['C7', 'F7', 'C7', 'C7', 'F7', 'F7', 'C7', 'C7', 'G7', 'F7', 'C7', 'G7']
        };

        const chordStrings = presets[presetName];
        if (chordStrings) {
            this.loadProgressionFromStrings(chordStrings);
            this.showStatus(`Loaded preset: ${presetName}`);
        }
    }

    /**
     * Load progression from chord strings
     */
    loadProgressionFromStrings(chordStrings) {
        this.state.chordProgression = chordStrings.map(str => 
            this.chordManager.parseChord(str)
        );
        this.displayChords();
    }

    /**
     * Get application diagnostics
     */
    getDiagnostics() {
        return {
            audio: this.audioEngine.getDiagnostics(),
            errors: this.errorLogger.getErrors(),
            state: { ...this.state },
            chordCount: this.state.chordProgression.length
        };
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.accompanist = new MusicalAccompanist();
    
    // Expose diagnostics for debugging
    window.getDiagnostics = () => window.accompanist.getDiagnostics();
});

export default MusicalAccompanist;
