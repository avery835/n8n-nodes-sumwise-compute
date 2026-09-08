# SumWise Compute for n8n

Evaluate expressions using the separately provisioned SumWise Compute service. The connector preserves typed exact integer/rational strings and approximate-result provenance without embedding a calculator. An external calculation service is useful when workflows need the same calculation contract and engine identity across hosts.

This is a locally qualified release candidate. npm publication, real-service smoke testing and n8n verification remain pending. The intended repository/documentation URLs may not be live until the approved public snapshot is uploaded. No n8n endorsement, public production readiness, uptime or throughput guarantee is claimed.

## Credentials and usage

Paid service access and opaque API keys are arranged separately with SumWise under the applicable evaluation/service terms. No signup, checkout, account provisioning or service entitlement is included in this MIT connector.

Select **SumWise Compute API** and read the [credential guide](docs/CREDENTIALS.md) before saving/testing. **Credential testing sends a calculation request. Each accepted test counts toward your request limits.** The pinned n8n UI may test on save, explicit retest and opening an existing credential.

Evaluate accepts an ASCII expression such as **1/3 + 5/6**, including a mapped prior item string (={{ $json.expression }}). It performs only POST /v1/evaluate. The eleven supported functions are expression capabilities, not eleven operations. See [usage and safe retry decisions](docs/USAGE.md).

Successful output preserves the validated service JSON under **body**, with statusCode and allowlisted response headers outside it. Exact integer/rational fields remain strings; approximate results remain approximate. Do not coerce exact strings into floating point downstream.

## Evaluate as an AI tool

The supported n8n-generated **SumWise Compute Tool** runs the same Evaluate implementation. An agent can supply the expression; the credential owner controls origin, key and timeout. There is no arbitrary URL/header/HTTP-operation input, local arithmetic engine or model dependency.

Each accepted tool request consumes service allowance. n8n/agent workflows may call it multiple times; the node's lack of automatic retries does not constrain all host/agent behavior. Local tool-wrapper invocation uses mocks without an external model. Actual AI-agent/provider usage remains untested.

## Limits, privacy and examples

The complete expression-only JSON body is limited to 4,096 UTF-8 bytes, including escaping. Items run sequentially and retain paired-item linkage without input mutation. Separate workflow executions can overlap; service_busy and rate/quota/concurrency errors are possible. Keep the host's **Retry On Fail** disabled. Redirects are refused and TLS validation stays enabled.

Timeout/failure leaves request completion and accounting uncertain. There is no idempotency-key contract. Expressions and results reach the selected service and may also be stored in n8n execution history; this connector does not control the host's retention or all host logs.

- [Exact structured result](examples/01-exact-result.mock.json): synthetic expression to exact rational output.
- [Reconciliation exception](examples/02-reconciliation.mock.json): synthetic totals, service-computed difference, standard If branching.

Examples contain no credentials. Local preview supplies a synthetic mock credential to select; no manual key entry is needed. Fixtures are explicit responses, not a second calculator. Mock request/response tests, native n8n CLI examples and release credential/tool paths are distinguished from pending real-service/editor checks. No email/CRM/customer finance integration was tested.

For source-checkout development and controlled publishing plans, see the intended repository's [development guide](https://github.com/avery835/n8n-nodes-sumwise-compute/blob/main/docs/DEVELOPMENT.md) and [publishing guide](https://github.com/avery835/n8n-nodes-sumwise-compute/blob/main/docs/PUBLISHING.md). Those source-only tools are excluded from npm.

## License and origin

[MIT](LICENSE), Copyright (c) 2026 Avery Wise, applies to this connector and its intended public supporting source/docs/examples, subject to [third-party notices](THIRD_PARTY_NOTICES.md). It does not license the separate SumWise service, engine, desktop application or trademarks. Development used AI assistance and official n8n conventions; no claim of human-only authorship or universal ownership of third-party material is made.
