/**
 * Chord Manager for Musical Accompanist Tool
 * Handles chord parsing, progression logic, and frequency calculations
 */
export class ChordManager {
    constructor(errorLogger) {
        this.errorLogger = errorLogger;
        
        // Note mapping utilities
        this.indexToNote = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
        this.noteToIndex = {
            'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,
            'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11
        };

        // Chord patterns and intervals
        this.chordPatterns = this.initializeChordPatterns();
        
        // Just intonation ratios for pure harmonies
        this.justIntonationRatios = {
            'unison': 1,
            'minor2': 16/15,
            'major2': 9/8,
            'minor3': 6/5,
            'major3': 5/4,
            'perfect4': 4/3,
            'tritone': 7/5,
            'perfect5': 3/2,
            'minor6': 8/5,
            'major6': 5/3,
            'minor7': 16/9,
            'major7': 15/8,
            'octave': 2
        };

        // Base frequency for A4
        this.baseFrequency = 440;
        this.baseNote = 'A';
        this.baseOctave = 4;
    }

    /**
     * Initialize chord patterns
     */
    initializeChordPatterns() {
        return {
            // Major chords
            '': [0, 4, 7],           // Major triad
            'maj': [0, 4, 7],        // Major triad
            'M': [0, 4, 7],          // Major triad
            'major': [0, 4, 7],      // Major triad
            'maj7': [0, 4, 7, 11],   // Major 7th
            'M7': [0, 4, 7, 11],     // Major 7th
            'maj9': [0, 4, 7, 11, 14], // Major 9th
            'add9': [0, 4, 7, 14],   // Add 9
            '6': [0, 4, 7, 9],       // Major 6th
            'maj6': [0, 4, 7, 9],    // Major 6th

            // Minor chords
            'm': [0, 3, 7],          // Minor triad
            'min': [0, 3, 7],        // Minor triad
            'minor': [0, 3, 7],      // Minor triad
            'm7': [0, 3, 7, 10],     // Minor 7th
            'min7': [0, 3, 7, 10],   // Minor 7th
            'm9': [0, 3, 7, 10, 14], // Minor 9th
            'm6': [0, 3, 7, 9],      // Minor 6th
            'min6': [0, 3, 7, 9],    // Minor 6th

            // Dominant chords
            '7': [0, 4, 7, 10],      // Dominant 7th
            'dom7': [0, 4, 7, 10],   // Dominant 7th
            '9': [0, 4, 7, 10, 14],  // Dominant 9th
            '13': [0, 4, 7, 10, 14, 21], // Dominant 13th

            // Diminished chords
            'dim': [0, 3, 6],        // Diminished triad
            '°': [0, 3, 6],          // Diminished triad
            'dim7': [0, 3, 6, 9],    // Diminished 7th
            '°7': [0, 3, 6, 9],      // Diminished 7th

            // Augmented chords
            'aug': [0, 4, 8],        // Augmented triad
            '+': [0, 4, 8],          // Augmented triad
            'aug7': [0, 4, 8, 10],   // Augmented 7th

            // Suspended chords
            'sus2': [0, 2, 7],       // Suspended 2nd
            'sus4': [0, 5, 7],       // Suspended 4th
            '7sus4': [0, 5, 7, 10],  // 7 suspended 4th

            // Half-diminished
            'm7b5': [0, 3, 6, 10],   // Half-diminished
            'ø7': [0, 3, 6, 10],     // Half-diminished

            // Power chord
            '5': [0, 7],             // Power chord (root and fifth)

            // Extended chords
            '11': [0, 4, 7, 10, 14, 17], // 11th chord
            'm11': [0, 3, 7, 10, 14, 17], // Minor 11th
        };
    }

