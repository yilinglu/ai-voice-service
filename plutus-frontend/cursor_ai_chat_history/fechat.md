The problem with this ui is that the ui positioning changes when the microphone toggles between these 3 states (defined in microphone_finite_state_machine.md)

It moves up and down.

Replace "🎙️ Voice Interaction " with something playful that encourages, leads the user on to talk, you can suggest something, I am thinking "Let's chat".

We don't need the "Active" label and the dot beside it.

As a rule of thumb, all components should not shift positions on the page when their state changes, if the component has a loading state, there should be some placeholder elements.


Keep our original audio visualizer as "ClassicAudioVisualizer" component in the source code, we will use it in the future.

On the user facing pages, as a general principle, don't create, place any labels, components that carries the name Layercode. If there are some components that carries this type of label, Remove them from the UI.