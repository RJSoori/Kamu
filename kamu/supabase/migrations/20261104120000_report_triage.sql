-- Report triage agent (docs/report-triage.md): the latest AI suggestion for
-- each customer report, shown to admins next to the report.
--
-- Its own table rather than columns on content_reports: customers can
-- insert content_reports rows, and must never be able to plant a fake
-- "suggestion" on their own report. Here only admins can read or write.
-- The suggestion is advice; nothing acts on it until an admin clicks.

create table report_triage (
  report_id uuid primary key references content_reports (id) on delete cascade,
  -- { action, confidence, summary, reasons[], steps[] } -- see the
  -- triage-report Edge Function.
  suggestion jsonb not null,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamp with time zone not null default now()
);

alter table report_triage enable row level security;

create policy "report_triage_admin_all"
  on report_triage for all
  using (is_admin())
  with check (is_admin());

grant select, insert, update, delete on table report_triage to authenticated;
grant all on table report_triage to service_role;