    /**
     * Parse a chord string and return chord information
     */
    parseChord(input) {
        if (!input || typeof input !== 'string') {
            return this.createEmptyChord();
        }

        const cleanInput = input.trim().toUpperCase();
        
        // Handle rest notation
        if (cleanInput === '-' || cleanInput === 'REST') {
            return this.createRestChord();
        }

        try {
            const match = cleanInput.match(/^([A-G][#b]?)(.*)$/);
            
            if (!match) {
                this.errorLogger.logWarning('Invalid chord format', { input, cleanInput });
                return this.createEmptyChord();
            }

            const [, root, quality] = match;
            const rootNote = this.normalizeNote(root);
            
            if (rootNote === null) {
                this.errorLogger.logWarning('Invalid root note', { input, root });
                return this.createEmptyChord();
            }

            const intervals = this.getChordIntervals(quality);
            const notes = this.buildChordNotes(rootNote, intervals);

            return {
                name: input.trim(),
                root: rootNote,
                quality: quality || 'major',
                intervals,
                notes,
                isEmpty: false,
                isRest: false
            };

        } catch (error) {
            this.errorLogger.logError(error, { 
                module: 'ChordManager', 
                method: 'parseChord', 
                input 
            });
            return this.createEmptyChord();
        }
    }

    /**
     * Create an empty chord object
     */
    createEmptyChord() {
        return {
            name: '',
            root: null,
            quality: null,
            intervals: [],
            notes: [],
            isEmpty: true,
            isRest: false
        };
    }

    /**
     * Create a rest chord object
     */
    createRestChord() {
        return {
            name: 'REST',
            root: null,
            quality: 'rest',
            intervals: [],
            notes: [],
            isEmpty: false,
            isRest: true
        };
    }

    /**
     * Normalize note name (convert flats to sharps, validate)
     */
    normalizeNote(note) {
        const normalized = note.replace('b', '#').replace('DB', 'C#')
            .replace('EB', 'D#').replace('GB', 'F#')
            .replace('AB', 'G#').replace('BB', 'A#');
        
        return this.noteToIndex.hasOwnProperty(normalized) ? normalized : null;
    }

    /**
     * Get chord intervals for a given quality
     */
    getChordIntervals(quality) {
        const normalizedQuality = quality.toLowerCase();
        return this.chordPatterns[normalizedQuality] || this.chordPatterns[''];
    }

    /**
     * Build chord notes from root and intervals
     */
    buildChordNotes(root, intervals) {
        const rootIndex = this.noteToIndex[root];
        return intervals.map(interval => {
            const noteIndex = (rootIndex + interval) % 12;
            return this.indexToNote[noteIndex];
        });
    }

    /**
     * Get frequencies for a chord (using just intonation)
     */
    getChordFrequencies(chord, baseOctave = 4) {
        if (!chord || chord.isEmpty || chord.isRest) {
            return [];
        }

        try {
            const rootNote = chord.root;
            const rootFreq = this.getNoteFrequency(rootNote, baseOctave);
            
            return chord.intervals.map(interval => {
                const ratio = this.getIntervalRatio(interval);
                return rootFreq * ratio;
            }).filter(freq => freq > 0);

        } catch (error) {
            this.errorLogger.logError(error, {
                module: 'ChordManager',
                method: 'getChordFrequencies',
                chord: chord.name
            });
            return [];
        }
    }

    /**
     * Get frequency for a specific note
     */
    getNoteFrequency(note, octave = 4) {
        const noteIndex = this.noteToIndex[note];
        const baseNoteIndex = this.noteToIndex[this.baseNote];
        
        const semitonesFromBase = noteIndex - baseNoteIndex;
        const octaveAdjustment = octave - this.baseOctave;
        
        return this.baseFrequency * Math.pow(2, (semitonesFromBase + octaveAdjustment * 12) / 12);
    }

    /**
     * Get just intonation ratio for an interval
     */
    getIntervalRatio(semitones) {
        const intervalNames = [
            'unison', 'minor2', 'major2', 'minor3', 'major3', 'perfect4',
            'tritone', 'perfect5', 'minor6', 'major6', 'minor7', 'major7'
        ];
        
        const normalizedInterval = semitones % 12;
        const octaves = Math.floor(semitones / 12);
        const intervalName = intervalNames[normalizedInterval];
        
        const baseRatio = this.justIntonationRatios[intervalName] || Math.pow(2, normalizedInterval / 12);
        return baseRatio * Math.pow(2, octaves);
    }

    /**
     * Transpose a chord by semitones
     */
    transposeChord(chord, semitones) {
        if (!chord || chord.isEmpty || chord.isRest) {
            return chord;
        }

        try {
            const rootIndex = this.noteToIndex[chord.root];
            const newRootIndex = (rootIndex + semitones + 12) % 12;
            const newRoot = this.indexToNote[newRootIndex];
            
            const newNotes = chord.notes.map(note => {
                const noteIndex = this.noteToIndex[note];
                const newNoteIndex = (noteIndex + semitones + 12) % 12;
                return this.indexToNote[newNoteIndex];
            });

            return {
                ...chord,
                root: newRoot,
                notes: newNotes,
                name: newRoot + chord.quality
            };

        } catch (error) {
            this.errorLogger.logError(error, {
                module: 'ChordManager',
                method: 'transposeChord',
                chord: chord.name,
                semitones
            });
            return chord;
        }
    }

    /**
     * Validate chord progression
     */
    validateProgression(chordStrings) {
        const results = {
            valid: true,
            errors: [],
            warnings: [],
            chords: []
        };

        chordStrings.forEach((chordString, index) => {
            const chord = this.parseChord(chordString);
            results.chords.push(chord);

            if (chord.isEmpty && chordString.trim() !== '') {
                results.errors.push(`Invalid chord at position ${index + 1}: "${chordString}"`);
                results.valid = false;
            }
        });

        return results;
    }

    /**
     * Get available chord qualities
     */
    getAvailableQualities() {
        return Object.keys(this.chordPatterns).sort();
    }

    /**
     * Get chord suggestions based on key
     */
    getChordSuggestions(key = 'C', mode = 'major') {
        const scaleIntervals = mode === 'major' 
            ? [0, 2, 4, 5, 7, 9, 11]  // Major scale
            : [0, 2, 3, 5, 7, 8, 10]; // Natural minor scale

        const keyIndex = this.noteToIndex[key];
        
        return scaleIntervals.map((interval, degree) => {
            const noteIndex = (keyIndex + interval) % 12;
            const note = this.indexToNote[noteIndex];
            
            // Determine chord quality based on scale degree
            let quality = '';
            if (mode === 'major') {
                quality = [0, 3, 4].includes(degree) ? '' : // I, IV, V = major
                         [1, 2, 5].includes(degree) ? 'm' : // ii, iii, vi = minor
                         'dim'; // vii = diminished
            } else {
                quality = [0, 3, 4].includes(degree) ? 'm' : // i, iv, v = minor
                         [1, 5].includes(degree) ? 'dim' : // ii, vi = diminished
                         [2, 6].includes(degree) ? '' : // III, VII = major
                         ''; // Default
            }
            
            return note + quality;
        });
    }
}
