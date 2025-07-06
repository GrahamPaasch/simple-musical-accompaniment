# 🎵 Musical Accompanist Tool

A web-based musical accompanist tool for practice and learning, featuring customizable chord progressions, drones, and precise timing control.

## Features

### 🎹 **Core Functionality**
- **Chord Progression Playback**: Play custom chord sequences with accurate timing
- **Drone Mode**: Continuous pitch playback for scale practice
- **Tempo Control**: Adjustable BPM from 40-200 with real-time updates
- **Volume Control**: Independent volume adjustment for accompaniment
- **Loop Mode**: Automatic looping of chord progressions
- **Metronome**: Optional click track for rhythmic reference
- **Time Signatures**: Support for 2/4, 3/4, 4/4, 6/8, and 8/8 time
- **Drag and Drop**: Rearrange chords by dragging them to new positions

### ️ **Input Methods**
- **Text Input**: Enter chord progressions using simple text notation
- **Preset Library**: Quick access to common progressions and drones
- **Piano Keyboard**: Visual piano interface for building custom chords
- **Clickable Chords**: Click any chord in the progression to preview it
- **Visual Feedback**: Real-time display of current chord and progression

### 📱 **User Interface**
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Modern UI**: Clean, colorful interface with smooth animations
- **Touch-friendly**: Large buttons and controls for mobile use
- **Visual Feedback**: Current chord highlighting and status displays

## Quick Start

1. **Open** `index.html` in a modern web browser
2. **Choose** a preset or enter custom chords
3. **Adjust** tempo, volume, time signature, and other settings
4. **Click Play** to start the accompaniment
5. **Drag chords** to rearrange your progression as needed

## Supported Chord Notation

### Basic Chords
```
C, D, E, F, G, A, B           - Major chords
Cm, Dm, Em, Fm, Gm, Am, Bm    - Minor chords  
C7, D7, E7, F7, G7, A7, B7     - Dominant 7th chords
```

### Custom Chords
```
C-E-G                         - C major chord (explicit notes)
A-C#-E-G                      - A dominant 7th chord
D-F-A-C                       - D minor 7th chord
C-E-G-B-D                     - C major 9th chord
G-B-D-F#-A                    - G major 7th chord
```

### Sharps and Flats
```
C#, D#, F#, G#, A#            - Sharp chords
Db, Eb, Gb, Ab, Bb            - Flat chords
C#-F-G#, Db-F-Ab              - Custom chords with sharps/flats
```

### Roman Numerals and Scale Degrees
```
I, IV, V, I                   - Major chords (uppercase)
ii, iii, vi                   - Minor chords (lowercase)
I7, V7, ii7                   - 7th chords
1, 4, 5, 1                    - Scale degrees (numbers 1-7)
```

### Special Symbols
```
- (dash) or REST               - Rest/pause (no sound)
| (pipe)                       - Bar line separator
```

### Input Examples
```
C F G7 C                      - Simple progression
C | Am | F | G                - With bar lines
C Am F G | C Am - G           - With rest
C-E-G F-A-C G-B-D-F C-E-G     - Custom chord progression
A-C#-E-G | D-F#-A | G-B-D     - Mixed custom and standard
I IV V I                      - Roman numeral progression
1 4 5 1                       - Scale degree progression
```

## Custom Chord Examples

The note-dash-note syntax allows you to create any chord combination:

### Basic Custom Chords
```
C-E-G                         - C major (same as standard "C")
A-C#-E                        - A major (same as standard "A")
D-F-A                         - D minor (same as standard "Dm")
G-B-D-F                       - G dominant 7th (same as standard "G7")
```

### Extended and Jazz Chords
```
C-E-G-B-D                     - C major 9th
A-C#-E-G-B                    - A dominant 9th
D-F-A-C-E                     - D minor 9th
G-B-D-F-A                     - G dominant 11th
C-E-G-B-D-F#                  - C major 7th #11
```

### Experimental and Unusual Chords
```
C-E-G#-B                      - C augmented 7th
C-Eb-Gb-A                     - C diminished 7th
C-F-G                         - C suspended 4th
C-D-G                         - C suspended 2nd
C-E-G-A-D                     - C major add9 add2
C-Eb-F#-A                     - C diminished major 7th
G-B-D-F#-A-C#                 - G major 7th add 13
```

### Non-Traditional Chord Clusters
```
C-C#-D-D#                     - Chromatic cluster
C-E-F#-B                      - Quartal harmony
A-C-E-G-Bb-D                  - Complex jazz voicing
C-D-E-F#-G#-A#                - Whole tone cluster
```

## Preset Library

### **Drone: A (440Hz)**
- Continuous A pitch for scale practice
- Perfect for violin, mandolin, or vocal practice

### **G Major I-IV-V**
- Classic G-C-D-G progression
- Great for folk and country styles

### **C Major I-vi-IV-V**
- Popular C-Am-F-G progression
- Common in pop and rock music

### **D Major Drone**
- D and A drone (root and fifth)
- Excellent for D major scale practice

