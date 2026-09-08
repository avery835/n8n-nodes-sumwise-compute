// Development process guard only. Excluded from the package; never imported by the node.
// n8n settings below disable optional online activity. This also prevents accidental egress.
const net = require('node:net');
const allowed = host => ['127.0.0.1', '::1', 'localhost'].includes(host);
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const normalized = net._normalizeArgs(args);
  const options = normalized[0];
  if (!options.path && !allowed(options.host || 'localhost')) {
    throw new Error('Local preview blocks non-loopback connections');
  }
  return connect.apply(this, args);
};
const listen = net.Server.prototype.listen;
net.Server.prototype.listen = function (...args) {
  const options = typeof args[0] === 'object' ? args[0] : { host: typeof args[1] === 'string' ? args[1] : undefined };
  if (!options.path && !allowed(options.host)) throw new Error('Local preview requires an explicit loopback listener');
  return listen.apply(this, args);
};
