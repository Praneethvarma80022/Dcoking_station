import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { HardwareGateway } from './hardwareGateway.js';

const port = Number(process.env.HARDWARE_GATEWAY_PORT || 8080);
const gateway = new HardwareGateway();

const httpServer = createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: true, mode: gateway.hm30.state.status, hardwareCommandsEnabled: false, hm30: gateway.hm30.diagnostics().hm30 }));
    return;
  }

  response.writeHead(404);
  response.end();
});

const websocketServer = new WebSocketServer({ server: httpServer, path: '/hardware' });
let duplicatePortHandled = false;

const handleServerError = (error) => {
  if (error.code === 'EADDRINUSE') {
    if (duplicatePortHandled) return;
    duplicatePortHandled = true;
    console.warn(`Hardware gateway is already running on http://127.0.0.1:${port}`);
    websocketServer.close();
    httpServer.close();
    return;
  }
  console.error('Hardware gateway server error:', error);
  process.exitCode = 1;
};

httpServer.on('error', handleServerError);
websocketServer.on('error', handleServerError);

websocketServer.on('connection', (client) => {
  gateway.addClient(client);

  client.on('message', async (raw) => {
    try {
      const response = await gateway.handleMessage(JSON.parse(raw.toString()));
      if (response) client.send(JSON.stringify(response));
    } catch (error) {
      client.send(JSON.stringify({ type: 'error', error: error.message }));
    }
  });

  client.on('close', () => gateway.removeClient(client));
});

httpServer.listen(port, '127.0.0.1', () => {
  console.log(`Hardware gateway listening on http://127.0.0.1:${port}`);
  console.log('Mode: SIMULATOR. HM30 and dock adapters are interface-only; no hardware commands are transmitted.');
});