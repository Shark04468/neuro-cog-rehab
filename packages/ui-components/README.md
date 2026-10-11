# ui-components

Shared React components for the cognitive rehabilitation auxiliary training
platform.

## EEGStatusPanel

`EEGStatusPanel` presents device connection, signal quality, attention,
relaxation, fatigue trend, wearing prompts, and data latency prompts in a
simple training-friendly layout.

The component only describes device and signal status. It must not be used for
clinical diagnosis or treatment claims.

## MusicLibraryPage

`MusicLibraryPage` presents a therapist-facing music material library with tag
filtering, per-user recommendation, and per-user disable controls. Mock tracks
are exported from `music-library-mock`.

## MusicTherapyTrainingPage

`MusicTherapyTrainingPage` presents the user-facing music training flow:
instructions, EEG status check, one-minute resting baseline, music phase,
trend display, pause/resume/end controls, and `MusicTherapySession` result
output.
