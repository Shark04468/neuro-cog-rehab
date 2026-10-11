# eeg-features

Reusable EEG feature utilities for the cognitive rehabilitation auxiliary
training platform.

This package currently provides configurable EEG signal quality detection for
simulator or gateway `EEGFeatureFrame` streams. Output labels describe data
quality only: `good`, `unstable`, `noisy`, or `disconnected`.

```ts
import { EEGQualityDetector } from "@neuro-cog-rehab/eeg-features";

const detector = new EEGQualityDetector({
  minGoodSignalQuality: 75,
  noisyArtifactLevel: 55,
  disconnectedAfterMs: 3000
});

const assessment = detector.update(frame);
```

The reason text is intended for headset fit, sensor contact, motion artifact,
and connection prompts. It must not be used as a diagnostic conclusion.
