import { createClient } from 'redis';

let client;

(async () => {
  if (!process.env.DATABASE_URL) return;

  client = createClient({ url: process.env.DATABASE_URL });
  client.on('connect', () => console.log('redis connect'));
  client.on('ready', () => console.log('redis ready'));
  client.on('reconnecting', err => console.log('redis reconnecting', err));
  client.on('error', err => console.log('redis error', err));
  client.on('end', err => console.log('redis end', err));

  await client.connect();

  setInterval(async () => {
    try {
      await client.set('heartbeat', ~~(Date.now() / 1e3));
    } catch (e) {
      console.log('redis heartbeat failed', e);
    }
  }, 10e3);
})();

export default client;
