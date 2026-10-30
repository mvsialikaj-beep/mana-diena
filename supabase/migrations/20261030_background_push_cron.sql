create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

select cron.schedule(
  'mana-diena-send-reminders',
  '* * * * *',
  $$
    select net.http_post(
      url := 'https://szjzigtavauimamgiaoe.supabase.co/functions/v1/send-reminders',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-token', (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'mana_diena_cron_token'
          limit 1
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 10000
    );
  $$
);
