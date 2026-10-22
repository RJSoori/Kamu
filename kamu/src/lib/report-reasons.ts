// Values must match content_reports_reason_check in
// supabase/migrations/20261001120000_owner_verification_and_reports.sql.
export const REPORT_REASONS: [value: string, label: string][] = [
  ["inaccurate", "Wrong info or prices"],
  ["closed", "Permanently closed"],
  ["offensive", "Offensive content"],
  ["spam", "Spam"],
  ["impersonation", "Pretending to be this place"],
  ["other", "Something else"],
];
