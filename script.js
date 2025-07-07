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
        this.metronomeEnabled = true;
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
        
        // Initialize with empty progression
        this.displayChords();
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
            measureDeleteBtn.title = 'Clear all slots in measure';
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
                
                if (chord.isEmpty) {
                    // Empty slot for incomplete measures
                    chordElement.classList.add('empty-slot');
                    chordElement.textContent = '';
                    
                    // Make empty slots clickable to select for piano input
                    chordElement.addEventListener('click', () => {
                        // If the slot is beyond current progression, extend the progression
                        if (globalChordIndex >= this.chordProgression.length) {
                            // Extend progression with empty slots up to this index
                            while (this.chordProgression.length <= globalChordIndex) {
                                this.chordProgression.push({
                                    name: '',
                                    notes: [],
                                    duration: '1n',
                                    isEmpty: true
                                });
                            }
                        }
                        this.selectSlotForPiano(globalChordIndex);
                    });
                    
                    // Add right-click context menu for options
                    chordElement.addEventListener('contextmenu', (e) => {
                        // If the slot is beyond current progression, extend the progression
                        if (globalChordIndex >= this.chordProgression.length) {
                            while (this.chordProgression.length <= globalChordIndex) {
                                this.chordProgression.push({
                                    name: '',
                                    notes: [],
                                    duration: '1n',
                                    isEmpty: true
                                });
                            }
                        }
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
                
                // Add selected slot highlighting for piano input
                if (globalChordIndex === this.targetChordIndex) {
                    chordElement.classList.add('selected-for-piano');
                }
                
                chordElement.dataset.index = globalChordIndex;
                
                // Make chord clickable to preview (but not empty slots)
                if (!chord.isEmpty) {
                    // Add chord delete button
                    const chordDeleteBtn = document.createElement('button');
                    chordDeleteBtn.className = 'chord-delete';
                    chordDeleteBtn.innerHTML = '×';
                    chordDeleteBtn.title = 'Clear chord slot';
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
        
        // Only highlight during playback
        if (!this.isPlaying) {
            return;
        }
        
        // Highlight current chord
        const currentItem = document.querySelector(`[data-index="${this.currentChordIndex}"]`);
        if (currentItem) {
            currentItem.classList.add('current');
            
            // Highlight the current measure
            const measureElement = currentItem.closest('.measure');
            if (measureElement) {
                measureElement.classList.add('current-measure');
            }
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
        document.querySelectorAll('.measure').forEach(measure => {
            measure.classList.remove('current-measure');
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
            const currentSlotIndex = this.targetChordIndex;
            this.chordProgression[this.targetChordIndex] = chord;
            this.showStatus(`Filled slot ${this.targetChordIndex + 1} with ${chordName}`);
            
            // Auto-advance to next empty slot if available
            this.autoAdvanceToNextEmptySlot(currentSlotIndex);
        } else {
            // Add to end of progression (original behavior)
            this.chordProgression.push(chord);
            this.showStatus(`Added ${chordName} to progression`);
            this.clearSlotSelection();
        }
        
        // Update display
        this.displayChords();
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
     * Delete a chord at the specified index (replace with empty slot)
     */
    deleteChordAtIndex(chordIndex) {
        if (chordIndex < 0 || chordIndex >= this.chordProgression.length) {
            this.showStatus('Invalid chord index');
            return;
        }

        // Stop playback if currently playing
        if (this.isPlaying) {
            this.stopPlayback();
        }

        // Get chord info for status message
        const chordToDelete = this.chordProgression[chordIndex];
        const chordName = chordToDelete.name || 'Empty Slot';

        // Replace the chord with an empty slot instead of removing it
        this.chordProgression[chordIndex] = {
            name: '',
            notes: [],
            duration: '1n',
            isEmpty: true
        };

        // Clear slot selection if the deleted chord was selected
        if (this.targetChordIndex === chordIndex) {
            this.clearSlotSelection();
        }

        // Update the display
        this.displayChords();
        this.hideContextMenu();

        // Show status message
        this.showStatus(`Cleared "${chordName}" - slot ${chordIndex + 1} is now empty`);
    }

    /**
     * Delete an entire measure at the specified index (clear all slots in measure)
     */
    deleteMeasure(measureIndex) {
        const chordsPerMeasure = this.timeSignature;
        const startIndex = measureIndex * chordsPerMeasure;
        const endIndex = startIndex + chordsPerMeasure;

        if (startIndex >= this.chordProgression.length) {
            this.showStatus('Invalid measure index');
            return;
        }

        // Confirm deletion of the measure
        const measureNumber = measureIndex + 1;
        const confirmMessage = `Clear all slots in measure ${measureNumber}? This will empty ${chordsPerMeasure} chord slots.`;
        
        if (!confirm(confirmMessage)) {
            return;
        }

        // Stop playback if currently playing
        if (this.isPlaying) {
            this.stopPlayback();
        }

        // Calculate how many slots to actually clear (in case of partial measures)
        const slotsToImpact = Math.min(chordsPerMeasure, this.chordProgression.length - startIndex);
        let clearedCount = 0;

        // Replace all chords in the measure with empty slots
        for (let i = 0; i < slotsToImpact; i++) {
            const slotIndex = startIndex + i;
            if (!this.chordProgression[slotIndex].isEmpty) {
                this.chordProgression[slotIndex] = {
                    name: '',
                    notes: [],
                    duration: '1n',
                    isEmpty: true
                };
                clearedCount++;
            }
        }

        // Clear slot selection if it was in the cleared measure
        if (this.targetChordIndex !== null && 
            this.targetChordIndex >= startIndex && 
            this.targetChordIndex < endIndex) {
            this.clearSlotSelection();
        }

        // Update the display
        this.displayChords();

        // Show status message
        this.showStatus(`Cleared measure ${measureNumber} (${clearedCount} chord slots emptied)`);
    }

    /**
     * Edit a chord at the specified index
     */
    editChord(chordIndex) {
        if (chordIndex < 0 || chordIndex >= this.chordProgression.length) {
            this.showStatus('Invalid chord index');
            return;
        }

        this.editingChordIndex = chordIndex;
        const chord = this.chordProgression[chordIndex];
        
        // Get the modal elements
        const modal = document.getElementById('chord-edit-modal');
        const input = document.getElementById('chord-edit-input');
        
        if (!modal || !input) {
            this.showStatus('Edit modal not found');
            return;
        }

        // Pre-fill the input with current chord name
        input.value = chord.name || '';
        
        // Show the modal
        modal.style.display = 'block';
        input.focus();
        
        // Hide context menu
        this.hideContextMenu();
    }

    /**
     * Save the edited chord
     */
    saveChordEdit() {
        const input = document.getElementById('chord-edit-input');
        const newChordName = input.value.trim();
        
        if (!newChordName) {
            this.showStatus('Please enter a chord name');
            return;
        }

        if (this.editingChordIndex === null || this.editingChordIndex < 0 || this.editingChordIndex >= this.chordProgression.length) {
            this.showStatus('Invalid chord index for editing');
            this.closeEditModal();
            return;
        }

        // Parse the new chord
        const newChord = this.parseChord(newChordName);
        
        if (!newChord) {
            this.showStatus('Invalid chord name. Try examples like: C, Am, F7, or C-E-G');
            return;
        }

        // Update the chord in the progression
        this.chordProgression[this.editingChordIndex] = newChord;
        this.chordProgression[this.editingChordIndex].edited = true;

        // Update the display
        this.displayChords();
        
        // Close the modal
        this.closeEditModal();
        
        // Show status message
        this.showStatus(`Updated chord to "${newChord.name}"`);
    }

    /**
     * Close the edit modal
     */
    closeEditModal() {
        const modal = document.getElementById('chord-edit-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.editingChordIndex = null;
    }

    /**
     * Duplicate a chord at the specified index
     */
    duplicateChord(chordIndex) {
        if (chordIndex < 0 || chordIndex >= this.chordProgression.length) {
            this.showStatus('Invalid chord index');
            return;
        }

        const chordToDuplicate = this.chordProgression[chordIndex];
        
        // Create a copy of the chord
        const duplicatedChord = {
            ...chordToDuplicate,
            notes: [...chordToDuplicate.notes]
        };

        // Insert the duplicated chord right after the original
        this.chordProgression.splice(chordIndex + 1, 0, duplicatedChord);

        // Update current chord index if needed
        if (this.currentChordIndex > chordIndex) {
            this.currentChordIndex++;
        }

        // Update target chord index if needed
        if (this.targetChordIndex !== null && this.targetChordIndex > chordIndex) {
            this.targetChordIndex++;
        }

        // Update the display
        this.displayChords();
        this.hideContextMenu();

        // Show status message
        this.showStatus(`Duplicated "${chordToDuplicate.name || 'Empty Slot'}"`);
    }

    /**
     * Insert an empty chord at the specified index
     */
    insertEmptyChord(insertIndex) {
        // Clamp the insert index to valid range
        insertIndex = Math.max(0, Math.min(insertIndex, this.chordProgression.length));

        const emptyChord = {
            name: '',
            notes: [],
            duration: '1n',
            isEmpty: true
        };

        // Insert the empty chord
        this.chordProgression.splice(insertIndex, 0, emptyChord);

        // Update current chord index if needed
        if (this.currentChordIndex >= insertIndex) {
            this.currentChordIndex++;
        }

        // Update target chord index if needed
        if (this.targetChordIndex !== null && this.targetChordIndex >= insertIndex) {
            this.targetChordIndex++;
        }

        // Update the display
        this.displayChords();
        this.hideContextMenu();

        // Automatically select the new empty slot
        this.selectSlotForPiano(insertIndex);

        // Show status message
        this.showStatus(`Inserted empty chord slot at position ${insertIndex + 1}`);
    }

    /**
     * Show chord substitution suggestions
     */
    showChordSubstitutions(chordIndex) {
        if (chordIndex < 0 || chordIndex >= this.chordProgression.length) {
            this.showStatus('Invalid chord index');
            return;
        }

        const chord = this.chordProgression[chordIndex];
        this.hideContextMenu();
        
        // Simple substitution suggestions
        const substitutions = this.getChordSubstitutions(chord.name);
        
        if (substitutions.length === 0) {
            this.showStatus('No substitutions available for this chord');
            return;
        }

        // Create a simple alert with substitutions
        const substitutionText = substitutions.join(', ');
        alert(`Substitution suggestions for ${chord.name}:\n${substitutionText}\n\nDouble-click the chord to edit it manually.`);
    }

    /**
     * Get chord substitution suggestions
     */
    getChordSubstitutions(chordName) {
        const substitutions = {
            'C': ['Am', 'Em', 'F', 'C7'],
            'F': ['Dm', 'Am', 'Bb', 'F7'],
            'G': ['Em', 'Bm', 'C', 'G7'],
            'Am': ['C', 'F', 'Dm', 'Am7'],
            'Dm': ['F', 'Bb', 'Am', 'Dm7'],
            'Em': ['G', 'C', 'Am', 'Em7'],
            // Add more substitutions as needed
        };

        return substitutions[chordName] || [];
    }

    /**
     * Delete a chord from the edit modal
     */
    deleteChord() {
        if (this.editingChordIndex === null || this.editingChordIndex < 0 || this.editingChordIndex >= this.chordProgression.length) {
            this.showStatus('No chord selected for deletion');
            this.closeEditModal();
            return;
        }

        // Confirm deletion
        const chord = this.chordProgression[this.editingChordIndex];
        const chordName = chord.name || 'Empty Slot';
        
        if (!confirm(`Clear "${chordName}" from slot ${this.editingChordIndex + 1}?`)) {
            return;
        }

        // Close modal first
        this.closeEditModal();

        // Clear the chord slot
        this.deleteChordAtIndex(this.editingChordIndex);
    }

    /**
     * Show context menu for chord options
     */
    showContextMenu(event, chordIndex) {
        event.preventDefault();
        event.stopPropagation();
        
        this.contextChordIndex = chordIndex;
        
        const menu = document.getElementById('chord-context-menu');
        if (!menu) {
            this.showStatus('Context menu not found');
            return;
        }

        // Position and show the menu
        menu.style.left = event.clientX + 'px';
        menu.style.top = event.clientY + 'px';
        menu.style.display = 'block';
    }

    /**
     * Hide the context menu
     */
    hideContextMenu() {
        const menu = document.getElementById('chord-context-menu');
        if (menu) {
            menu.style.display = 'none';
        }
        this.contextChordIndex = null;
    }

    /**
     * Select a slot for piano input
     */
    selectSlotForPiano(slotIndex) {
        if (slotIndex < 0 || slotIndex >= this.chordProgression.length) {
            this.showStatus('Invalid slot index');
            return;
        }

        this.targetChordIndex = slotIndex;
        this.updateSelectedSlotDisplay();
        
        const slot = this.chordProgression[slotIndex];
        const slotName = slot.isEmpty ? 'Empty Slot' : slot.name;
        this.showStatus(`Selected slot ${slotIndex + 1} (${slotName}) for piano input`);
        
        // Update display to show selected slot
        this.displayChords();
    }

    /**
     * Clear slot selection
     */
    clearSlotSelection() {
        this.targetChordIndex = null;
        this.updateSelectedSlotDisplay();
        this.showStatus('Slot selection cleared');
        this.displayChords();
    }

    /**
     * Update the selected slot display
     */
    updateSelectedSlotDisplay() {
        const display = document.getElementById('selected-slot-display');
        const infoText = document.getElementById('slot-info-text');
        const measureInput = document.getElementById('goto-measure');
        const beatInput = document.getElementById('goto-beat');
        
        if (!display || !infoText) return;

        // Always show the slot navigation panel
        display.style.display = 'block';

        if (this.chordProgression.length === 0) {
            infoText.textContent = 'No measures available - Use "📐" to create measures';
            // Clear the measure/beat inputs when no measures exist
            if (measureInput) measureInput.value = '';
            if (beatInput) beatInput.value = '';
        } else if (this.targetChordIndex === null) {
            infoText.textContent = 'No slot selected';
            // Clear the measure/beat inputs when no slot is selected
            if (measureInput) measureInput.value = '';
            if (beatInput) beatInput.value = '';
        } else {
            const slot = this.chordProgression[this.targetChordIndex];
            const measureInfo = this.getMeasureIndices(this.targetChordIndex);
            const slotName = slot && slot.isEmpty ? 'Empty Slot' : (slot ? slot.name : 'Unknown');
            infoText.textContent = `Slot ${this.targetChordIndex + 1} (M${measureInfo.measureIndex + 1}B${measureInfo.chordIndex + 1}): ${slotName}`;
            
            // Auto-populate the measure/beat inputs with the current slot's position
            if (measureInput) measureInput.value = measureInfo.measureIndex + 1;
            if (beatInput) beatInput.value = measureInfo.chordIndex + 1;
        }
    }

    /**
     * Create empty measures
     */
    createEmptyMeasures() {
        const countInput = document.getElementById('measure-count');
        const measureCount = parseInt(countInput.value) || 4;
        
        if (measureCount < 1 || measureCount > 500) {
            this.showStatus('Please enter a number between 1 and 500');
            return;
        }

        const chordsPerMeasure = this.timeSignature;
        const totalSlots = measureCount * chordsPerMeasure;
        
        let confirmMessage = `Create ${measureCount} empty measures (${totalSlots} chord slots)?`;
        
        // Add performance warning for very large progressions
        if (measureCount > 100) {
            confirmMessage += `\n\nNote: Creating ${measureCount} measures will generate a large progression. For best performance with classical pieces, consider working in sections.`;
        }
        
        if (!confirm(confirmMessage)) {
            return;
        }

        // Stop playback if currently playing
        if (this.isPlaying) {
            this.stopPlayback();
        }

        // Create empty slots
        for (let i = 0; i < totalSlots; i++) {
            this.chordProgression.push({
                name: '',
                notes: [],
                duration: '1n',
                isEmpty: true
            });
        }

        // Update display
        this.displayChords();
        this.showStatus(`Created ${measureCount} empty measures (${totalSlots} slots)`);
    }

    /**
     * Add a rest to the currently selected target slot
     */
    addRestToTarget() {
        if (this.targetChordIndex === null) {
            this.showStatus('No slot selected. Click on an empty slot first.');
            return;
        }

        if (this.targetChordIndex < 0 || this.targetChordIndex >= this.chordProgression.length) {
            this.showStatus('Invalid slot index');
            return;
        }

        // Create rest chord
        const restChord = {
            name: 'REST',
            notes: [],
            duration: '1n',
            isRest: true
        };

        // Replace the slot with the rest
        this.chordProgression[this.targetChordIndex] = restChord;
        
        // Update display
        this.displayChords();
        this.showStatus(`Added rest to slot ${this.targetChordIndex + 1}`);
        
        // Clear selection
        this.clearSlotSelection();
    }

    /**
     * Select previous empty slot
     */
    selectPreviousEmptySlot() {
        if (this.chordProgression.length === 0) {
            this.showStatus('No measures available. Use the "📐" button to create empty measures first.');
            return;
        }
        
        let searchIndex = this.targetChordIndex !== null ? this.targetChordIndex - 1 : this.chordProgression.length - 1;
        
        for (let i = 0; i < this.chordProgression.length; i++) {
            if (searchIndex < 0) searchIndex = this.chordProgression.length - 1;
            
            const slot = this.chordProgression[searchIndex];
            if (slot && slot.isEmpty) {
                this.selectSlotForPiano(searchIndex);
                return;
            }
            searchIndex--;
        }
        
        this.showStatus('No empty slots found');
    }

    /**
     * Select next empty slot
     */
    selectNextEmptySlot() {
        if (this.chordProgression.length === 0) {
            this.showStatus('No measures available. Use the "📐" button to create empty measures first.');
            return;
        }
        
        let searchIndex = this.targetChordIndex !== null ? this.targetChordIndex + 1 : 0;
        
        for (let i = 0; i < this.chordProgression.length; i++) {
            if (searchIndex >= this.chordProgression.length) searchIndex = 0;
            
            const slot = this.chordProgression[searchIndex];
            if (slot && slot.isEmpty) {
                this.selectSlotForPiano(searchIndex);
                return;
            }
            searchIndex++;
        }
        
        this.showStatus('No empty slots found');
    }

    /**
     * Go to a specific slot by measure and beat
     */
    gotoSpecificSlot() {
        // Check if progression is empty
        if (this.chordProgression.length === 0) {
            this.showStatus('No measures available. Use the "📐" button to create empty measures first.');
            return;
        }
        
        const measureInput = document.getElementById('goto-measure');
        const beatInput = document.getElementById('goto-beat');
        
        const measureNumber = parseInt(measureInput.value);
        const beatNumber = parseInt(beatInput.value);
        
        if (!measureNumber || measureNumber < 1) {
            this.showStatus('Please enter a valid measure number (1 or higher)');
            return;
        }
        
        if (!beatNumber || beatNumber < 1 || beatNumber > this.timeSignature) {
            this.showStatus(`Please enter a valid beat number (1-${this.timeSignature})`);
            return;
        }
        
        const measureIndex = measureNumber - 1;
        const beatIndex = beatNumber - 1;
        const globalIndex = this.getGlobalChordIndex(measureIndex, beatIndex);
        
        if (globalIndex >= this.chordProgression.length) {
            this.showStatus('That slot does not exist in the current progression');
            return;
        }
        
        this.selectSlotForPiano(globalIndex);
        
        // Clear the inputs
        measureInput.value = '';
        beatInput.value = '';
    }

    /**
     * Auto-advance to the next empty slot after filling current slot
     */
    autoAdvanceToNextEmptySlot(currentSlotIndex) {
        // Look for the next empty slot starting from the slot immediately to the right
        for (let i = currentSlotIndex + 1; i < this.chordProgression.length; i++) {
            const slot = this.chordProgression[i];
            if (slot && slot.isEmpty) {
                // Found the next empty slot, select it
                this.selectSlotForPiano(i);
                return;
            }
        }
        
        // If no empty slot found to the right, clear selection
        this.clearSlotSelection();
    }

    /**
     * Show context menu for empty slots
     */
    showEmptySlotMenu(event, slotIndex) {
        // For now, just select the slot - we can expand this later
        event.preventDefault();
        this.selectSlotForPiano(slotIndex);
    }

    /**
     * Clear the entire progression
     */
    clearProgression() {
        if (this.chordProgression.length === 0) {
            this.showStatus('Progression is already empty');
            return;
        }

        if (!confirm('Clear the entire chord progression?')) {
            return;
        }

        // Stop playback if currently playing
        if (this.isPlaying) {
            this.stopPlayback();
        }

        this.chordProgression = [];
        this.currentChordIndex = 0;
        this.clearSlotSelection();
        this.displayChords();
        this.showStatus('Progression cleared');
    }

    /**
     * Update progression information display
     */
    updateProgressionInfo() {
        // Progression info display removed - no longer needed
    }
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
