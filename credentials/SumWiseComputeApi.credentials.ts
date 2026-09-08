import type { IAuthenticateGeneric, ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

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

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: { headers: { Authorization: '=Bearer {{$credentials.apiKey}}' } },
  };

}
