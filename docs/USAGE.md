# SumWise Compute usage

Community connector for self-hosted n8n. Not n8n-verified.
Paid SumWise Compute access is separately provisioned.

Install the exact **n8n-nodes-sumwise-compute@0.1.0** version through your permitted self-hosted community-node installation flow; **latest** is the stable channel and **@next** retains the separate preview. Instance permissions and policy must allow unverified packages. See [installation and access](../README.md). This is not an n8n Cloud custom-node release.

## Credentials

**SumWise Compute API** stores the separately issued opaque bearer API key as a password. Do not place credentials in item data, node parameters, workflow exports or URLs.

**Service Origin** defaults to https://api.sumwisecalc.com. The credential owner chooses where the secret is sent. Alternative HTTPS origins are supported. Local HTTP is permitted only for literal 127.0.0.1 or [::1], optionally with a port. HTTP hostnames, shorthand addresses, paths, query strings, fragments and embedded user information are rejected. Origin and timeout are credential-level settings, outside per-item expressions. Redirects are refused and normal TLS validation remains enabled.

**Request Timeout (ms)** is an integer from 1,000 to 120,000, default 30,000. This is a client choice, not a processing-time guarantee. The supported credential-file test sends 1+1 through Evaluate. Its HTTP-status check verifies request acceptance, not the typed calculation body. Normal Evaluate and separate integration assertions validate typed results. Credential testing sends a calculation request. Each accepted test counts toward your request limits. n8n may test on save, explicit retest and opening an existing credential; see [credentials](CREDENTIALS.md). No health/authentication endpoint is invented.

## Input and results

Evaluate accepts one nonempty ASCII expression string, including a mapped prior item value. The complete serialized JSON body may not exceed 4,096 UTF-8 bytes, including escaping. Grammar/domain validation and unpublished computation limits remain service responsibilities.

The functions sum, mean, min, max, median, range, abs, sign, floor, ceil and trunc are expression capabilities. Aggregations admit 1–30 arguments; scalar utilities take one. There is no Convert, batch endpoint or local calculation engine.

This is an illustrative fixed mock response, not a deployed engine identity:

~~~json
{
  "body": {
    "ok": true,
    "api_version": "v1",
    "operation": "evaluate",
    "engine_version": "0.1.0-mock.1",
    "result": {
      "type": "rational",
      "text": "7/6",
      "exactness": "exact",
      "value": { "numerator": "7", "denominator": "6" }
    }
  },
  "statusCode": 200,
  "headers": { "x-request-id": "mock-1" }
}
~~~

The validated parsed service body is preserved unchanged. Integers and rational components remain exact strings; no local rounding, simplification or recomputation occurs. Approximate values are finite binary64 strings with type "real" and exactness "approximate"; decimal/scientific inputs and constants introduce approximate provenance. The connector does not relabel approximate results exact.

Acceptance depends on the documented closed response shape, field types and value constraints. An opaque key may coincidentally equal a field name, version, result or substring of legitimate service data. Equality alone cannot identify a credential leak, so valid body data is never rejected or redacted for that reason. The node never copies credentials or authenticated request objects into output. It discards raw helper errors and unexpected problem data; optional untrusted response metadata containing the key is redacted. This is not a promise that a key's substring can never appear in a legitimate result or that the connector controls all n8n storage.

Only request ID and valid positive integer Retry-After response headers are exposed, outside the service body. Header redaction does not invalidate a successful calculation. Standard pairedItem linkage identifies the originating item.

## Errors and retry decisions

Configure n8n **On Error** to stop or continue. Continue output contains an error, stable code, safe status/problem/header information where available and paired-item linkage; it is never a successful calculation. Valid static public problem fields are retained. Malformed or unknown responses fail honestly.

Correct input, authentication, expression/domain and limit problems before another attempt. A durably accepted request consumes a rate attempt without a later refund. Credential-specific rate/quota quantities are communicated separately. For rate/quota rejection, wait at least the positive Retry-After seconds before any explicitly chosen retry. Other executions may overlap despite sequential item handling, so concurrency errors and service_busy are possible.

There is no automatic retry, polling, caching or duplicate suppression. Keep n8n **Retry On Fail** disabled. Do not automatically retry a computation timeout. A transport timeout/failure leaves request completion and accounting uncertain; it does not establish that no quota was consumed. With no idempotency-key contract, every explicit retry is a new attempt. No availability, retry schedule, throughput or SLA is promised.

Expressions/results reach the chosen service and may persist in n8n execution history. Use data permitted by the separately agreed evaluation terms.

## Examples and validation boundary

The [exact example](../examples/01-exact-result.mock.json) and [reconciliation example](../examples/02-reconciliation.mock.json) use synthetic inputs, omit credentials and disable Retry On Fail. The latter asks the service to subtract two totals and uses a standard If node to inspect a nonzero or approximate result; it does not perform local arithmetic or connect a finance, email or CRM account.

Mock-backed tests and two real-n8n CLI examples have executed, and the public source passed Linux CI. Prior bounded live credential, Evaluate, reconciliation exception/match and generated-wrapper requests succeeded through an authorized local route preserving the real HTTPS hostname and certificate validation. External TLS reachability was observed separately; it was not a full external authenticated workflow test. A separate continuation observed expected revoked-credential rejection without converting the original interrupted lifecycle into PASS. Prior owner-reported editor checks are not a new automated walkthrough.

The supported credential-file test is status-based: it checks HTTP request acceptance and does not validate the calculation body. Normal Evaluate retains the closed typed-response checks above; separate integration assertions verify that 1+1 returns exact integer 2. The authentication hook enforces credential origin/timeout and prevents a second request after authentication failure. Earlier live evidence covers the previous credential path, not this change. npm publication does not establish n8n verification, Cloud availability, external AI-agent behavior or real customer finance integration.

## Tool use

The n8n-generated tool exposes the same Evaluate operation and body envelope. Map only the expression from the agent; origin, key and timeout remain credential-level. Each accepted call consumes service allowance, and an agent or the host may issue multiple calls independently of node-level no-retry behavior. Local wrapper invocation uses a synthetic expression and no external model; actual AI-agent usage is not claimed.

Paid service access is separately provisioned; the connector license grants no service entitlement. Founding private-alpha access is US$99 for 30 days, with limited founder help setting up one supported calculation after confirming fit and applicable limits. Contact [Avery](mailto:avery@sumwisecalc.com). This is not unlimited consulting, a QA service, automatic signup, an SLA or a production-suitability promise.
