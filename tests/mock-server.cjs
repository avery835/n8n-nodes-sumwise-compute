// Contract fixtures only. This server does not parse or calculate mathematics.
const http = require('node:http');
const fixtures = require('./fixtures/successes.json');
const problems = require('../nodes/SumWiseCompute/problems.json');
const SYNTHETIC_KEY = 'sumwise-local-mock-NOT-A-REAL-KEY';

async function startMock({ key = SYNTHETIC_KEY, respond } = {}) {
  const requests = [];
  let active = 0;
  let maxActive = 0;
  const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks).toString('utf8');
    // Never store the actual Authorization value, even in local mock data.
    const authenticated = req.headers.authorization === `Bearer ${key}`;
    const record = { method: req.method, url: req.url, body, authenticated,
      contentType: req.headers['content-type'], contentLength: req.headers['content-length'],
      transferEncoding: req.headers['transfer-encoding'],
      authorizationCount: req.rawHeaders.filter((v, i) => i % 2 === 0 && v.toLowerCase() === 'authorization').length };
    requests.push(record);
    active++;
    maxActive = Math.max(maxActive, active);
    res.once('close', () => { active--; });
    let expression;
    try { expression = JSON.parse(body).expression; } catch { /* fixed invalid_request below */ }
    const send = (status, payload, headers = {}) => {
      res.writeHead(status, { 'Content-Type': status === 200 ? 'application/json' : 'application/problem+json',
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
        'X-Request-Id': `mock-${requests.length}`, ...headers });
      res.end(typeof payload === 'string' ? payload : JSON.stringify(payload));
    };
    if (!authenticated) return send(401, problems.authentication_required);
    if (respond) return respond({ req, res, expression, send, record });
    if (req.url !== '/v1/evaluate') return send(404, problems.route_not_found);
    if (req.method !== 'POST') return send(405, problems.method_not_allowed, { Allow: 'POST' });
    if (Object.prototype.hasOwnProperty.call(fixtures, expression)) return send(200, fixtures[expression]);
    if (expression === '1/0') return send(422, problems.domain_error);
    return send(422, problems.expression_parse_error);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { server, requests, get maxActive() { return maxActive; },
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }) };
}
module.exports = { startMock, SYNTHETIC_KEY };
