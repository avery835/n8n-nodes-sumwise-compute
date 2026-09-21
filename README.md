# SumWise Compute for n8n

Community connector for self-hosted n8n. Not n8n-verified.
Paid SumWise Compute access is separately provisioned.

Evaluate expressions using the separately provisioned SumWise Compute service. The connector preserves typed exact integer/rational strings and approximate-result provenance without embedding a calculator. An external calculation service is useful when workflows need the same calculation contract and engine identity across hosts.

This unverified community connector targets compatible self-hosted instances whose permissions and community-node policy allow unverified packages. It is not an n8n Cloud custom-node release, verified-node listing, endorsement or enterprise-readiness claim. No production suitability, uptime or throughput guarantee is made.

## Install

In a permitted self-hosted instance, an authorized owner/admin can open **Settings → Community nodes → Install** and enter **n8n-nodes-sumwise-compute@0.1.0**. Review the community-package notice and install. Follow your instance's administrator-approved installation procedure if this UI is unavailable; a disabled community-node policy is not bypassed by this package.

Prefer that exact version for reproducibility. Stable releases use **latest**. **n8n-nodes-sumwise-compute@next** remains the separate older preview channel; it is not promoted or removed by the stable release. If the exact version does not resolve in npm, publication has not completed; public source or a successful CI run alone is not a registry release. See the [npm package](https://www.npmjs.com/package/n8n-nodes-sumwise-compute).

Installation grants no service access. After installation, arrange paid access separately and select the **SumWise Compute API** credential when using **SumWise Compute**.

## Credentials and usage

Founding private-alpha access is **US$99 for 30 days**, with limited founder help setting up one supported calculation after confirming fit and applicable limits. Contact **Avery at [avery@sumwisecalc.com](mailto:avery@sumwisecalc.com)** to discuss access. Opaque API keys and paid service access are manually provisioned under the agreed terms.

This is not unlimited consulting, a QA service, free service entitlement, automatic signup, an SLA or a promise of production suitability. No signup, payment link, checkout or account provisioning is included in this MIT connector.

Select **SumWise Compute API** and read the [credential guide](docs/CREDENTIALS.md) before saving/testing. **Credential testing sends a calculation request. Each accepted test counts toward your request limits.** The pinned n8n UI may test on save, explicit retest and opening an existing credential.

Evaluate accepts an ASCII expression such as **1/3 + 5/6**, including a mapped prior item string (={{ $json.expression }}). It performs only POST /v1/evaluate. The eleven supported functions are expression capabilities, not eleven operations. See [usage and safe retry decisions](docs/USAGE.md).

Successful output preserves the validated service JSON under **body**, with statusCode and allowlisted response headers outside it. Exact integer/rational fields remain strings; approximate results remain approximate. Do not coerce exact strings into floating point downstream.

## Evaluate as an AI tool

The supported n8n-generated **SumWise Compute Tool** runs the same Evaluate implementation. An agent can supply the expression; the credential owner controls origin, key and timeout. There is no arbitrary URL/header/HTTP-operation input, local arithmetic engine or model dependency.

Each accepted tool request consumes service allowance. n8n/agent workflows may call it multiple times; the node's lack of automatic retries does not constrain all host/agent behavior. Mock and bounded live generated-wrapper invocations used no external model. No external AI model/agent loop is proven.

## Limits, privacy and examples

The complete expression-only JSON body is limited to 4,096 UTF-8 bytes, including escaping. Items run sequentially and retain paired-item linkage without input mutation. Separate workflow executions can overlap; service_busy and rate/quota/concurrency errors are possible. Keep the host's **Retry On Fail** disabled. Redirects are refused and TLS validation stays enabled.

Timeout/failure leaves request completion and accounting uncertain. There is no idempotency-key contract. Expressions and results reach the selected service and may also be stored in n8n execution history; this connector does not control the host's retention or all host logs.

- [Exact structured result](examples/01-exact-result.mock.json): synthetic expression to exact rational output.
- [Reconciliation exception](examples/02-reconciliation.mock.json): synthetic totals, service-computed difference, standard If branching.

Examples contain no credentials. The source-checkout mock preview supplies a synthetic credential to select; fixtures are explicit responses, not a second calculator. An installed community package still requires separately provisioned service credentials.

## Validation and verification status

The public source has passed Linux CI with 120 baseline tests, build, configured lint and package/source checks. Native n8n mock workflows exercised exact results, paired items, reconciliation and credential/tool paths. Separately authorized live credential, Evaluate, reconciliation exception/match and generated-wrapper requests succeeded through a local route retaining the real HTTPS hostname and certificate validation. External TLS reachability was a separate observation, not a complete external authenticated workflow test.

A later continuation observed the expected rejection of an owner-resupplied revoked credential. It does not relabel the original interrupted lifecycle as PASS or prove uninterrupted secret continuity. Prior editor checks are owner-reported evidence, not a new automated walkthrough. No external AI model/agent loop or real customer finance, email or CRM integration is proven.

The credential-file test uses the supported n8n ICredentialTestRequest mechanism with an authentication hook that validates the chosen origin and timeout, keeps TLS validation, refuses redirects and prevents an authentication failure from causing a second HTTP request. This status-based check establishes HTTP request acceptance, not correctness of the returned calculation. Normal Evaluate retains full typed-response validation. The stock lint configuration has no compatibility suppression. Local lint or mock success is not official scanner acceptance, publication provenance or n8n verification. The changed credential path requires its own separately authorized real-service check; earlier live results do not qualify it.

For source-checkout development and controlled publishing, see the public repository's [development guide](https://github.com/avery835/n8n-nodes-sumwise-compute/blob/main/docs/DEVELOPMENT.md) and [publishing guide](https://github.com/avery835/n8n-nodes-sumwise-compute/blob/main/docs/PUBLISHING.md). Those source-only tools are excluded from npm.

## License and origin

[MIT](LICENSE), Copyright (c) 2026 Avery Wise, applies to this connector and its intended public supporting source/docs/examples, subject to [third-party notices](THIRD_PARTY_NOTICES.md). It does not license the separate SumWise service, engine, desktop application or trademarks. Development used AI assistance and official n8n conventions; no claim of human-only authorship or universal ownership of third-party material is made.
