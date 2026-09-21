import type { IAuthenticate, ICredentialTestRequest, ICredentialType, INodeProperties, Icon } from 'n8n-workflow';
import { authenticateRequest } from '../nodes/SumWiseCompute/transport';

export class SumWiseComputeApi implements ICredentialType {
  name = 'sumWiseComputeApi';
  displayName = 'SumWise Compute API';
  icon: Icon = { light: 'file:../nodes/SumWiseCompute/sumwise.svg', dark: 'file:../nodes/SumWiseCompute/sumwise.dark.svg' };
  documentationUrl = 'https://github.com/avery835/n8n-nodes-sumwise-compute/blob/main/docs/CREDENTIALS.md';
  properties: INodeProperties[] = [
    {
      displayName: 'Credential testing sends a calculation request. Each accepted test counts toward your request limits.',
      name: 'testNotice', type: 'notice', default: '',
    },
    {
      displayName: 'The credential check verifies HTTP request acceptance, not the calculation result. After any timeout or failure, completion and request allowance may be uncertain. Do not retry automatically.',
      name: 'testScopeNotice', type: 'notice', default: '',
    },
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      required: true,
      default: '',
      description: 'Separately provisioned Compute API key. Use only a synthetic key with the local mock.',
    },
    {
      displayName: 'Service Origin',
      name: 'serviceOrigin',
      type: 'string',
      noDataExpression: true,
      required: true,
      default: 'https://api.sumwisecalc.com',
      description: 'You choose where this secret is sent. HTTPS origin only; local mock HTTP is allowed only at literal 127.0.0.1 or [::1]. No path, query, credentials, or redirects.',
    },
    {
      displayName: 'Request Timeout (ms)',
      name: 'requestTimeout',
      type: 'number',
      noDataExpression: true,
      typeOptions: { minValue: 1000, maxValue: 120000, numberPrecision: 0 },
      default: 30000,
      description: 'Client timeout, not a service guarantee. Completion and quota consumption may be uncertain after a timeout. No automatic retries.',
    },
  ];

  authenticate: IAuthenticate = authenticateRequest;

  test: ICredentialTestRequest = {
    request: {
      // The authentication hook resolves this fixed path against the validated
      // credential origin before n8n sends the request.
      method: 'POST', url: '/v1/evaluate', body: '{"expression":"1+1"}',
      headers: { 'Content-Type': 'application/json', 'Content-Length': '20', Accept: 'application/json, application/problem+json' },
      encoding: 'text', json: false, disableFollowRedirect: true,
      skipSslCertificateValidation: false, ignoreHttpStatusErrors: false,
      sendCredentialsOnCrossOriginRedirect: false,
    },
    // Failure rules, not positive result validators. Cover every HTTP status the
    // host parser accepts so untrusted reason phrases never become UI text.
    rules: Array.from({ length: 900 }, (_, index) => index + 100)
      .filter((status) => status < 200 || status > 299)
      .map((status) => ({
        type: 'responseCode' as const,
        properties: {
          value: status,
          message: (status === 401 || status === 403 ? 'Authentication was rejected.' :
            status === 429 ? 'The service rejected the test due to a rate or request limit.' :
            status === 503 ? 'The service is busy or unavailable; the credential was not verified.' :
            `The credential test failed (HTTP ${status}).`) +
            ' Check the settings and service status before a new attempt. Request completion and allowance may be uncertain; do not retry automatically.',
        },
      })),
  };

}
