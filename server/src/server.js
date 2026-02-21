import { Http3Server } from '@fails-components/webtransport';
import { readFileSync, existsSync } from 'fs';
import { GameHandler } from './game-handler.js';

// Fly.io uses fly-global-services for UDP binding
const FLY_GLOBAL_SERVICES = 'fly-global-services';
const IS_PRODUCTION = process.env.FLY_APP_NAME !== undefined;

const config = {
  host: IS_PRODUCTION ? FLY_GLOBAL_SERVICES : '127.0.0.1',
  port: parseInt(process.env.PORT || (IS_PRODUCTION ? '443' : '4433'), 10),
  cert: process.env.CERT_PATH || './certs/cert.pem',
  key: process.env.KEY_PATH || './certs/key.pem',
};

// Validate certificates exist
if (!existsSync(config.cert) || !existsSync(config.key)) {
  console.error('❌ Certificates not found!');
  console.error('Run: npm run cert:generate');
  process.exit(1);
}

const server = new Http3Server({
  host: config.host,
  port: config.port,
  secret: 'mysecret', // Session ticket encryption
  cert: readFileSync(config.cert),
  privKey: readFileSync(config.key),
});

const gameHandler = new GameHandler();

server.startServer();

console.log(`🚀 WebTransport server running on https://${config.host}:${config.port}`);
console.log(`   Environment: ${IS_PRODUCTION ? 'Production (Fly.io)' : 'Development'}`);

// Handle incoming sessions
(async () => {
  const sessionStream = await server.sessionStream('/game');
  const sessionReader = sessionStream.getReader();

  while (true) {
    const { done, value: session } = await sessionReader.read();
    if (done) {
      console.log('Session stream ended');
      break;
    }

    handleSession(session);
  }
})();

async function handleSession(session) {
  const sessionId = crypto.randomUUID();
  console.log(`📥 New session: ${sessionId}`);

  try {
    await session.ready;
    console.log(`✅ Session ready: ${sessionId}`);

    gameHandler.addPlayer(sessionId, session);

    // Handle bidirectional streams (reliable, ordered)
    handleBidiStreams(session, sessionId);

    // Handle datagrams (unreliable, unordered - ideal for position updates)
    handleDatagrams(session, sessionId);

    // Handle session close
    session.closed.then(() => {
      console.log(`👋 Session closed: ${sessionId}`);
      gameHandler.removePlayer(sessionId);
    }).catch(err => {
      console.error(`Session error: ${sessionId}`, err);
      gameHandler.removePlayer(sessionId);
    });

  } catch (err) {
    console.error(`Failed to establish session: ${sessionId}`, err);
  }
}

async function handleBidiStreams(session, sessionId) {
  try {
    const bidiReader = session.incomingBidirectionalStreams.getReader();

    while (true) {
      const { done, value: stream } = await bidiReader.read();
      if (done) break;

      handleBidiStream(stream, sessionId);
    }
  } catch (err) {
    console.error(`BidiStream error: ${sessionId}`, err);
  }
}

async function handleBidiStream(stream, sessionId) {
  const reader = stream.readable.getReader();
  const writer = stream.writable.getWriter();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Parse and handle game commands (reliable channel)
      const message = new TextDecoder().decode(value);
      const response = gameHandler.handleReliableMessage(sessionId, message);

      if (response) {
        await writer.write(new TextEncoder().encode(response));
      }
    }
  } catch (err) {
    console.error(`Stream error: ${sessionId}`, err);
  } finally {
    reader.releaseLock();
    writer.releaseLock();
  }
}

async function handleDatagrams(session, sessionId) {
  try {
    const reader = session.datagrams.readable.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Handle position/state updates (unreliable, low-latency)
      gameHandler.handleDatagram(sessionId, value);
    }
  } catch (err) {
    // Datagrams may not be supported or session closed
    if (err.name !== 'InvalidStateError') {
      console.error(`Datagram error: ${sessionId}`, err);
    }
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  server.stopServer();
  process.exit(0);
});