### **12-Bar Blues in A**
- Complete 12-bar blues progression
- Perfect for blues practice and improvisation

## Advanced Features

### Piano Keyboard Interface
The built-in piano keyboard allows you to:
- **Click Keys**: Select individual notes by clicking on the visual piano
- **Build Chords**: Combine multiple notes to create custom chords
- **Preview Selection**: Play your selected notes instantly
- **Add to Progression**: Insert custom chords directly into your progression
- **Visual Feedback**: Selected notes are highlighted and displayed

### Chord Interaction
- **Clickable Progression**: Click any chord in the progression display to preview it
- **Rest Support**: Use `-` or `REST` to add silence/pauses in your progression
- **Live Preview**: Hear chords immediately without starting full playback
- **Drag and Drop**: Drag chords to rearrange them within your progression
- **Adjustable Time Signature**: Change between 2/4, 3/4, 4/4, 6/8, and 8/8 time signatures
- **Measure-Based Display**: Chords are organized into measures with clear visual separation
- **Right-click Context Menu**: Right-click on chords for edit, duplicate, substitute, and delete options
- **Double-click Editing**: Double-click any chord to edit it directly
- **Transpose Tools**: Transpose entire progressions up or down by semitones
- **Import/Export**: Save and load progressions as JSON files or text format
- **Chord Substitution**: Get intelligent chord substitution suggestions
- **Visual Indicators**: See chord functions, note names, and edit status
- **Empty Slot Insertion**: Add placeholder chords for easier progression building

### Just Intonation
When enabled, Just Intonation mode adjusts chord intervals to use pure harmonic ratios:
- **Major Third**: 5:4 ratio (14 cents flatter than equal temperament)
- **Perfect Fifth**: 3:2 ratio (2 cents sharper than equal temperament)
- **Minor Third**: 6:5 ratio (slightly different from equal temperament)

This creates more consonant, "in-tune" harmonies that are easier on the ear and better for ear training.

### Timing and Synchronization
- Uses Web Audio API for precise timing
- Chord changes are scheduled in advance to avoid timing drift
- Metronome clicks are synchronized with the main beat

## Technical Details

### Built With
- **HTML5**: Semantic structure and responsive layout
- **CSS3**: Modern styling with gradients and animations
- **JavaScript (ES6+)**: Core functionality and audio processing
- **Tone.js**: Professional audio synthesis and timing
- **Web Audio API**: Low-level audio processing

### Browser Support
- **Chrome**: Full support (recommended)
- **Firefox**: Full support
- **Safari**: Full support
- **Edge**: Full support
- **Mobile browsers**: Full support on iOS Safari and Android Chrome

### Performance
- Lightweight: No server required, runs entirely in browser
- Efficient: Optimized audio scheduling prevents glitches
- Responsive: Smooth UI updates even during playback

## Usage Tips

### For Instrument Practice
1. **Scale Practice**: Use drone modes to practice scales against a tonic
2. **Chord Practice**: Play along with progressions to develop timing
3. **Ear Training**: Practice identifying chord progressions and intervals

### For Singing
1. **Pitch Reference**: Use drones to establish key center
2. **Harmony Practice**: Sing harmonies over chord progressions
3. **Rhythm Training**: Use metronome for timing

### For Composition
1. **Chord Exploration**: Test different progressions quickly
2. **Key Modulation**: Switch between different key centers
3. **Rhythm Patterns**: Experiment with different tempos

## Keyboard Shortcuts

- **Ctrl+Enter**: Parse chord input
- **Spacebar**: Play/Pause (when focused on controls)
- **Escape**: Stop playback
- **Right-click**: Context menu on chords (edit, duplicate, delete, etc.)
- **Double-click**: Edit chord directly
- **Drag & Drop**: Rearrange chords by dragging

## Troubleshooting

### No Sound
- Check browser audio permissions
- Ensure speakers/headphones are connected
- Try refreshing the page
- Check volume slider is not at zero

### Timing Issues
- Close other audio applications
- Try reducing browser load (close other tabs)
- Check system audio settings

### Mobile Issues
- Ensure device is not in silent mode
- Try using headphones
- Check browser permissions for audio

## Development

### File Structure
```
simple-musical-accompaniment/
├── index.html          # Main HTML file
├── styles.css          # CSS styling
├── script.js           # JavaScript functionality
└── README.md           # This documentation
```

### Customization
- **Add New Chords**: Extend the `chordPatterns` object in `script.js`
- **Create Presets**: Add entries to the `presets` object
- **Change Styling**: Edit `styles.css` for visual customization

## Contributing

This is an open-source project. Feel free to:
- Report bugs and request features
- Submit pull requests with improvements
- Create additional presets or chord patterns
- Improve the audio synthesis and timing

## License

This project is released under the MIT License. Feel free to use, modify, and distribute.

## Acknowledgments

- **Tone.js**: For excellent Web Audio API abstraction
- **Web Audio API**: For low-level audio processing capabilities
- **Music Theory**: Based on traditional Western harmony and just intonation principles

---

**Happy practicing! 🎵**