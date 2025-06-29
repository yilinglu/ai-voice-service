# Frontend Application Development Plan
## UI Design
Adopt IBM's Carbon Design System, see appendix. 
## Step 1
Build a front end application that repalces the current layercode frontend, such as https://dash.layercode.com/pipelines/e0y2kgye/playground in prod and https://dash.layercode.com/pipelines/g0yw0o69 in staging environment.

At this step, via a chatbot UI the customer and an AI agent talks back and forth to engage in an interesting conversation about anything and everything. The customer experience ultra low latency, they feel they are talking to an intelligent philosopher.
[Carbon Design chatbot UI component reference](https://carbondesignsystem.com/community/patterns/chatbot/usage/#best-practices)

Suggest an UI framework that can start with a couple of core functions and expand, extend to support more business functions.
### Foundational functions
1. User login by integration with Auth0's single sign-on (SSO) platform.
### Core Functions
1. A chatbot on the home page to interact with the user via voice and via text. Make the voice interation function a prominent feature on the page.
1. Microphone UI to toggle on and off for capturing audio input
1. UI widget to visualize sound in analog form and digital form (some call it MIDI piano roll)

### Future Expansions
1. Chat history browse, search, from chat history, allow users to select user questions and AI response to share out via text message, email and other social network
1. Tabulate view of chat history
1. Graph visualization of chat history along time dimension to show usage pattern

# Appendix

## IBM's Carbon Design System
**IBM's Carbon Design System** has excellent support for **Next.js** and **React**, and the integration matters significantly for modern web development. Here's a detailed breakdown:

---

### **1. Official Next.js Support** 
- Carbon recently updated its **React tutorial** to use **Next.js 13** (App Router) as the default framework, replacing the deprecated Create React App. This includes:
  - Built-in support for **server components** and **dynamic routing**.
  - Optimized builds via Next.js’s compiler (e.g., for Sass preprocessing).
  - Example repositories like [`carbon-tutorial-nextjs`](https://github.com/carbon-design-system/carbon-tutorial-nextjs) demonstrate integration .

- Key features:
  - **Theming**: Uses Next.js’s layout system for global styles (e.g., `globals.scss`) .
  - **Performance**: Leverages Next.js’s static generation (SSG) and server-side rendering (SSR) for Carbon components .

---

### **2. React Integration** 
- Carbon’s React library (`@carbon/react`) provides:
  - **Pre-built components** (e.g., `DataTable`, `Button`) with React hooks support.
  - **TypeScript** compatibility (community-maintained typings) .
  - **Accessibility**: WCAG-compliant components out-of-the-box .

- Example React component usage:
  ```jsx
  import { Button } from '@carbon/react';
  function MyComponent() {
    return <Button>Click</Button>;
  }
  ```

---

### **3. Why It Matters**
- **Developer Experience**: Next.js simplifies routing and API integration for Carbon-powered apps (e.g., fetching data for `DataTable` components) .
- **Performance**: Next.js optimizations (e.g., code splitting) reduce bundle size for Carbon’s Sass/styles .
- **Enterprise Readiness**: Combines Carbon’s design consistency with Next.js’s scalability (e.g., multi-tenant apps) .

---

### **4. Potential Challenges**
- **Sass Builds**: Next.js requires manual Sass configuration for Carbon’s styles (fixed in newer versions) .
- **Legacy Code**: Older Carbon + React apps may need migration to Next.js 13’s App Router .

---

### **5. Resources**
- **Tutorial**: [Carbon + Next.js 13](https://carbondesignsystem.com/developing/react-tutorial/overview/) .
- **GitHub**: [`carbon-tutorial-nextjs`](https://github.com/carbon-design-system/carbon-tutorial-nextjs) for starter code .

For teams using React/Next.js, Carbon offers a **production-ready** solution with strong community backing .


# Research
### UI Widget to Show sound waveform, something simpler, lightweight, and ideally usable or embeddable as a clean UI widget, not a full-blown DAW interface"


### 🔍 Interpretation

* **"Display sound"** – You want to visualize audio in some way.
* **"in digital MIDI style"** – This suggests you're thinking of a visualization similar to a MIDI piano roll or event grid (e.g. like in DAWs such as Ableton, Logic, FL Studio).

So you're likely referring to a **UI widget that visually represents note sequences, durations, pitches, or events**, as found in a **MIDI piano roll or sequencer**.

---

### ✅ Better Alternatives (Depending on What You Mean)

Here are refined phrases depending on your exact intent:

| What You Want                      | Clearer Phrase                                                                     |
| ---------------------------------- | ---------------------------------------------------------------------------------- |
| Show piano-style note events       | **"Visualize audio as a MIDI piano roll"**                                         |
| Show discrete events on a timeline | **"Display MIDI events in sequencer view"**                                        |
| Show waveform + MIDI overlay       | **"Overlay MIDI data on waveform"**                                                |
| Show live MIDI input               | **"Real-time MIDI input visualization"**                                           |
| Show note-on/off with timing       | **"Time-based MIDI note visualizer"**                                              |
| General sound → graphical form     | **"Sound visualization widget"** or **"Audio visualizer with MIDI-style display"** |

---

### ✅ UI Widget Suggestions (if you're implementing or integrating)

If you're looking for **actual UI widgets/libraries**, here are some options depending on platform:

* **Web (JS):**

  * [Tone.js](https://tonejs.github.io/) + custom canvas drawing
  * [MIDI Visualizer](https://github.com/cifkao/html-midi-player) (piano roll visualization)
  * [Piano Roll from Magenta.js](https://github.com/magenta/magenta-js)

* **Electron / Desktop:**

  * JUCE framework (C++): has components for MIDI sequencing
  * VST plugins often come with roll visualizers, sometimes reusable in apps

* **Game Engines or Custom UI:**

  * You’d implement a **timeline + pitch grid**, and render **note blocks** with durations

---

### TL;DR

> ❌ “Display sound in digital MIDI style”
> ✅ “Visualize audio as a MIDI piano roll” or “MIDI event sequencer view” depending on intent.

Let me know your platform or language, and I can suggest specific tools or libraries.

"Live audio visualization in MIDI piano roll style for both user and AI speech."

Or in UI context:

"Real-time MIDI-style piano roll visualizer for conversational audio."


Great — now that you've clarified the goal is to **visualize sound during a live conversation** (both user input and AI voice output), using a **MIDI-style piano roll or sequencer view**, we can frame it more precisely:

---

### ✅ Refined Description

> **"Live audio visualization in MIDI piano roll style for both user and AI speech."**

Or in UI context:

> **"Real-time MIDI-style piano roll visualizer for conversational audio."**

---

### 🎯 What This Implies Technically

You’re likely trying to:

* **Convert speech audio (mic input + AI output)** into **musical pitch or note-like representations**.
* Display these **in real time** in a visual format resembling:

  * a **MIDI piano roll** (pitch vs. time),
  * or a **sequencer grid** with time-based blocks.

---

### 🔧 Implementation Considerations

#### 1. **Speech → Pitch Detection**

You'll need to extract the *fundamental frequency (F0)* of the audio:

* `YIN`, `CREPE`, or `pYIN` for accurate pitch detection.
* Output: Time series of pitch + duration.

#### 2. **Pitch → MIDI Mapping**

Map F0 to nearest MIDI note:

```text
MIDI note = 69 + 12 * log2(frequency / 440 Hz)
```

Then display as blocks in piano roll layout.

#### 3. **Visualization UI**

* Grid with:

  * Y-axis: MIDI note numbers (e.g., 21–108 for piano)
  * X-axis: Time (scrolling or streaming)
  * Each note: colored bar/block

#### 4. **Libraries You Might Use**

* **Web (Live browser app)**:

  * **Tone.js** + **Canvas/WebGL** for drawing
  * [WAAClock](https://github.com/sebpiq/WAAClock) for audio-accurate timing
  * `crepe` (TensorFlow\.js) for pitch detection

* **Python / Desktop**:

  * `aubio`, `librosa`, or `pYIN` for pitch
  * `pygame`, `PyQtGraph`, or OpenGL for rendering

* **Native / JUCE (C++)**:

  * Ideal for plugin-like UI with MIDI-style components

---

### 🧠 Notes on UX

Keep in mind:

* **Human voice is not as clean as MIDI** — pitch bends, vibrato, and unclear articulation are common.
* You might want:

  * **Smoothing**, thresholds, or note grouping
  * Optional **MIDI quantization**

---

### ✨ Final Naming Ideas for the UI Widget

* `LiveSpeechRoll`
* `VoicePianoRoll`
* `Conversational MIDI View`
* `AI Voice Sequencer`
* `SpeechToneVisualizer`

Let me know your stack (e.g., JS frontend, Python backend, etc.), and I can help you prototype or pick libraries.
