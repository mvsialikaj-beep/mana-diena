const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(process.argv[2] || path.join(root, 'index.html'), 'utf8');
const source = fs.readFileSync(path.join(root, 'supabase/functions/test-push/index.ts'), 'utf8');
assert(html.includes('id="pushTest"'));
assert(source.includes('db.auth.getUser(token)'));
assert(source.includes(".eq('user_id', identity.user.id).eq('endpoint', endpoint)"));
assert(source.includes("if (!token) return reply(401"));

const sync = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(match => match[1]).filter(Boolean)[1];
const start = sync.indexOf('async function sendPushTest(delaySeconds=0){');
const end = sync.indexOf("document.querySelector('#pushTest').onclick=()=>sendPushTest(0);", start);
assert(start >= 0 && end > start);

const button = { disabled: false };
let status = '';
let called;
const subscription = { endpoint: 'https://push.example/device-one' };
const test = new Function('document', 'navigator', 'Notification', 'window', 'client', 'user',
  'savePushSubscription', 'pushMessage',
  sync.slice(start, end) + 'return sendPushTest;')(
    { querySelector: () => button },
    { serviceWorker: { getRegistration: async () => ({
      pushManager: { getSubscription: async () => subscription }
    }) } },
    { permission: 'granted' }, { Notification: function Notification() {} },
    { functions: { invoke: async (...args) => {
      called = args;
      return { data: args[1].body.delaySeconds ? { scheduled: true } : { accepted: true } };
    } } },
    { id: 'account-one' }, async () => {}, message => { status = message; });

test().then(() => {
  assert.equal(called[0], 'test-push');
  assert.deepEqual(called[1], { body: { endpoint: subscription.endpoint, delaySeconds: 0 } });
  assert.equal(button.disabled, false);
  assert(status.includes('nosūtīts'));
  return test(30);
}).then(() => {
  assert.deepEqual(called[1], { body: { endpoint: subscription.endpoint, delaySeconds: 30 } });
  assert(status.includes('aizver aplikāciju'));
  console.log('Immediate and closed-app push diagnostics verified.');
}).catch(error => { console.error(error); process.exitCode = 1; });
