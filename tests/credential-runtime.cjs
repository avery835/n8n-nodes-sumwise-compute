// Test-only actual n8n credential runner. Synthetic DI services avoid all owner/DB state.
const path = require('node:path');
const util = require('node:util');
require('../scripts/loopback-only.cjs');
const core = require('n8n-core');
const { Container } = require('@n8n/di');
const { GlobalConfig, SsrfProtectionConfig } = require('@n8n/config');
const { Logger, ModuleRegistry } = require('@n8n/backend-common');
const coreRoot = path.dirname(require.resolve('n8n-core'));
const hostRoot = path.dirname(require.resolve('n8n/package.json'));
const { InstanceSettings } = require(path.join(coreRoot, 'instance-settings'));
const { CredentialsHelper } = require(path.join(hostRoot, 'dist/credentials-helper'));
const { CredentialsTester } = require(path.join(hostRoot, 'dist/services/credentials-tester.service'));
const { UrlService } = require(path.join(hostRoot, 'dist/services/url.service'));
const { VariablesService } = require(path.join(hostRoot, 'dist/environments.ee/variables/variables.service.ee'));
const { EventService } = require(path.join(hostRoot, 'dist/events/event.service'));
const { NoOp } = require('n8n-nodes-base/dist/nodes/NoOp/NoOp.node');

async function createCredentialRuntime({ credentialType, packageRoot } = {}) {
  let loader;
  if (!credentialType) {
    loader = new core.PackageDirectoryLoader(packageRoot || path.resolve(__dirname, '..'));
    await loader.loadAll();
    credentialType = loader.credentialTypes.sumWiseComputeApi.type;
  }
  const logs = [];
  const capture = (...args) => logs.push(util.inspect(args, { depth: 10 }));
  const logger = { error: capture, warn: capture, info: capture, debug: capture, trace: capture };
  logger.scoped = () => logger;
  const denied = () => { throw new Error('Synthetic credential runner forbids account, store and external-secret access'); };
  const unavailable = new Proxy({}, { get: () => denied });
  const registry = {
    getByName: name => { if (name !== credentialType.name) throw new Error('Unknown synthetic credential'); return credentialType; },
    getParentTypes: () => [], getSupportedNodes: () => [],
  };
  const helper = new CredentialsHelper(registry,
    { applyOverwrite: (_name, data) => data, usesManagedAuth: () => false },
    unavailable, unavailable, unavailable, unavailable, { externalSecretsForProjects: false }, unavailable);
  Container.set(InstanceSettings, { instanceId: 'synthetic-test-only', hmacSignatureSecret: 'synthetic-test-only' });
  Container.set(Logger, logger);
  Container.set(GlobalConfig, { endpoints: { rest: 'rest', formWaiting: 'form-waiting', form: 'form', formTest: 'form-test', webhook: 'webhook', webhookWaiting: 'webhook-waiting', webhookTest: 'webhook-test', mcp: 'mcp', mcpTest: 'mcp-test' } });
  Container.set(SsrfProtectionConfig, { enabled: false });
  Container.set(UrlService, { getWebhookBaseUrl: () => 'http://127.0.0.1/', getTestWebhookBaseUrl: () => 'http://127.0.0.1/', getInstanceBaseUrl: () => 'http://127.0.0.1' });
  Container.set(VariablesService, { getAllCached: async () => [] });
  Container.set(EventService, { emit: () => {} });
  Container.set(CredentialsHelper, helper);
  Container.set(core.ExternalSecretsProxy, { hasProvider: () => false, hasSecret: () => false, getSecret: denied, listProviders: () => [] });
  Container.set(ModuleRegistry, { context: new Map() });
  const reporter = new core.ErrorReporter(logger, {});
  const tester = new CredentialsTester(logger, reporter, registry, { getByNameAndVersion: () => new NoOp() }, helper);
  return {
    credentialType, loader,
    resolved: tester.getCredentialTestFunction(credentialType.name),
    async test(data) {
      logs.length = 0;
      const result = await tester.testCredentials('synthetic-user', credentialType.name,
        { id: 'synthetic-credential', name: 'Synthetic test only', data: structuredClone(data) });
      return { result, logs: logs.slice() };
    },
  };
}
module.exports = { createCredentialRuntime };
