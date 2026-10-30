const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(process.argv[2] || path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(process.argv[3] || path.join(root, 'sw.js'), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .map(match => match[1]).filter(Boolean);
const sync = scripts[1];
const key = sync.match(/const vapidPublicKey='([^']+)'/)?.[1];
assert(key && !key.includes('__VAPID'));
const publicBytes = Buffer.from(key, 'base64url');
assert.equal(publicBytes.length, 65);
assert.equal(publicBytes[0], 4);
assert(sw.includes("self.addEventListener('push'"));
assert(sw.includes('self.registration.showNotification'));

const start = sync.indexOf('function pushMessage(');
const end = sync.indexOf('async function activate(u){', start);
assert(start >= 0 && end > start);
const status = {textContent:''};
const button = {};
const document = {querySelector: selector => selector === '#pushStatus' ? status : button};
const Notification = {permission:'default',requestPermission:async () => 'granted'};
const window = {Notification,PushManager:function PushManager(){},backgroundPushActive:false};
let subscriptionOptions,registeredPath,upserted,stored;
const subscription = {toJSON:() => ({endpoint:'https://push.example/sub',keys:{p256dh:'public',auth:'secret'}})};
const navigator = {serviceWorker:{register:async path => {
  registeredPath = path;
  return {pushManager:{getSubscription:async () => null,subscribe:async options => {
    subscriptionOptions = options;
    return subscription;
  }}};
}}};
const client = {from: table => {
  assert.equal(table, 'push_subscriptions');
  return {upsert:async data => {upserted = data;return {error:null}}};
}};
const localStorage = {setItem:(key,value) => {stored = [key,value]}};
const enable = new Function('document','Notification','window','navigator','client','localStorage','user','vapidPublicKey',
  sync.slice(start, end) + 'return enableBackgroundPush;')(
    document,Notification,window,navigator,client,localStorage,{id:'account-1'},key);

enable().then(() => {
  assert.equal(registeredPath, './sw.js');
  assert.equal(subscriptionOptions.userVisibleOnly, true);
  assert.equal(subscriptionOptions.applicationServerKey.length, 65);
  assert.equal(upserted.user_id, 'account-1');
  assert.equal(upserted.endpoint, subscription.toJSON().endpoint);
  assert.equal(window.backgroundPushActive, true);
  assert.deepEqual(stored, ['mana-diena-push-active','true']);
  assert(status.textContent.includes('ieslēgti'));
  console.log('Background push subscription flow verified.');
}).catch(error => {console.error(error);process.exitCode=1});
