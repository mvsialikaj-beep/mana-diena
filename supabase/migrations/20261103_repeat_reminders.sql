alter table public.push_deliveries
  drop constraint push_deliveries_reminder_type_check;

alter table public.push_deliveries
  add constraint push_deliveries_reminder_type_check
  check (reminder_type in ('day', 'before_time') or reminder_type ~ '^repeat_[0-9]+$');
