# Self-hosted preview release checklist

Community preview for self-hosted n8n. Not n8n-verified.
Paid SumWise Compute access is separately provisioned.

Established review/validation facts:

- [x] Connector-only MIT licensing, retained third-party/source-origin and AI-assistance notices, and service/engine/desktop/trademark exclusions.
- [x] Fixed credential test requiring contract-valid exact integer 2, with request-consumption and editor save/open/retest notices.
- [x] Evaluate and supported generated tool wrapper preserve exact/approximate results, security/retry behavior and paired items.
- [x] Stock strict ESLint configuration remains intact. One narrow directive applies to the visible legacy credential-test request call; it does not pass verification with inline configuration ignored.
- [x] Reviewed public source uploaded with separate history and successful Linux CI; 120 baseline tests retained.
- [x] Prior authorized local-route live credential, Evaluate, reconciliation exception/match and generated-wrapper calls passed with the real HTTPS hostname and certificate validation.
- [x] Expected revoked-credential rejection observed in a separate continuation. The original interrupted lifecycle remains stopped; external TLS and owner-reported editor checks retain their narrower evidence limits.

For each publication, complete and record these gates in release evidence and Actions/registry metadata. This checklist alone does not assert publication:

- [ ] Confirm actual npm/GitHub identities, exact package/version availability and owner-approved authentication scope/expiry.
- [ ] Review the release delta and actual package bytes; pass build, configured lint, complete tests, package and source checks.
- [ ] Commit/export only selected source, reconcile the whole public tree and preserve distinct private/public history.
- [ ] Pass complete push-triggered Linux CI for the exact reviewed public SHA.
- [ ] Dispatch manual publish.yml for that public SHA and **0.1.0-dev.1**, public access and **next** tag, with provenance.
- [ ] Verify exact registry metadata, next tag, downloaded tarball integrity/content and cryptographic provenance.
- [ ] Exercise actual registry-installed bytes in fresh isolated n8n state using only fixed loopback mocks; clean task-owned state/processes.
- [ ] Confirm bootstrap-token revocation and repository-secret removal; record exact trusted-publisher/direct-publish status or remaining owner step.

The scanner/helper compatibility question and Creator Portal prerelease selection remain unresolved. They do not block this explicitly unverified self-hosted preview and are not waived by it. n8n verification, Cloud availability, external model/agent behavior, real customer integrations, backend deployment and production suitability are not claimed. Later verification/submission needs its own authorization.

Founding private-alpha access is US$99 for 30 days, with limited founder help setting up one supported calculation after confirming fit and applicable limits; contact [Avery](mailto:avery@sumwisecalc.com). Package installation grants no service entitlement, automatic signup, unlimited consulting, QA service or SLA.

See [controlled publishing](PUBLISHING.md), [development](DEVELOPMENT.md) and [usage](USAGE.md). Private historical evidence stays excluded from both public source and npm.
