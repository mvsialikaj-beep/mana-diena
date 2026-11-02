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
const start = sync.indexOf('async function sendPushTest(){');
const end = sync.indexOf("document.querySelector('#pushTest').onclick=sendPushTest;", start);
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
    { functions: { invoke: async (...args) => { called = args; return { data: { accepted: true } }; } } },
    { id: 'account-one' }, async () => {}, message => { status = message; });

test().then(() => {
  assert.equal(called[0], 'test-push');
  assert.deepEqual(called[1], { body: { endpoint: subscription.endpoint } });
  assert.equal(button.disabled, false);
  assert(status.includes('nosūtīts'));
  console.log('Push diagnostics and device targeting verified.');
}).catch(error => { console.error(error); process.exitCode = 1; });
