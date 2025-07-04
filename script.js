/**
 * Musical Accompanist Tool
 * A web-based tool for practicing with chord progressions and drones
 * Uses Tone.js for audio synthesis and Web Audio API for precise timing
 */

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
        this.tuningMode = 'equal';
        this.loopMode = true;
        this.metronomeEnabled = false;
        this.countInEnabled = true;
        this.currentKey = 'C';
        this.selectedNotes = []; // For piano keyboard
        this.timeSignature = 4; // Default to 4/4 time
        this.draggedChord = null; // For drag and drop
        this.draggedProgression = null; // For preset progression drag and drop
        this.draggedFromIndex = null;
        this.contextChordIndex = null; // For context menu
        this.editingChordIndex = null; // For chord editing
        this.showChordAnalysis = false; // For progression analysis
        this.showChordNotes = false; // For showing notes above chords
        this.showChordFunctions = false; // For showing Roman numeral functions
        
        // Initialize audio context
        this.initializeAudio();
        
        // Bind event handlers
        this.bindEvents();
        
        // Load default preset
        this.loadPreset('c-major-1645');
    }

    /**
     * Initialize the audio system using Tone.js
     */
    async initializeAudio() {
        try {
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

            console.log('Audio initialized successfully');
        } catch (error) {
            console.error('Error initializing audio:', error);
            this.showStatus('Error initializing audio. Please check your browser settings.');
        }
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

        document.getElementById('tuning').addEventListener('change', (e) => {
            this.tuningMode = e.target.value;
            this.showStatus(`Tuning mode: ${this.tuningMode === 'equal' ? 'Equal Temperament' : 'Just Intonation'}`);
        });

        // Circle of Fifths key selection
        this.setupCircleOfFifths();

        document.getElementById('time-signature').addEventListener('change', (e) => {
            this.timeSignature = parseInt(e.target.value);
            this.displayChords(); // Refresh the display with new time signature
            this.showStatus(`Time signature changed to: ${this.timeSignature}/4`);
        });

        document.getElementById('metronome').addEventListener('change', (e) => {
            this.metronomeEnabled = e.target.checked;
        });

        document.getElementById('loop').addEventListener('change', (e) => {
            this.loopMode = e.target.checked;
        });

        document.getElementById('count-in').addEventListener('change', (e) => {
            this.countInEnabled = e.target.checked;
        });

        // Chord input
        document.getElementById('parse-chords').addEventListener('click', () => {
            this.parseCustomChords();
        });

        // Playback controls
        document.getElementById('play-btn').addEventListener('click', () => {
            this.startPlayback();
        });

        document.getElementById('pause-btn').addEventListener('click', () => {
            this.pausePlayback();
        });

        document.getElementById('stop-btn').addEventListener('click', () => {
            this.stopPlayback();
        });

        // Handle Enter key in chord input
        document.getElementById('chord-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.parseCustomChords();
            }
        });

        // Piano keyboard events
        document.querySelectorAll('.key').forEach(key => {
            key.addEventListener('click', (e) => {
                const note = e.target.dataset.note;
                this.toggleNote(note, e.target);
            });
        });

        // Piano control buttons
        document.getElementById('play-selected').addEventListener('click', () => {
            this.playSelectedNotes();
        });

        document.getElementById('clear-selection').addEventListener('click', () => {
            this.clearSelection();
        });

        document.getElementById('add-to-progression').addEventListener('click', () => {
            this.addSelectionToProgression();
        });

        // Enhanced progression controls
        document.getElementById('transpose-up').addEventListener('click', () => {
            this.transposeProgression(1);
        });

        document.getElementById('transpose-down').addEventListener('click', () => {
            this.transposeProgression(-1);
        });

        document.getElementById('analyze-progression').addEventListener('click', () => {
            this.analyzeProgression();
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

        // Setup drag and drop for preset chords
        this.setupPresetDragAndDrop();
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
            },
            'roman-145': {
                name: 'Roman: I-IV-V',
                chords: [
                    { name: 'I', notes: ['C4', 'E4', 'G4'], duration: '1n', isRomanNumeral: true, scaleDegree: 1 },
                    { name: 'IV', notes: ['F4', 'A4', 'C5'], duration: '1n', isRomanNumeral: true, scaleDegree: 4 },
                    { name: 'V', notes: ['G4', 'B4', 'D5'], duration: '1n', isRomanNumeral: true, scaleDegree: 5 },
                    { name: 'I', notes: ['C4', 'E4', 'G4'], duration: '1n', isRomanNumeral: true, scaleDegree: 1 }
                ],
                tempo: 120,
                key: 'C'
            },
            'roman-1645': {
                name: 'Roman: I-vi-IV-V',
                chords: [
                    { name: 'I', notes: ['C4', 'E4', 'G4'], duration: '1n', isRomanNumeral: true, scaleDegree: 1 },
                    { name: 'vi', notes: ['A4', 'C5', 'E5'], duration: '1n', isRomanNumeral: true, scaleDegree: 6 },
                    { name: 'IV', notes: ['F4', 'A4', 'C5'], duration: '1n', isRomanNumeral: true, scaleDegree: 4 },
                    { name: 'V', notes: ['G4', 'B4', 'D5'], duration: '1n', isRomanNumeral: true, scaleDegree: 5 }
                ],
                tempo: 120,
                key: 'C'
            },
            'roman-circle': {
                name: 'Roman: vi-IV-I-V (Circle)',
                chords: [
                    { name: 'vi', notes: ['A4', 'C5', 'E5'], duration: '1n', isRomanNumeral: true, scaleDegree: 6 },
                    { name: 'IV', notes: ['F4', 'A4', 'C5'], duration: '1n', isRomanNumeral: true, scaleDegree: 4 },
                    { name: 'I', notes: ['C4', 'E4', 'G4'], duration: '1n', isRomanNumeral: true, scaleDegree: 1 },
                    { name: 'V', notes: ['G4', 'B4', 'D5'], duration: '1n', isRomanNumeral: true, scaleDegree: 5 }
                ],
                tempo: 120,
                key: 'C'
            },
            'number-145': {
                name: 'Numbers: 1-4-5',
                chords: [
                    { name: '1', notes: ['C4', 'E4', 'G4'], duration: '1n', isRomanNumeral: true, scaleDegree: 1 },
                    { name: '4', notes: ['F4', 'A4', 'C5'], duration: '1n', isRomanNumeral: true, scaleDegree: 4 },
                    { name: '5', notes: ['G4', 'B4', 'D5'], duration: '1n', isRomanNumeral: true, scaleDegree: 5 },
                    { name: '1', notes: ['C4', 'E4', 'G4'], duration: '1n', isRomanNumeral: true, scaleDegree: 1 }
                ],
                tempo: 120,
                key: 'C'
            }
        };

        const preset = presets[presetName];
        if (!preset) {
            this.showStatus('Preset not found');
            return;
        }

        this.chordProgression = preset.chords;
        this.currentKey = preset.key;
        this.tempo = preset.tempo;
        
        // Update UI
        document.getElementById('tempo').value = this.tempo;
        document.getElementById('tempo-display').textContent = this.tempo;
        this.updateCircleOfFifthsSelection();
        
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
            },
            'roman-145': {
                name: 'Roman: I-IV-V',
                chords: [
                    { name: 'I', notes: ['C4', 'E4', 'G4'], duration: '1n', isRomanNumeral: true, scaleDegree: 1 },
                    { name: 'IV', notes: ['F4', 'A4', 'C5'], duration: '1n', isRomanNumeral: true, scaleDegree: 4 },
                    { name: 'V', notes: ['G4', 'B4', 'D5'], duration: '1n', isRomanNumeral: true, scaleDegree: 5 },
                    { name: 'I', notes: ['C4', 'E4', 'G4'], duration: '1n', isRomanNumeral: true, scaleDegree: 1 }
                ],
                tempo: 120,
                key: 'C'
            },
            'roman-1645': {
                name: 'Roman: I-vi-IV-V',
                chords: [
                    { name: 'I', notes: ['C4', 'E4', 'G4'], duration: '1n', isRomanNumeral: true, scaleDegree: 1 },
                    { name: 'vi', notes: ['A4', 'C5', 'E5'], duration: '1n', isRomanNumeral: true, scaleDegree: 6 },
                    { name: 'IV', notes: ['F4', 'A4', 'C5'], duration: '1n', isRomanNumeral: true, scaleDegree: 4 },
                    { name: 'V', notes: ['G4', 'B4', 'D5'], duration: '1n', isRomanNumeral: true, scaleDegree: 5 }
                ],
                tempo: 120,
                key: 'C'
            },
            'roman-circle': {
                name: 'Roman: vi-IV-I-V (Circle)',
                chords: [
                    { name: 'vi', notes: ['A4', 'C5', 'E5'], duration: '1n', isRomanNumeral: true, scaleDegree: 6 },
                    { name: 'IV', notes: ['F4', 'A4', 'C5'], duration: '1n', isRomanNumeral: true, scaleDegree: 4 },
                    { name: 'I', notes: ['C4', 'E4', 'G4'], duration: '1n', isRomanNumeral: true, scaleDegree: 1 },
                    { name: 'V', notes: ['G4', 'B4', 'D5'], duration: '1n', isRomanNumeral: true, scaleDegree: 5 }
                ],
                tempo: 120,
                key: 'C'
            },
            'number-145': {
                name: 'Numbers: 1-4-5',
                chords: [
                    { name: '1', notes: ['C4', 'E4', 'G4'], duration: '1n', isRomanNumeral: true, scaleDegree: 1 },
                    { name: '4', notes: ['F4', 'A4', 'C5'], duration: '1n', isRomanNumeral: true, scaleDegree: 4 },
                    { name: '5', notes: ['G4', 'B4', 'D5'], duration: '1n', isRomanNumeral: true, scaleDegree: 5 },
                    { name: '1', notes: ['C4', 'E4', 'G4'], duration: '1n', isRomanNumeral: true, scaleDegree: 1 }
                ],
                tempo: 120,
                key: 'C'
            }
        };

        const preset = presets[presetName];
        if (!preset) {
            this.showStatus('Preset not found');
            return;
        }

        this.chordProgression = preset.chords;
        this.currentKey = preset.key;
        this.tempo = preset.tempo;
        
        // Update UI
        document.getElementById('tempo').value = this.tempo;
        document.getElementById('tempo-display').textContent = this.tempo;
        this.updateCircleOfFifthsSelection();
        
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
            },
            'roman-145': {
                name: 'Roman: I-IV-V',
                chords: [
                    { name: 'I', notes: ['C4', 'E4', 'G4'], duration: '1n', isRomanNumeral: true, scaleDegree: 1 },
                    { name: 'IV', notes: ['F4', 'A4', 'C5'], duration: '1n', isRomanNumeral: true, scaleDegree: 4 },
                    { name: 'V', notes: ['G4', 'B4', 'D5'], duration: '1n', isRomanNumeral: true, scaleDegree: 5 },
                    { name: 'I', notes: ['C4', 'E4', 'G4'], duration: '1n', isRomanNumeral: true, scaleDegree: 1 }
                ],
                tempo: 120,
                key: 'C'
            },
            'roman-1645': {
                name: 'Roman: I-vi-IV-V',
                chords: [
                    { name: 'I', notes: ['C4', 'E4', 'G4'], duration: '1n', isRomanNumeral: true, scaleDegree: 1 },
                    { name: 'vi', notes: ['A4', 'C5', 'E5'], duration: '1n', isRomanNumeral: true, scaleDegree: 6 },
                    { name: 'IV', notes: ['F4', 'A4', 'C5'], duration: '1n', isRomanNumeral: true, scaleDegree: 4 },
                    { name: 'V', notes: ['G4', 'B4', 'D5'], duration: '1n', isRomanNumeral: true, scaleDegree: 5 }
                ],
                tempo: 120,
                key: 'C'
            },
            'roman-circle': {
                name: 'Roman: vi-IV-I-V (Circle)',
                chords: [
                    { name: 'vi', notes: ['A4', 'C5', 'E5'], duration: '1n', isRomanNumeral: true, scaleDegree: 6 },
                    { name: 'IV', notes: ['F4', 'A4', 'C5'], duration: '1n', isRomanNumeral: true, scaleDegree: 4 },
                    { name: 'I', notes: ['C4', 'E4', 'G4'], duration: '1n', isRomanNumeral: true, scaleDegree: 1 },
                    { name: 'V', notes: ['G4', 'B4', 'D5'], duration: '1n', isRomanNumeral: true, scaleDegree: 5 }
                ],
                tempo: 120,
                key: 'C'
            },
            'number-145': {
                name: 'Numbers: 1-4-5',
                chords: [
                    { name: '1', notes: ['C4', 'E4', 'G4'], duration: '1n', isRomanNumeral: true, scaleDegree: 1 },
                    { name: '4', notes: ['F4', 'A4', 'C5'], duration: '1n', isRomanNumeral: true, scaleDegree: 4 },
                    { name: '5', notes: ['G4', 'B4', 'D5'], duration: '1n', isRomanNumeral: true, scaleDegree: 5 },
                    { name: '1', notes: ['C4', 'E4', 'G4'], duration: '1n', isRomanNumeral: true, scaleDegree: 1 }
                ],
                tempo: 120,
                key: 'C'
            }
        };

        return presets[presetName] || null;
    }

    /**
     * Parse custom chord input from textarea
     */
    parseCustomChords() {
        const input = document.getElementById('chord-input').value.trim();
        if (!input) {
            this.showStatus('Please enter some chords');
            return;
        }

        try {
            this.chordProgression = this.parseChordString(input);
            this.displayChords();
            this.showStatus(`Parsed ${this.chordProgression.length} chords`);
        } catch (error) {
            this.showStatus('Error parsing chords: ' + error.message);
        }
    }

    /**
     * Parse a chord string into chord objects
     */
    parseChordString(input) {
        const chords = [];
        const parts = input.split(/[\s|]+/).filter(part => part.trim());
        
        for (const part of parts) {
            const chord = this.parseChord(part.trim());
            if (chord) {
                chords.push(chord);
            }
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
        // Handle rest/pause
        if (chordName === '-' || chordName === 'REST' || chordName === 'rest') {
            return {
                name: '-',
                notes: [],
                duration: '1n',
                isRest: true
            };
        }

        // Check if it's a Roman numeral chord (I, IV, V, vi, ii, etc.)
        if (this.isRomanNumeral(chordName)) {
            return this.parseRomanNumeral(chordName);
        }

        // Check if it's a custom chord using note-dash-note syntax
        if (chordName.includes('-') && chordName !== '-') {
            return this.parseCustomChord(chordName);
        }

        // Check if it's a single note (note name with optional octave)
        if (this.isSingleNote(chordName)) {
            return this.parseSingleNote(chordName);
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
     * Display the current chord progression
     */
    displayChords() {
        const display = document.getElementById('chord-display');
        display.innerHTML = '';
        
        if (this.chordProgression.length === 0) {
            display.innerHTML = '<div class="chord-item">No chords loaded</div>';
            this.updateProgressionInfo();
            return;
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
            measureDeleteBtn.title = 'Delete measure';
            measureDeleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteMeasure(measureIndex);
            });
            measureElement.appendChild(measureDeleteBtn);
            
            // Check if this measure contains the current chord
            const currentMeasureIndices = this.getMeasureIndices(this.currentChordIndex);
            if (currentMeasureIndices && currentMeasureIndices.measureIndex === measureIndex) {
                measureElement.classList.add('current-measure');
            }
            
            // Add chords to this measure
            measureChords.forEach((chord, chordIndex) => {
                const chordElement = document.createElement('div');
                chordElement.className = 'chord-item';
                
                const globalChordIndex = this.getGlobalChordIndex(measureIndex, chordIndex);
                
                if (chord.isEmpty) {
                    // Empty slot for incomplete measures
                    chordElement.classList.add('empty-slot');
                    chordElement.textContent = '';
                } else if (chord.isRest) {
                    chordElement.textContent = 'REST';
                    chordElement.classList.add('rest-chord');
                } else {
                    chordElement.textContent = chord.name;
                    if (chord.isSingleNote) {
                        chordElement.classList.add('single-note');
                    } else if (chord.isCustom) {
                        chordElement.classList.add('custom-chord');
                    } else if (chord.isRomanNumeral) {
                        // Check if it's a number (1-7) or actual Roman numeral
                        const isNumber = /^[1-7]/.test(chord.name);
                        if (isNumber) {
                            chordElement.classList.add('scale-degree');
                        } else {
                            chordElement.classList.add('roman-numeral');
                        }
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
                        functionDiv.textContent = this.chordToRomanNumeral(chord);
                        chordElement.appendChild(functionDiv);
                    }
                }
                
                // Add current chord highlighting
                if (globalChordIndex === this.currentChordIndex) {
                    chordElement.classList.add('current');
                }
                
                chordElement.dataset.index = globalChordIndex;
                
                // Make chord clickable to preview (but not empty slots)
                if (!chord.isEmpty) {
                    // Add chord delete button
                    const chordDeleteBtn = document.createElement('button');
                    chordDeleteBtn.className = 'chord-delete';
                    chordDeleteBtn.innerHTML = '×';
                    chordDeleteBtn.title = 'Delete chord';
                    chordDeleteBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.deleteChordAtIndex(globalChordIndex);
                    });
                    chordElement.appendChild(chordDeleteBtn);
                    
                    chordElement.addEventListener('click', () => {
                        this.previewChord(chord);
                    });
                    
                    // Add right-click context menu
                    chordElement.addEventListener('contextmenu', (e) => {
                        this.showContextMenu(e, globalChordIndex);
                    });
                    
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
    previewChord(chord) {
        if (!this.synth || chord.isRest) {
            if (chord.isRest) {
                this.showStatus('Rest - no sound');
            }
            return;
        }
        
        // Get frequencies for the chord
        const frequencies = this.getChordFrequencies(chord);
        
        // Play the chord briefly
        this.synth.releaseAll();
        frequencies.forEach(freq => {
            this.synth.triggerAttackRelease(freq, '2n');
        });
        
        this.showStatus(`Previewing: ${chord.name}`);
    }

    /**
     * Start playback
     */
    async startPlayback() {
        if (this.chordProgression.length === 0) {
            this.showStatus('No chords to play');
            return;
        }

        try {
            // Start Tone.js context if needed
            if (Tone.context.state !== 'running') {
                await Tone.start();
            }

            this.isPlaying = true;
            this.isPaused = false;
            this.currentChordIndex = 0;
            
            // Update UI
            document.getElementById('play-btn').disabled = true;
            document.getElementById('pause-btn').disabled = false;
            document.getElementById('stop-btn').disabled = false;
            
            // Set tempo
            Tone.Transport.bpm.value = this.tempo;
            
            // Start with count-in if enabled
            if (this.countInEnabled && !this.chordProgression[0].isDrone) {
                await this.playCountIn();
            }
            
            // Start the main progression
            this.schedulePlayback();
            
            this.showStatus('Playing...');
        } catch (error) {
            console.error('Error starting playback:', error);
            this.showStatus('Error starting playback');
            this.stopPlayback();
        }
    }

    /**
     * Play count-in beats
     */
    async playCountIn() {
        return new Promise((resolve) => {
            this.showStatus('Count-in...');
            let count = 0;
            const beats = 4; // Two bars count-in
            
            const playBeat = () => {
                // Play click sound
                if (this.metronome) {
                    this.metronome.triggerAttackRelease('C6', '8n');
                }
                
                // Update display
                document.getElementById('current-chord-display').textContent = `${count + 1}`;
                
                count++;
                if (count < beats) {
                    setTimeout(playBeat, 60000 / this.tempo); // Beat interval
                } else {
                    document.getElementById('current-chord-display').textContent = '';
                    setTimeout(resolve, 100); // Small delay before starting
                }
            };
            
            playBeat();
        });
    }

    /**
     * Schedule the chord progression playback
     */
    schedulePlayback() {
        if (!this.isPlaying) return;
        
        const currentChord = this.chordProgression[this.currentChordIndex];
        
        // Highlight current chord
        this.highlightCurrentChord();
        
        // Handle rest chords
        if (currentChord.isRest) {
            // Stop all sounds for rest
            if (this.synth) {
                this.synth.releaseAll();
            }
            this.showStatus('Rest');
            document.getElementById('current-chord-display').textContent = 'REST';
        } else {
            // Get frequencies for current chord (with tuning applied)
            const frequencies = this.getChordFrequencies(currentChord);
            
            // Play the chord
            this.playChord(frequencies, currentChord);
            
            // Update status
            this.showStatus(`Playing: ${currentChord.name}`);
            document.getElementById('current-chord-display').textContent = currentChord.name;
        }
        
        // Play metronome if enabled and not a drone
        if (this.metronomeEnabled && !currentChord.isDrone) {
            this.playMetronome();
        }
        
        // Schedule next chord or loop
        if (!currentChord.isDrone) {
            const nextTime = 60000 / this.tempo; // Time to next beat in milliseconds
            
            setTimeout(() => {
                this.moveToNextChord();
                if (this.isPlaying) {
                    this.schedulePlayback();
                }
            }, nextTime);
        }
    }

    /**
     * Move to the next chord in the progression
     */
    moveToNextChord() {
        this.currentChordIndex++;
        
        if (this.currentChordIndex >= this.chordProgression.length) {
            if (this.loopMode) {
                this.currentChordIndex = 0;
            } else {
                this.stopPlayback();
                return;
            }
        }
    }

    /**
     * Get frequencies for a chord with tuning applied
     */
    getChordFrequencies(chord) {
        const frequencies = [];
        
        for (const note of chord.notes) {
            let frequency = Tone.Frequency(note).toFrequency();
            
            // Apply just intonation if enabled
            if (this.tuningMode === 'just') {
                frequency = this.applyJustIntonation(note, chord.name, frequency);
            }
            
            frequencies.push(frequency);
        }
        
        return frequencies;
    }

    /**
     * Apply just intonation tuning
     */
    applyJustIntonation(note, chordName, frequency) {
        // Simple just intonation implementation
        // This is a basic version - in practice, you'd want more sophisticated tuning
        const noteName = note.replace(/\d+/, '');
        const chordRoot = chordName.replace(/[^A-G#b]/, '');
        
        // Apply just intonation ratios for common intervals
        const justRatios = {
            'unison': 1,
            'major_third': 5/4,
            'perfect_fifth': 3/2,
            'minor_third': 6/5,
            'seventh': 16/9
        };
        
        // This is a simplified implementation
        // In a full implementation, you'd calculate the exact interval relationships
        if (noteName !== chordRoot) {
            // Apply slight detuning for just intonation effect
            const cents = this.getJustIntonationCents(noteName, chordRoot);
            frequency *= Math.pow(2, cents / 1200);
        }
        
        return frequency;
    }

    /**
     * Get cents adjustment for just intonation
     */
    getJustIntonationCents(note, root) {
        // Simplified cents adjustments for just intonation
        const adjustments = {
            'E': -14, // Major third, 14 cents flat
            'F#': -2, // Perfect fifth, 2 cents sharp
            'G': -2,  // Perfect fifth, 2 cents sharp
            'A': -2,  // Perfect fifth, 2 cents sharp
            'B': -2   // Perfect fifth, 2 cents sharp
        };
        
        return adjustments[note] || 0;
    }

    /**
     * Play a chord with given frequencies
     */
    playChord(frequencies, chord) {
        if (!this.synth) return;
        
        // Stop any currently playing notes
        this.synth.releaseAll();
        
        // Play the new chord
        if (chord.isDrone) {
            // For drones, play continuously
            frequencies.forEach(freq => {
                this.synth.triggerAttack(freq);
            });
        } else {
            // For regular chords, play with envelope
            const duration = 60 / this.tempo; // Duration in seconds
            frequencies.forEach(freq => {
                this.synth.triggerAttackRelease(freq, duration);
            });
        }
    }

    /**
     * Play metronome click
     */
    playMetronome() {
        if (!this.metronome) return;
        
        this.metronome.triggerAttackRelease('C6', '32n');
    }

    /**
     * Highlight the current chord in the display
     */
    highlightCurrentChord() {
        // Remove previous highlights
        document.querySelectorAll('.chord-item').forEach(item => {
            item.classList.remove('current');
        });
        document.querySelectorAll('.measure').forEach(measure => {
            measure.classList.remove('current-measure');
        });
        
        // Highlight current chord
        const currentItem = document.querySelector(`[data-index="${this.currentChordIndex}"]`);
        if (currentItem) {
            currentItem.classList.add('current');
            
            // Highlight the current measure
            const measureElement = currentItem.closest('.measure');
            if (measureElement) {
                measureElement.classList.add('current-measure');
            }
            
            // Scroll into view if needed
            currentItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    /**
     * Pause playback
     */
    pausePlayback() {
        this.isPaused = true;
        this.isPlaying = false;
        
        // Stop all sounds
        if (this.synth) {
            this.synth.releaseAll();
        }
        
        // Update UI
        document.getElementById('play-btn').disabled = false;
        document.getElementById('pause-btn').disabled = true;
        
        this.showStatus('Paused');
    }

    /**
     * Stop playback
     */
    stopPlayback() {
        this.isPlaying = false;
        this.isPaused = false;
        this.currentChordIndex = 0;
        
        // Stop all sounds
        if (this.synth) {
            this.synth.releaseAll();
        }
        
        // Clear highlights
        document.querySelectorAll('.chord-item').forEach(item => {
            item.classList.remove('current');
        });
        
        // Update UI
        document.getElementById('play-btn').disabled = false;
        document.getElementById('pause-btn').disabled = true;
        document.getElementById('stop-btn').disabled = true;
        
        // Clear current chord display
        document.getElementById('current-chord-display').textContent = '';
        
        this.showStatus('Stopped');
    }

    /**
     * Show status message
     */
    showStatus(message) {
        document.getElementById('status-display').textContent = message;
        console.log('Status:', message);
    }

    /**
     * Convert volume percentage to decibels
     */
    volumeToDb(volume) {
        return volume === 0 ? -Infinity : Math.log10(volume) * 20;
    }

    /**
     * Toggle a note selection on the piano keyboard
     */
    toggleNote(note, keyElement) {
        const index = this.selectedNotes.indexOf(note);
        
        if (index > -1) {
            // Remove note
            this.selectedNotes.splice(index, 1);
            keyElement.classList.remove('active');
        } else {
            // Add note
            this.selectedNotes.push(note);
            keyElement.classList.add('active');
        }
        
        this.updateSelectedNotesDisplay();
        
        // Play the note briefly
        if (this.synth) {
            const frequency = Tone.Frequency(note).toFrequency();
            this.synth.triggerAttackRelease(frequency, '8n');
        }
    }

    /**
     * Update the selected notes display
     */
    updateSelectedNotesDisplay() {
        const display = document.getElementById('selected-notes');
        display.innerHTML = '';
        
        if (this.selectedNotes.length === 0) {
            display.innerHTML = '<span style="color: #6c757d; font-style: italic;">No notes selected</span>';
            return;
        }
        
        this.selectedNotes.forEach(note => {
            const noteElement = document.createElement('div');
            noteElement.className = 'selected-note';
            noteElement.textContent = note.replace('4', '');
            display.appendChild(noteElement);
        });
    }

    /**
     * Play the currently selected notes
     */
    playSelectedNotes() {
        if (!this.synth || this.selectedNotes.length === 0) {
            this.showStatus('No notes selected');
            return;
        }
        
        // Stop any playing notes
        this.synth.releaseAll();
        
        // Play selected notes
        this.selectedNotes.forEach(note => {
            const frequency = Tone.Frequency(note).toFrequency();
            this.synth.triggerAttackRelease(frequency, '2n');
        });
        
        this.showStatus(`Playing ${this.selectedNotes.length} notes`);
    }

    /**
     * Clear the note selection
     */
    clearSelection() {
        this.selectedNotes = [];
        
        // Remove active class from all keys
        document.querySelectorAll('.key').forEach(key => {
            key.classList.remove('active');
        });
        
        this.updateSelectedNotesDisplay();
        this.showStatus('Selection cleared');
    }

    /**
     * Add the selected notes as a chord to the progression
     */
    addSelectionToProgression() {
        if (this.selectedNotes.length === 0) {
            this.showStatus('No notes selected');
            return;
        }
        
        // Create a custom chord name
        const chordName = this.selectedNotes.map(note => note.replace('4', '')).join('-');
        
        // Create chord object
        const chord = {
            name: chordName,
            notes: [...this.selectedNotes],
            duration: '1n',
            isCustom: true
        };
        
        // Add to progression
        this.chordProgression.push(chord);
        
        // Update display
        this.displayChords();
        
        // Update chord input text
        const chordInput = document.getElementById('chord-input');
        const currentText = chordInput.value.trim();
        if (currentText) {
            chordInput.value = currentText + ' ' + chordName;
        } else {
            chordInput.value = chordName;
        }
        
        this.showStatus(`Added ${chordName} to progression`);
    }

    /**
     * Identify and suggest chord name for selected notes
     */
    identifyChord(notes) {
        if (notes.length < 3) return 'Single Notes';
        
        // Simple chord identification
        const noteNames = notes.map(note => note.replace('4', ''));
        const uniqueNotes = [...new Set(noteNames)].sort();
        
        // Basic chord patterns
        const chordPatterns = {
            'C,E,G': 'C',
            'D,F#,A': 'D',
            'E,G#,B': 'E',
            'F,A,C': 'F',
            'G,B,D': 'G',
            'A,C#,E': 'A',
            'B,D#,F#': 'B',
            'C,Eb,G': 'Cm',
            'D,F,A': 'Dm',
            'E,G,B': 'Em',
            'F,Ab,C': 'Fm',
            'G,Bb,D': 'Gm',
            'A,C,E': 'Am',
            'B,D,F#': 'Bm'
        };
        
        const pattern = uniqueNotes.join(',');
        return chordPatterns[pattern] || uniqueNotes.join('-');
    }

    /**
     * Clear the current chord progression
     */
    clearProgression() {
        // Stop playback if currently playing
        if (this.isPlaying) {
            this.stopPlayback();
        }
        
        // Clear the progression array
        this.chordProgression = [];
        
        // Clear the text input
        document.getElementById('chord-input').value = '';
        
        // Update the display
        this.displayChords();
        
        // Show status message
        this.showStatus('Progression cleared');
    }

    /**
     * Parse a custom chord using note-dash-note syntax
     * Examples: C-E-G, A-C#-E-G, D-F-A
     */
    parseCustomChord(chordName) {
        const noteNames = chordName.split('-').map(note => note.trim());
        
        // Validate that all parts are valid note names
        const validNotes = [];
        for (const noteName of noteNames) {
            if (!noteName) continue; // Skip empty parts
            
            const standardizedNote = this.standardizeNoteName(noteName);
            if (standardizedNote) {
                validNotes.push(standardizedNote);
            } else {
                console.warn(`Invalid note name: ${noteName} in chord ${chordName}`);
                return null;
            }
        }
        
        if (validNotes.length === 0) {
            console.warn(`No valid notes found in custom chord: ${chordName}`);
            return null;
        }
        
        return {
            name: chordName,
            notes: validNotes,
            duration: '1n',
            isCustom: true
        };
    }

    /**
     * Standardize note name to include octave and handle enharmonic equivalents
     * Examples: C -> C4, C# -> C#4, Db -> Db4, c -> C4
     */
    standardizeNoteName(noteName) {
        // Clean up the input
        let cleanNote = noteName.trim();
        
        // Handle case insensitivity
        cleanNote = cleanNote.charAt(0).toUpperCase() + cleanNote.slice(1).toLowerCase();
        
        // Handle enharmonic equivalents and variations
        const noteMap = {
            'C': 'C4', 'C#': 'C#4', 'Db': 'Db4', 'C♯': 'C#4', 'D♭': 'Db4',
            'D': 'D4', 'D#': 'D#4', 'Eb': 'Eb4', 'D♯': 'D#4', 'E♭': 'Eb4',
            'E': 'E4', 'E#': 'F4', 'Fb': 'E4', 'E♯': 'F4', 'F♭': 'E4',
            'F': 'F4', 'F#': 'F#4', 'Gb': 'Gb4', 'F♯': 'F#4', 'G♭': 'Gb4',
            'G': 'G4', 'G#': 'G#4', 'Ab': 'Ab4', 'G♯': 'G#4', 'A♭': 'Ab4',
            'A': 'A4', 'A#': 'A#4', 'Bb': 'Bb4', 'A♯': 'A#4', 'B♭': 'Bb4',
            'B': 'B4', 'B#': 'C5', 'Cb': 'B4', 'B♯': 'C5', 'C♭': 'B4'
        };
        
        // If it already has an octave number, validate it
        if (/[0-9]$/.test(cleanNote)) {
            const notePart = cleanNote.slice(0, -1);
            const octave = parseInt(cleanNote.slice(-1));
            
            // Validate octave range (0-8)
            if (octave >= 0 && octave <= 8) {
                // Check if the note part is valid
                if (this.isValidNoteName(notePart)) {
                    return cleanNote;
                }
            }
            return null;
        }
        
        // Check if it's in our map
        if (noteMap[cleanNote]) {
            return noteMap[cleanNote];
        }
        
        // If not found, return null
        return null;
    }

    /**
     * Check if a note name (without octave) is valid
     */
    isValidNoteName(noteName) {
        const validNotes = ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'];
        return validNotes.includes(noteName);
    }

    /**
     * Check if a chord name represents a single note
     */
    isSingleNote(chordName) {
        // Remove octave if present
        const noteNameOnly = chordName.replace(/[0-9]/g, '');
        
        // Check if it's a valid note name without chord suffixes
        return this.isValidNoteName(noteNameOnly) && 
               !chordName.includes('m') && 
               !chordName.includes('7') && 
               !chordName.includes('sus') &&
               !chordName.includes('dim') &&
               !chordName.includes('aug') &&
               !chordName.includes('maj') &&
               !chordName.includes('min');
    }

    /**
     * Parse a single note name into a note object
     */
    parseSingleNote(noteName) {
        const standardizedNote = this.standardizeNoteName(noteName);
        
        if (!standardizedNote) {
            console.warn(`Invalid single note: ${noteName}`);
            return null;
        }

        return {
            name: noteName,
            notes: [standardizedNote],
            duration: '1n',
            isSingleNote: true
        };
    }

    /**
     * Check if a chord name represents a Roman numeral or scale degree number
     */
    isRomanNumeral(chordName) {
        // Match Roman numerals: I, II, III, IV, V, VI, VII (uppercase = major)
        // i, ii, iii, iv, v, vi, vii (lowercase = minor)
        // Also support 7th chords like I7, V7, ii7, etc.
        const romanPattern = /^(I{1,3}|IV|V|VI{1,2}|VII|i{1,3}|iv|v|vi{1,2}|vii)(7|maj7|m7|dim7|dim|aug|\+)?$/i;
        
        // Also match scale degree numbers: 1, 2, 3, 4, 5, 6, 7
        const numberPattern = /^[1-7](7|maj7|m7|dim7|dim|aug|\+)?$/;
        
        return romanPattern.test(chordName) || numberPattern.test(chordName);
    }

    /**
     * Parse a Roman numeral chord into notes based on the current key
     */
    parseRomanNumeral(romanChord) {
        const originalChord = romanChord;
        let chordQuality = '';
        let baseRoman = romanChord;
        
        // Check if it's a number (1-7) or Roman numeral
        const isNumber = /^[1-7]/.test(romanChord);
        
        // Extract chord quality (7, maj7, m7, dim7, dim, aug, +)
        const qualityMatch = romanChord.match(/(7|maj7|m7|dim7|dim|aug|\+)$/i);
        if (qualityMatch) {
            chordQuality = qualityMatch[1].toLowerCase();
            baseRoman = romanChord.replace(qualityMatch[1], '');
        }
        
        let scaleDegree;
        let isMajor;
        
        if (isNumber) {
            // Handle number notation (1-7)
            scaleDegree = parseInt(baseRoman);
            
            // In major keys: 1, 4, 5 are major; 2, 3, 6 are minor; 7 is diminished
            const majorKeyDegrees = [1, 4, 5];
            const minorKeyDegrees = [2, 3, 6];
            const diminishedDegrees = [7];
            
            if (majorKeyDegrees.includes(scaleDegree)) {
                isMajor = true;
            } else if (minorKeyDegrees.includes(scaleDegree)) {
                isMajor = false;
            } else if (diminishedDegrees.includes(scaleDegree)) {
                isMajor = false; // We'll handle diminished separately
            }
        } else {
            // Handle Roman numeral notation
            // Convert Roman numeral to scale degree
            const romanToNumber = {
                'I': 1, 'i': 1,
                'II': 2, 'ii': 2,
                'III': 3, 'iii': 3,
                'IV': 4, 'iv': 4,
                'V': 5, 'v': 5,
                'VI': 6, 'vi': 6,
                'VII': 7, 'vii': 7
            };
            
            scaleDegree = romanToNumber[baseRoman];
            if (!scaleDegree) {
                console.warn(`Unknown Roman numeral: ${baseRoman}`);
                return null;
            }
            
            // Determine if it's major or minor based on case
            const isUpperCase = baseRoman === baseRoman.toUpperCase();
            isMajor = isUpperCase;
            
            // In major keys, adjust based on scale degree
            if (this.currentKey) {
                const majorKeyDegrees = [1, 4, 5]; // I, IV, V are major
                const minorKeyDegrees = [2, 3, 6]; // ii, iii, vi are minor
                const diminishedDegrees = [7]; // vii is diminished
                
                if (majorKeyDegrees.includes(scaleDegree)) {
                    isMajor = true;
                } else if (minorKeyDegrees.includes(scaleDegree)) {
                    isMajor = false;
                } else if (diminishedDegrees.includes(scaleDegree)) {
                    isMajor = false; // We'll handle diminished separately
                }
            }
            
            // Override with explicit case if provided
            if (!isUpperCase) {
                isMajor = false;
            }
        }
        
        // Get the root note for this scale degree
        const rootNote = this.getScaleDegreeNote(scaleDegree, this.currentKey);
        if (!rootNote) {
            console.warn(`Could not determine root note for scale degree ${scaleDegree} in key ${this.currentKey}`);
            return null;
        }
        
        // Build the chord based on quality
        const notes = this.buildChordFromRoot(rootNote, isMajor, chordQuality, scaleDegree);
        
        return {
            name: originalChord,
            notes: notes,
            duration: '1n',
            isRomanNumeral: true,
            scaleDegree: scaleDegree,
            rootNote: rootNote
        };
    }

    /**
     * Get the note name for a scale degree in a given key
     */
    getScaleDegreeNote(scaleDegree, key) {
        if (!key) key = 'C'; // Default to C major
        
        // Major scale intervals in semitones from root
        const majorScaleIntervals = [0, 2, 4, 5, 7, 9, 11];
        
        // Convert key to a root note (handle sharps/flats)
        const keyRoot = this.standardizeNoteName(key).replace(/\d+$/, '');
        
        // Get the base note without octave
        const baseNote = keyRoot.replace(/\d+$/, '');
        
        // Calculate the note for this scale degree
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const flatNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
        
        let rootIndex = noteNames.indexOf(baseNote);
        if (rootIndex === -1) {
            // Try flat notation
            rootIndex = flatNames.indexOf(baseNote);
        }
        if (rootIndex === -1) {
            console.warn(`Unknown key: ${key}`);
            return null;
        }
        
        const scaleIndex = (scaleDegree - 1) % 7;
        const semitones = majorScaleIntervals[scaleIndex];
        const noteIndex = (rootIndex + semitones) % 12;
        
        // Use sharp or flat notation based on key
        const useFlats = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'].includes(baseNote);
        const resultNote = useFlats ? flatNames[noteIndex] : noteNames[noteIndex];
        
        return resultNote + '4'; // Add default octave
    }

    /**
     * Build a chord from a root note with specified quality
     */
    buildChordFromRoot(rootNote, isMajor, quality, scaleDegree) {
        const baseNote = rootNote.replace(/\d+$/, '');
        const octave = parseInt(rootNote.match(/\d+$/)?.[0] || '4');
        
        // Start with the root
        const notes = [rootNote];
        
        // Get the note names for building intervals
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const flatNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
        
        // Invalid drag state
        if (!this.draggedChord || this.draggedFromIndex === null) {
            this.draggedChord = null;
            this.draggedFromIndex = null;
            return;
        }
        
        // Handle dropping on empty slots - this removes the chord from progression
        const targetElement = e.target;
        if (targetElement.classList.contains('empty-slot')) {
            // Remove the chord from its original position
            this.chordProgression.splice(this.draggedFromIndex, 1);
            
            // Update the display
            this.displayChords();
            
            // Show status
            this.showStatus(`Removed ${this.draggedChord.name} from progression`);
            
            // Clear drag state
            this.draggedChord = null;
            this.draggedFromIndex = null;
            return;
        }
        
        // Standard reordering logic
        // Remove the chord from its original position
        const draggedChord = this.chordProgression.splice(this.draggedFromIndex, 1)[0];
        
        // Adjust target index if necessary (if we removed an item before the target)
        let adjustedTargetIndex = targetGlobalIndex;
        if (this.draggedFromIndex < targetGlobalIndex) {
            adjustedTargetIndex--;
        }
        
        // Insert the chord at the new position
        this.chordProgression.splice(adjustedTargetIndex, 0, draggedChord);
        
        // Update the display
        this.displayChords();
        
        // Show status
        this.showStatus(`Moved ${draggedChord.name} to position ${adjustedTargetIndex + 1}`);
        
        // Clear drag state
        this.draggedChord = null;
        this.draggedFromIndex = null;
    }

    /**
     * Transpose the entire progression up or down by semitones
     */
    transposeProgression(semitones) {
        if (this.chordProgression.length === 0) {
            this.showStatus('No progression to transpose');
            return;
        }

        const newProgression = this.chordProgression.map(chord => {
            if (chord.isRest) return chord;
            
            const transposedChord = this.transposeChord(chord, semitones);
            return transposedChord;
        });

        this.chordProgression = newProgression;
        this.displayChords();
        this.updateProgressionInfo();
        this.showStatus(`Transposed ${semitones > 0 ? 'up' : 'down'} by ${Math.abs(semitones)} semitone(s)`);
    }

    /**
     * Transpose a single chord by semitones
     */
    transposeChord(chord, semitones) {
        const transposedNotes = chord.notes.map(note => {
            const frequency = Tone.Frequency(note).toFrequency();
            const newFrequency = frequency * Math.pow(2, semitones / 12);
            return Tone.Frequency(newFrequency).toNote();
        });

        return {
            ...chord,
            notes: transposedNotes,
            name: this.generateChordName(transposedNotes)
        };
    }

    /**
     * Generate a chord name from notes
     */
    generateChordName(notes) {
        if (notes.length === 1) {
            return notes[0].replace(/\d+$/, '');
        }
        
        // Simple chord naming - just join the note names
        const noteNames = notes.map(note => note.replace(/\d+$/, ''));
        return noteNames.join('-');
    }

    /**
     * Analyze the current progression
     */
    analyzeProgression() {
        if (this.chordProgression.length === 0) {
            this.showStatus('No progression to analyze');
            return;
        }

        const analysis = this.getProgressionAnalysis();
        this.displayAnalysis(analysis);
        this.toggleAnalysisDisplay();
    }

    /**
     * Get analysis data for the current progression
     */
    getProgressionAnalysis() {
        const chords = this.chordProgression.filter(chord => !chord.isRest);
        const totalDuration = this.calculateProgressionDuration();
        
        return {
            chordCount: chords.length,
            totalDuration: totalDuration,
            key: this.currentKey,
            timeSignature: this.timeSignature,
            romanNumerals: this.getRomanNumeralAnalysis(chords),
            chordTypes: this.getChordTypesAnalysis(chords),
            commonProgressions: this.identifyCommonProgressions(chords)
        };
    }

    /**
     * Get Roman numeral analysis for chords
     */
    getRomanNumeralAnalysis(chords) {
        return chords.map(chord => {
            if (chord.isRomanNumeral) {
                return chord.name;
            }
            return this.chordToRomanNumeral(chord);
        }).join(' - ');
    }

    /**
     * Convert chord to Roman numeral based on current key
     */
    chordToRomanNumeral(chord) {
        // Simple implementation - this could be more sophisticated
        const root = chord.notes[0].replace(/\d+$/, '');
        const keyRoot = this.currentKey.replace(/m$/, '');
        
        const majorScale = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
        const keyIndex = majorScale.indexOf(keyRoot);
        const chordIndex = majorScale.indexOf(root);
        
        if (keyIndex === -1 || chordIndex === -1) return '?';
        
        const degree = ((chordIndex - keyIndex + 7) % 7) + 1;
        const romanNumerals = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
        
        return romanNumerals[degree - 1] || '?';
    }

    /**
     * Analyze chord types in the progression
     */
    getChordTypesAnalysis(chords) {
        const types = {};
        chords.forEach(chord => {
            const type = this.getChordType(chord);
            types[type] = (types[type] || 0) + 1;
        });
        
        return Object.entries(types)
            .map(([type, count]) => `${type}: ${count}`)
            .join(', ');
    }

    /**
     * Get chord type (major, minor, etc.)
     */
    getChordType(chord) {
        if (chord.isSingleNote) return 'single note';
        if (chord.isCustom) return 'custom';
        if (chord.notes.length === 3) {
            // Simple major/minor detection
            const intervals = this.getChordIntervals(chord.notes);
            if (intervals.includes(4)) return 'major';
            if (intervals.includes(3)) return 'minor';
        }
        return 'other';
    }

    /**
     * Get intervals between chord notes
     */
    getChordIntervals(notes) {
        const frequencies = notes.map(note => Tone.Frequency(note).toMidi());
        const intervals = [];
        for (let i = 1; i < frequencies.length; i++) {
            intervals.push(frequencies[i] - frequencies[0]);
        }
        return intervals;
    }

    /**
     * Identify common chord progressions
     */
    identifyCommonProgressions(chords) {
        const romanNumerals = chords.map(chord => this.chordToRomanNumeral(chord));
        const progressionString = romanNumerals.join('-');
        
        const commonPatterns = {
            'I-V-vi-IV': 'I-V-vi-IV (Pop progression)',
            'vi-IV-I-V': 'vi-IV-I-V (Circle progression)',
            'I-IV-V-I': 'I-IV-V-I (Classic cadence)',
            'ii-V-I': 'ii-V-I (Jazz cadence)',
            'I-vi-ii-V': 'I-vi-ii-V (Circle of fifths)'
        };
        
        for (const [pattern, name] of Object.entries(commonPatterns)) {
            if (progressionString.includes(pattern)) {
                return name;
            }
        }
        
        return 'Custom progression';
    }

    /**
     * Calculate total duration of progression
     */
    calculateProgressionDuration() {
        const beatsPerChord = 4 / this.timeSignature; // Assume whole notes
        const totalBeats = this.chordProgression.length * beatsPerChord;
        const totalSeconds = (totalBeats * 60) / this.tempo;
        
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Display analysis results
     */
    displayAnalysis(analysis) {
        const analysisContent = document.getElementById('analysis-content');
        analysisContent.innerHTML = `
            <div class="analysis-row">
                <span class="analysis-label">Chords:</span>
                <span class="analysis-value">${analysis.chordCount}</span>
            </div>
            <div class="analysis-row">
                <span class="analysis-label">Duration:</span>
                <span class="analysis-value">${analysis.totalDuration}</span>
            </div>
            <div class="analysis-row">
                <span class="analysis-label">Key:</span>
                <span class="analysis-value">${analysis.key}</span>
            </div>
            <div class="analysis-row">
                <span class="analysis-label">Time:</span>
                <span class="analysis-value">${analysis.timeSignature}/4</span>
            </div>
            <div class="analysis-row">
                <span class="analysis-label">Analysis:</span>
                <span class="analysis-value">${analysis.romanNumerals}</span>
            </div>
            <div class="analysis-row">
                <span class="analysis-label">Types:</span>
                <span class="analysis-value">${analysis.chordTypes}</span>
            </div>
            <div class="analysis-row">
                <span class="analysis-label">Pattern:</span>
                <span class="analysis-value">${analysis.commonProgressions}</span>
            </div>
        `;
    }

    /**
     * Toggle analysis display
     */
    toggleAnalysisDisplay() {
        const analysisDiv = document.getElementById('progression-analysis');
        const isVisible = analysisDiv.style.display !== 'none';
        analysisDiv.style.display = isVisible ? 'none' : 'block';
        
        const analyzeBtn = document.getElementById('analyze-progression');
        analyzeBtn.classList.toggle('active', !isVisible);
    }

    /**
     * Export progression as JSON
     */
    exportProgression() {
        if (this.chordProgression.length === 0) {
            this.showStatus('No progression to export');
            return;
        }

        const exportData = {
            chords: this.chordProgression,
            key: this.currentKey,
            tempo: this.tempo,
            timeSignature: this.timeSignature,
            tuningMode: this.tuningMode,
            exportedAt: new Date().toISOString()
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `progression_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        this.showStatus('Progression exported');
    }

    /**
     * Import progression from file
     */
    async importProgression(file) {
        if (!file) return;

        try {
            const text = await file.text();
            let importData;
            
            if (file.name.endsWith('.json')) {
                importData = JSON.parse(text);
            } else {
                // Assume it's a text file with chord names
                importData = { chords: this.parseChordString(text) };
            }

            this.chordProgression = importData.chords;
            if (importData.key) this.currentKey = importData.key;
            if (importData.tempo) this.tempo = importData.tempo;
            if (importData.timeSignature) this.timeSignature = importData.timeSignature;
            if (importData.tuningMode) this.tuningMode = importData.tuningMode;

            // Update UI
            this.displayChords();
            this.updateProgressionInfo();
            this.showStatus('Progression imported');
        } catch (error) {
            this.showStatus('Error importing progression: ' + error.message);
        }
    }

    /**
     * Update progression info display
     */
    updateProgressionInfo() {
        const lengthSpan = document.getElementById('progression-length');
        const durationSpan = document.getElementById('progression-duration');
        
        if (lengthSpan) {
            lengthSpan.textContent = `${this.chordProgression.length} chord${this.chordProgression.length !== 1 ? 's' : ''}`;
        }
        
        if (durationSpan) {
            durationSpan.textContent = this.calculateProgressionDuration();
        }
    }

    /**
     * Show context menu for chord
     */
    showContextMenu(event, chordIndex) {
        event.preventDefault();
        this.contextChordIndex = chordIndex;
        
        const contextMenu = document.getElementById('chord-context-menu');
        contextMenu.style.display = 'block';
        contextMenu.style.left = event.pageX + 'px';
        contextMenu.style.top = event.pageY + 'px';
    }

    /**
     * Hide context menu
     */
    hideContextMenu() {
        const contextMenu = document.getElementById('chord-context-menu');
        contextMenu.style.display = 'none';
    }

    /**
     * Edit chord at index
     */
    editChord(index) {
        this.editingChordIndex = index;
        const chord = this.chordProgression[index];
        
        const modal = document.getElementById('chord-edit-modal');
        const input = document.getElementById('chord-edit-input');
        
        input.value = chord.name;
        modal.style.display = 'flex';
        input.focus();
        
        this.hideContextMenu();
    }

    /**
     * Save chord edit
     */
    saveChordEdit() {
        const input = document.getElementById('chord-edit-input');
        const newChordName = input.value.trim();
        
        if (!newChordName) {
            this.showStatus('Please enter a chord name');
            return;
        }

        try {
            const newChord = this.parseChord(newChordName);
            if (newChord) {
                this.chordProgression[this.editingChordIndex] = newChord;
                this.displayChords();
                this.updateProgressionInfo();
                this.closeEditModal();
                this.showStatus('Chord updated');
            }
        } catch (error) {
            this.showStatus('Error parsing chord: ' + error.message);
        }
    }

    /**
     * Close edit modal
     */
    closeEditModal() {
        const modal = document.getElementById('chord-edit-modal');
        modal.style.display = 'none';
        this.editingChordIndex = null;
    }

    /**
     * Delete chord at index
     */
    deleteChord() {
        if (this.editingChordIndex !== null) {
            this.deleteChordAtIndex(this.editingChordIndex);
            this.closeEditModal();
        }
    }

    /**
     * Delete chord at specific index
     */
    deleteChordAtIndex(index) {
        // Stop playback if currently playing
        if (this.isPlaying) {
            this.stopPlayback();
        }

        this.chordProgression.splice(index, 1);
        
        // Reset current chord index if it's beyond the new progression length
        if (this.currentChordIndex >= this.chordProgression.length) {
            this.currentChordIndex = Math.max(0, this.chordProgression.length - 1);
        }
        
        this.displayChords();
        this.updateProgressionInfo();
        this.updateChordInputFromProgression();
        this.hideContextMenu();
        this.showStatus('Chord deleted');
    }

    /**
     * Duplicate chord at index
     */
    duplicateChord(index) {
        const chord = this.chordProgression[index];
        const duplicatedChord = JSON.parse(JSON.stringify(chord));
        this.chordProgression.splice(index + 1, 0, duplicatedChord);
        this.displayChords();
        this.updateProgressionInfo();
        this.hideContextMenu();
        this.showStatus('Chord duplicated');
    }

    /**
     * Show chord substitution suggestions
     */
    showChordSubstitutions(index) {
        const chord = this.chordProgression[index];
        const substitutions = this.getChordSubstitutions(chord);
        
        if (substitutions.length === 0) {
            this.showStatus('No substitutions available for this chord');
            return;
        }

        // For now, just show the first substitution
        const substitution = substitutions[0];
        try {
            const newChord = this.parseChord(substitution);
            if (newChord) {
                this.chordProgression[index] = newChord;
                this.displayChords();
                this.updateProgressionInfo();
                this.showStatus(`Substituted with ${substitution}`);
            }
        } catch (error) {
            this.showStatus('Error applying substitution');
        }
        
        this.hideContextMenu();
    }

    /**
     * Get chord substitution suggestions
     */
    getChordSubstitutions(chord) {
        const substitutions = [];
        
        // Simple substitution rules
        if (chord.name === 'C') {
            substitutions.push('Am', 'F', 'Em');
        } else if (chord.name === 'Am') {
            substitutions.push('C', 'F', 'Dm');
        } else if (chord.name === 'F') {
            substitutions.push('Dm', 'Am', 'C');
        } else if (chord.name === 'G') {
            substitutions.push('Em', 'G7', 'B');
        }
        
        return substitutions;
    }

    /**
     * Insert empty chord at index
     */
    insertEmptyChord(index) {
        const emptyChord = {
            name: 'C',
            notes: ['C4', 'E4', 'G4'],
            duration: '1n',
            isEmpty: true
        };
        
        this.chordProgression.splice(index, 0, emptyChord);
        this.displayChords();
        this.updateProgressionInfo();
        this.hideContextMenu();
        this.showStatus('Empty chord inserted');
    }

    /**
     * Delete an entire measure and all its chords
     */
    deleteMeasure(measureIndex) {
        // Stop playback if currently playing
        if (this.isPlaying) {
            this.stopPlayback();
        }

        const chordsPerMeasure = this.timeSignature;
        const startIndex = measureIndex * chordsPerMeasure;
        const endIndex = Math.min(startIndex + chordsPerMeasure, this.chordProgression.length);
        
        // Calculate how many chords to actually remove
        const chordsToRemove = endIndex - startIndex;
        
        if (chordsToRemove > 0) {
            // Remove the chords for this measure
            this.chordProgression.splice(startIndex, chordsToRemove);
            
            // Reset current chord index if it's beyond the new progression length
            if (this.currentChordIndex >= this.chordProgression.length) {
                this.currentChordIndex = Math.max(0, this.chordProgression.length - 1);
            }
            
            // Update display and progression info
            this.displayChords();
            this.updateProgressionInfo();
            
            // Update chord input text
            this.updateChordInputFromProgression();
            
            this.showStatus(`Deleted measure ${measureIndex + 1} (${chordsToRemove} chords)`);
        } else {
            this.showStatus('No chords to delete in this measure');
        }
    }

    /**
     * Update the chord input textarea to reflect the current progression
     */
    updateChordInputFromProgression() {
        const chordInput = document.getElementById('chord-input');
        const chordNames = this.chordProgression.map(chord => {
            if (chord.isRest) {
                return '-';
            }
            return chord.name;
        });
        
        // Group by measures and add bar lines
        const chordsPerMeasure = this.timeSignature;
        const measuredChords = [];
        
        for (let i = 0; i < chordNames.length; i += chordsPerMeasure) {
            const measureChords = chordNames.slice(i, i + chordsPerMeasure);
            measuredChords.push(measureChords.join(' '));
        }
        
        chordInput.value = measuredChords.join(' | ');
    }

    /**
     * Setup drag and drop functionality for preset chords and progressions
     */
    setupPresetDragAndDrop() {
        // Handle preset chords
        const presetChordElements = document.querySelectorAll('.preset-chord');
        
        presetChordElements.forEach(element => {
            element.addEventListener('dragstart', (e) => {
                const chordName = e.target.dataset.chordName;
                const chordNotes = e.target.dataset.chordNotes.split(',');
                const isDrone = e.target.dataset.isDrone === 'true';
                const isSingle = e.target.dataset.isSingle === 'true';
                
                // Create a chord object for dragging
                const draggedChord = {
                    name: chordName,
                    notes: chordNotes,
                    duration: '1n',
                    isDrone: isDrone,
                    isSingleNote: isSingle,
                    isCustom: !isDrone && !isSingle
                };
                
                this.draggedChord = draggedChord;
                this.draggedProgression = null; // Clear any progression drag
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', e.target.outerHTML);
                
                this.showStatus(`Dragging preset chord: ${chordName}`);
            });
            
            element.addEventListener('dragend', () => {
                this.draggedChord = null;
                this.showStatus('');
            });
        });
        
        // Handle preset progressions
        const presetProgressionElements = document.querySelectorAll('.preset-progression');
        
        presetProgressionElements.forEach(element => {
            element.addEventListener('dragstart', (e) => {
                const presetName = e.target.dataset.presetName;
                const presetChords = e.target.dataset.presetChords.split(',');
                
                // Create progression from preset
                let draggedProgression = [];
                if (presetName) {
                    // Get preset data without loading it
                    const presetData = this.getPresetData(presetName);
                    if (presetData) {
                        draggedProgression = [...presetData.chords];
                    }
                } else {
                    // Create from chord list
                    draggedProgression = presetChords.map(chordName => {
                        const parsedChord = this.parseChordName(chordName.trim());
                        return parsedChord || { name: chordName.trim(), notes: [], duration: '1n' };
                    });
                }
                
                this.draggedProgression = draggedProgression;
                this.draggedChord = null; // Clear any single chord drag
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/html', e.target.outerHTML);
                
                this.showStatus(`Dragging preset progression: ${e.target.textContent}`);
            });
            
            element.addEventListener('dragend', () => {
                this.draggedProgression = null;
                this.showStatus('');
            });
        });
        
        // Enable dropping on the progression area
        const chordDisplay = document.getElementById('chord-display');
        if (chordDisplay) {
            chordDisplay.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                chordDisplay.classList.add('drag-over');
            });
            
            chordDisplay.addEventListener('dragleave', (e) => {
                if (!chordDisplay.contains(e.relatedTarget)) {
                    chordDisplay.classList.remove('drag-over');
                }
            });
            
            chordDisplay.addEventListener('drop', (e) => {
                e.preventDefault();
                chordDisplay.classList.remove('drag-over');
                
                if (this.draggedProgression) {
                    // Insert entire progression
                    this.chordProgression.push(...this.draggedProgression);
                    this.displayChords();
                    this.updateChordInputFromProgression();
                    this.showStatus(`Added preset progression (${this.draggedProgression.length} chords)`);
                } else if (this.draggedChord) {
                    // Insert single chord
                    this.chordProgression.push(this.draggedChord);
                    this.displayChords();
                    this.updateChordInputFromProgression();
                    this.showStatus(`Added ${this.draggedChord.name} to progression`);
                }
            });
        }
        
        // Enable dropping on empty slots in the progression
        const emptySlots = document.querySelectorAll('.empty-slot');
        emptySlots.forEach(slot => {
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });
            
            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                
                if (this.draggedChord) {
                    // Insert the dragged chord into the progression
                    const measureElement = e.target.closest('.measure');
                    const measureIndex = measureElement ? parseInt(measureElement.dataset.measureIndex) : 0;
                    const chordIndex = Array.from(e.target.parentNode.children).indexOf(e.target);
                    
                    this.insertChordAtIndex(this.draggedChord, measureIndex, chordIndex);
                    
                    // Remove visual feedback
                    document.querySelectorAll('.chord-item').forEach(item => {
                        item.classList.remove('dragging', 'drag-over');
                    });
                }
            });
        });
    }

    /**
     * Insert a chord at a specific index in the progression
     */
    insertChordAtIndex(chord, measureIndex, chordIndex) {
        const targetGlobalIndex = this.getGlobalChordIndex(measureIndex, chordIndex);
        
        // Adjust index if dropping after the current position
        let adjustedIndex = targetGlobalIndex;
        if (this.draggedFromIndex !== null && this.draggedFromIndex < targetGlobalIndex) {
            adjustedIndex--;
        }
        
        // Insert the chord
        this.chordProgression.splice(adjustedIndex, 0, chord);
        
        // Update display
        this.displayChords();
        this.showStatus(`Inserted ${chord.name} at position ${adjustedIndex + 1}`);
    }

    /**
     * Setup Circle of Fifths interface for key selection
     */
    setupCircleOfFifths() {
        const keySegments = document.querySelectorAll('.key-segment');
        const selectedKeyDisplay = document.getElementById('selected-key-display');
        
        keySegments.forEach(segment => {
            segment.addEventListener('click', (e) => {
                e.preventDefault();
                
                const selectedKey = segment.dataset.key;
                
                // Remove previous selection
                keySegments.forEach(s => s.classList.remove('selected'));
                
                // Add selection to clicked segment
                segment.classList.add('selected');
                
                // Update the key
                this.currentKey = selectedKey;
                
                // Update center display
                if (selectedKeyDisplay) {
                    selectedKeyDisplay.textContent = selectedKey;
                }
                
                // Show status
                const isMinor = selectedKey.includes('m');
                const keyType = isMinor ? 'Minor' : 'Major';
                this.showStatus(`Key set to: ${selectedKey} ${keyType}`);
                
                // Update any existing progression analysis
                if (this.showChordAnalysis) {
                    this.analyzeProgression();
                }
            });
            
            // Add hover effects
            segment.addEventListener('mouseenter', () => {
                if (!segment.classList.contains('selected')) {
                    segment.style.opacity = '0.8';
                }
            });
            
            segment.addEventListener('mouseleave', () => {
                if (!segment.classList.contains('selected')) {
                    segment.style.opacity = '1';
                }
            });
        });
        
        // Set initial selection to current key (C Major by default)
        this.updateCircleOfFifthsSelection();
    }

    /**
     * Update the Circle of Fifths to show the current key selection
     */
    updateCircleOfFifthsSelection() {
        const keySegments = document.querySelectorAll('.key-segment');
        const selectedKeyDisplay = document.getElementById('selected-key-display');
        
        // Remove all selections
        keySegments.forEach(segment => segment.classList.remove('selected'));
        
        // Find and select the current key
        const currentSegment = document.querySelector(`.key-segment[data-key="${this.currentKey}"]`);
        if (currentSegment) {
            currentSegment.classList.add('selected');
        }
        
        // Update center display
        if (selectedKeyDisplay) {
            selectedKeyDisplay.textContent = this.currentKey;
        }
    }

    // ...existing code...
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check for Web Audio API support
    if (!window.AudioContext && !window.webkitAudioContext) {
        alert('Your browser does not support the Web Audio API. Please use a modern browser like Chrome, Firefox, or Safari.');
        return;
    }
    
    // Initialize the musical accompanist
    window.musicalAccompanist = new MusicalAccompanist();
    
    console.log('Musical Accompanist Tool initialized');
});

// Handle page visibility changes to stop audio when tab is hidden
document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.musicalAccompanist) {
        window.musicalAccompanist.stopPlayback();
    }
});
