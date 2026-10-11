# MVP E2E Tests

This folder contains Playwright tests for the MVP auxiliary training flow. The
current application uses local mock state for authentication, profile creation,
EEG simulator status, training sessions, and therapist reports.

## Scope

- Therapist mock login and authorized user list review
- Mock training user creation data
- Training prescription editing and operation log display
- User mock login, consent confirmation, EEG simulator status check
- Music therapy, attention training, Go/No-Go, rhythm navigation, summary, and record save flow
- Therapist user detail report review and weekly report draft generation
- Visual consistency smoke coverage for the unified auth portal, trainee cockpit,
  parent brief, therapist command center, admin workspace, and training safety shell

## Commands

Install Playwright browser runtime once if the local machine has not installed it:

```bash
corepack pnpm exec playwright install chromium
```

Run the MVP E2E flow:

```bash
corepack pnpm test:e2e
```

Run only the visual consistency screenshot checks:

```bash
corepack pnpm exec playwright test visual-consistency.spec.ts
```

Run with a visible browser:

```bash
corepack pnpm test:e2e:headed
```

## Ports

The config starts:

- `@neuro-cog-rehab/user-web` on `http://127.0.0.1:5187`
- `@neuro-cog-rehab/therapist-web` on `http://127.0.0.1:5186`
- `@neuro-cog-rehab/admin-web` on `http://127.0.0.1:5188`

Override ports when needed:

```bash
$env:USER_WEB_PORT=5197
$env:THERAPIST_WEB_PORT=5196
$env:ADMIN_WEB_PORT=5195
corepack pnpm test:e2e
```

## Visual Screenshot Artifacts

`visual-consistency.spec.ts` captures desktop and mobile screenshots into
`test-results/playwright-artifacts`. These screenshots are intended for review
evidence and future visual regression baselines. The checks also verify that core
pages render the shared medical platform components and avoid high-risk flashing
style names or strong pure-red animation patterns.

## Data Boundary

The mock EEG frames are summary-like feature frames only. The E2E suite does not
store raw EEG data and does not assert clinical diagnosis or treatment outcome
claims.
