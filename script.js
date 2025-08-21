/**
 * Musical Accompanist Tool
 * A web-based tool for practicing with chord progressions and drones
 * Uses Tone.js for audio synthesis and Web Audio API for precise timing
 */

// Mapping of which keys use sharps vs flats for spelling
const KEY_SIGNATURES = {
    major: {
        'C': 'sharp',
        'C#': 'sharp', 'Db': 'flat',
        'D': 'sharp',
        'D#': 'flat', 'Eb': 'flat',
        'E': 'sharp',
        'F': 'flat',
        'F#': 'sharp', 'Gb': 'flat',
        'G': 'sharp',
        'G#': 'flat', 'Ab': 'flat',
        'A': 'sharp',
        'A#': 'flat', 'Bb': 'flat',
        'B': 'sharp'
    },
    minor: {
        'C': 'flat',
        'C#': 'sharp', 'Db': 'flat',
        'D': 'flat',
        'D#': 'flat', 'Eb': 'flat',
        'E': 'sharp',
        'F': 'flat',
        'F#': 'sharp', 'Gb': 'flat',
        'G': 'flat',
        'G#': 'sharp', 'Ab': 'flat',
        'A': 'sharp',
        'A#': 'flat', 'Bb': 'flat',
        'B': 'sharp'
    }
};

// Key-specific note spellings for proper enharmonic notation
const KEY_NOTE_SPELLINGS = {
    major: {
        'C': ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
        'C#': ['C#', 'D#', 'E#', 'F#', 'G#', 'A#', 'B#'],
        'Db': ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C'],
        'D': ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
        'D#': ['D#', 'E#', 'F##', 'G#', 'A#', 'B#', 'C##'],
        'Eb': ['Eb', 'F', 'G', 'Ab', 'Bb', 'C', 'D'],
        'E': ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'],
        'E#': ['E#', 'F##', 'G##', 'A#', 'B#', 'C##', 'D##'],
        'F': ['F', 'G', 'A', 'Bb', 'C', 'D', 'E'],
        'F#': ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'],
        'Fb': ['Fb', 'Gb', 'Ab', 'Bbb', 'Cb', 'Db', 'Eb'],
        'G': ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
        'G#': ['G#', 'A#', 'B#', 'C#', 'D#', 'E#', 'F##'],
        'Gb': ['Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F'],
        'A': ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
        'A#': ['A#', 'B#', 'C##', 'D#', 'E#', 'F##', 'G##'],
        'Ab': ['Ab', 'Bb', 'C', 'Db', 'Eb', 'F', 'G'],
        'B': ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'],
        'B#': ['B#', 'C##', 'D##', 'E#', 'F##', 'G##', 'A##'],
        'Bb': ['Bb', 'C', 'D', 'Eb', 'F', 'G', 'A'],
        'Cb': ['Cb', 'Db', 'Eb', 'Fb', 'Gb', 'Ab', 'Bb']
    },
    minor: {
        'C': ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb'],
        'C#': ['C#', 'D#', 'E', 'F#', 'G#', 'A', 'B'],
        'Db': ['Db', 'Eb', 'Fb', 'Gb', 'Ab', 'Bbb', 'Cb'],
        'D': ['D', 'E', 'F', 'G', 'A', 'Bb', 'C'],
        'D#': ['D#', 'E#', 'F#', 'G#', 'A#', 'B', 'C#'],
        'Eb': ['Eb', 'F', 'Gb', 'Ab', 'Bb', 'Cb', 'Db'],
        'E': ['E', 'F#', 'G', 'A', 'B', 'C', 'D'],
        'E#': ['E#', 'F##', 'G#', 'A#', 'B#', 'C#', 'D#'],
        'F': ['F', 'G', 'Ab', 'Bb', 'C', 'Db', 'Eb'],
        'F#': ['F#', 'G#', 'A', 'B', 'C#', 'D', 'E'],
        'Fb': ['Fb', 'Gb', 'Abb', 'Bbb', 'Cb', 'Dbb', 'Ebb'],
        'G': ['G', 'A', 'Bb', 'C', 'D', 'Eb', 'F'],
        'G#': ['G#', 'A#', 'B', 'C#', 'D#', 'E', 'F#'],
        'Gb': ['Gb', 'Ab', 'Bbb', 'Cb', 'Db', 'Ebb', 'Fb'],
        'A': ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
        'A#': ['A#', 'B#', 'C#', 'D#', 'E#', 'F#', 'G#'],
        'Ab': ['Ab', 'Bb', 'Cb', 'Db', 'Eb', 'Fb', 'Gb'],
        'B': ['B', 'C#', 'D', 'E', 'F#', 'G', 'A'],
        'B#': ['B#', 'C##', 'D#', 'E#', 'F##', 'G#', 'A#'],
        'Bb': ['Bb', 'C', 'Db', 'Eb', 'F', 'Gb', 'Ab'],
        'Cb': ['Cb', 'Db', 'Ebb', 'Fb', 'Gb', 'Abb', 'Bbb']
    }
};

// Chromatic mapping from piano keys to scale degrees for proper labeling
const CHROMATIC_TO_SCALE_DEGREE = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 
    'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 
    'A#': 10, 'Bb': 10, 'B': 11
};

class MusicalAccompanist {
    constructor() {
        this.isPlaying = false;
        this.isPaused = false;
        this.currentChordIndex = 0;
        this.chordProgression = [];
        this.synth = null;
        this.metronome = null;
        this.transport = null;
        this.tempo = 120;
        this.volume = 0.5;
        this.loopMode = true;
        this.metronomeEnabled = true;
        this.selectedNotes = []; // For piano keyboard
        this.targetChordIndex = null; // Track which slot to fill with piano selection
        this.timeSignature = 4; // Default to 4/4 time
        this.measureTimeSignatures = []; // Per-measure time signatures
        this.draggedFromIndex = null;
        this.contextChordIndex = null; // For context menu
        this.editingChordIndex = null; // For chord editing
        this.showChordNotes = false; // For showing notes above chords
        this.showChordFunctions = false; // For showing Roman numeral functions
        this.key = { tonic: 'C', mode: 'major' }; // Default, will be updated from HTML

        // Trial and Subscription Management
        this.trialStartDate = this.getTrialStartDate();
        this.isSubscribed = this.checkSubscriptionStatus();
        this.trialDaysRemaining = this.calculateTrialDaysRemaining();
        
        // Update UI based on trial/subscription status
        this.updateTrialUI();


        // Note mapping utilities for roman numeral parsing
        this.SHARP_NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
        this.FLAT_NOTES  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
        this.indexToNote = this.SHARP_NOTES;
        this.noteToIndex = {
            'C':0, 'C#':1, 'Db':1, 'D':2, 'D#':3, 'Eb':3,
            'E':4, 'Fb':4, 'E#':5, 'F':5, 'F#':6, 'Gb':6,
            'G':7, 'G#':8, 'Ab':8, 'A':9, 'A#':10, 'Bb':10,
            'B':11, 'Cb':11, 'B#':0
        };

        this.updateNoteNames();
        
        // Flag to track if audio has been initialized
        this.audioInitialized = false;
        
        // Add comprehensive debugging
        console.log('=== CONSTRUCTOR DEBUG ===');
        console.log('Tone object exists:', typeof Tone !== 'undefined');
        console.log('Tone.context exists:', typeof Tone.context !== 'undefined');
        console.log('Tone.context.state:', Tone.context ? Tone.context.state : 'undefined');
        console.log('========================');
        
        // Check initial AudioContext state
        console.log('Initial Tone.context state:', Tone.context.state);
        
        // Show appropriate initial status
        if (Tone.context.state === 'suspended') {
            this.showStatus('Audio suspended - Click Play to enable audio');
        } else {
            this.showStatus('Audio ready');
        }
        
        // Bind event handlers
        this.bindEvents();
        
        // Initialize UI elements
        this.initializeUI();
        
        // Initialize with empty progression
        this.displayChords();
        
        // Sync key from HTML dropdown values
        this.syncKeyFromHTML();
        this.updateKeyboardForKey();

        // Initialize Roman numeral buttons (with slight delay to ensure DOM is ready)
        setTimeout(() => {
            this.updateRomanNumeralButtons();
        }, 100);
    }

    /**
     * Sync the internal key state with the HTML dropdown values
     */
    syncKeyFromHTML() {
        const tonicSelect = document.getElementById('key-tonic');
        const modeSelect = document.getElementById('key-mode');
        
        if (tonicSelect && modeSelect) {
            this.key.tonic = tonicSelect.value;
            this.key.mode = modeSelect.value;
            console.log('Synced key from HTML:', this.key.tonic, this.key.mode);
        }
    }

    /**
     * Get or set the trial start date
     */
    getTrialStartDate() {
        let trialStart = localStorage.getItem('trialStartDate');
        if (!trialStart) {
            trialStart = new Date().toISOString();
            localStorage.setItem('trialStartDate', trialStart);
        }
        return new Date(trialStart);
    }

    /**
     * Calculate remaining days in trial
     */
    calculateTrialDaysRemaining() {
        if (this.isSubscribed) return null;
        
        const now = new Date();
        const trialEnd = new Date(this.trialStartDate);
        trialEnd.setDate(trialEnd.getDate() + 7); // 7-day trial
        
        const timeDiff = trialEnd.getTime() - now.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        return Math.max(0, daysDiff);
    }

    /**
     * Check if user has active subscription
     */
    checkSubscriptionStatus() {
        // For demo purposes, check localStorage
        // In production, this would verify with your backend/Stripe
        return localStorage.getItem('subscriptionActive') === 'true';
    }

    /**
     * Check if user can access features (trial or subscribed)
     */
    hasAccess() {
        return this.isSubscribed || this.trialDaysRemaining > 0;
    }

    /**
     * Update UI based on trial/subscription status
     */
    updateTrialUI() {
        const trialBanner = document.getElementById('trial-active-banner');
        const expiredBanner = document.getElementById('trial-expired-banner');
        const subscribedBanner = document.getElementById('subscribed-banner');
        const trialDaysElement = document.getElementById('trial-days-remaining');

        // Hide all banners first
        trialBanner.style.display = 'none';
        expiredBanner.style.display = 'none';
        subscribedBanner.style.display = 'none';

        if (this.isSubscribed) {
            subscribedBanner.style.display = 'flex';
        } else if (this.trialDaysRemaining > 0) {
            trialBanner.style.display = 'flex';
            trialDaysElement.textContent = `${this.trialDaysRemaining} day${this.trialDaysRemaining !== 1 ? 's' : ''}`;
        } else {
            expiredBanner.style.display = 'flex';
            // Show trial expired modal
            this.showTrialExpiredModal();
        }
    }

    /**
     * Show trial expired modal
     */
    showTrialExpiredModal() {
        const modal = document.getElementById('trial-expired-modal');
        modal.style.display = 'block';
    }

    /**
     * Activate subscription (for testing/demo)
     */
    activateSubscription() {
        localStorage.setItem('subscriptionActive', 'true');
        this.isSubscribed = true;
        this.updateTrialUI();
        console.log('Subscription activated');
    }

    /**
     * Deactivate subscription (for testing/demo)
     */
    deactivateSubscription() {
        localStorage.removeItem('subscriptionActive');
        this.isSubscribed = false;
        this.trialDaysRemaining = this.calculateTrialDaysRemaining();
        this.updateTrialUI();
        console.log('Subscription deactivated');
    }

    /**
     * Reset trial (for testing/demo)
     */
    resetTrial() {
        localStorage.removeItem('trialStartDate');
        localStorage.removeItem('subscriptionActive');
        this.trialStartDate = this.getTrialStartDate();
        this.isSubscribed = false;
        this.trialDaysRemaining = this.calculateTrialDaysRemaining();
        this.updateTrialUI();
        console.log('Trial reset');
    }

