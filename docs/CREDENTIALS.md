# SumWise Compute API credentials

Obtain an opaque API key and paid service/evaluation access separately from SumWise. This connector does not create accounts, sell access or provision keys. Service quantities and terms are communicated separately; no signup or checkout flow is promised.

In n8n, select **SumWise Compute API**:

- **API Key:** the separately issued key, stored in a password field. Never put it in workflow items, exported workflows, URLs or logs.
- **Service Origin:** defaults to https://api.sumwisecalc.com. The credential owner chooses where the secret is sent. Use only a service origin you trust. Alternative HTTPS origins are supported. Local HTTP is limited to literal 127.0.0.1 or [::1] with an optional port. No paths, user information, query or fragment; localhost aliases are refused. Redirects are not followed, and TLS verification is enabled.
- **Request Timeout (ms):** integer 1,000–120,000, default 30,000. This is a client timeout, not a processing-time guarantee.

## Calculation test and request allowance

**Credential testing sends a calculation request. Each accepted test counts toward your request limits.**

The pinned n8n UI tests testable credentials after saving, supports explicit retest, and can automatically retest an existing credential when its editor opens (subject to required-field/permission checks). Do not assume a test happens only after clicking a dedicated test button. This connector's test sends exactly POST /v1/evaluate with {"expression":"1+1"}, the selected origin/key/timeout and normal security controls. Only a contract-valid exact integer result 2 succeeds; an arbitrary 200 response does not prove connection.

Authentication rejection is reported separately from known busy/unavailable/rate/quota problems. A service-limit error does not mean that the key is invalid, and it does not fully qualify service availability. Malformed/unexpected responses fail the test. Timeout/transport failure leaves completion and accounting uncertain; a failed test does not establish that no allowance was consumed. There is no automatic node/test retry or idempotency guarantee. Read [retry decisions](USAGE.md) before any new attempt.

The test uses n8n's supported testedBy function and its credential-test request helper. No raw authenticated request, helper error or service response body is returned as a credential-test message. Normal Evaluate preserves validated success JSON even if legitimate data happens to equal an opaque key.

## Local mocks and validation status

The development preview provisions a clearly named synthetic mock credential; select it without copying a key from documentation. Mocks support fixed fixture expressions. Do not replace their synthetic key with a real one. Real-service credentials and request expenditure require a separately authorized smoke test. Mock tests do not verify the deployed service or external accounts.

Credentials are stored by n8n; expressions/results can remain in host execution history. Configure host access and retention appropriately. The connector does not control the whole n8n host's storage or logging.

The intended public location of this guide is the approved avery835/n8n-nodes-sumwise-compute repository; it is not asserted to be live before upload. The [connector MIT license](../LICENSE) grants no service, backend, desktop or trademark rights.
