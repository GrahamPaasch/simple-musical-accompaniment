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
        this.measureTimeSignatures = []; // Per-measure time signatures
        this.draggedFromIndex = null;
        this.contextChordIndex = null; // For context menu
        this.editingChordIndex = null; // For chord editing
        this.showChordNotes = false; // For showing notes above chords
        this.showChordFunctions = false; // For showing Roman numeral functions
        this.key = { tonic: 'C', mode: 'major' }; // Current key signature

        // Navigation markers for musical repeats
        this.dsMarkers = [];
        this.dcMarkers = [];
        this.toCodaIndices = [];
        this.segnoIndex = null;
        this.codaIndex = null;
        this.fineIndex = null;
        this.dsJumped = false;
        this.dcJumped = false;

        // Note mapping utilities for roman numeral parsing
        this.indexToNote = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
        this.noteToIndex = {
            'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,
            'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11
        };
        
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
        
        // Initialize with empty progression
        this.displayChords();
        
        // Initialize Roman numeral buttons (with slight delay to ensure DOM is ready)
        setTimeout(() => {
            this.updateRomanNumeralButtons();
        }, 100);
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
            const noteElement = document.createElement('span');
            noteElement.className = 'selected-note';
            noteElement.textContent = note;
            display.appendChild(noteElement);
        });
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
     * Display the current chord progression with edit buttons
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
                    
                    chordElement.addEventListener('click', async () => {
                        await this.previewChord(chord);
                    });
                }
                
                measureElement.appendChild(chordElement);
            });
            
            display.appendChild(measureElement);
        });
        
        // Update progression info
        this.updateProgressionInfo();
        
        // Update slot selection display
        this.updateSelectedSlotDisplay();
    }

    // Add placeholder methods to prevent errors
    groupChordsIntoMeasures(chords) {
        const measures = [];
        let currentMeasure = [];
        let chordsInCurrentMeasure = 0;
        const chordsPerMeasure = this.timeSignature;
        
        for (let i = 0; i < chords.length; i++) {
            const chord = chords[i];
            currentMeasure.push(chord);
            chordsInCurrentMeasure++;
            
            if (chordsInCurrentMeasure >= chordsPerMeasure) {
                measures.push([...currentMeasure]);
                currentMeasure = [];
                chordsInCurrentMeasure = 0;
            }
        }
        
        if (currentMeasure.length > 0) {
            while (currentMeasure.length < chordsPerMeasure) {
                currentMeasure.push({ name: '', notes: [], isEmpty: true });
            }
            measures.push(currentMeasure);
        }
        
        return measures;
    }

    getGlobalChordIndex(measureIndex, chordIndex) {
        const chordsPerMeasure = this.timeSignature;
        return (measureIndex * chordsPerMeasure) + chordIndex;
    }

    async previewChord(chord) {
        this.showStatus(`Previewing: ${chord.name}`);
    }

    deleteChordAtIndex(index) {
        if (index >= 0 && index < this.chordProgression.length) {
            this.chordProgression.splice(index, 1);
            this.displayChords();
            this.showStatus(`Deleted chord at position ${index + 1}`);
        }
    }

    updateProgressionInfo() {
        // Placeholder - implement if needed
    }

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

    bindEvents() {
        // Add event listeners for piano keyboard
        document.querySelectorAll('.key').forEach(key => {
            key.addEventListener('click', async (e) => {
                const note = e.target.dataset.note;
                await this.toggleNote(note, e.target);
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
    }

    async toggleNote(note, keyElement) {
        if (this.selectedNotes.includes(note)) {
            // Remove note
            this.selectedNotes = this.selectedNotes.filter(n => n !== note);
            keyElement.classList.remove('active');
        } else {
            // Add note
            this.selectedNotes.push(note);
            keyElement.classList.add('active');
        }
        
        this.updateSelectedNotesDisplay();
    }

    async playSelectedNotes() {
        this.showStatus(`Playing: ${this.selectedNotes.join(', ')}`);
    }

    addSelectionToProgression() {
        if (this.selectedNotes.length === 0) {
            this.showStatus('No notes selected to add');
            return;
        }
        
        const chord = {
            name: this.selectedNotes.join('-'),
            notes: [...this.selectedNotes],
            duration: '1n',
            isCustom: true
        };
        
        if (this.targetChordIndex !== null) {
            this.chordProgression[this.targetChordIndex] = chord;
        } else {
            this.chordProgression.push(chord);
        }
        
        this.displayChords();
        this.showStatus(`Added chord: ${chord.name}`);
    }

    clearSlotSelection() {
        this.targetChordIndex = null;
        this.updateSelectedSlotDisplay();
        this.displayChords();
        this.showStatus('Slot selection cleared');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MusicalAccompanist();
});
