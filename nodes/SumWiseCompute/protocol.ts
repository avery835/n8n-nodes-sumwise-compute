import type { IDataObject } from 'n8n-workflow';
import problems from './problems.json';

export class ConnectorError extends Error {
  constructor(message: string, readonly info: IDataObject) {
    super(message);
  }
}

export function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function closed(value: unknown, keys: string[]): value is Record<string, unknown> {
  return object(value) && Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

export function endpoint(origin: unknown): string {
  const invalid = () => new ConnectorError('Invalid service origin', {
    code: 'invalid_configuration',
    detail: 'Use an HTTPS origin, or http://127.0.0.1:PORT or http://[::1]:PORT for a local mock. Paths, queries, fragments, user information, and URL shorthand are not allowed.',
  });
  if (typeof origin !== 'string' || /[\s\\?#@]/.test(origin)) throw invalid();
  let url: URL;
  try { url = new URL(origin); } catch { throw invalid(); }
  if (!/^https?:\/\/[^/]+\/?$/.test(origin) || url.pathname !== '/' || url.username || url.password) throw invalid();
  if (url.protocol === 'http:' && !/^http:\/\/(?:127\.0\.0\.1|\[::1\])(?::[1-9][0-9]{0,4})?\/?$/.test(origin)) throw invalid();
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw invalid();
  return `${url.origin}/v1/evaluate`;
}

export function requestBody(expression: unknown): string {
  if (typeof expression !== 'string' || expression.trim() === '' || [...expression].some((char) => char.charCodeAt(0) > 126)) {
    throw new ConnectorError('Expression must be a nonempty ASCII string', { code: 'invalid_input' });
  }
  const body = JSON.stringify({ expression });
  // ASCII was checked first; JSON escapes are also ASCII, so length is UTF-8 bytes.
  if (body.length > 4096) {
    throw new ConnectorError('Serialized request body exceeds 4096 bytes', { code: 'request_body_too_large' });
  }
  return body;
}

export function fail(message: string, code: string): never {
  throw new ConnectorError(message, { code });
}

const integer = /^(?:0|-?[1-9][0-9]*)$/;
const numerator = /^-?[1-9][0-9]*$/;
const denominator = /^(?:[2-9]|[1-9][0-9]+)$/;
const real = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*[1-9])?(?:e-?[1-9][0-9]*)?$/;
const version = /^(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)(?:-(?:(?:0|[1-9][0-9]*)|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:(?:0|[1-9][0-9]*)|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function success(body: unknown): body is IDataObject {
  if (!closed(body, ['ok', 'api_version', 'operation', 'engine_version', 'result']) ||
      body.ok !== true || body.api_version !== 'v1' || body.operation !== 'evaluate' ||
      typeof body.engine_version !== 'string' || body.engine_version.length > 64 || !version.test(body.engine_version)) return false;
  const result = body.result;
  if (!closed(result, ['type', 'text', 'exactness', 'value']) || typeof result.text !== 'string') return false;
  if (result.type === 'integer') {
    return result.exactness === 'exact' && typeof result.value === 'string' && integer.test(result.value) && result.text === result.value;
  }
  if (result.type === 'rational') {
    const value = result.value;
    return result.exactness === 'exact' && closed(value, ['numerator', 'denominator']) &&
      typeof value.numerator === 'string' && numerator.test(value.numerator) &&
      typeof value.denominator === 'string' && denominator.test(value.denominator) &&
      result.text === `${value.numerator}/${value.denominator}`;
  }
  if (result.type === 'real') {
    // Validate finiteness only for the approximate family. Return the original strings.
    return result.exactness === 'approximate' && typeof result.value === 'string' &&
      real.test(result.value) && Number.isFinite(Number(result.value)) && result.text === result.value;
  }
  return false;
}

function safeHeaders(raw: unknown, secret: string): IDataObject {
  const result: IDataObject = {};
  if (!object(raw)) return result;
  for (const [key, value] of Object.entries(raw)) {
    const name = key.toLowerCase();
    if (typeof value !== 'string') continue;
    if (name === 'x-request-id') {
      result[name] = secret && value.includes(secret) ? '[REDACTED]' : value;
    } else if (name === 'retry-after' && /^[1-9][0-9]*$/.test(value)) {
      result[name] = secret && value.includes(secret) ? '[REDACTED]' : value;
    }
  }
  return result;
}

export function responseData(response: unknown, secret: string): IDataObject {
  const statusCode = object(response) && typeof response.statusCode === 'number' ? response.statusCode : undefined;
  const headers = safeHeaders(object(response) ? response.headers : undefined, secret);
  const malformed = () => new ConnectorError('Malformed or unexpected Compute response', {
    code: 'malformed_response', ...(statusCode === undefined ? {} : { statusCode }), headers,
    detail: 'No calculation was returned. The response did not match the frozen public contract. No automatic retry was made.',
  });
  if (!object(response)) throw malformed();
  if (statusCode !== undefined && statusCode >= 300 && statusCode < 400) {
    throw new ConnectorError('Compute redirect refused', { code: 'redirect_refused', statusCode, headers });
  }
  let body: unknown;
  try { body = typeof response.body === 'string' ? JSON.parse(response.body) : response.body; } catch { throw malformed(); }
  const rawHeaders = object(response.headers) ? response.headers : {};
  const mediaType = Object.entries(rawHeaders).find(([key]) => key.toLowerCase() === 'content-type')?.[1];
  const mime = typeof mediaType === 'string' ? mediaType.split(';')[0].trim().toLowerCase() : '';
  if (statusCode === 200 && mime === 'application/json' && success(body)) {
    // Contract-valid body text can coincide with an opaque credential. Equality
    // alone is not evidence of reflection; preserve the validated body unchanged.
    return { body, statusCode, headers };
  }
  if (statusCode !== 200 && mime === 'application/problem+json' && object(body) && typeof body.code === 'string') {
    const known = (problems as Record<string, IDataObject>)[body.code];
    // Reconstruct only a fully matching public static problem, never reflect raw error bodies.
    if (known && known.status === statusCode && closed(body, Object.keys(known)) &&
        Object.entries(known).every(([key, value]) => body[key] === value)) {
      if ((body.code === 'rate_limit_exceeded' || body.code === 'quota_exhausted') && !headers['retry-after']) throw malformed();
      throw new ConnectorError(`Compute: ${body.code} (HTTP ${statusCode})`, {
        code: body.code, statusCode, problem: { ...known }, headers,
        detail: 'No automatic retry was made. A new attempt may consume rate or quota accounting.',
      });
    }
  }
  throw malformed();
}

export function transportError(error: unknown): ConnectorError {
  let timeout = false;
  let current = error;
  // n8n wraps transport errors. Inspect only bounded code fields, never messages or requests.
  for (let depth = 0; depth < 4 && object(current); depth++) {
    timeout ||= current.code === 'ETIMEDOUT' || current.code === 'ECONNABORTED' || current.code === 'ESOCKETTIMEDOUT';
    current = current.cause;
  }
  return new ConnectorError(timeout ? 'Compute request timed out' : 'Compute transport failed', {
    code: timeout ? 'transport_timeout' : 'transport_error',
    detail: 'Request completion and rate/quota consumption are uncertain. No automatic retry was made. There is no idempotency-key contract; an explicit retry is a new attempt.',
  });
}
