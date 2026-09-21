import type { ICredentialDataDecryptedObject, IDataObject, IHttpRequestOptions } from 'n8n-workflow';
import { endpoint, fail, requestBody, responseData, transportError } from './protocol';

function configuration(credentials: ICredentialDataDecryptedObject) {
  const url = endpoint(credentials.serviceOrigin);
  const timeout = credentials.requestTimeout ?? 30000;
  if (typeof timeout !== 'number' || !Number.isInteger(timeout) || timeout < 1000 || timeout > 120000 ||
      typeof credentials.apiKey !== 'string' || !credentials.apiKey || /[\r\n]/.test(credentials.apiKey)) {
    fail('Invalid Compute credential configuration', 'invalid_configuration');
  }
  return { url, timeout, apiKey: credentials.apiKey };
}

// Supported n8n credential authentication hook; it does not perform HTTP requests.
// RoutingNode sets its own timeout before this hook, so apply the validated
// credential timeout here as well as in normal Evaluate request construction.
export async function authenticateRequest(credentials: ICredentialDataDecryptedObject,
  options: IHttpRequestOptions): Promise<IHttpRequestOptions> {
  const settings = configuration(credentials);
  if (Object.keys(options.headers ?? {}).some((name) => name.toLowerCase() === 'authorization') || options.auth) {
    // n8n's authentication wrapper calls this hook again after HTTP 401 with the
    // already authenticated options. Refuse that second dispatch, without state.
    fail('Authentication failed or the request was already authenticated. No automatic retry was sent. Check the credential before a new attempt; request completion and allowance may be uncertain.', 'authentication_required');
  }
  if (options.method !== 'POST' || (options.url !== '/v1/evaluate' && options.url !== settings.url) ||
      typeof options.body !== 'string' || [...options.body].some((char) => char.charCodeAt(0) > 126) || options.body.length > 4096) {
    fail('Invalid Compute request configuration', 'invalid_configuration');
  }
  return {
    ...options, url: settings.url, baseURL: undefined, timeout: settings.timeout,
    headers: { ...options.headers, Authorization: `Bearer ${settings.apiKey}`,
      'Content-Type': 'application/json', 'Content-Length': String(options.body.length) },
    encoding: 'text', json: false, disableFollowRedirect: true,
    skipSslCertificateValidation: false, sendCredentialsOnCrossOriginRedirect: false,
  };
}

// Normal Evaluate retains closed response validation and exact strings.
export async function evaluate(expression: unknown, credentials: ICredentialDataDecryptedObject,
  send: (options: IHttpRequestOptions) => Promise<unknown>): Promise<IDataObject> {
  const body = requestBody(expression);
  const { url, timeout, apiKey } = configuration(credentials);
  let response: unknown;
  try {
    response = await send({
      method: 'POST', url, body,
      headers: { 'Content-Type': 'application/json', 'Content-Length': String(body.length), Accept: 'application/json, application/problem+json' },
      encoding: 'text', returnFullResponse: true, ignoreHttpStatusErrors: true,
      disableFollowRedirect: true, skipSslCertificateValidation: false, timeout,
    });
  } catch (error) { throw transportError(error); }
  return responseData(response, apiKey);
}
