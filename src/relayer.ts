import snapshot from '@snapshot-labs/snapshot.js';
import { EnumType } from 'json-to-graphql-query';
import redis from './redis';

const hubURL = process.env.HUB_URL || 'https://hub.snapshot.org';

export const defaultMci = 29915678;

async function getLastMci() {
  const lastMciStr = await redis.get('last_mci');

  return lastMciStr ? Number(lastMciStr) : defaultMci;
}

async function getNextMessages(mci: number) {
  const query = {
    messages: {
      __args: {
        first: 10,
        where: {
          type_in: ['vote', 'proposal'],
          mci_gt: mci
        },
        orderBy: 'mci',
        orderDirection: new EnumType('asc')
      },
      mci: true,
      id: true,
      ipfs: true,
      type: true,
      timestamp: true,
      space: true
    }
  };

  try {
    const results = await snapshot.utils.subgraphRequest(`${hubURL}/graphql`, query);
    return results.messages;
  } catch (e) {
    console.error('failed to load messages', e);
    return;
  }
}

async function updateLastMci(mci: number) {
  await redis.set('last_mci', mci);
}

async function processMessages(messages: any[]) {
  let lastMessageMci = null;

  for (const message of messages) {
    try {
      if (message.type === 'proposal' && message.space === 'snapback.eth') {
        // @TODO send proposal
        console.log(`new proposal from ${message.address}`);
      }

      if (message.type === 'vote' && message.space === 'snapback.eth') {
        // @TODO send vote
        console.log(`new vote on snapback.eth from ${message.address}`);
      }
      lastMessageMci = message.mci;
    } catch (error) {
      console.error('failed to process message', message.id, error);
      break;
    }
  }

  if (lastMessageMci !== null) {
    // Store latest message MCI
    await updateLastMci(lastMessageMci);

    console.log(`updated to MCI ${lastMessageMci}`);
  }

  return;
}

async function run() {
  // Check latest indexed MCI from db
  const lastMci = await getLastMci();

  console.log(`last MCI ${lastMci}`);

  // Load next messages after latest indexed MCI
  const messages = await getNextMessages(lastMci);

  if (messages && messages.length > 0) {
    await processMessages(messages);
  }

  // Run again after 10sec
  await snapshot.utils.sleep(5e3);

  return run();
}

run();
