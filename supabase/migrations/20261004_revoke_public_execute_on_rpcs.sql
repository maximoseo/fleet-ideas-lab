-- fil_transition_idea and fil_record_probe were executable by PUBLIC, anon and authenticated
-- (the default for new functions), unlike every other fil_* function. They are SECURITY INVOKER and
-- RLS has no policies, so an anon call fails today, but one added policy would have exposed them.
-- The app calls them with the service-role key only. Idempotent.
revoke all on function public.fil_transition_idea(text, text, text) from public, anon, authenticated;
revoke all on function public.fil_record_probe(text, boolean, integer, integer, text) from public, anon, authenticated;
grant execute on function public.fil_transition_idea(text, text, text) to service_role;
grant execute on function public.fil_record_probe(text, boolean, integer, integer, text) to service_role;
