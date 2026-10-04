# Deployment checklist

## Ready for review

This change is prepared on a separate branch. The live GitHub Pages app, existing records, and database permissions have not been changed. The dashboard project is named MealPlan, but its project reference matches LiftPlan's configuration. Its unrelated `mealplan_state` table must stay untouched.

## Apply before merging

1. Review `database/001-secure-sync.sql`. It adds `liftplan_v2_records`, restricted by Supabase Auth account ID, and an authenticated save function with revision checks. It does not migrate or delete old rows.
2. Apply that file in the matching Supabase project's SQL editor. The project must be active and reachable.
3. Verify email/password authentication is enabled. Set the Site URL to `https://therealcrispy.github.io/LiftPlan/` and allow that confirmation redirect if email confirmation is enabled. Do not disable confirmation solely to work around setup. Create the shared account through the app and complete any confirmation personally.
4. Review and apply `database/002-lock-legacy-api.sql` to remove the old anonymous/authenticated public table access. This makes the old v1 app stop loading its profiles, so coordinate this with merging the new version. Old rows remain available in the dashboard. The unrelated meal-planning table is untouched.
5. Merge the reviewed pull request. GitHub Pages should publish the new relative-path app files. Confirm the deployment succeeded and open the actual Pages address.
6. On the two iPhones, sign into the same new account, select separate profiles, set Week 1's Monday, then install from Safari.

## Cloud acceptance checks

- Signed-out requests must be unable to read/write `liftplan_v2_records` and the three old LiftPlan tables.
- Account A must not read or modify Account B's records, including through the save function.
- Log a session on phone A; phone B must receive it after sync when viewing the same profile.
- Edit a setting on both phones while offline. Reconnect and confirm a conflict is shown rather than silently overwriting either version.
- Disconnect during a save, reconnect, and confirm one workout exists after retry.
- Log in Brody's profile and verify Mackenzie's log remains separate.

## Physical iPhone checks

Check portrait, landscape, safe areas, numeric keyboard, installed standalone appearance, pause/relaunch, lock/unlock during rest, and an airplane-mode launch after the first online load. Background sound is intentionally not guaranteed. A desktop browser at matching layout dimensions cannot prove Safari or physical-device behavior.

## Rollback

The old source remains in Git history. Reverting the source does not restore its now-revoked anonymous permissions; do not restore insecure public access casually. New v2 rows are separate and remain intact. To roll back the new UI safely, keep its private database and use a reviewed earlier v2 commit.
