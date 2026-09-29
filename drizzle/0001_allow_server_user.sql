-- Owner-only policies (no shared demo UUID). Prefer scripts/security/rls-owner-policies.sql for live apply.
drop policy if exists "notes_owner" on "notes";
create policy "notes_owner" on "notes"
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "quiz_cards_owner" on "quiz_cards";
create policy "quiz_cards_owner" on "quiz_cards"
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "review_logs_owner" on "review_logs";
create policy "review_logs_owner" on "review_logs"
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
