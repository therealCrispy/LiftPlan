-- Separate deployment action. Review before running.
-- Stops the old unauthenticated API without deleting either app's rows.
-- Only LiftPlan tables are affected; mealplan_state is untouched.
begin;
revoke all on public.liftplan_profiles,public.liftplan_baselines,public.liftplan_logs from anon,authenticated;
commit;
