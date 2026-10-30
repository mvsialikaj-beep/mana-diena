import { createClient } from 'npm:@supabase/supabase-js@2';
import { sendNotification, setVapidDetails } from 'npm:web-push@3.6.7';
import { reminderEvents } from './schedule.mjs';

type SubscriptionRow = {
  id: string; user_id: string; endpoint: string; p256dh: string; auth: string;
};
type TaskRow = { user_id: string; task_id: string; data: Record<string, unknown> };

const url = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!url || !serviceKey) throw new Error('Supabase service configuration is missing');
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

Deno.serve(async request => {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const { data: config, error: configError } = await db.rpc('get_push_config');
  if (configError || !config?.cron_token || !config?.vapid_public || !config?.vapid_private) {
    return new Response('Push configuration unavailable', { status: 503 });
  }
  if (request.headers.get('x-cron-token') !== config.cron_token) {
    return new Response('Unauthorized', { status: 401 });
  }
  setVapidDetails('https://mvsialikaj-beep.github.io/mana-diena/',
    config.vapid_public, config.vapid_private);
  const { data: subscriptions, error: subscriptionError } = await db
    .from('push_subscriptions').select('id,user_id,endpoint,p256dh,auth');
  if (subscriptionError) return new Response('Subscription lookup failed', { status: 500 });
  if (!subscriptions?.length) return Response.json({ sent: 0, failed: 0 });

  const users = [...new Set((subscriptions as SubscriptionRow[]).map(item => item.user_id))];
  const { data: taskRows, error: taskError } = await db.from('planner_tasks')
    .select('user_id,task_id,data').in('user_id', users);
  if (taskError) return new Response('Task lookup failed', { status: 500 });
  const byUser = new Map<string, SubscriptionRow[]>();
  for (const subscription of subscriptions as SubscriptionRow[]) {
    const list = byUser.get(subscription.user_id) || [];
    list.push(subscription);
    byUser.set(subscription.user_id, list);
  }

  const now = new Date();
  let sent = 0, failed = 0;
  for (const row of (taskRows || []) as TaskRow[]) {
    const task = row.data;
    if (!task || typeof task !== 'object' || typeof task.text !== 'string') continue;
    for (const event of reminderEvents(task, now)) {
      for (const subscription of byUser.get(row.user_id) || []) {
        const delivery = {
          subscription_id: subscription.id, task_id: row.task_id,
          occurrence_date: event.day, reminder_type: event.type
        };
        const { error: claimError } = await db.from('push_deliveries').insert(delivery);
        if (claimError?.code === '23505') continue;
        if (claimError) { failed++; continue; }
        try {
          await sendNotification({ endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
            JSON.stringify({ title: event.title, body: event.body,
              tag: `${row.task_id}-${event.day}-${event.type}`,
              url: 'https://mvsialikaj-beep.github.io/mana-diena/' }),
            { TTL: 3600, urgency: 'high' });
          sent++;
        } catch (error) {
          failed++;
          const statusCode = Number((error as { statusCode?: number }).statusCode);
          if (statusCode === 404 || statusCode === 410) {
            await db.from('push_subscriptions').delete().eq('id', subscription.id);
          } else {
            await db.from('push_deliveries').delete()
              .eq('subscription_id', subscription.id).eq('task_id', row.task_id)
              .eq('occurrence_date', event.day).eq('reminder_type', event.type);
          }
        }
      }
    }
  }
  return Response.json({ sent, failed });
});
