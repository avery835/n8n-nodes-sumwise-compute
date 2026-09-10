# Controlled publication of the self-hosted preview

Community preview for self-hosted n8n. Not n8n-verified.
Paid SumWise Compute access is separately provisioned.

The preview release decision is **n8n-nodes-sumwise-compute@0.1.0-dev.1**, public access, distribution tag **next**, through the existing manual GitHub Actions workflow with provenance. Do not wait for the separate n8n verification inquiry to publish this explicitly unverified preview. That decision does not waive the known scanner finding or establish Cloud availability. An exact registry version and verified publication result establish publication; source, prepared YAML and npm dry runs do not.

## Identities and source boundaries

Public owner/repository: **avery835/n8n-nodes-sumwise-compute**. Package author: Avery Wise <avery@sumwisecalc.com>. Confirm the authenticated npm username and ownership independently; GitHub identity and package author metadata are not npm ownership.

The reviewed source is already public and has passed GitHub-hosted Linux CI: locked installation, build, configured lint, 120 baseline tests and package/source gates. Each release delta still requires those gates for its exact new public SHA. Use only the existing explicit public-source selection, with a fresh export and complete content reconciliation. Continue the public history; never push private development history, reports, owner state or dependencies.

The public source includes plainly synthetic tests and development support. The separate npm inventory excludes tests, scripts, mock credentials and local evidence. Connector MIT licensing, third-party/source-origin and AI-assistance notices must survive both selections; the license grants no rights to the separate service or n8n itself.

## Release sequence

1. Confirm the package/version is unoccupied through successful registry metadata reads. A network error is not availability. If a version exists, reconcile ownership, contents, tags and publication history; do not overwrite, unpublish or invent a replacement version.
2. Review the allowed release delta, actual distributable bytes and source manifest. Run build, configured lint, all tests, package and source gates. Preserve functional/security coverage, current dependencies, the visible legacy credential-test call and its single narrow directive.
3. Commit the private delta, export only selected public files, reconcile the public checkout and create a continuation commit. Push only public main without force or tags. Require complete Linux CI for that exact public commit; the private SHA is not the public SHA.
4. Prefer an existing verified trusted publisher. Otherwise, for a new package without configurable trust, the owner must explicitly approve the actual short-lived granular bootstrap-token scope, expiration and token-specific bypass-2FA requirement. Do not invent an unavailable-package-only grant. Never disable account 2FA, reveal the token, or overwrite an unidentified secret. The owner enters it directly into only this repository's **NPM_BOOTSTRAP_TOKEN** Actions secret.
5. Dispatch **publish.yml** from public main with the recorded full **public** reviewed_sha, version **0.1.0-dev.1** and approved authentication mode. Recheck the current public tip first. Repository/ref/SHA/name/version/license/repository-metadata guards and the clean build/checks must pass. Use only **npm publish --provenance --access public --tag next --ignore-scripts** inside Actions. No local publishing, n8n-node release, stable/latest promotion, Git tag/release or auto-versioning.
6. If the run is interrupted or ambiguous, inspect its logs and exact registry version before any next action. Never blindly retry publication. At most one successful publication of this immutable version is intended.
7. Read the actual version, ownership, tags and dist metadata. Require next to resolve to 0.1.0-dev.1; do not promote latest. Download the registry tarball, verify its reported integrity, compare its full file set/bytes to reviewed inputs/build outputs, and verify provenance against the public repository, commit and publish workflow. Metadata inspection alone is not cryptographic verification.
8. Qualify the freshly registry-installed connector in isolated self-hosted n8n state with fixed loopback mocks. Reuse the pinned host if desired, but record that distinction. The existing local-n8n helper copies development assets, so using it unchanged is not registry-installation proof. A small task-local adapter must retain the installed registry bytes and exercise credential resolution, exact rational/paired output, reconciliation exception and generated tool wrapper without an external model or live service. Clean only task-owned disposable state/processes.
9. After the attempt settles, have the owner revoke the exact bootstrap token and remove its repository secret, confirming both non-secret outcomes even if publication failed. Once the package exists, configure/verify trust for **avery835 / n8n-nodes-sumwise-compute / publish.yml**, with explicit owner approval of **direct npm publish** permission. Record any pending cleanup or trust step; bypass-2FA tokens must not be assumed capable of trust governance.

Ordinary push/PR/CI completion cannot publish. publish.yml is workflow_dispatch-only, checks out the event SHA, uses contents:read and job-scoped id-token:write, and confines the bootstrap secret to its conditional publish step. Inputs use environment variables rather than unchecked shell interpolation. PR CI uses pull_request, never pull_request_target. Keep official actions pinned; do not broaden permissions or add an alternate release system.

## Validation and unresolved verification

Prior bounded live credential, Evaluate, both reconciliation decisions and generated-wrapper calls passed through an authorized local route retaining the real HTTPS hostname and certificate validation. External TLS reachability was a separate observation, not a full external authenticated workflow. Expected revoked-credential rejection was observed in a later continuation; the original interrupted lifecycle remains stopped. Owner-reported editor checks are not a new automated walkthrough. No external model/agent loop, real customer finance integration or production-suitability conclusion follows.

The pinned n8n 2.37.10 custom credential-test context exposes only its legacy **this.helpers.request** HTTP helper. The known verification rule rejects it when inline configuration is ignored. Configured lint passes with the single visible narrow directive; it is not scanner-clean status or an n8n waiver. Preserve the supported runtime behavior while the separate compatibility question remains unresolved.

Creator Portal acceptance/selection of the next-only prerelease remains unconfirmed and does not gate this unverified self-hosted preview. No Creator Portal submission or verified-node claim is part of this publication. Any later verified release, version/tag change, reviewer service access or Cloud claim requires its own decision.

## Official references and pinned inputs

- [npm token creation](https://docs.npmjs.com/creating-and-viewing-access-tokens/), [trusted publishing](https://docs.npmjs.com/trusted-publishers/), [provenance](https://docs.npmjs.com/generating-provenance-statements/) and [signature verification](https://docs.npmjs.com/verifying-ecdsa-registry-signatures/).
- [n8n verification guidelines](https://docs.n8n.io/connect/create-nodes/build-your-node/reference/verification-guidelines/) and [submission guidance](https://docs.n8n.io/connect/create-nodes/deploy-your-node/submit-community-nodes/).
- Node 24.19.0, installed n8n 2.37.10 and node CLI 0.46.4 are the reviewed host/tool inputs. The workflow checks npm >=11.5.1. No dependency/action upgrade is implicit.
- actions/checkout v6: **d23441a48e516b6c34aea4fa41551a30e30af803**; actions/setup-node v6: **249970729cb0ef3589644e2896645e5dc5ba9c38**.
- Retained starter MIT notice: **6240cb49c06c41b6bc0b2c4c6fc28924ad3a4fbd**. Development dependency licenses remain upstream.
