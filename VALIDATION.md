# Validation performed

## Automated checks

All 19 tests passed on Node 24, with `TZ=America/Chicago` for calendar validation. Coverage includes the three preserved blocks/five training days, superset order, zero rest, backoff/drop separation, daylight-saving week boundaries, twelve-week rollover, explicit zero loads, invalid reps, matching-exercise progression, wall-clock timers, per-session progress aggregation, account/profile isolation, atomic draft completion, protection of unsynced edits, edits arriving during push, duplicate acknowledgments, conflict resolution, restoreable tombstones, concurrent sync coalescing, and retained outbox entries after network failure.

The JavaScript modules and service worker passed syntax checks. There are no production npm dependencies.

## Browser checks

Tested through the connected Brave browser with disposable, locally isolated preview records:

- Loaded the app under `/LiftPlan/`, including relative scripts, styles, icons, and manifest.
- Portrait layouts at 402×874 and 440×956 CSS pixels.
- No horizontal document overflow in the tested larger layout.
- Invalid blank repetitions rejected; explicit zero load accepted.
- Heavy set followed by a separate backoff entry.
- An unfinished workout survives reload and resumes with its elapsed rest time.
- Partial workout saved to history and draft removed.
- Brody's saved session does not appear in Mackenzie's profile.
- Applying a waiting service-worker update preserves saved data.
- With the local HTTP server stopped, the app still launches from cache.
- A set was logged and its partial workout saved with that server stopped; it remained in history after another reload.
- Phone screenshots reviewed; display glitches and touch targets found during testing were fixed.

## Remaining acceptance checks

The new SQL schema and authenticated cloud sync have not been applied or tested against the live Supabase project. Sync tests use a simulated server and real IndexedDB API emulation. Authentication confirmation, server-side account isolation, cross-phone syncing, and production `/LiftPlan/` publishing must be verified during deployment.

No physical iPhone or Safari test has been performed. Desktop viewport checks cannot establish iOS safe-area, keyboard, standalone installation, background wake/sound, or storage-eviction behavior. Follow DEPLOYMENT.md for those checks.
