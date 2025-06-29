# MicrophoneWaveformControl

## MicrophoneControl, WaveformControl

Microphone and Waveform share the same 2-state (described below) transition model (finite state machine transition paradigm):

Active Color is defined as the default green color used in IBM Carbon design system.

Grey color is defined as the default grey color used in IBM Carbon design system.

Waveform control UI component deault to 20 bars.

1. Listening: 
Microphone: Active color, no slanted line across.

Waveform: Active color, all bars reponse to real time audio sound.

2. Mute: 
Microphone: Grey color with a dashed grey line slanted on the top, the line slants from top left to bottom right.

Waveform: Grey color, it should display static bars (bars that don't move/respond to audio sound) in greyed-out mode, when in greyed-out mode, the height of each bar can be set to a descending height from 50% to 2% from left to right

## Display

After the MicrophoneWaveformControl is loaded onto the screen (after theire react JS component loads completes), both controls (microphone and waveform widget) should be in listening state (state 1). Clicking on the microphone and its enclosing circle anywhere should toggle the MicrophoneWaveformControl's state between state 1 (listening) and state 2 (mute).


If user press on MicrophoneWaveformControl when it is in state 1, it goes to state 3, if user presses on it while it is in state 2, it goes to state 1.

## Layout Implementation



