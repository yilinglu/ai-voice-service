Build real-time, browser-based audio visualization system using a combination of:

1. **Pitch detection from microphone & AI speech**
2. **Real-time rendering in a MIDI-style piano roll UI**

Key phrase: "UI Widget to Show sound waveform, something simpler, lightweight, and ideally usable or embeddable as a clean UI widget, not a full-blown DAW interface"

---

### 🧱 Recommended Architecture

#### 🎙️ 1. **Capture Microphone + AI Audio**

Use the Web Audio API:

* `navigator.mediaDevices.getUserMedia()` for mic input
* Audio playback node for AI speech (if streamed)
* Tap both sources into the audio processing pipeline

#### 🔍 2. **Real-Time Pitch Detection**

Use a JS-based pitch detection library:

* [**CREPE via TensorFlow.js**](https://github.com/marl/crepe)

  * Accurate pitch tracking (but heavier)
* [**Pitchy**](https://github.com/peterkhayes/pitchy) – lightweight WebAssembly port of YIN
* [**Meyda**](https://meyda.js.org/) – audio feature extraction (less accurate pitch, but usable)

→ Output a stream of: `{ timestamp, frequency, confidence }`

#### 🎹 3. **Pitch → MIDI Note Mapping**

Convert frequency to MIDI notes:

```js
function freqToMidi(frequency) {
  return Math.round(69 + 12 * Math.log2(frequency / 440));
}
```

You may want to discard low-confidence or out-of-range data.

#### 🖼️ 4. **Render MIDI Piano Roll**

Use **Canvas** or **SVG**, depending on performance:

* **Canvas**: for smoother real-time updates and scrolling.
* **SVG/React Components**: if you want interactivity or editing.

UI Frameworks:

* **React + Canvas**: via `react-canvas` or raw canvas API
* **PixiJS** (for higher-performance 2D rendering)
* **Three.js (2D plane)** if you're aiming for style

UI features:

* Vertical grid: piano key layout (MIDI 60 = Middle C)
* Horizontal scroll: time (autoscroll to right as time moves)
* Each note: a colored rectangle per pitch + duration

#### 🔁 5. **Live Streaming Updates**

Use React state with throttled updates:

```js
const [notes, setNotes] = useState([]);
useEffect(() => {
  const interval = setInterval(() => {
    // Add latest detected note to `notes`
  }, 100); // every 100ms
  return () => clearInterval(interval);
}, []);
```

---

### 🧰 Libraries You Can Use

| Purpose         | Library                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------- |
| Audio Capture   | Web Audio API (built-in)                                                                        |
| Pitch Detection | [Pitchy](https://github.com/peterkhayes/pitchy), [Meyda](https://github.com/meyda/meyda), CREPE |
| UI              | `react-canvas`, `react-pixi`, or raw Canvas                                                     |
| Grid Layout     | Custom draw or repurpose piano roll components                                                  |
| Audio Playback  | Tone.js (optional)                                                                              |

---

### 🚀 Optional Enhancements

* 🎨 Show AI vs. User in different colors
* 🎛️ Allow pause/play/scrub in history
* 🎼 Enable note grouping or quantization
* 📈 Display pitch confidence or volume intensity

---

### ⚡ Summary

> Build a **"Real-time speech-to-piano-roll visualizer"** in **Next.js** by combining:
>
> * Web Audio API for mic and playback audio
> * JS pitch detection (Pitchy, CREPE, etc.)
> * MIDI note mapping
> * Canvas or Pixi.js for rendering a piano roll-style UI

---

Let me know if you want:

* A **starter template** (React + Canvas + Pitch Detection)
* A **Next.js API route** to handle AI voice stream
* A **drawing example** for the piano roll grid

I can scaffold it out.
