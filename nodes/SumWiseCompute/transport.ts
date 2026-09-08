import type { ICredentialDataDecryptedObject, ICredentialTestFunction, IDataObject, IHttpRequestOptions } from 'n8n-workflow';
import { ConnectorError, endpoint, fail, object, requestBody, responseData, transportError } from './protocol';

// Both host adapters share request framing, configuration and response validation.
export async function evaluate(expression: unknown, credentials: ICredentialDataDecryptedObject,
  send: (options: IHttpRequestOptions) => Promise<unknown>): Promise<IDataObject> {
  const body = requestBody(expression);
  const url = endpoint(credentials.serviceOrigin);
  const timeout = credentials.requestTimeout ?? 30000;
  if (typeof timeout !== 'number' || !Number.isInteger(timeout) || timeout < 1000 || timeout > 120000 ||
      typeof credentials.apiKey !== 'string' || !credentials.apiKey || /[\r\n]/.test(credentials.apiKey)) {
    fail('Invalid Compute credential configuration', 'invalid_configuration');
  }
  let response: unknown;
  try {
    response = await send({
      method: 'POST', url, body,
      headers: { 'Content-Type': 'application/json', 'Content-Length': String(body.length), Accept: 'application/json, application/problem+json' },
      encoding: 'text', returnFullResponse: true, ignoreHttpStatusErrors: true,
      disableFollowRedirect: true, skipSslCertificateValidation: false, timeout,
    });
  } catch (error) { throw transportError(error); }
  return responseData(response, credentials.apiKey);
}

export const testCredential: ICredentialTestFunction = async function (credential) {
  try {
    const credentials = credential.data ?? {};
    const result = await evaluate('1+1', credentials, async (options) =>
      // CredentialTestContext exposes the legacy request helper. Its bearer auth
      // option is resolved by n8n; it has no preAuthentication/retry wrapper.
      // eslint-disable-next-line @n8n/community-nodes/no-deprecated-workflow-functions -- n8n 2.37.10 CredentialTestContext exposes only request; this adapter has no retry wrapper.
      await this.helpers.request({
        method: options.method, uri: options.url, body: options.body, headers: options.headers,
        auth: { bearer: credentials.apiKey }, timeout: options.timeout,
        json: false, encoding: 'utf8', resolveWithFullResponse: true, simple: false,
        followRedirect: false, followAllRedirects: false, maxRedirects: 0,
        rejectUnauthorized: true, sendCredentialsOnCrossOriginRedirect: false,
      }));
    const body = result.body;
    if (!object(body) || !object(body.result) || body.result.type !== 'integer' ||
        body.result.exactness !== 'exact' || body.result.text !== '2' || body.result.value !== '2') {
      return { status: 'Error', message: 'Unexpected calculation result: the credential test requires exact integer 2. An accepted test may have consumed request allowance.' };
    }
    return { status: 'OK', message: 'Calculation test returned exact integer 2. Each accepted test counts toward your request limits.' };
  } catch (error) {
    const safe = error instanceof ConnectorError ? error : new ConnectorError('Credential test failed', { code: 'invalid_configuration' });
    // Only static connector diagnostics: no response body, raw error, key or request.
    const detail = typeof safe.info.detail === 'string' ? safe.info.detail : 'Check the credential settings before a new attempt.';
    return { status: 'Error', message: safe.message + '. ' + detail + ' A failed test does not establish that no request allowance was consumed.' };
  }
};
