import { createClient } from 'npm:@supabase/supabase-js@2';
import { sendNotification, setVapidDetails } from 'npm:web-push@3.6.7';

const url = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!url || !serviceKey) throw new Error('Supabase service configuration is missing');
const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const cors = {
  'Access-Control-Allow-Origin': 'https://mvsialikaj-beep.github.io',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status: number, body: Record<string, unknown>) =>
  Response.json(body, { status, headers: cors });

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') return reply(405, { error: 'Method not allowed' });

  const authorization = request.headers.get('authorization') || '';
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return reply(401, { error: 'Sign in required' });
  const { data: identity, error: identityError } = await db.auth.getUser(token);
  if (identityError || !identity.user) return reply(401, { error: 'Invalid session' });

  let endpoint: string | undefined;
  let delaySeconds = 0;
  try {
    const body = await request.json();
    endpoint = body.endpoint;
    if (body.delaySeconds === 30) delaySeconds = 30;
  } catch {}
  if (typeof endpoint !== 'string' || endpoint.length > 2000)
    return reply(400, { error: 'Device subscription missing' });

  const { data: subscription, error: subscriptionError } = await db
    .from('push_subscriptions').select('endpoint,p256dh,auth')
    .eq('user_id', identity.user.id).eq('endpoint', endpoint).maybeSingle();
  if (subscriptionError) return reply(500, { error: 'Subscription lookup failed' });
  if (!subscription) return reply(404, { error: 'Device is not subscribed' });

  const { data: config, error: configError } = await db.rpc('get_push_config');
  if (configError || !config?.vapid_public || !config?.vapid_private)
    return reply(503, { error: 'Push configuration unavailable' });
  setVapidDetails('https://mvsialikaj-beep.github.io/mana-diena/',
    config.vapid_public, config.vapid_private);
  async function deliver() {
    try {
      await sendNotification({ endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
        JSON.stringify({ title: 'Mana diena - pārbaude',
          body: delaySeconds ? 'Paziņojums pienāca pēc aplikācijas aizvēršanas.'
            : 'Ja redzi šo paziņojumu, fona paziņojumi darbojas.',
          tag: `mana-diena-test-${Date.now()}`,
          url: 'https://mvsialikaj-beep.github.io/mana-diena/' }),
        { TTL: 300, urgency: 'high' });
      console.info('Push test accepted by provider', { delaySeconds });
      return { accepted: true, expired: false };
    } catch (error) {
      const statusCode = Number((error as { statusCode?: number }).statusCode);
      const expired = statusCode === 404 || statusCode === 410;
      if (expired) await db.from('push_subscriptions').delete()
        .eq('user_id', identity.user.id).eq('endpoint', endpoint);
      console.error('Push test rejected by provider', { statusCode, delaySeconds });
      return { accepted: false, expired };
    }
  }

  if (delaySeconds) {
    EdgeRuntime.waitUntil((async () => {
      await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
      await deliver();
    })());
    return reply(202, { scheduled: true });
  }
  const result = await deliver();
  return result.accepted ? reply(200, result)
    : reply(502, { error: 'Push service rejected the notification', expired: result.expired });
});
