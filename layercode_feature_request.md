# Layercode Feature Request Email

**To:** Layercode Support Team  
**Subject:** Feature Request: Enhanced VAD Integration for React SDK

---

**Dear Layercode Team,**

We're building a professional voice interface using your React SDK and have discovered a UX challenge that could be solved with enhanced Voice Activity Detection (VAD) integration.

## Current Challenge

The `userAudioAmplitude` from `useLayercodePipeline` provides raw microphone input (0-1 scale), but your internal VAD system decides independently when audio constitutes "speech." This creates a user experience disconnect:

- **User Experience:** Users see visual feedback (waveform bars dancing) 
- **System Behavior:** No AI response when VAD determines audio isn't speech
- **Result:** User confusion ("Why didn't it respond? I saw it was listening!")

## Feature Requests

### 1. **Expose VAD State**
Add `isUserSpeaking: boolean` to the `useLayercodePipeline` hook that reflects your internal VAD decision.

```typescript
const { userAudioAmplitude, isUserSpeaking } = useLayercodePipeline({...});
// Now we can align visual feedback with actual speech processing
```

### 2. **VAD Threshold Configuration**
Allow developers to configure VAD sensitivity for different environments:

```typescript
useLayercodePipeline({
  vadSensitivity: 'high' | 'medium' | 'low' | 'custom',
  vadThreshold: 0.15 // Custom threshold option
});
```

### 3. **Enhanced Amplitude Data**
Provide separate amplitude values:
- `rawAmplitude`: Current microphone input
- `speechAmplitude`: Post-VAD processed audio (only when recognized as speech)

### 4. **Turn Event Exposure**
Expose the `turn.start`/`turn.end` WebSocket events through the React SDK hooks for better turn-taking control.

### 5. **Development Debug Mode**
Add optional VAD decision logging for development:

```typescript
useLayercodePipeline({
  debugVAD: true // Development only
});
```

## Business Impact

**User Experience:** Eliminates confusion when users see visual feedback but get no response  
**Developer Experience:** Better alignment between visual indicators and functional behavior  
**Adoption:** Reduces integration friction for voice interface developers

## Current Workaround

We're empirically testing amplitude thresholds (0.01 → 0.05 → 0.10 → 0.15) to find the sweet spot where visual feedback matches your VAD decisions, but this is imprecise and environment-dependent.

## Request

Would you consider adding these VAD integration features to your React SDK roadmap? Even a subset of these would significantly improve the developer experience.

Happy to provide more details or discuss implementation approaches.

**Best regards,**  
[Your Name]  
[Your Company]  
[Contact Information]

---

**Technical Context:**
- Using `@layercode/react-sdk` v1.0.28
- Next.js 15.3.4 frontend
- Professional voice agent application 