# LiftPlan

A small, build-free training PWA for Brody and Mackenzie. The five-day Upper / Lower / Push / Pull / Legs schedule and all three four-week blocks are preserved from the original LiftPlan.

## What changed

Workouts and unfinished sessions save to IndexedDB before any cloud request. Cloud sync sends individual record changes; it never deletes and rewrites the full workout history. Each mutation has an ID and each record a revision. Simultaneous edits to the same record keep both versions for review. Completed workouts can be removed and restored.

The interface has large weight and rep controls, warmup guidance, distinct heavy/backoff/drop sets, alternating supersets, per-exercise history, optional effort logging, a wall-clock rest timer, and separate profiles. Exercise names and weight conventions can be customized. Calendar weeks start on Monday and do not depend on daylight-saving hours.

A service worker caches only the public app files. Authentication responses and workout data are never put in the service-worker cache. New versions wait for the user to apply the update. Relative asset paths support GitHub Pages at `/LiftPlan/`.

## Local preview

Use Node 20+ and Python 3:

```sh
npm ci
npm test
npm run serve
```

Open `http://127.0.0.1:4173/?preview=1`. Preview records live in their own local scope and never connect to Supabase. They persist so pause/resume can be tested. Opening the same address without `?preview=1` shows the real sign-in screen.

There are no production dependencies, build tools, or third-party script/CDN downloads. The test-only dependency emulates IndexedDB for storage tests. `js/config.js` contains a public Supabase publishable key; no service-role secret belongs in this repository.

## Deployment

Follow [DEPLOYMENT.md](DEPLOYMENT.md) before merging. The existing public API must be restricted and the new private schema created first. Neither SQL file has been run as part of preparing this change.

Create one shared Supabase email/password account and use it on both phones, choosing Brody or Mackenzie afterward. Each account can read and write only its own records. The two profiles share that account's access; they are a convenience, not separate security boundaries. Separate private accounts would need an explicit household-sharing model.

## iPhone installation

Open the deployed address in Safari, choose Share → Add to Home Screen, then launch from the icon. The first launch needs a connection to load the app; afterward the shell, saved sessions, and unfinished workout are available offline. Rest time catches up when returning from the background. A sound cue is only supported while the app is open; this app does not promise a locked-screen alarm.

## Program provenance

`js/program.js` preserves the old app's five-day program. It has not been verified against a purchased five-day edition. The supplied three-day Essentials PDF informed general warmup and progression guidance only. It is not bundled or published. No exercise-specific RPE targets were invented.

## Recovery and maintenance

GitHub retains the old app in commit `301d1f486f5329f168240b4cc9dffea2b18f124b`. A separate recovered archive includes all six original source versions and the audit. The new app does not import old browser storage or plaintext PINs automatically.

Export workouts from Settings periodically. Device storage can be cleared by the OS or browser; cloud sync and exports provide additional copies. Drafts stay on the phone where they were started. Signing out retains local records in that account's scope for its next sign-in. Export on a trusted device: an export contains workout details.

See [VALIDATION.md](VALIDATION.md) for performed checks and remaining physical-device/cloud checks.
