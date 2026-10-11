# eeg-gateway

WebSocket gateway for EEG feature streams in the cognitive rehabilitation
auxiliary training platform. It accepts simulator or device feature frames,
routes them by `userId` and `sessionId`, pushes real-time frames to subscribed
frontends, tracks connection state, and can publish session summaries to a
backend API.

The gateway only reports data quality and training-state reference metrics. It
does not produce clinical diagnosis or treatment conclusions.

## Start gateway

```bash
corepack pnpm --filter @neuro-cog-rehab/eeg-gateway build
corepack pnpm --filter @neuro-cog-rehab/eeg-gateway start -- --mode=gateway --port=8787
```

Optional backend summary save endpoint:

```bash
corepack pnpm --filter @neuro-cog-rehab/eeg-gateway start -- --mode=gateway --summary-endpoint=http://localhost:8000/eeg/summaries
```

Environment variables:

- `EEG_GATEWAY_HOST`
- `EEG_GATEWAY_PORT`
- `EEG_GATEWAY_PATH`
- `EEG_SUMMARY_ENDPOINT`
- `EEG_SUMMARY_BEARER_TOKEN`

## WebSocket connections

Viewer/front-end subscription:

```text
ws://localhost:8787/eeg?role=viewer&userId=user-1&sessionId=session-1
```

Simulator or device producer:

```text
ws://localhost:8787/eeg?role=producer&source=simulator&userId=user-1&sessionId=session-1
```

## Inbound events

Producer frame:

```json
{
  "type": "eeg_frame",
  "frame": {
    "timestamp": "2026-06-15T08:00:00.000Z",
    "attentionScore": 76,
    "relaxationScore": 44,
    "fatigueScore": 18,
    "thetaPower": 0.24,
    "alphaPower": 0.36,
    "betaPower": 0.5,
    "signalQuality": 94,
    "artifactLevel": 4
  }
}
```

End session and publish summary:

```json
{ "type": "session_end", "completionStatus": "completed" }
```

Heartbeat:

```json
{ "type": "ping" }
```

## Outbound events

- `connection_ack`: connection accepted for the requested role and session.
- `session_status`: session status changed, including `awaiting_source`,
  `streaming`, `stale`, `disconnected`, or `ended`.
- `eeg_frame`: real-time frame with quality status `good`, `unstable`, `noisy`,
  or `disconnected`.
- `eeg_summary_saved`: session summary was sent through the configured publisher.
- `eeg_error`: validation, permission, or backend save error.
- `pong`: heartbeat response.

## Simulator mode

The original simulator remains available for development:

```bash
corepack pnpm --filter @neuro-cog-rehab/eeg-gateway start -- --mode=simulator --state=focused --port=8788
```

Simulator states:

- `focused`
- `relaxed`
- `fatigued`

## Tests

```bash
corepack pnpm --filter @neuro-cog-rehab/eeg-gateway test
```