    /**
     * Initialize the audio system using Tone.js
     * Note: This only creates synths, doesn't start AudioContext
     */
    async initializeAudio() {
        try {
            console.log('initializeAudio called, context state:', Tone.context.state);
            
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

            // Create metronome
            this.metronome = new Tone.Synth({
                oscillator: { type: 'square' },
                envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.1 }
            }).toDestination();

            // Set initial volume
            this.synth.volume.value = this.volumeToDb(this.volume);
            this.metronome.volume.value = this.volumeToDb(0.3);

            console.log('Synths created successfully');
            
        } catch (error) {
            console.error('Error initializing audio:', error);
            this.showStatus('Error initializing audio. Please check your browser settings.');
            throw error;
        }
    }

    /**
     * Ensure audio context and synths are ready after a user gesture
     */
    async ensureAudioInitialized() {
        console.log('=== ENSUREAUDOINITIALIZED CALLED ===');
        try {
            console.log('ensureAudioInitialized called, current state:', Tone.context.state);
            
            // Always call Tone.start() to ensure audio context is properly initialized
            if (Tone.context.state !== 'running') {
                console.log('Context not running, calling Tone.start()...');
                await Tone.start();
                console.log('Tone.start() completed, final state:', Tone.context.state);
            } else {
                console.log('Context is already running');
            }
            
            // Initialize our synths if not already done
            if (!this.audioInitialized) {
                console.log('Audio not initialized, calling initializeAudio()...');
                await this.initializeAudio();
                this.audioInitialized = true;
                console.log('initializeAudio() completed');
            } else {
                console.log('Audio already initialized');
            }
            
            // Update status once audio is ready
            if (Tone.context.state === 'running') {
                this.showStatus('Audio ready');
                console.log('Audio is ready, status updated');
            } else {
                console.log('Audio context state is still not running:', Tone.context.state);
            }
            
        } catch (error) {
            console.error('Error in ensureAudioInitialized:', error);
            console.error('Error stack:', error.stack);
            this.showStatus('Audio initialization failed');
            throw error;
        }
        console.log('=== ENSUREAUDOINITIALIZED DONE ===');
    }

    /**
     * Bind all event handlers
     */
    bindEvents() {
        // Control inputs
        document.getElementById('tempo').addEventListener('input', (e) => {
            this.tempo = parseInt(e.target.value);
            document.getElementById('tempo-display').textContent = this.tempo;
            if (this.isPlaying) {
                Tone.Transport.bpm.value = this.tempo;
            }
        });

        document.getElementById('volume').addEventListener('input', (e) => {
            this.volume = parseInt(e.target.value) / 100;
            document.getElementById('volume-display').textContent = e.target.value + '%';
            if (this.synth) {
                this.synth.volume.value = this.volumeToDb(this.volume);
            }
        });

        document.getElementById('time-signature').addEventListener('change', (e) => {
            this.timeSignature = parseInt(e.target.value);
            this.displayChords(); // Refresh the display with new time signature
            this.showStatus(`Time signature changed to: ${this.timeSignature}/4`);
        });

        // Key signature controls
        const tonicSelect = document.getElementById('key-tonic');
        const modeSelect = document.getElementById('key-mode');
        if (tonicSelect && modeSelect) {
            tonicSelect.addEventListener('change', (e) => {
                this.key.tonic = e.target.value;
                this.updateNoteNames();
                this.updateRomanNumeralButtons();
                this.displayChords();
                this.updateKeyboardForKey();
                this.showStatus(`Key set to ${this.key.tonic} ${this.key.mode}`);
            });

            modeSelect.addEventListener('change', (e) => {
                this.key.mode = e.target.value;
                this.updateNoteNames();
                this.updateRomanNumeralButtons();
                this.displayChords();
                this.updateKeyboardForKey();
                this.showStatus(`Key set to ${this.key.tonic} ${this.key.mode}`);
            });
        }

        document.getElementById('loop').addEventListener('change', (e) => {
            this.loopMode = e.target.checked;
            this.showStatus(`Loop mode ${this.loopMode ? 'enabled' : 'disabled'}`);
        });

        document.getElementById('metronome-toggle').addEventListener('change', (e) => {
            this.metronomeEnabled = e.target.checked;
            this.showStatus(`Metronome ${this.metronomeEnabled ? 'On' : 'Off'}`);
        });

        // Playback controls
        document.getElementById('play-btn').addEventListener('click', async () => {
            console.log('=== PLAY BUTTON CLICKED ===');
            console.log('About to call startPlayback()');
            try {
                await this.startPlayback();
                console.log('startPlayback() completed successfully');
            } catch (error) {
                console.error('Error in play button handler:', error);
            }
            console.log('=== PLAY BUTTON HANDLER DONE ===');
        });

        document.getElementById('pause-btn').addEventListener('click', () => {
            this.pausePlayback();
        });

        document.getElementById('stop-btn').addEventListener('click', () => {
            this.stopPlayback();
        });

        // Piano keyboard events
        document.querySelectorAll('.key').forEach(key => {
            key.addEventListener('click', async (e) => {
                // Use the canonical data-note (physical pitch + octave) for internal state
                const dataNote = e.target.dataset.note;
                await this.toggleNote(dataNote, e.target);
            });
        });

        // Piano control buttons
        document.getElementById('play-selected').addEventListener('click', async () => {
            await this.playSelectedNotes();
        });

        document.getElementById('clear-selection').addEventListener('click', () => {
            this.clearSelection();
        });

        document.getElementById('add-to-progression').addEventListener('click', () => {
            this.addSelectionToProgression();
        });

        document.getElementById('clear-slot-selection').addEventListener('click', () => {
            this.clearSlotSelection();
        });

        // Enhanced progression controls
        document.getElementById('transpose-up').addEventListener('click', () => {
            this.transposeProgression(1);
        });

        document.getElementById('transpose-down').addEventListener('click', () => {
            this.transposeProgression(-1);
        });

        document.getElementById('export-progression').addEventListener('click', () => {
            this.exportProgression();
        });

        document.getElementById('import-progression').addEventListener('click', () => {
            document.getElementById('import-file-input').click();
        });

        document.getElementById('import-file-input').addEventListener('change', (e) => {
            this.importProgression(e.target.files[0]);
        });

        // Enhanced piano controls for slot navigation
        document.getElementById('prev-empty-slot').addEventListener('click', () => {
            this.selectPreviousEmptySlot();
        });

        document.getElementById('next-empty-slot').addEventListener('click', () => {
            this.selectNextEmptySlot();
        });

        document.getElementById('goto-slot').addEventListener('click', () => {
            this.gotoSpecificSlot();
        });

        // Allow Enter key on measure/beat inputs
        document.getElementById('goto-measure').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.gotoSpecificSlot();
        });

        document.getElementById('goto-beat').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.gotoSpecificSlot();
        });

        // Modal and context menu events
        document.getElementById('chord-edit-modal').addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeEditModal();
            }
        });

        document.querySelector('.close').addEventListener('click', () => {
            this.closeEditModal();
        });

        document.getElementById('save-chord-edit').addEventListener('click', () => {
            this.saveChordEdit();
        });

        document.getElementById('cancel-chord-edit').addEventListener('click', () => {
            this.closeEditModal();
        });

        document.getElementById('delete-chord').addEventListener('click', () => {
            this.deleteChord();
        });

        // Context menu items
        document.getElementById('context-edit').addEventListener('click', () => {
            this.editChord(this.contextChordIndex);
        });

        document.getElementById('context-duplicate').addEventListener('click', () => {
            this.duplicateChord(this.contextChordIndex);
        });

        document.getElementById('context-substitute').addEventListener('click', () => {
            this.showChordSubstitutions(this.contextChordIndex);
        });

        document.getElementById('context-insert-before').addEventListener('click', () => {
            this.insertEmptyChord(this.contextChordIndex);
        });

        document.getElementById('context-insert-after').addEventListener('click', () => {
            this.insertEmptyChord(this.contextChordIndex + 1);
        });

        document.getElementById('context-delete').addEventListener('click', () => {
            this.deleteChordAtIndex(this.contextChordIndex);
        });

        // Hide context menu when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.context-menu') && !e.target.closest('.chord-item')) {
                this.hideContextMenu();
            }
        });

        // Clear progression button
        document.getElementById('clear-progression').addEventListener('click', () => {
            this.clearProgression();
        });

        // Create measures button
        document.getElementById('create-measures').addEventListener('click', () => {
            this.createEmptyMeasures();
        });

        // Roman numeral chord buttons and tabs
        document.querySelectorAll('.roman-chord-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                await this.selectRomanChord(e.target.dataset.roman);
            });
        });

        // Chord type tabs
        document.querySelectorAll('.chord-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                // Check if trial has expired and user isn't subscribed
                if (!this.hasAccess()) {
                    this.showTrialExpiredModal();
                    return;
                }
                
                this.switchChordTab(e.target.dataset.type);
            });
        });

        // Trial and subscription event handlers
        document.getElementById('subscribe-early-btn')?.addEventListener('click', () => {
            window.open('https://buy.stripe.com/9B600i6Tj3S50cE4j28k800', '_blank');
        });

        document.getElementById('subscribe-btn')?.addEventListener('click', () => {
            window.open('https://buy.stripe.com/9B600i6Tj3S50cE4j28k800', '_blank');
        });

        document.getElementById('manage-subscription')?.addEventListener('click', () => {
            // In production, this would open Stripe customer portal
            alert('In production, this would open the Stripe customer portal for subscription management.');
        });

        // Modal close functionality
        const trialModal = document.getElementById('trial-expired-modal');
        if (trialModal) {
            window.addEventListener('click', (e) => {
                if (e.target === trialModal) {
                    trialModal.style.display = 'none';
                }
            });
        }

        // Demo functions for testing (remove in production)
        window.activateSubscription = () => this.activateSubscription();
        window.deactivateSubscription = () => this.deactivateSubscription();
        window.resetTrial = () => this.resetTrial();
    }

    /**
     * Switch between chord type tabs
     */
    switchChordTab(tabType) {
        // Update tab buttons
        document.querySelectorAll('.chord-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`.chord-tab[data-type="${tabType}"]`).classList.add('active');

        // Update chord groups
        document.querySelectorAll('.chord-group').forEach(group => {
            group.classList.remove('active');
        });
        document.querySelector(`.chord-group[data-group="${tabType}"]`).classList.add('active');

        this.showStatus(`Switched to ${tabType} chords`);
    }

    /**
     * Initialize UI elements to match internal state
     */
    initializeUI() {
        // Sync checkbox states with internal values
        document.getElementById('loop').checked = this.loopMode;
        document.getElementById('metronome-toggle').checked = this.metronomeEnabled;
        
        // Update tempo and volume displays
        document.getElementById('tempo-display').textContent = this.tempo;
        document.getElementById('volume-display').textContent = Math.round(this.volume * 100) + '%';
        
        // Set slider values
        document.getElementById('tempo').value = this.tempo;
        document.getElementById('volume').value = Math.round(this.volume * 100);
        
        // Initialize repeat markers drag and drop
        // (Removed for simplicity)
    }

    /**
     * Load a preset configuration
     */
    loadPreset(presetName) {
        const presets = {
            'drone-a': {
                name: 'Drone: A (440Hz)',
                chords: [{ name: 'A', notes: ['A4'], duration: '1n', isDrone: true, isSingleNote: true }],
                tempo: 60,
                key: 'A'
            },
            'single-note-c': {
                name: 'Single Note: C',
                chords: [{ name: 'C', notes: ['C4'], duration: '1n', isSingleNote: true }],
                tempo: 120,
                key: 'C'
            },
            'chromatic-scale': {
                name: 'Chromatic Scale',
                chords: [
                    { name: 'C', notes: ['C4'], duration: '1n', isSingleNote: true },
                    { name: 'C#', notes: ['C#4'], duration: '1n', isSingleNote: true },
                    { name: 'D', notes: ['D4'], duration: '1n', isSingleNote: true },
                    { name: 'D#', notes: ['D#4'], duration: '1n', isSingleNote: true },
                    { name: 'E', notes: ['E4'], duration: '1n', isSingleNote: true },
                    { name: 'F', notes: ['F4'], duration: '1n', isSingleNote: true },
                    { name: 'F#', notes: ['F#4'], duration: '1n', isSingleNote: true },
                    { name: 'G', notes: ['G4'], duration: '1n', isSingleNote: true },
                    { name: 'G#', notes: ['G#4'], duration: '1n', isSingleNote: true },
                    { name: 'A', notes: ['A4'], duration: '1n', isSingleNote: true },
                    { name: 'A#', notes: ['A#4'], duration: '1n', isSingleNote: true },
                    { name: 'B', notes: ['B4'], duration: '1n', isSingleNote: true },
                    { name: 'C5', notes: ['C5'], duration: '1n', isSingleNote: true }
                ],
                tempo: 80,
                key: 'C'
            },
            'g-major-145': {
                name: 'G Major I-IV-V',
                chords: [
                    { name: 'G', notes: ['G4', 'B4', 'D5'], duration: '1n' },
                    { name: 'C', notes: ['C4', 'E4', 'G4'], duration: '1n' },
                    { name: 'D', notes: ['D4', 'F#4', 'A4'], duration: '1n' },
                    { name: 'G', notes: ['G4', 'B4', 'D5'], duration: '1n' }
                ],
                tempo: 100,
                key: 'G'
            },
            'c-major-1645': {
                name: 'C Major I-vi-IV-V',
                chords: [
                    { name: 'C', notes: ['C4', 'E4', 'G4'], duration: '1n' },
                    { name: 'Am', notes: ['A3', 'C4', 'E4'], duration: '1n' },
                    { name: 'F', notes: ['F3', 'A3', 'C4'], duration: '1n' },
                    { name: 'G', notes: ['G3', 'B3', 'D4'], duration: '1n' }
                ],
                tempo: 120,
                key: 'C'
            },
            'd-major-drone': {
                name: 'D Major Drone',
                chords: [{ name: 'D', notes: ['D4', 'A4'], duration: '1n', isDrone: true }],
                tempo: 60,
                key: 'D'
            },
            'blues-12bar': {
                name: '12-Bar Blues in A',
                chords: [
                    { name: 'A7', notes: ['A3', 'C#4', 'E4', 'G4'], duration: '1n' },
                    { name: 'A7', notes: ['A3', 'C#4', 'E4', 'G4'], duration: '1n' },
                    { name: 'A7', notes: ['A3', 'C#4', 'E4', 'G4'], duration: '1n' },
                    { name: 'A7', notes: ['A3', 'C#4', 'E4', 'G4'], duration: '1n' },
                    { name: 'D7', notes: ['D4', 'F#4', 'A4', 'C5'], duration: '1n' },
                    { name: 'D7', notes: ['D4', 'F#4', 'A4', 'C5'], duration: '1n' },
                    { name: 'A7', notes: ['A3', 'C#4', 'E4', 'G4'], duration: '1n' },
                    { name: 'A7', notes: ['A3', 'C#4', 'E4', 'G4'], duration: '1n' },
                    { name: 'E7', notes: ['E4', 'G#4', 'B4', 'D5'], duration: '1n' },
                    { name: 'D7', notes: ['D4', 'F#4', 'A4', 'C5'], duration: '1n' },
                    { name: 'A7', notes: ['A3', 'C#4', 'E4', 'G4'], duration: '1n' },
                    { name: 'E7', notes: ['E4', 'G#4', 'B4', 'D5'], duration: '1n' }
                ],
                tempo: 120,
                key: 'A'
            }
        };

        const preset = presets[presetName];
        if (!preset) {
            this.showStatus('Preset not found');
            return;
        }

        this.chordProgression = preset.chords;
        this.tempo = preset.tempo;
        
        // Update UI
        document.getElementById('tempo').value = this.tempo;
        document.getElementById('tempo-display').textContent = this.tempo;
        
        this.displayChords();
        this.showStatus(`Loaded preset: ${preset.name}`);
    }

    /**
     * Get preset data without loading it
     */
    getPresetData(presetName) {
        const presets = {
            'drone-a': {
                name: 'Drone: A (440Hz)',
                chords: [{ name: 'A', notes: ['A4'], duration: '1n', isDrone: true, isSingleNote: true }],
                tempo: 60,
                key: 'A'
            },
            'single-note-c': {
                name: 'Single Note: C',
                chords: [{ name: 'C', notes: ['C4'], duration: '1n', isSingleNote: true }],
                tempo: 120,
                key: 'C'
            },
            'chromatic-scale': {
                name: 'Chromatic Scale',
                chords: [
                    { name: 'C', notes: ['C4'], duration: '1n', isSingleNote: true },
                    { name: 'C#', notes: ['C#4'], duration: '1n', isSingleNote: true },
                    { name: 'D', notes: ['D4'], duration: '1n', isSingleNote: true },
                    { name: 'D#', notes: ['D#4'], duration: '1n', isSingleNote: true },
                    { name: 'E', notes: ['E4'], duration: '1n', isSingleNote: true },
                    { name: 'F', notes: ['F4'], duration: '1n', isSingleNote: true },
                    { name: 'F#', notes: ['F#4'], duration: '1n', isSingleNote: true },
                    { name: 'G', notes: ['G4'], duration: '1n', isSingleNote: true },
                    { name: 'G#', notes: ['G#4'], duration: '1n', isSingleNote: true },
                    { name: 'A', notes: ['A4'], duration: '1n', isSingleNote: true },
                    { name: 'A#', notes: ['A#4'], duration: '1n', isSingleNote: true },
                    { name: 'B', notes: ['B4'], duration: '1n', isSingleNote: true },
                    { name: 'C5', notes: ['C5'], duration: '1n', isSingleNote: true }
                ],
                tempo: 80,
                key: 'C'
            },
            'g-major-145': {
                name: 'G Major I-IV-V',
                chords: [
                    { name: 'G', notes: ['G4', 'B4', 'D5'], duration: '1n' },
                    { name: 'C', notes: ['C4', 'E4', 'G4'], duration: '1n' },
                    { name: 'D', notes: ['D4', 'F#4', 'A4'], duration: '1n' },
                    { name: 'G', notes: ['G4', 'B4', 'D5'], duration: '1n' }
                ],
                tempo: 100,
                key: 'G'
            },
            'c-major-1645': {
                name: 'C Major I-vi-IV-V',
                chords: [
                    { name: 'C', notes: ['C4', 'E4', 'G4'], duration: '1n' },
                    { name: 'Am', notes: ['A3', 'C4', 'E4'], duration: '1n' },
                    { name: 'F', notes: ['F3', 'A3', 'C4'], duration: '1n' },
                    { name: 'G', notes: ['G3', 'B3', 'D4'], duration: '1n' }
                ],
                tempo: 120,
                key: 'C'
            },
            'd-major-drone': {
                name: 'D Major Drone',
                chords: [{ name: 'D', notes: ['D4', 'A4'], duration: '1n', isDrone: true }],
                tempo: 60,
                key: 'D'
            },
            'blues-12bar': {
                name: '12-Bar Blues in A',
                chords: [
                    { name: 'A7', notes: ['A3', 'C#4', 'E4', 'G4'], duration: '1n' },
                    { name: 'A7', notes: ['A3', 'C#4', 'E4', 'G4'], duration: '1n' },
                    { name: 'A7', notes: ['A3', 'C#4', 'E4', 'G4'], duration: '1n' },
                    { name: 'A7', notes: ['A3', 'C#4', 'E4', 'G4'], duration: '1n' },
                    { name: 'D7', notes: ['D4', 'F#4', 'A4', 'C5'], duration: '1n' },
                    { name: 'D7', notes: ['D4', 'F#4', 'A4', 'C5'], duration: '1n' },
                    { name: 'A7', notes: ['A3', 'C#4', 'E4', 'G4'], duration: '1n' },
                    { name: 'A7', notes: ['A3', 'C#4', 'E4', 'G4'], duration: '1n' },
                    { name: 'E7', notes: ['E4', 'G#4', 'B4', 'D5'], duration: '1n' },
                    { name: 'D7', notes: ['D4', 'F#4', 'A4', 'C5'], duration: '1n' },
                    { name: 'A7', notes: ['A3', 'C#4', 'E4', 'G4'], duration: '1n' },
                    { name: 'E7', notes: ['E4', 'G#4', 'B4', 'D5'], duration: '1n' }
                ],
                tempo: 120,
                key: 'A'
            }
        };

        const preset = presets[presetName];
        if (!preset) {
            this.showStatus('Preset not found');
            return;
        }

        this.chordProgression = preset.chords;
        this.tempo = preset.tempo;
        
        // Update UI
        document.getElementById('tempo').value = this.tempo;
        document.getElementById('tempo-display').textContent = this.tempo;
        
        this.displayChords();
        this.showStatus(`Loaded preset: ${preset.name}`);
    }

    /**
     * Parse a chord string into chord objects
     */
    parseChordString(input) {
        const chords = [];

        // Tokenize keeping basic repeat symbols intact
        const tokens = input.match(/\|:|:\|x?\d*|[^\s]+/gi) || [];

        const repeatStack = [];

        // Reset measure time signatures
        this.measureTimeSignatures = [];
        let currentSig = this.timeSignature;
        let chordsInMeasure = 0;

        for (const rawToken of tokens) {
            const token = rawToken.trim();

            if (token === '|:') {
                repeatStack.push(chords.length);
                continue;
            }

            if (token.startsWith(':|')) {
                const repeatCount = parseInt(token.slice(2).replace(/^x/, '')) || 2;
                const start = repeatStack.pop() ?? 0;
                const section = chords.slice(start);
                for (let i = 1; i < repeatCount; i++) {
                    chords.push(...section);
                }
                continue;
            }

            // Check for time signature change token (e.g. "3/4")
            if (/^\d+\/\d+$/.test(token)) {
                // If we have started a measure, finalize it
                if (chordsInMeasure > 0) {
                    this.measureTimeSignatures.push(currentSig);
                    chordsInMeasure = 0;
                }
                
                const [numerator] = token.split('/').map(Number);
                currentSig = numerator;
                continue;
            }

            // Tempo change e.g. Tempo120 or [Tempo=120]
            let match = token.match(/^\[?Tempo=?([0-9]+)\]?$/i);
            if (match) {
                const bpm = parseInt(match[1]);
                chords.push({
                    type: 'tempo',
                    bpm,
                    name: `Tempo=${bpm}`,
                    notes: [],
                    isTempoEvent: true
                });
                continue;
            }

            // Accelerando/Ritardando e.g. Accel=120:4 or Accel->120:4
            match = token.match(/^\[?Accel(?:->|=)?([0-9]+):([0-9]+)\]?$/i);
            if (match) {
                const target = parseInt(match[1]);
                const measures = parseInt(match[2]);
                chords.push({
                    type: 'accel',
                    target,
                    measures,
                    name: `Accel ${target}:${measures}`,
                    notes: [],
                    isTempoEvent: true
                });
                continue;
            }

            switch (token.toUpperCase()) {
                case '|':
                    continue;
                default:
                    const chord = this.parseChord(token);
                    if (chord) {
                        chords.push(chord);
                        chordsInMeasure++;
                        
                        // Check if measure is complete
                        if (chordsInMeasure === currentSig) {
                            this.measureTimeSignatures.push(currentSig);
                            chordsInMeasure = 0;
                        }
                    }
            }
        }

        // Handle any remaining partial measure
        if (chordsInMeasure > 0) {
            this.measureTimeSignatures.push(currentSig);
        }

        if (chords.length === 0) {
            throw new Error('No valid chords found');
        }

        return chords;
    }

    /**
     * Parse a single chord name into notes
     */
    parseChord(chordName) {
        // Check if it's a custom chord using note-dash-note syntax
        if (chordName.includes('-') && chordName !== '-') {
            return this.parseCustomChord(chordName);
        }

        // Check if it's a single note (note name with optional octave)
        if (this.isSingleNote(chordName)) {
            return this.parseSingleNote(chordName);
        }

        // Check for Roman numeral or scale degree input
        const romanChord = this.parseRomanNumeralChord(chordName);
        if (romanChord) {
            return romanChord;
        }

        // Basic chord parsing - supports major, minor, 7th chords
        const chordPatterns = {
            // Major chords
            'C': ['C4', 'E4', 'G4'],
            'C#': ['C#4', 'F4', 'G#4'],
            'Db': ['Db4', 'F4', 'Ab4'],
            'D': ['D4', 'F#4', 'A4'],
            'D#': ['D#4', 'G4', 'A#4'],
            'Eb': ['Eb4', 'G4', 'Bb4'],
            'E': ['E4', 'G#4', 'B4'],
            'F': ['F4', 'A4', 'C5'],
            'F#': ['F#4', 'A#4', 'C#5'],
            'Gb': ['Gb4', 'Bb4', 'Db5'],
            'G': ['G4', 'B4', 'D5'],
            'G#': ['G#4', 'C5', 'D#5'],
            'Ab': ['Ab4', 'C5', 'Eb5'],
            'A': ['A4', 'C#5', 'E5'],
            'A#': ['A#4', 'D5', 'F5'],
            'Bb': ['Bb4', 'D5', 'F5'],
            'B': ['B4', 'D#5', 'F#5'],
            
            // Minor chords
            'Cm': ['C4', 'Eb4', 'G4'],
            'C#m': ['C#4', 'E4', 'G#4'],
            'Dbm': ['Db4', 'E4', 'Ab4'],
            'Dm': ['D4', 'F4', 'A4'],
            'D#m': ['D#4', 'F#4', 'A#4'],
            'Ebm': ['Eb4', 'Gb4', 'Bb4'],
            'Em': ['E4', 'G4', 'B4'],
            'Fm': ['F4', 'Ab4', 'C5'],
            'F#m': ['F#4', 'A4', 'C#5'],
            'Gbm': ['Gb4', 'A4', 'Db5'],
            'Gm': ['G4', 'Bb4', 'D5'],
            'G#m': ['G#4', 'B4', 'D#5'],
            'Abm': ['Ab4', 'B4', 'Eb5'],
            'Am': ['A4', 'C5', 'E5'],
            'A#m': ['A#4', 'C#5', 'F5'],
            'Bbm': ['Bb4', 'Db5', 'F5'],
            'Bm': ['B4', 'D5', 'F#5'],
            
            // 7th chords
            'C7': ['C4', 'E4', 'G4', 'Bb4'],
            'C#7': ['C#4', 'F4', 'G#4', 'B4'],
            'Db7': ['Db4', 'F4', 'Ab4', 'B4'],
            'D7': ['D4', 'F#4', 'A4', 'C5'],
            'D#7': ['D#4', 'G4', 'A#4', 'C#5'],
            'Eb7': ['Eb4', 'G4', 'Bb4', 'Db5'],
            'E7': ['E4', 'G#4', 'B4', 'D5'],
            'F7': ['F4', 'A4', 'C5', 'Eb5'],
            'F#7': ['F#4', 'A#4', 'C#5', 'E5'],
            'Gb7': ['Gb4', 'Bb4', 'Db5', 'E5'],
            'G7': ['G4', 'B4', 'D5', 'F5'],
            'G#7': ['G#4', 'C5', 'D#5', 'F#5'],
            'Ab7': ['Ab4', 'C5', 'Eb5', 'Gb5'],
            'A7': ['A4', 'C#5', 'E5', 'G5'],
            'A#7': ['A#4', 'D5', 'F5', 'G#5'],
            'Bb7': ['Bb4', 'D5', 'F5', 'Ab5'],
            'B7': ['B4', 'D#5', 'F#5', 'A5']
        };

        const notes = chordPatterns[chordName];
        if (!notes) {
            console.warn(`Unknown chord: ${chordName}`);
            return null;
        }

        return {
            name: chordName,
            notes: notes,
            duration: '1n'
        };
    }

    /**
     * Parse Roman numeral chord notation
     */
    parseRomanNumeralChord(chordName) {
        // Enhanced Roman numeral patterns to handle more chord types
        const romanPattern = /^([IVX]+|[ivx]+)([°o]?)(maj7|7|sus4|sus2|\+|b5)?$/i;
        const match = chordName.match(romanPattern);
        
        if (!match) return null;
        
        const romanNumeral = match[1];
        const isDiminished = match[2] !== '';
        const chordModifier = match[3] || '';
        
        // Convert Roman numeral to scale degree (0-based)
        const romanToScale = {
            'I': 0, 'i': 0,
            'II': 1, 'ii': 1,
            'III': 2, 'iii': 2,
            'IV': 3, 'iv': 3,
            'V': 4, 'v': 4,
            'VI': 5, 'vi': 5,
            'VII': 6, 'vii': 6
        };
        
        const scaleDegree = romanToScale[romanNumeral.toUpperCase()];
        if (scaleDegree === undefined) return null;
        
        // Get the root note based on key and scale degree
        const keyIndex = this.noteToIndex[this.key.tonic];
        
        // Scale intervals (major/minor)
        const majorScale = [0, 2, 4, 5, 7, 9, 11];
        const minorScale = [0, 2, 3, 5, 7, 8, 10];
        const scale = this.key.mode === 'major' ? majorScale : minorScale;
        
        const rootIndex = (keyIndex + scale[scaleDegree]) % 12;
        const rootNote = this.indexToNote[rootIndex];
        
        // Determine chord quality from Roman numeral case and key context
        let chordType = '';
        const isUpperCase = romanNumeral === romanNumeral.toUpperCase();
        
        if (isDiminished) {
            chordType = 'dim';
        } else if (chordModifier === '+') {
            chordType = 'aug';
        } else if (chordModifier === 'sus4') {
            chordType = 'sus4';
        } else if (chordModifier === 'sus2') {
            chordType = 'sus2';
        } else {
            // Determine major/minor based on mode and scale degree
            if (this.key.mode === 'major') {
                // In major keys: I, IV, V are major; ii, iii, vi are minor; vii is diminished
                if ([0, 3, 4].includes(scaleDegree)) {
                    chordType = '';  // major
                } else if ([1, 2, 5].includes(scaleDegree)) {
                    chordType = 'm'; // minor
                } else if (scaleDegree === 6) {
                    chordType = 'dim'; // diminished
                }
            } else {
                // In minor keys: i, iv, v are minor; III, VI, VII are major; ii is diminished
                if ([0, 3, 4].includes(scaleDegree)) {
                    chordType = 'm'; // minor
                } else if ([2, 5, 6].includes(scaleDegree)) {
                    chordType = '';  // major
                } else if (scaleDegree === 1) {
                    chordType = 'dim'; // diminished
                }
            }
            
            // Override with explicit case indication when provided
            // Uppercase roman numerals typically indicate major chords
            // Lowercase roman numerals typically indicate minor chords
            if (isUpperCase && !['vii', 'ii'].includes(romanNumeral.toLowerCase()) && chordModifier !== '°' && chordModifier !== 'o') {
                if (chordType === 'm') chordType = ''; // Force major if uppercase
            } else if (!isUpperCase && chordType === '') {
                if (!['III', 'VI', 'VII'].includes(romanNumeral.toUpperCase()) || this.key.mode === 'major') {
                    chordType = 'm'; // Force minor if lowercase
                }
            }
        }
        
        // Handle 7th chords
        if (chordModifier === '7') {
            chordType += '7';
        } else if (chordModifier === 'maj7') {
            chordType = chordType.replace('m', '') + 'maj7';
        } else if (chordModifier === 'b5') {
            if (chordType === 'm') {
                chordType = 'm7b5'; // half-diminished
            } else {
                chordType += 'b5';
            }
        }
        
        // Build the actual chord name
        const actualChordName = rootNote + chordType;
        
        // Parse the actual chord and modify its name to show the Roman numeral
        const chord = this.parseChord(actualChordName);
        if (chord) {
            chord.name = chordName; // Keep the original Roman numeral name
            chord.actualChord = actualChordName; // Store the actual chord name
            chord.isRomanNumeral = true;
        }
        
        console.log(`parseRomanNumeralChord: ${chordName} -> actualChordName: ${actualChordName} -> chord:`, chord);
        return chord;
    }

    /**
     * Display the current chord progression
     */
    displayChords() {
        const display = document.getElementById('chord-display');
        display.innerHTML = '';
        
        // If progression is empty, create some default empty slots
        if (this.chordProgression.length === 0) {
            // Create 4 empty measures (16 slots in 4/4 time) by default
            const defaultSlots = this.timeSignature * 4;
            for (let i = 0; i < defaultSlots; i++) {
                this.chordProgression.push({
                    name: '',
                    notes: [],
                    duration: '1n',
                    isEmpty: true
                });
            }
        }

        // Group chords into measures (4 chords per measure by default)
        const measuresData = this.groupChordsIntoMeasures(this.chordProgression);
        
        measuresData.forEach((measureChords, measureIndex) => {
            const measureElement = document.createElement('div');
            measureElement.className = 'measure';
            measureElement.dataset.measureIndex = measureIndex;
            
            // Add measure number
            const measureNumber = document.createElement('div');
            measureNumber.className = 'measure-number';
            measureNumber.textContent = (measureIndex + 1).toString();
            measureElement.appendChild(measureNumber);
            
            // Add measure delete button
            const measureDeleteBtn = document.createElement('button');
            measureDeleteBtn.className = 'measure-delete';
            measureDeleteBtn.innerHTML = '×';
            measureDeleteBtn.title = 'Delete entire measure';
            measureDeleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                this.deleteMeasure(measureIndex);
                return false;
            });
            measureDeleteBtn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                return false;
            });
            measureElement.appendChild(measureDeleteBtn);
            
            // Check if this measure contains the current chord (only during playback)
            const currentMeasureIndices = this.getMeasureIndices(this.currentChordIndex);
            if (this.isPlaying && currentMeasureIndices && currentMeasureIndices.measureIndex === measureIndex) {
                measureElement.classList.add('current-measure');
            }
            
            // Add chords to this measure
            measureChords.forEach((chord, chordIndex) => {
                const chordElement = document.createElement('div');
                chordElement.className = 'chord-item';
                
                const globalChordIndex = this.getGlobalChordIndex(measureIndex, chordIndex);
                chordElement.dataset.index = globalChordIndex;
                
                if (chord.isEmpty) {
                    // Empty slot for incomplete measures - show as rest
                    chordElement.classList.add('empty-slot');
                    chordElement.innerHTML = '<span class="rest-symbol">𝄽</span>'; // Musical rest symbol
                    chordElement.title = 'Rest (empty beat) - click to select for piano input';
                } else {
                    chordElement.textContent = chord.name;
                    if (chord.isSingleNote) {
                        chordElement.classList.add('single-note');
                    } else if (chord.isCustom) {
                        chordElement.classList.add('custom-chord');
                    }
                    
                    if (chord.edited) {
                        chordElement.classList.add('edited');
                    }
                    
                    // Add chord notes display if enabled
                    if (this.showChordNotes && chord.notes && chord.notes.length > 0) {
                        const notesDiv = document.createElement('div');
                        notesDiv.className = 'chord-notes';
                        notesDiv.textContent = chord.notes.map(note => note.replace(/\d+$/, '')).join('·');
                        chordElement.appendChild(notesDiv);
                    }
                    
                    // Add chord function display if enabled
                    if (this.showChordFunctions) {
                        const functionDiv = document.createElement('div');
                        functionDiv.className = 'chord-function';
                        functionDiv.textContent = chord.name; // Simple display without analysis
                        chordElement.appendChild(functionDiv);
                    }
                }
                
                // Add current chord highlighting
                if (globalChordIndex === this.currentChordIndex) {
                    chordElement.classList.add('current');
                }
                
                // Add selected slot highlighting for piano input
                if (globalChordIndex === this.targetChordIndex) {
                    chordElement.classList.add('selected-for-piano');
                }
                
                chordElement.dataset.index = globalChordIndex;
                
                // Add click handlers for ALL slots (empty and filled)
                chordElement.addEventListener('click', (e) => {
                    // Don't trigger if clicking on edit/delete buttons
                    if (e.target.classList.contains('chord-edit') || e.target.classList.contains('chord-delete')) {
                        return;
                    }
                    
                    // If it's a filled slot, preview the chord
                    if (!chord.isEmpty) {
                        this.previewChord(chord);
                    }
                    
                    // Always allow slot selection for piano input
                    this.selectSlotForPiano(globalChordIndex);
                });
                
                // Add context menu for all slots
                chordElement.addEventListener('contextmenu', (e) => {
                    if (chord.isEmpty) {
                        this.showEmptySlotMenu(e, globalChordIndex);
                    } else {
                        this.showContextMenu(e, globalChordIndex);
                    }
                });
                
                // Add edit and delete buttons only for non-empty slots
                if (!chord.isEmpty) {
                    // Add chord edit button
                    const chordEditBtn = document.createElement('button');
                    chordEditBtn.className = 'chord-edit';
                    chordEditBtn.innerHTML = '🎹';
                    chordEditBtn.title = 'Edit chord with piano';
                    chordEditBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        this.editChordWithPiano(globalChordIndex);
                        return false;
                    });
                    chordEditBtn.addEventListener('mousedown', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        return false;
                    });
                    chordElement.appendChild(chordEditBtn);

                    // Add chord delete button
                    const chordDeleteBtn = document.createElement('button');
                    chordDeleteBtn.className = 'chord-delete';
                    chordDeleteBtn.innerHTML = '×';
                    chordDeleteBtn.title = 'Clear chord (convert to rest)';
                    chordDeleteBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        this.deleteChordAtIndex(globalChordIndex);
                        return false;
                    });
                    chordDeleteBtn.addEventListener('mousedown', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        return false;
                    });
                    chordElement.appendChild(chordDeleteBtn);
                    
                    // Add double-click to edit
                    chordElement.addEventListener('dblclick', () => {
                        this.editChord(globalChordIndex);
                    });
                    
                    // Add drag and drop functionality
                    chordElement.draggable = true;
                    chordElement.addEventListener('dragstart', (e) => {
                        this.handleDragStart(e, chord, globalChordIndex);
                    });
                }
                
                // Add drop functionality to all chord slots (including empty ones)
                chordElement.addEventListener('dragover', (e) => {
                    this.handleDragOver(e);
                });
                
                chordElement.addEventListener('drop', (e) => {
                    this.handleDrop(e, measureIndex, chordIndex);
                });
                
                chordElement.addEventListener('dragenter', (e) => {
                    this.handleDragEnter(e);
                });
                
                chordElement.addEventListener('dragleave', (e) => {
                    this.handleDragLeave(e);
                });
                
                measureElement.appendChild(chordElement);
            });
            
            display.appendChild(measureElement);
        });
        
        // Update progression info
        this.updateProgressionInfo();
        
        // Update slot selection display
        this.updateSelectedSlotDisplay();
    }

    /**
     * Group chords into measures for display
     */
    groupChordsIntoMeasures(chords) {
        const measures = [];
        let currentMeasure = [];
        let chordsInCurrentMeasure = 0;
        const chordsPerMeasure = this.timeSignature; // Use dynamic time signature
        
        for (let i = 0; i < chords.length; i++) {
            const chord = chords[i];
            
            // Add chord to current measure
            currentMeasure.push(chord);
            chordsInCurrentMeasure++;
            
            // Check if we should start a new measure
            if (chordsInCurrentMeasure >= chordsPerMeasure) {
                measures.push([...currentMeasure]);
                currentMeasure = [];
                chordsInCurrentMeasure = 0;
            }
        }
        
        // Add any remaining chords in the last measure
        if (currentMeasure.length > 0) {
            // Fill incomplete measures with empty spaces for visual consistency
            while (currentMeasure.length < chordsPerMeasure) {
                currentMeasure.push({ name: '', notes: [], isEmpty: true });
            }
            measures.push(currentMeasure);
        }
        
        return measures;
    }

    /**
     * Get the global chord index from measure and chord indices
     */
    getGlobalChordIndex(measureIndex, chordIndex) {
        const chordsPerMeasure = this.timeSignature;
        return (measureIndex * chordsPerMeasure) + chordIndex;
    }

    /**
     * Get measure and chord indices from global chord index
     */
    getMeasureIndices(globalIndex) {
        const chordsPerMeasure = this.timeSignature;
        const measureIndex = Math.floor(globalIndex / chordsPerMeasure);
        const chordIndex = globalIndex % chordsPerMeasure;
        return { measureIndex, chordIndex };
    }

    /**
     * Preview a single chord by playing it briefly
     */
    async previewChord(chord) {
        try {
            // Ensure audio context is ready
            await this.ensureAudioInitialized();
            
            // Get frequencies for the chord
            const frequencies = this.getChordFrequencies(chord);
            
            console.log(`Previewing chord: ${chord.name} with ${frequencies.length} notes`);
            console.log(`Frequencies: [${frequencies.join(', ')}]`);
            
            // Play the chord - use triggerAttackRelease with array for proper chord playback
            this.synth.releaseAll();
            
            if (frequencies.length > 0) {
                // Trigger all notes simultaneously as a chord
                this.synth.triggerAttackRelease(frequencies, '2n');
            }
            
            this.showStatus(`Previewing: ${chord.name} (${frequencies.length} notes)`);
        } catch (error) {
            console.error('Error previewing chord:', error);
            this.showStatus('Error previewing chord');
        }
    }

    /**
     * Start playback
     */
    async startPlayback() {
        console.log('=== STARTPLAYBACK CALLED ===');
        console.log('Chord progression length:', this.chordProgression.length);
        
        if (this.chordProgression.length === 0) {
            this.showStatus('No chords to play');
            console.log('No chords to play, returning early');
            return;
        }

        try {
            console.log('Starting playback...');
            console.log('Current AudioContext state:', Tone.context.state);
            
            // Ensure audio context is ready
            await this.ensureAudioInitialized();
            
            this.isPlaying = true;
            this.isPaused = false;
            this.currentChordIndex = 0;
            
            // Update UI
            document.getElementById('play-btn').disabled = true;
            document.getElementById('pause-btn').disabled = false;
            document.getElementById('stop-btn').disabled = false;
            
            // Set tempo
            Tone.Transport.bpm.value = this.tempo;
            
            // Start the main progression
            this.schedulePlayback();
            
            this.showStatus('Playing...');
        } catch (error) {
            console.error('Error starting playback:', error);
            this.showStatus('Error starting playback. Please try again.');
            this.stopPlayback();
        }
    }

    /**
     * Schedule the chord progression playback
     */
    schedulePlayback() {
        // Clear any existing scheduled events
        Tone.Transport.cancel();
        
        // Create a repeating event instead of individual schedules
        const chordDuration = 60 / this.tempo; // Duration of each chord in seconds
        const totalDuration = this.chordProgression.length * chordDuration;
        
        // Schedule the main progression loop
        Tone.Transport.scheduleRepeat((time) => {
            if (!this.isPlaying) return;
            
            const chord = this.chordProgression[this.currentChordIndex];
            if (!chord) return;
            
            this.updateProgressionDisplay();
            
            const frequencies = this.getChordFrequencies(chord);
            this.playChord(frequencies, chord);
            
            // Update status to show what's playing (chord or rest)
            if (chord.isEmpty || frequencies.length === 0) {
                this.showStatus(`Playing rest (beat ${this.currentChordIndex + 1})`);
            } else {
                this.showStatus(`Playing: ${chord.name} (beat ${this.currentChordIndex + 1})`);
            }
            
            // Schedule metronome if enabled
            if (this.metronomeEnabled) {
                this.playMetronome();
            }
            
            // Move to next chord
            this.currentChordIndex++;
            
            // Handle end of progression
            if (this.currentChordIndex >= this.chordProgression.length) {
                if (this.loopMode) {
                    this.currentChordIndex = 0;
                } else {
                    this.stopPlayback();
                }
            }
        }, chordDuration, 0);
        
        Tone.Transport.start();
    }

    /**
     * Update the progression display to highlight current chord
     */
    updateProgressionDisplay() {
        // Clear all current highlighting
        document.querySelectorAll('.chord-item').forEach(item => {
            item.classList.remove('current');
        });
        
        // Highlight current chord
        const currentChordElement = document.querySelector(`.chord-item[data-index="${this.currentChordIndex}"]`);
        if (currentChordElement) {
            currentChordElement.classList.add('current');
        }
        
        // Also refresh the display to ensure highlighting is correct
        this.displayChords();
    }

    /**
     * Get chord frequencies for playback
     */
    getChordFrequencies(chord) {
        // If chord is empty, return empty array (rest)
        if (chord.isEmpty || !chord.notes || chord.notes.length === 0) {
            return [];
        }
        
        const frequencies = [];
        
        chord.notes.forEach(note => {
            let frequency = Tone.Frequency(note).toFrequency();
            frequencies.push(frequency);
        });
        
        return frequencies;
    }

    /**
     * Play a chord with the given frequencies
     */
    playChord(frequencies, chord) {
        // Release all previous notes
        this.synth.releaseAll();
        
        // If no frequencies (rest), don't play anything
        if (frequencies.length === 0) {
            return; // This is a rest - silence
        }
        
        // Play new chord
        if (chord.isDrone) {
            // For drone chords, sustain the notes - trigger all simultaneously
            if (frequencies.length > 1) {
                this.synth.triggerAttack(frequencies);
            } else if (frequencies.length === 1) {
                this.synth.triggerAttack(frequencies[0]);
            }
        } else {
            // For regular chords, play with envelope - trigger all simultaneously
            if (frequencies.length > 1) {
                this.synth.triggerAttackRelease(frequencies, '2n');
            } else if (frequencies.length === 1) {
                this.synth.triggerAttackRelease(frequencies[0], '2n');
            }
        }
    }

    /**
     * Play metronome click
     */
    playMetronome() {
        const isAccented = (this.currentChordIndex % this.timeSignature === 0);
        const note = isAccented ? 'C5' : 'C6';
        
        this.metronome.triggerAttackRelease(note, '16n');
    }

    /**
     * Stop playback
     */
    stopPlayback() {
        this.isPlaying = false;
        this.isPaused = false;
        this.currentChordIndex = 0;
        
        // Stop transport and release all notes
        Tone.Transport.stop();
        Tone.Transport.cancel();
        this.synth.releaseAll();
        
        // Update UI
        document.getElementById('play-btn').disabled = false;
        document.getElementById('pause-btn').disabled = true;
        document.getElementById('stop-btn').disabled = true;
        
        // Clear progression display highlighting
        const progressionItems = document.querySelectorAll('.progression-item');
        progressionItems.forEach(item => {
            item.classList.remove('current-chord');
        });
        
        this.showStatus('Stopped');
    }

    /**
     * Pause playback
     */
    pausePlayback() {
        if (this.isPlaying) {
            this.isPaused = true;
            this.isPlaying = false;
            
            Tone.Transport.pause();
            this.synth.releaseAll();
            
            // Update UI
            document.getElementById('play-btn').disabled = false;
            document.getElementById('pause-btn').disabled = true;
            
            this.showStatus('Paused');
        }
    }

    /**
     * Handle Roman numeral chord selection
     */
    handleRomanNumeralSelection(romanNumeral) {
        try {
            const chord = this.getRomanNumeralChord(romanNumeral);
            if (chord) {
                this.highlightPianoKeys(chord.notes);
                this.updateChordInfo(chord);
                this.previewChord(chord);
            }
        } catch (error) {
            console.error('Error handling Roman numeral selection:', error);
            this.showStatus('Error selecting Roman numeral chord');
        }
    }

    /**
     * Get chord from Roman numeral
     */
    getRomanNumeralChord(romanNumeral) {
        // First try to use the dynamic parsing method for simple roman numerals
        const simpleRomanPattern = /^([IVX]+|[ivx]+)([°o]?)(maj7|7|sus4|sus2|\+)?$/i;
        if (simpleRomanPattern.test(romanNumeral)) {
            const parsedChord = this.parseRomanNumeralChord(romanNumeral);
            if (parsedChord) {
                return parsedChord;
            }
        }
        
        const keyIndex = this.noteToIndex[this.key.tonic];
        const majorScale = [0, 2, 4, 5, 7, 9, 11]; // Major scale intervals
        const minorScale = [0, 2, 3, 5, 7, 8, 10]; // Natural minor scale intervals
        
        const scale = this.key.mode === 'major' ? majorScale : minorScale;
        
        // Enhanced Roman numeral mapping with context-aware chord types
        // Basic triads - quality depends on current mode
        const getBasicTriadQuality = (degree) => {
            if (this.key.mode === 'major') {
                // Major key: I, IV, V are major; ii, iii, vi are minor; vii is diminished
                if ([0, 3, 4].includes(degree)) return 'major';
                if ([1, 2, 5].includes(degree)) return 'minor';
                if (degree === 6) return 'diminished';
            } else {
                // Minor key: i, iv, v are minor; III, VI, VII are major; ii is diminished
                if ([0, 3, 4].includes(degree)) return 'minor';
                if ([2, 5, 6].includes(degree)) return 'major';
                if (degree === 1) return 'diminished';
            }
            return 'major'; // fallback
        };
        
        const romanNumeralMap = {
            // Basic triads - dynamically determined by mode
            'I': { degree: 0, quality: getBasicTriadQuality(0) },
            'ii': { degree: 1, quality: getBasicTriadQuality(1) },
            'iii': { degree: 2, quality: getBasicTriadQuality(2) },
            'IV': { degree: 3, quality: getBasicTriadQuality(3) },
            'V': { degree: 4, quality: getBasicTriadQuality(4) },
            'vi': { degree: 5, quality: getBasicTriadQuality(5) },
            'vii°': { degree: 6, quality: 'diminished' },
            
            // Minor key versions
            'i': { degree: 0, quality: getBasicTriadQuality(0) },
            'ii°': { degree: 1, quality: getBasicTriadQuality(1) },
            'III': { degree: 2, quality: getBasicTriadQuality(2) },
            'iv': { degree: 3, quality: getBasicTriadQuality(3) },
            'v': { degree: 4, quality: getBasicTriadQuality(4) },
            'VI': { degree: 5, quality: getBasicTriadQuality(5) },
            'VII': { degree: 6, quality: getBasicTriadQuality(6) },
            
            // Suspended chords
            'Isus4': { degree: 0, quality: 'sus4' },
            'Vsus4': { degree: 4, quality: 'sus4' },
            'IVsus2': { degree: 3, quality: 'sus2' },
            
            // 7th chords - context-aware
            'Imaj7': { degree: 0, quality: this.key.mode === 'major' ? 'major7' : 'minor7' },
            'IVmaj7': { degree: 3, quality: this.key.mode === 'major' ? 'major7' : 'minor7' },
            'iim7': { degree: 1, quality: this.key.mode === 'major' ? 'minor7' : 'half-diminished7' },
            'iiim7': { degree: 2, quality: this.key.mode === 'major' ? 'minor7' : 'major7' },
            'vim7': { degree: 5, quality: this.key.mode === 'major' ? 'minor7' : 'major7' },
            'V7': { degree: 4, quality: 'dominant7' },
            
            // Minor key 7th chords (explicit)
            'imaj7': { degree: 0, quality: 'minor7' },
            'ivmaj7': { degree: 3, quality: 'minor7' },
            'IIImaj7': { degree: 2, quality: 'major7' },
            'VImaj7': { degree: 5, quality: 'major7' },
            'iim7b5': { degree: 1, quality: 'half-diminished7' },
            
            // Half-diminished 7th
            'viim7b5': { degree: 6, quality: 'half-diminished7' },
            
            // Fully diminished 7th
            'viio7': { degree: 6, quality: 'fully-diminished7' },
            'iio7': { degree: 1, quality: 'fully-diminished7' },
            
            // Augmented
            'III+': { degree: 2, quality: 'augmented' },
            'V+': { degree: 4, quality: 'augmented' },
            
            // Borrowed chords (flat chords)
            'bVII': { degree: 6, quality: 'major', flat: true },
            'bVI': { degree: 5, quality: 'major', flat: true },
            'bII': { degree: 1, quality: 'major', flat: true },
            
            // Secondary dominants
            'V7/V': { target: 4, quality: 'secondary-dominant' },
            'V7/vi': { target: 5, quality: 'secondary-dominant' },
            'V7/IV': { target: 3, quality: 'secondary-dominant' },
            'V7/ii': { target: 1, quality: 'secondary-dominant' },
            'V7/iii': { target: 2, quality: 'secondary-dominant' }
        };
        
        if (!(romanNumeral in romanNumeralMap)) {
            return null;
        }
        
        const chordInfo = romanNumeralMap[romanNumeral];
        
        // Handle secondary dominants
        if (chordInfo.quality === 'secondary-dominant') {
            return this.buildSecondaryDominant(chordInfo.target, romanNumeral);
        }
        
        // Handle regular chords
        let degree = chordInfo.degree;
        let rootIndex;
        
        if (chordInfo.flat) {
            // For borrowed chords, lower the degree by a semitone
            rootIndex = (keyIndex + scale[degree] - 1 + 12) % 12;
        } else {
            rootIndex = (keyIndex + scale[degree]) % 12;
        }
        
        const result = this.buildChordFromRoot(rootIndex, chordInfo.quality, romanNumeral);
        console.log(`getRomanNumeralChord: ${romanNumeral} -> `, result);
        return result;
    }
    
    /**
     * Build a secondary dominant chord
     */
    buildSecondaryDominant(targetDegree, romanNumeral) {
        const keyIndex = this.noteToIndex[this.key.tonic];
        const majorScale = [0, 2, 4, 5, 7, 9, 11];
        const minorScale = [0, 2, 3, 5, 7, 8, 10];
        const scale = this.key.mode === 'major' ? majorScale : minorScale;
        
        // Get the target chord's root
        const targetRootIndex = (keyIndex + scale[targetDegree]) % 12;
        
        // Build dominant 7th chord a fifth above the target
        const dominantRootIndex = (targetRootIndex + 7) % 12;
        
        return this.buildChordFromRoot(dominantRootIndex, 'dominant7', romanNumeral);
    }
    
    /**
     * Build a chord from a root note and quality
     */
    buildChordFromRoot(rootIndex, quality, displayName) {
        const rootNote = this.indexToNote[rootIndex] + '4';
        let notes = [rootNote];
        
        switch (quality) {
            case 'major':
                notes = [
                    rootNote,
                    this.indexToNote[(rootIndex + 4) % 12] + '4',
                    this.indexToNote[(rootIndex + 7) % 12] + '4'
                ];
                break;
                
            case 'minor':
                notes = [
                    rootNote,
                    getNoteWithOctave(3),  // Minor third
                    rootNote,
                    this.indexToNote[(rootIndex + 3) % 12] + '4',
                    this.indexToNote[(rootIndex + 7) % 12] + '4'
                ];
                break;
                
            case 'diminished':
                notes = [
                    rootNote,
                    this.indexToNote[(rootIndex + 3) % 12] + '4',
                    this.indexToNote[(rootIndex + 6) % 12] + '4'
                ];
                break;
                
            case 'augmented':
                notes = [
                    rootNote,
                    this.indexToNote[(rootIndex + 4) % 12] + '4',
                    this.indexToNote[(rootIndex + 8) % 12] + '4'
                ];
                break;
                
            case 'sus4':
                notes = [
                    rootNote,
                    this.indexToNote[(rootIndex + 5) % 12] + '4',
                    this.indexToNote[(rootIndex + 7) % 12] + '4'
                ];
                break;
                
            case 'sus2':
                notes = [
                    rootNote,
                    this.indexToNote[(rootIndex + 2) % 12] + '4',
                    this.indexToNote[(rootIndex + 7) % 12] + '4'
                ];
                break;
                
            case 'major7':
                notes = [
                    rootNote,
                    this.indexToNote[(rootIndex + 4) % 12] + '4',
                    this.indexToNote[(rootIndex + 7) % 12] + '4',
                    this.indexToNote[(rootIndex + 11) % 12] + '4'
                ];
                break;
                
            case 'minor7':
                notes = [
                    rootNote,
                    this.indexToNote[(rootIndex + 3) % 12] + '4',
                    this.indexToNote[(rootIndex + 7) % 12] + '4',
                    this.indexToNote[(rootIndex + 10) % 12] + '4'
                ];
                break;
                
            case 'dominant7':
                notes = [
                    rootNote,
                    this.indexToNote[(rootIndex + 4) % 12] + '4',
                    this.indexToNote[(rootIndex + 7) % 12] + '4',
                    this.indexToNote[(rootIndex + 10) % 12] + '4'
                ];
                break;
                
            case 'half-diminished7':
                notes = [
                    rootNote,
                    this.indexToNote[(rootIndex + 3) % 12] + '4',
                    this.indexToNote[(rootIndex + 6) % 12] + '4',
                    this.indexToNote[(rootIndex + 10) % 12] + '4'
                ];
                break;
                
            case 'fully-diminished7':
                notes = [
                    rootNote,
                    this.indexToNote[(rootIndex + 3) % 12] + '4',
                    this.indexToNote[(rootIndex + 6) % 12] + '4',
                    this.indexToNote[(rootIndex + 9) % 12] + '4'
                ];
                break;
        }
        
        // Add safety check for single note issue
        if (notes.length === 1) {
            console.warn(`buildChordFromRoot: Only single note for quality '${quality}' - this indicates a problem!`);
            console.warn(`Available qualities should include: major, minor, diminished, augmented, sus4, sus2, major7, minor7, dominant7, half-diminished7, fully-diminished7`);
        }
        
        const result = {
            name: displayName,
            notes: notes,
            duration: '1n',
            isRomanNumeral: true,
            chordQuality: quality
        };
        
        console.log(`buildChordFromRoot: ${displayName} (${quality}) -> `, result);
        return result;
    }

    /**
     * Highlight piano keys for a chord
     */
    highlightPianoKeys(notes) {
        // Clear previous highlights
        const keys = document.querySelectorAll('.key');
        keys.forEach(key => {
            key.classList.remove('highlighted');
        });
        
        // Highlight new notes
        notes.forEach(note => {
            const key = document.querySelector(`.key[data-note="${note}"]`);
            if (key) {
                key.classList.add('highlighted');
            }
        });
    }    
    
    /**
     * Update chord info display
     */
    updateChordInfo(chord) {
        const chordInfo = document.getElementById('roman-chord-display');
        if (chordInfo && chord) {
            let description = `${chord.name}: ${chord.notes.join(', ')}`;
            
            // Add chord quality information
            if (chord.chordQuality) {
                const qualityDescriptions = {
                    'major': 'Major triad',
                    'minor': 'Minor triad',
                    'diminished': 'Diminished triad',
                    'augmented': 'Augmented triad',
                    'sus4': 'Suspended 4th',
                    'sus2': 'Suspended 2nd',
                    'major7': 'Major 7th chord',
                    'minor7': 'Minor 7th chord',
                    'dominant7': 'Dominant 7th chord',
                    'half-diminished7': 'Half-diminished 7th',
                    'fully-diminished7': 'Fully diminished 7th',
                    'secondary-dominant': 'Secondary dominant'
                };
                
                const qualityDesc = qualityDescriptions[chord.chordQuality] || chord.chordQuality;
                description += ` (${qualityDesc})`;
            }
            
            chordInfo.innerHTML = description;
        }
    }

    /**
     * Toggle a note on the piano keyboard
     */
    async toggleNote(note, keyElement) {
        try {
            await this.ensureAudioInitialized();
            
            if (this.selectedNotes.includes(note)) {
                // Remove note (no sound)
                this.selectedNotes = this.selectedNotes.filter(n => n !== note);
                keyElement.classList.remove('active');
            } else {
                // Add note (with sound)
                this.selectedNotes.push(note);
                keyElement.classList.add('active');
                
                // Play the note only when selecting
                this.playNote(note);
            }
            
            // Update display
            this.updateSelectedNotesDisplay();
            
        } catch (error) {
            console.error('Error toggling note:', error);
            this.showStatus('Error toggling note');
        }
    }

    /**
     * Play a single note
     */
    playNote(note) {
        try {
            const frequency = Tone.Frequency(note).toFrequency();
            this.synth.triggerAttackRelease(frequency, '4n');
        } catch (error) {
            console.error('Error playing note:', error);
        }
    }

    /**
     * Play selected notes as a chord
     */
    async playSelectedNotes() {
        try {
            await this.ensureAudioInitialized();
            
            if (this.selectedNotes.length === 0) {
                this.showStatus('No notes selected');
                return;
            }
            
            // Get frequencies for selected notes
            const frequencies = this.selectedNotes.map(note => 
                Tone.Frequency(note).toFrequency()
            );
            
            // Play chord
            this.synth.releaseAll();
            frequencies.forEach(freq => {
                this.synth.triggerAttackRelease(freq, '2n');
            });
            
            this.showStatus(`Playing: ${this.selectedNotes.join(', ')}`);
            
        } catch (error) {
            console.error('Error playing selected notes:', error);
            this.showStatus('Error playing selected notes');
        }
    }

    /**
     * Clear selected notes
     */
    clearSelection() {
        this.selectedNotes = [];
        
        // Remove active class from all keys
        document.querySelectorAll('.key').forEach(key => {
            key.classList.remove('active');
        });
        
        // Update display
        this.updateSelectedNotesDisplay();
        
        this.showStatus('Selection cleared');
    }

    /**
     * Update the selected notes display
     */
    updateSelectedNotesDisplay() {
        const display = document.getElementById('selected-notes');
        if (!display) return;
        
        display.innerHTML = '';
        
        if (this.selectedNotes.length === 0) {
            display.innerHTML = '<span class="placeholder">No notes selected</span>';
            return;
        }
        
        this.selectedNotes.forEach(note => {
            // note is canonical like C#4 or D4; derive pitch class and octave
            const octaveMatch = note.match(/(\d+)$/);
            const octave = octaveMatch ? octaveMatch[1] : '4';
            const pitchClass = note.replace(/[0-9]/g, '');

            // If we have a chromaticMapping, use the displayed theoretical name for pitch class
            const displayPitch = (this.chromaticMapping && this.chromaticMapping[pitchClass]) ? this.chromaticMapping[pitchClass] : pitchClass;
            const displayName = `${displayPitch}${octave}`;

            const noteElement = document.createElement('span');
            noteElement.className = 'selected-note';
            noteElement.textContent = displayName;
            display.appendChild(noteElement);
        });
    }

    /**
     * Add selected notes to progression
     */
    addSelectionToProgression() {
        if (this.selectedNotes.length === 0) {
            this.showStatus('No notes selected to add');
            return;
        }
        
        // Create chord object
        const chord = {
            name: this.selectedNotes.join('-'),
            notes: [...this.selectedNotes],
            duration: '1n',
            isDrone: false
        };
        
        // Add to progression
        if (this.targetChordIndex !== null) {
            this.chordProgression[this.targetChordIndex] = chord;
            
            // Auto-select next slot
            const nextSlotIndex = this.targetChordIndex + 1;
            
            // Ensure next slot exists (extend progression if needed)
            while (this.chordProgression.length <= nextSlotIndex) {
                this.chordProgression.push({
                    name: '',
                    notes: [],
                    duration: '1n',
                    isEmpty: true
                });
            }
            
            // If next slot is empty, select it; otherwise find next empty slot
            if (this.chordProgression[nextSlotIndex].isEmpty || this.chordProgression[nextSlotIndex].name === '') {
                this.targetChordIndex = nextSlotIndex;
            } else {
                // Find next empty slot
                let foundEmpty = false;
                for (let i = nextSlotIndex; i < this.chordProgression.length; i++) {
                    if (this.chordProgression[i].isEmpty || this.chordProgression[i].name === '') {
                        this.targetChordIndex = i;
                        foundEmpty = true;
                        break;
                    }
                }
                if (!foundEmpty) {
                    // Create new empty slot
                    this.chordProgression.push({
                        name: '',
                        notes: [],
                        duration: '1n',
                        isEmpty: true
                    });
                    this.targetChordIndex = this.chordProgression.length - 1;
                }
            }
        } else {
            this.chordProgression.push(chord);
            // No auto-selection when adding to end
        }
        
        // Update display
        this.displayChords();
        this.updateSelectedSlotDisplay();
        
        this.showStatus(`Added chord: ${chord.name}`);
    }

    /**
     * Clear slot selection
     */
    clearSlotSelection() {
        this.targetChordIndex = null;
        this.updateSelectedSlotDisplay();
        this.showStatus('Slot selection cleared');
    }

    /**
     * Update selected slot display
     */
    updateSelectedSlotDisplay() {
        const display = document.getElementById('slot-info-text');
        if (!display) return;
        
        if (this.targetChordIndex !== null) {
            display.textContent = `Selected slot: ${this.targetChordIndex + 1}`;
            // Show the slot selection display
            const slotDisplay = document.getElementById('selected-slot-display');
            if (slotDisplay) {
                slotDisplay.style.display = 'block';
            }
        } else {
            display.textContent = 'No slot selected';
            // Hide the slot selection display
            const slotDisplay = document.getElementById('selected-slot-display');
            if (slotDisplay) {
                slotDisplay.style.display = 'none';
            }
        }
    }

    /**
     * Show status message to the user
     */
    showStatus(message) {
        const statusDisplay = document.getElementById('status-display');
        if (statusDisplay) {
            statusDisplay.textContent = message;
        }
        console.log('Status:', message);
    }

    /**
     * Update note name preferences (sharp vs flat) based on current key
     */
    updateNoteNames() {
        const sharpKeys = ['C','G','D','A','E','B','F#','C#'];
        this.indexToNote = sharpKeys.includes(this.key.tonic) ? this.SHARP_NOTES : this.FLAT_NOTES;
    }

    /**
     * Convert volume (0-1) to decibels for Tone.js
     */
    volumeToDb(volume) {
        if (volume <= 0) return -Infinity;
        return 20 * Math.log10(volume);
    }

    /**
     * Update piano keyboard note labels and highlighting based on current key signature
     */
    updateKeyboardForKey() {
        console.log('updateKeyboardForKey called - Key:', this.key.tonic, this.key.mode);
        
        // Get the scale notes for this key using the exact tonic name
        const scaleNotes = KEY_NOTE_SPELLINGS[this.key.mode] && KEY_NOTE_SPELLINGS[this.key.mode][this.key.tonic];
        if (!scaleNotes) {
            console.log('No scale notes found for key:', this.key.tonic, this.key.mode);
            return;
        }
        
        console.log('Scale notes for', this.key.tonic, this.key.mode, ':', scaleNotes);
        
        // Get the tonic index (chromatic position)
        const keyIndex = this.noteToIndex[this.key.tonic];
        if (keyIndex === undefined) {
            console.log('Could not find tonic index for:', this.key.tonic);
            return;
        }
        
        // Create mapping from chromatic piano key names to scale note names
        const majorScale = [0, 2, 4, 5, 7, 9, 11];
        const minorScale = [0, 2, 3, 5, 7, 8, 10];
        const scaleIntervals = this.key.mode === 'major' ? majorScale : minorScale;
        
        // Build the chromatic mapping
        const chromaticMapping = {};
        
        // Function to normalize note names for piano key matching
        const normalizeNoteName = (noteName) => {
            if (!noteName || typeof noteName !== 'string') return noteName;
            // Normalize unicode accidentals to ascii for matching
            const clean = noteName.replace(/♯/g, '#').replace(/♭/g, 'b');

            // Single-accidental enharmonic equivalents
            const singleMap = {
                'E#': 'F', 'B#': 'C',
                'Cb': 'B', 'Fb': 'E'
            };

            // Double accidentals
            const doubleSharpMap = {
                'C##': 'D', 'D##': 'E', 'E##': 'F#', 'F##': 'G', 'G##': 'A', 'A##': 'B', 'B##': 'C#'
            };
            const doubleFlatMap = {
                'Cbb': 'Bb', 'Dbb': 'C', 'Ebb': 'D', 'Fbb': 'Eb', 'Gbb': 'F', 'Abb': 'G', 'Bbb': 'A'
            };

            if (singleMap[clean]) return singleMap[clean];
            if (doubleSharpMap[clean]) return doubleSharpMap[clean];
            if (doubleFlatMap[clean]) return doubleFlatMap[clean];

            // If it's already a normal pitch name (C, C#, Db, etc.), return ASCII-cleaned name
            return clean;
        };
        
        // Map scale tones to their proper names using the exact scale notes from KEY_NOTE_SPELLINGS
        // For each scale note, find which piano key it should appear on
        scaleNotes.forEach(scaleNoteName => {
            const normalizedName = normalizeNoteName(scaleNoteName);
            console.log('Scale note normalization:', scaleNoteName, '->', normalizedName);
            
            // Find which piano key this scale note should appear on
            // The normalized name tells us the physical key, but we display the original scale note name
            for (let i = 0; i < 12; i++) {
                const sharpName = this.SHARP_NOTES[i];
                const flatName = this.FLAT_NOTES[i];
                
                // If this chromatic position matches the normalized scale note
                if (sharpName === normalizedName || flatName === normalizedName) {
                    chromaticMapping[sharpName] = scaleNoteName;
                    chromaticMapping[flatName] = scaleNoteName;
                    console.log('  Mapped chromatic slot', sharpName, '/', flatName, 'to', scaleNoteName);
                    break;
                }
            }
        });
        
        // For non-scale tones, determine the best enharmonic spelling
        for (let i = 0; i < 12; i++) {
            const sharpName = this.SHARP_NOTES[i];
            const flatName = this.FLAT_NOTES[i];
            
            if (!chromaticMapping[sharpName]) {
                // Choose appropriate enharmonic based on key signature preference
                const usesFlats = scaleNotes.some(note => note.includes('b'));
                chromaticMapping[sharpName] = usesFlats ? flatName : sharpName;
            }
            
            if (!chromaticMapping[flatName] && flatName !== sharpName) {
                chromaticMapping[flatName] = chromaticMapping[sharpName];
            }
        }
        
        console.log('Chromatic mapping:', chromaticMapping);
        try {
            console.log('Chromatic mapping (JSON):', JSON.stringify(chromaticMapping));
        } catch (e) {
            console.log('Chromatic mapping stringify failed:', e);
        }
        console.log('Chromatic mapping entries:');
        Object.keys(chromaticMapping).forEach(k => console.log(k, '->', chromaticMapping[k]));
        console.log('Scale notes (for highlighting):', scaleNotes);
        console.log('Normalized scale notes for highlighting:', scaleNotes.map(normalizeNoteName));

        // Additional runtime info to help debugging
        try {
            console.log('indexToNote array:', this.indexToNote);
        } catch (e) {
            console.log('indexToNote unavailable:', e);
        }
        try {
            console.log('noteToIndex[tonic]:', this.key && this.key.tonic ? this.noteToIndex[this.key.tonic] : undefined);
        } catch (e) {
            console.log('noteToIndex lookup failed:', e);
        }

    // Expose a small helper to dump keyboard state from the page console
        try {
            window._dumpKeyboardState = () => {
                const normalizedScale = scaleNotes.map(normalizeNoteName);
                const keys = Array.from(document.querySelectorAll('.key')).map(k => ({
                    dataNote: k.dataset.note,
                    pitchClass: (k.dataset.note || '').replace(/[0-9]/g, ''),
                    label: k.textContent,
                    inKey: k.classList.contains('in-key')
                }));
                return {
                    currentKey: this.key,
                    chromaticMapping,
                    scaleNotes,
                    normalizedScale,
                    keys
                };
            };
            console.log('Helper: window._dumpKeyboardState() available — call it to get a JSON-friendly dump of mapping and key labels.');
        } catch (e) {
            console.log('Could not install _dumpKeyboardState helper:', e);
        }
    // Persist mapping for other handlers
    this.chromaticMapping = chromaticMapping;
        
        // Update each piano key
        document.querySelectorAll('.key').forEach(keyEl => {
            const originalPitchClass = keyEl.dataset.note.replace(/[0-9]/g, '');
            
            // Get the proper label for this key
            const newLabel = chromaticMapping[originalPitchClass] || originalPitchClass;
            keyEl.textContent = newLabel;
            
            // For highlighting, we need to check if the normalized version of the displayed label
            // matches any of the normalized scale notes
            const normalizedDisplayLabel = normalizeNoteName(newLabel);
            const normalizedScaleNotes = scaleNotes.map(normalizeNoteName);
            
            if (normalizedScaleNotes.includes(normalizedDisplayLabel)) {
                keyEl.classList.add('in-key');
            } else {
                keyEl.classList.remove('in-key');
            }
        });
        
        console.log('Updated keyboard labels and highlighting');
    }

    /**
     * Update Roman numeral buttons based on current key
     */
    updateRomanNumeralButtons() {
        // Define the standard button mappings (what they should be for each mode)
        const triadMappings = {
            major: [
                { roman: 'I', title: 'Tonic major triad' },
                { roman: 'ii', title: 'Supertonic minor triad' },
                { roman: 'iii', title: 'Mediant minor triad' },
                { roman: 'IV', title: 'Subdominant major triad' },
                { roman: 'V', title: 'Dominant major triad' },
                { roman: 'vi', title: 'Submediant minor triad' },
                { roman: 'vii°', title: 'Leading tone diminished triad' }
            ],
            minor: [
                { roman: 'i', title: 'Tonic minor triad' },
                { roman: 'ii°', title: 'Supertonic diminished triad' },
                { roman: 'III', title: 'Mediant major triad' },
                { roman: 'iv', title: 'Subdominant minor triad' },
                { roman: 'v', title: 'Dominant minor triad' },
                { roman: 'VI', title: 'Submediant major triad' },
                { roman: 'VII', title: 'Subtonic major triad' }
            ]
        };
        
        // Update basic triad buttons
        const triadButtons = document.querySelectorAll('.chord-group[data-group="triads"] .category-label:first-of-type + .roman-numeral-buttons .roman-chord-btn');
        const currentMappings = triadMappings[this.key.mode];
        
        triadButtons.forEach((button, index) => {
            if (index < currentMappings.length) {
                const mapping = currentMappings[index];
                button.setAttribute('data-roman', mapping.roman);
                button.textContent = mapping.roman;
                button.setAttribute('title', mapping.title);
            }
        });
        
        // Update 7th chord buttons
        const seventhMappings = {
            major: {
                'Imaj7': { roman: 'Imaj7', title: 'Tonic major 7th' },
                'IVmaj7': { roman: 'IVmaj7', title: 'Subdominant major 7th' },
                'iim7': { roman: 'iim7', title: 'Supertonic minor 7th' },
                'iiim7': { roman: 'iiim7', title: 'Mediant minor 7th' },
                'vim7': { roman: 'vim7', title: 'Submediant minor 7th' },
                'V7': { roman: 'V7', title: 'Dominant 7th chord' }
            },
            minor: {
                'Imaj7': { roman: 'imaj7', title: 'Tonic minor major 7th' },
                'IVmaj7': { roman: 'ivmaj7', title: 'Subdominant minor major 7th' },
                'iim7': { roman: 'iim7b5', title: 'Supertonic half-diminished 7th' },
                'iiim7': { roman: 'IIImaj7', title: 'Mediant major 7th' },
                'vim7': { roman: 'VImaj7', title: 'Submediant major 7th' },
                'V7': { roman: 'V7', title: 'Dominant 7th chord' }
            }
        };
        
        const seventhButtons = document.querySelectorAll('.chord-group[data-group="sevenths"] .roman-chord-btn');
        const currentSeventhMappings = seventhMappings[this.key.mode];
        
        seventhButtons.forEach(button => {
            // Get the button's current roman numeral or use its original data attribute
            let currentRoman = button.getAttribute('data-roman');
            
            // We need to find the original mapping key for this button
            // First check if it's already a key in the current mode mappings
            if (currentSeventhMappings[currentRoman]) {
                const mapping = currentSeventhMappings[currentRoman];
                button.setAttribute('data-roman', mapping.roman);
                button.textContent = mapping.roman;
                button.setAttribute('title', mapping.title);
            } else {
                // Try to find it in the opposite mode's mappings (reverse lookup)
                const oppositeMappings = seventhMappings[this.key.mode === 'major' ? 'minor' : 'major'];
                let originalKey = null;
                
                // Find which original key produces this current roman numeral
                for (const [key, mapping] of Object.entries(oppositeMappings)) {
                    if (mapping.roman === currentRoman) {
                        originalKey = key;
                        break;
                    }
                }
                
                // If we found the original key, apply the current mode's mapping
                if (originalKey && currentSeventhMappings[originalKey]) {
                    const mapping = currentSeventhMappings[originalKey];
                    button.setAttribute('data-roman', mapping.roman);
                    button.textContent = mapping.roman;
                    button.setAttribute('title', mapping.title);
                }
            }
        });
        
        // Clear any previous selection
        document.querySelectorAll('.roman-chord-btn').forEach(btn => btn.classList.remove('selected'));
        
        console.log(`Roman numeral buttons updated for key: ${this.key.tonic} ${this.key.mode}`);
    }

    /**
     * Select a Roman numeral chord
     */
    async selectRomanChord(romanNumeral) {
        try {
            const chord = this.getRomanNumeralChord(romanNumeral);
            if (chord) {
                this.highlightPianoKeys(chord.notes);
                this.updateChordInfo(chord);
                await this.previewChord(chord);
                
                // Update the selected Roman numeral button
                this.updateSelectedRomanNumeral(romanNumeral);
                
                // If a slot is selected, add the chord to the progression
                if (this.targetChordIndex !== null) {
                    this.addRomanChordToProgression(chord);
                } else {
                    this.showStatus(`Selected ${romanNumeral} chord - Select a slot to add it to progression`);
                }
            } else {
                this.showStatus(`Unknown Roman numeral: ${romanNumeral}`);
            }
        } catch (error) {
            console.error('Error selecting Roman chord:', error);
            this.showStatus('Error selecting Roman numeral chord');
        }
    }

    /**
     * Add a Roman numeral chord to the progression
     */
    addRomanChordToProgression(chord) {
        if (this.targetChordIndex !== null) {
            // Ensure the slot exists
            while (this.chordProgression.length <= this.targetChordIndex) {
                this.chordProgression.push({
                    name: '',
                    notes: [],
                    duration: '1n',
                    isEmpty: true
                });
            }
            
            // Add the chord
            this.chordProgression[this.targetChordIndex] = chord;
            
            // Auto-select next slot
            const nextSlotIndex = this.targetChordIndex + 1;
            
            // Ensure next slot exists (extend progression if needed)
            while (this.chordProgression.length <= nextSlotIndex) {
                this.chordProgression.push({
                    name: '',
                    notes: [],
                    duration: '1n',
                    isEmpty: true
                });
            }
            
            // If next slot is empty, select it; otherwise find next empty slot
            if (this.chordProgression[nextSlotIndex].isEmpty || this.chordProgression[nextSlotIndex].name === '') {
                this.targetChordIndex = nextSlotIndex;
            } else {
                // Find next empty slot
                let foundEmpty = false;
                for (let i = nextSlotIndex; i < this.chordProgression.length; i++) {
                    if (this.chordProgression[i].isEmpty || this.chordProgression[i].name === '') {
                        this.targetChordIndex = i;
                        foundEmpty = true;
                        break;
                    }
                }
                if (!foundEmpty) {
                    // Create new empty slot
                    this.chordProgression.push({
                        name: '',
                        notes: [],
                        duration: '1n',
                        isEmpty: true
                    });
                    this.targetChordIndex = this.chordProgression.length - 1;
                }
            }
            
            // Update display
            this.displayChords();
            this.updateSelectedSlotDisplay();
            
            this.showStatus(`Added ${chord.name} chord to progression (slot ${this.targetChordIndex})`);
        } else {
            this.chordProgression.push(chord);
            this.displayChords();
            this.showStatus(`Added ${chord.name} chord to end of progression`);
        }
    }

    /**
     * Update the selected Roman numeral button visual state
     */
    updateSelectedRomanNumeral(romanNumeral) {
        // Clear previous selection
        document.querySelectorAll('.roman-chord-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Highlight the selected button
        const selectedBtn = document.querySelector(`.roman-chord-btn[data-roman="${romanNumeral}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('selected');
        }
    }

    /**
     * Hide context menu
     */
    hideContextMenu() {
        const contextMenu = document.getElementById('context-menu');
        if (contextMenu) {
            contextMenu.style.display = 'none';
        }
    }

    /**
     * Update progression info display
     */
    updateProgressionInfo() {
        const info = document.getElementById('progression-info');
        if (info) {
            const chordCount = this.chordProgression.length;
            const duration = Math.ceil(chordCount * (60 / this.tempo));
            info.textContent = `${chordCount} chords, ~${duration}s duration`;
        }
    }

    /**
     * Show context menu for chord items
     */
    showContextMenu(e, chordIndex) {
        e.preventDefault();
        this.contextChordIndex = chordIndex;
        
        const contextMenu = document.getElementById('context-menu');
        if (contextMenu) {
            contextMenu.style.display = 'block';
            contextMenu.style.left = e.pageX + 'px';
            contextMenu.style.top = e.pageY + 'px';
        }
    }

    /**
     * Show empty slot menu
     */
    showEmptySlotMenu(e, slotIndex) {
        e.preventDefault();
        this.contextChordIndex = slotIndex;
        this.showContextMenu(e, slotIndex);
    }

    /**
     * Select slot for piano input
     */
    selectSlotForPiano(slotIndex) {
        this.targetChordIndex = slotIndex;
        this.updateSelectedSlotDisplay();
        this.displayChords(); // Refresh display to show visual selection
        this.showStatus(`Selected slot ${slotIndex + 1} for piano input`);
    }

    /**
     * Edit chord at index
     */
    editChord(chordIndex) {
        this.editingChordIndex = chordIndex;
        // Open edit modal (if it exists)
        const modal = document.getElementById('chord-edit-modal');
        if (modal) {
            modal.style.display = 'block';
        }
    }

    /**
     * Close edit modal
     */
    closeEditModal() {
        const modal = document.getElementById('chord-edit-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.editingChordIndex = null;
    }

    /**
     * Save chord edit
     */
    saveChordEdit() {
        // Implementation depends on modal structure
        this.closeEditModal();
        this.displayChords();
    }

    /**
     * Delete chord
     */
    deleteChord() {
        if (this.editingChordIndex !== null) {
            this.deleteChordAtIndex(this.editingChordIndex);
            this.closeEditModal();
        }
    }

    /**
     * Delete chord at specific index - converts chord to rest
     */
    deleteChordAtIndex(index) {
        if (index >= 0 && index < this.chordProgression.length) {
            // Convert chord to empty rest instead of removing it
            this.chordProgression[index] = {
                name: '',
                notes: [],
                duration: '1n',
                isEmpty: true
            };
            this.displayChords();
            this.showStatus(`Cleared chord at position ${index + 1} (converted to rest)`);
        }
    }

    /**
     * Duplicate chord
     */
    duplicateChord(chordIndex) {
        if (chordIndex >= 0 && chordIndex < this.chordProgression.length) {
            const chord = { ...this.chordProgression[chordIndex] };
            this.chordProgression.splice(chordIndex + 1, 0, chord);
            this.displayChords();
            this.showStatus(`Duplicated chord at position ${chordIndex + 1}`);
        }
    }

    /**
     * Show chord substitutions
     */
    showChordSubstitutions(chordIndex) {
        // Placeholder for chord substitution functionality
        this.showStatus('Chord substitutions not implemented yet');
    }

    /**
     * Insert empty chord
     */
    insertEmptyChord(index) {
        const emptyChord = {
            name: '',
            notes: [],
            duration: '1n',
            isEmpty: true
        };
        this.chordProgression.splice(index, 0, emptyChord);
        this.displayChords();
        this.showStatus(`Inserted empty chord at position ${index + 1}`);
    }

    /**
     * Delete measure
     */
    deleteMeasure(measureIndex) {
        const chordsPerMeasure = this.timeSignature;
        const startIndex = measureIndex * chordsPerMeasure;
        const endIndex = startIndex + chordsPerMeasure;
        
        this.chordProgression.splice(startIndex, chordsPerMeasure);
        this.displayChords();
        this.showStatus(`Deleted measure ${measureIndex + 1}`);
    }

    /**
     * Clear progression
     */
    clearProgression() {
        this.chordProgression = [];
        this.displayChords();
        this.showStatus('Progression cleared');
    }

    /**
     * Create empty measures
     */
    createEmptyMeasures() {
        const numMeasures = parseInt(prompt('How many measures to create?', '4'));
        if (numMeasures && numMeasures > 0) {
            for (let i = 0; i < numMeasures * this.timeSignature; i++) {
                this.chordProgression.push({
                    name: '',
                    notes: [],
                    duration: '1n',
                    isEmpty: true
                });
            }
            this.displayChords();
            this.showStatus(`Created ${numMeasures} empty measures`);
        }
    }

    /**
     * Transpose progression
     */
    transposeProgression(semitones) {
        if (!this.hasAccess()) {
            this.showTrialExpiredModal();
            return;
        }
        // Placeholder for transposition functionality
        this.showStatus(`Transposing by ${semitones} semitones not implemented yet`);
    }

    /**
     * Export progression
     */
    exportProgression() {
        if (!this.hasAccess()) {
            this.showTrialExpiredModal();
            return;
        }
        const data = JSON.stringify(this.chordProgression, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'chord-progression.json';
        a.click();
        URL.revokeObjectURL(url);
        this.showStatus('Progression exported');
    }

    /**
     * Import progression
     */
    importProgression(file) {
        if (!this.hasAccess()) {
            this.showTrialExpiredModal();
            return;
        }
        
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.chordProgression = JSON.parse(e.target.result);
                this.displayChords();
                this.showStatus('Progression imported');
            } catch (error) {
                this.showStatus('Error importing progression');
            }
        };
        reader.readAsText(file);
    }

    /**
     * Select the previous empty slot
     */
    selectPreviousEmptySlot() {
        if (this.targetChordIndex === null) {
            // Find the last empty slot
            for (let i = this.chordProgression.length - 1; i >= 0; i--) {
                if (this.chordProgression[i].isEmpty) {
                    this.selectSlotForPiano(i);
                    return;
                }
            }
        } else {
            // Find the previous empty slot from current position
            for (let i = this.targetChordIndex - 1; i >= 0; i--) {
                if (this.chordProgression[i].isEmpty) {
                    this.selectSlotForPiano(i);
                    return;
                }
            }
        }
        this.showStatus('No previous empty slot found');
    }

    /**
     * Select the next empty slot
     */
    selectNextEmptySlot() {
        const startIndex = this.targetChordIndex === null ? 0 : this.targetChordIndex + 1;
        
        for (let i = startIndex; i < this.chordProgression.length; i++) {
            if (this.chordProgression[i].isEmpty) {
                this.selectSlotForPiano(i);
                return;
            }
        }
        
        // If no empty slot found, create a new one
        this.chordProgression.push({
            name: '',
            notes: [],
            duration: '1n',
            isEmpty: true
        });
        this.selectSlotForPiano(this.chordProgression.length - 1);
        this.displayChords();
    }

    /**
     * Go to a specific slot by measure and beat
     */
    gotoSpecificSlot() {
        const measureInput = document.getElementById('goto-measure');
        const beatInput = document.getElementById('goto-beat');
        
        if (!measureInput || !beatInput) return;
        
        const measure = parseInt(measureInput.value) - 1; // Convert to 0-based
        const beat = parseInt(beatInput.value) - 1; // Convert to 0-based
        
        if (isNaN(measure) || isNaN(beat) || measure < 0 || beat < 0) {
            this.showStatus('Please enter valid measure and beat numbers');
            return;
        }
        
        const slotIndex = measure * this.timeSignature + beat;
        
        // Extend progression if necessary
        while (this.chordProgression.length <= slotIndex) {
            this.chordProgression.push({
                name: '',
                notes: [],
                duration: '1n',
                isEmpty: true
            });
        }
        
        this.selectSlotForPiano(slotIndex);
        this.displayChords();
        
        // Clear the inputs
        measureInput.value = '';
        beatInput.value = '';
    }

    /**
     * Initialize repeat markers drag and drop functionality
     */
    initializeRepeatMarkers() {
        const repeatMarkers = document.querySelectorAll('.repeat-marker');
        
        // Add drag event listeners to repeat markers
        repeatMarkers.forEach(marker => {
            marker.addEventListener('dragstart', (e) => {
                this.handleRepeatDragStart(e);
            });
            
            marker.addEventListener('dragend', (e) => {
                this.handleRepeatDragEnd(e);
            });
        });
        
        // Add drop event listeners to chord slots
        this.setupChordSlotDropZones();
    }
    
    /**
     * Set up drop zones for chord slots
     */
    setupChordSlotDropZones() {
        const chordContainer = document.getElementById('chord-progression');
        if (!chordContainer) return;
        
        // Use event delegation for dynamically created chord items
        chordContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            const chordItem = e.target.closest('.chord-item');
            if (chordItem) {
                chordItem.classList.add('drop-zone');
            }
        });
        
        chordContainer.addEventListener('dragleave', (e) => {
            const chordItem = e.target.closest('.chord-item');
            if (chordItem && !chordItem.contains(e.relatedTarget)) {
                chordItem.classList.remove('drop-zone');
            }
        });
        
        chordContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            const chordItem = e.target.closest('.chord-item');
            if (chordItem) {
                this.handleRepeatDrop(e, chordItem);
                chordItem.classList.remove('drop-zone');
            }
        });
    }
    
    /**
     * Handle repeat marker drag start
     */
    handleRepeatDragStart(e) {
        const marker = e.target.closest('.repeat-marker');
        if (!marker) return;
        
        marker.classList.add('dragging');
        
        const repeatData = {
            type: marker.dataset.repeatType,
            symbol: marker.querySelector('.repeat-symbol').textContent,
            label: marker.querySelector('.repeat-label').textContent
        };
        
        e.dataTransfer.setData('application/json', JSON.stringify(repeatData));
        e.dataTransfer.effectAllowed = 'copy';
    }
    
    /**
     * Handle repeat marker drag end
     */
    handleRepeatDragEnd(e) {
        const marker = e.target.closest('.repeat-marker');
        if (marker) {
            marker.classList.remove('dragging');
        }
        
        // Remove all drop-zone classes
        document.querySelectorAll('.chord-item.drop-zone').forEach(item => {
            item.classList.remove('drop-zone');
        });
    }
    
    /**
     * Handle repeat marker drop on chord slot
     */
    handleRepeatDrop(e, chordItem) {
        try {
            const repeatData = JSON.parse(e.dataTransfer.getData('application/json'));
            const slotIndex = parseInt(chordItem.dataset.index);
            
            if (isNaN(slotIndex) || slotIndex < 0) {
                this.showStatus('Invalid drop target');
                return;
            }
            
            // Create repeat marker object
            const repeatMarker = {
                name: repeatData.symbol,
                notes: [],
                duration: '0n',
                isRepeatMarker: true,
                repeatType: repeatData.type,
                repeatLabel: repeatData.label
            };
            
            // Add or replace chord with repeat marker
            if (slotIndex >= this.chordProgression.length) {
                // Extend progression if needed
                while (this.chordProgression.length <= slotIndex) {
                    this.chordProgression.push({
                        name: '',
                        notes: [],
                        duration: '1n',
                        isEmpty: true
                    });
                }
            }
            
            this.chordProgression[slotIndex] = repeatMarker;
            this.updateRepeatMarkers();
            this.displayChords();
            this.showStatus(`${repeatData.label} added at position ${slotIndex + 1}`);
            
        } catch (error) {
            console.error('Error handling repeat drop:', error);
            this.showStatus('Error adding repeat marker');
        }
    }
    
    /**
     * Parse single note
     */
    parseSingleNote(noteName) {
        // Add octave if not present
        if (!/\d$/.test(noteName)) {
            noteName += '4';
        }
        
        return {
            name: noteName,
            notes: [noteName],
            duration: '1n',
            isSingleNote: true
        };
    }

    /**
     * Check if string is a single note
     */
    isSingleNote(str) {
        // A single note should have an octave number (like C4, D#5) 
        // OR be explicitly just a note name with context that it's meant as a single note
        // Basic chord names like "C", "D", "G" should not be treated as single notes
        return /^[A-G][#b]?\d+$/.test(str);
    }

    /**
     * Parse custom chord (note-dash-note format)
     */
    parseCustomChord(chordName) {
        const notes = chordName.split('-').map(note => {
            if (!/\d$/.test(note)) {
                note += '4';
            }
            return note;
        });
        
        return {
            name: chordName,
            notes: notes,
            duration: '1n',
            isCustom: true
        };
    }

    /**
     * Edit chord with piano interface
     */
    editChordWithPiano(chordIndex) {
        // Select the chord slot for piano input
        this.selectSlotForPiano(chordIndex);
        
        // Get the current chord to pre-populate the piano
        const chord = this.chordProgression[chordIndex];
        if (chord && chord.notes && chord.notes.length > 0) {
            // Clear current piano selection
            this.clearSelection();
            
            // Pre-select the chord's notes on the piano
            chord.notes.forEach(note => {
                const key = document.querySelector(`.key[data-note="${note}"]`);
                if (key) {
                    key.classList.add('active');
                    // Add note to selected notes if not already there
                    if (!this.selectedNotes.includes(note)) {
                        this.selectedNotes.push(note);
                    }
                }
            });
            
            // Update the selected notes display
            this.updateSelectedNotesDisplay();
        }
        
        // Scroll to piano section for better visibility
        const pianoSection = document.querySelector('.piano-section');
        if (pianoSection) {
            pianoSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        this.showStatus(`Editing chord at position ${chordIndex + 1}. Use piano to select notes, then click "Add to Slot".`);
    }

    /**
     * Initialize the application when the page loads
     */
    static init() {
        window.accompanist = new MusicalAccompanist();
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', MusicalAccompanist.init);
