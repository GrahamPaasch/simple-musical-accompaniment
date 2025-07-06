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
        this.loopMode = true;
        this.metronomeEnabled = false;
        this.selectedNotes = []; // For piano keyboard
        this.targetChordIndex = null; // Track which slot to fill with piano selection
        this.timeSignature = 4; // Default to 4/4 time
        this.draggedFromIndex = null;
        this.contextChordIndex = null; // For context menu
        this.editingChordIndex = null; // For chord editing
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

        // New piano controls
        document.getElementById('add-rest').addEventListener('click', () => {
            this.addRestToTarget();
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
                    
                    // Make empty slots clickable to select for piano input
                    chordElement.addEventListener('click', () => {
                        this.selectSlotForPiano(globalChordIndex);
                    });
                    
                    // Add right-click context menu for options
                    chordElement.addEventListener('contextmenu', (e) => {
                        this.showEmptySlotMenu(e, globalChordIndex);
                    });
                } else if (chord.isRest) {
                    chordElement.textContent = 'REST';
                    chordElement.classList.add('rest-chord');
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
            // Get frequencies for current chord
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
     * Get frequencies for a chord
     */
    getChordFrequencies(chord) {
        const frequencies = [];
        
        for (const note of chord.notes) {
            let frequency = Tone.Frequency(note).toFrequency();
            frequencies.push(frequency);
        }
        
        return frequencies;
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
        const chordName = this.selectedNotes.map(note => note.replace(/\d+$/, '')).join('-');
        
        // Create chord object
        const chord = {
            name: chordName,
            notes: [...this.selectedNotes],
            duration: '1n',
            isCustom: true
        };
        
        // Check if we have a target slot selected
        if (this.targetChordIndex !== null && this.targetChordIndex < this.chordProgression.length) {
            // Fill the specific slot
            this.chordProgression[this.targetChordIndex] = chord;
            this.showStatus(`Filled slot ${this.targetChordIndex + 1} with ${chordName}`);
            this.clearSlotSelection();
        } else {
            // Add to end of progression (original behavior)
            this.chordProgression.push(chord);
            this.showStatus(`Added ${chordName} to progression`);
        }
        
        // Update display
        this.displayChords();
        
        // Clear piano selection
        this.clearSelection();
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
            'B,D,F#': 'B',
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
        
        // Update the display
        this.displayChords();
        
        // Show status message
        this.showStatus('Progression cleared');
    }

    /**
     * Create empty measures with the specified number from user input
     */
    createEmptyMeasures() {
        // Get the number of measures from the input
        const measureCountInput = document.getElementById('measure-count');
        const numMeasures = parseInt(measureCountInput.value);
        
        // Validate input
        if (isNaN(numMeasures) || numMeasures < 1) {
            this.showStatus('Please enter a valid number of measures (minimum 1)');
            return;
        }
        
        // Warn for very large progressions that might impact performance
        if (numMeasures > 100) {
            const chordsPerMeasure = this.timeSignature;
            const totalChordSlots = numMeasures * chordsPerMeasure;
            const confirmed = confirm(`Creating ${numMeasures} measures will generate ${totalChordSlots} chord slots. This may impact performance on slower devices. Continue?`);
            if (!confirmed) {
                return;
            }
        }
        
        // Stop playback if currently playing
        if (this.isPlaying) {
            this.stopPlayback();
        }
        
        // Clear existing progression
        this.chordProgression = [];
        
        // Calculate total number of chord slots needed
        const chordsPerMeasure = this.timeSignature;
        const totalChordSlots = numMeasures * chordsPerMeasure;
        
        // Create empty chord slots
        for (let i = 0; i < totalChordSlots; i++) {
            this.chordProgression.push({
                name: '',
                notes: [],
                duration: '1n',
                isEmpty: true
            });
        }
        
        // Update the display
        this.displayChords();
        
        // Automatically select the first empty slot for convenience
        if (totalChordSlots > 0) {
            this.selectSlotForPiano(0);
        }
        
        // Show status message
        this.showStatus(`Created ${numMeasures} empty measure${numMeasures > 1 ? 's' : ''} (${totalChordSlots} chord slots) - First slot selected`);
    }

    /**
     * Select an empty slot for piano input
     */
    selectSlotForPiano(slotIndex) {
        // Clear any previous selection
        this.clearSlotSelection();
        
        // Set the target slot
        this.targetChordIndex = slotIndex;
        
        // Visually highlight the selected slot
        const slotElement = document.querySelector(`[data-index="${slotIndex}"]`);
        if (slotElement) {
            slotElement.classList.add('selected-for-piano');
        }
        
        // Update the piano interface to show which slot is being filled
        this.updateSelectedSlotDisplay();
        
        this.showStatus(`Selected slot ${slotIndex + 1} (Measure ${Math.floor(slotIndex / this.timeSignature) + 1}, Beat ${(slotIndex % this.timeSignature) + 1}). Use piano keys or navigation arrows.`);
    }
    
    /**
     * Clear slot selection
     */
    clearSlotSelection() {
        if (this.targetChordIndex !== null) {
            // Remove visual highlight
            const slotElement = document.querySelector(`[data-index="${this.targetChordIndex}"]`);
            if (slotElement) {
                slotElement.classList.remove('selected-for-piano');
            }
        }
        
        this.targetChordIndex = null;
        this.updateSelectedSlotDisplay();
    }
    
    /**
     * Update the display to show which slot is selected for piano input
     */
    updateSelectedSlotDisplay() {
        const slotDisplay = document.getElementById('selected-slot-display');
        const slotInfoText = document.getElementById('slot-info-text');
        
        if (slotDisplay && slotInfoText) {
            if (this.targetChordIndex !== null) {
                const measures = this.getMeasureIndices(this.targetChordIndex);
                const emptyCount = this.chordProgression.filter(chord => chord.isEmpty).length;
                slotInfoText.textContent = `Selected: Measure ${measures.measureIndex + 1}, Beat ${measures.chordIndex + 1} (${emptyCount} empty slots remaining)`;
                slotDisplay.style.display = 'block';
            } else {
                const emptyCount = this.chordProgression.filter(chord => chord.isEmpty).length;
                if (emptyCount > 0) {
                    slotInfoText.textContent = `${emptyCount} empty slots available - click one to select`;
                } else {
                    slotInfoText.textContent = 'No empty slots available';
                }
                slotDisplay.style.display = 'block';
            }
        }
    }
    
    /**
     * Show context menu for empty slots
     */
    showEmptySlotMenu(e, slotIndex) {
        e.preventDefault();
        e.stopPropagation();
        
        // Create simple context menu
        const existingMenu = document.getElementById('empty-slot-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
        
        const menu = document.createElement('div');
        menu.id = 'empty-slot-menu';
        menu.className = 'context-menu';
        menu.style.position = 'fixed';
        menu.style.left = e.clientX + 'px';
        menu.style.top = e.clientY + 'px';
        menu.style.display = 'block';
        menu.style.zIndex = '1000';
        
        menu.innerHTML = `
            <div class="menu-item" onclick="musicalAccompanist.selectSlotForPiano(${slotIndex})">🎹 Fill with Piano</div>
            <div class="menu-item" onclick="musicalAccompanist.fillSlotWithRest(${slotIndex})">⏸️ Add Rest</div>
            <div class="menu-item" onclick="musicalAccompanist.editChord(${slotIndex})">✏️ Type Chord</div>
        `;
        
        document.body.appendChild(menu);
        
        // Close menu when clicking elsewhere
        setTimeout(() => {
            document.addEventListener('click', function closeMenu() {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            });
        }, 10);
    }
    
    /**
     * Fill a slot with a rest
     */
    fillSlotWithRest(slotIndex) {
        if (slotIndex >= 0 && slotIndex < this.chordProgression.length) {
            this.chordProgression[slotIndex] = {
                name: '-',
                notes: [],
                duration: '1n',
                isRest: true
            };
            
            this.displayChords();
            this.showStatus(`Added rest to slot ${slotIndex + 1}`);
        }
    }

    /**
     * Add a rest to the selected target slot
     */
    addRestToTarget() {
        if (this.targetChordIndex !== null && this.targetChordIndex < this.chordProgression.length) {
            this.fillSlotWithRest(this.targetChordIndex);
            this.clearSlotSelection();
        } else {
            this.showStatus('No slot selected. Click an empty slot first, then use this button.');
        }
    }

    /**
     * Select the next empty slot
     */
    selectNextEmptySlot() {
        const currentIndex = this.targetChordIndex !== null ? this.targetChordIndex : -1;
        let nextIndex = currentIndex + 1;
        
        // Find next empty slot
        while (nextIndex < this.chordProgression.length) {
            if (this.chordProgression[nextIndex].isEmpty) {
                this.selectSlotForPiano(nextIndex);
                return;
            }
            nextIndex++;
        }
        
        // If no empty slots found after current, wrap to beginning
        nextIndex = 0;
        while (nextIndex <= currentIndex && nextIndex < this.chordProgression.length) {
            if (this.chordProgression[nextIndex].isEmpty) {
                this.selectSlotForPiano(nextIndex);
                return;
            }
            nextIndex++;
        }
        
        this.showStatus('No empty slots found');
    }

    /**
     * Select the previous empty slot
     */
    selectPreviousEmptySlot() {
        const currentIndex = this.targetChordIndex !== null ? this.targetChordIndex : this.chordProgression.length;
        let prevIndex = currentIndex - 1;
        
        // Find previous empty slot
        while (prevIndex >= 0) {
            if (this.chordProgression[prevIndex].isEmpty) {
                this.selectSlotForPiano(prevIndex);
                return;
            }
            prevIndex--;
        }
        
        // If no empty slots found before current, wrap to end
        prevIndex = this.chordProgression.length - 1;
        while (prevIndex >= currentIndex && prevIndex >= 0) {
            if (this.chordProgression[prevIndex].isEmpty) {
                this.selectSlotForPiano(prevIndex);
                return;
            }
            prevIndex--;
        }
        
        this.showStatus('No empty slots found');
    }

    /**
     * Go to specific measure and beat
     */
    gotoSpecificSlot() {
        const measureInput = document.getElementById('goto-measure');
        const beatInput = document.getElementById('goto-beat');
        
        const measureNum = parseInt(measureInput.value);
        const beatNum = parseInt(beatInput.value);
        
        if (isNaN(measureNum) || measureNum < 1) {
            this.showStatus('Please enter a valid measure number');
            return;
        }
        
        const chordsPerMeasure = this.timeSignature;
        const maxBeat = chordsPerMeasure;
        
        if (isNaN(beatNum) || beatNum < 1 || beatNum > maxBeat) {
            this.showStatus(`Please enter a valid beat number (1-${maxBeat} for ${chordsPerMeasure}/4 time)`);
            return;
        }
        
        // Convert to global index
        const globalIndex = (measureNum - 1) * chordsPerMeasure + (beatNum - 1);
        
        if (globalIndex >= this.chordProgression.length) {
            this.showStatus(`Slot not found. Current progression has ${this.chordProgression.length} slots.`);
            return;
        }
        
        // Select the slot
        this.selectSlotForPiano(globalIndex);
        
        // Clear the inputs
        measureInput.value = '';
        beatInput.value = '';
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
