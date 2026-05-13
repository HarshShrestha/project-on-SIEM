const test = require('node:test');
const assert = require('node:assert/strict');

const { createApp } = require('../src/index');

test('GET /health returns status ok with injected wazuh service', async (t) => {
  const app = createApp({
    wazuhService: {
      checkHealth: async () => 'connected',
    },
  });

  const server = app.listen(0);
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, 'ok');
  assert.equal(body.wazuh, 'connected');
  assert.equal(typeof body.uptime, 'number');
  assert.equal(typeof body.timestamp, 'string');
});