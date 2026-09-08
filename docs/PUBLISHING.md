# Controlled publishing plan — not yet executed

This source prepares a manual GitHub Actions publication, not an uploaded repository, registry release or completed n8n submission. The current version remains 0.1.0-dev.1 and the workflow uses the **next** distribution tag. A later stable-version/latest decision requires its own reviewed change. Never use a local first publish to bypass GitHub Actions provenance.

## Approved identities and public source

GitHub owner/repository: avery835/n8n-nodes-sumwise-compute. Intended npm name: n8n-nodes-sumwise-compute. Package author: Avery Wise <avery@sumwisecalc.com>. The npm account username and registry ownership/authentication remain unconfirmed; author metadata is not registry ownership.

Upload only the explicitly reviewed public-source snapshot in a separately authorized step. The private development repository has local engineering records and history that are not part of the public release. Do not push that repository's full contents/history. The snapshot may begin a new public history; it does not preserve the private development history. The source manifest includes supporting tests with plainly synthetic fixtures; the separate npm manifest excludes them.

The prepared CI installs the lockfile on a clean GitHub-hosted Linux runner, builds, runs stock lint, mock tests, package checks and source checks. Pull requests use pull_request, never pull_request_target. No Compute or model secret is used. Linux Actions execution remains untested locally; prepared YAML is not evidence of a successful run.

## Smallest remaining publication sequence

1. Complete targeted release review, Avery's manual editor walkthrough and separately authorized real-service smoke. Confirm service deployment/credential availability and explicitly approve accepted-request expenditure, including save/retest and tool calls. Local mock qualification grants no backend readiness or customer entitlement.
2. Confirm the npm username/account ownership, current name availability, GitHub account/repository ownership and public metadata. Create the intended public repository and upload only the reviewed snapshot under separate authorization. Run its remote CI successfully before publishing.
3. Inspect the public main commit, generated package and exact version. The manual publish workflow requires that exact public commit SHA and version; the private development commit is not the new public history's SHA. Keep the repository public for provenance and the package repository metadata matching it.
4. Prefer npm trusted publishing after the package has configurable settings. Configure GitHub owner avery835, repository n8n-nodes-sumwise-compute, workflow filename publish.yml; permit direct npm publish. No trust relationship is configured by this source.
5. A brand-new package may have no package settings yet. If initial OIDC setup is unavailable, separately authorize a short-lived granular npm token with only the permissions required to create/publish this package. New-package creation may require broader account-level creation permission than an existing-package scope; confirm the actual npm controls and do not pretend an unavailable package-scoped grant exists. Configure only the NPM_BOOTSTRAP_TOKEN repository secret, with the shortest practical expiry and required 2FA/bypass policy reviewed by the owner. Do not commit or print the token. Select bootstrap-token for this one manual Actions run. Provenance still comes from GitHub OIDC. No secret has been obtained or created locally.
6. Dispatch publish.yml from public main only after the reviewed SHA/version and authentication mode are approved. It checks repository/ref/SHA/version, rebuilds/tests the same checkout, uses contents:read and job-scoped id-token:write, then publishes with provenance/public access. It does not commit, tag, push or invoke a release tool. No ordinary push/PR publishes.
7. Verify registry contents/provenance, revoke the bootstrap token and remove its repository secret, then configure/verify trusted publishing and restrict token access as appropriate. These account actions require separate execution authorization.
8. Run then-current n8n published-package checks, arrange a reachable service and separately provisioned reviewer credentials as required, and submit through Creator Portal after authorization. Do not claim verified status before n8n's decision.

Staged publishing is not assumed to create a brand-new package and is not used in the initial workflow. npm trusted publishing requires npm >=11.5.1 and Node >=22.14; the prepared runner selects Node 24.19.0 and checks npm. No dependency upgrades or installs were performed during local preparation.

## Official sources and reviewed inputs

- [n8n verification guidelines](https://docs.n8n.io/connect/create-nodes/build-your-node/reference/verification-guidelines/) and [submission guidance](https://docs.n8n.io/connect/create-nodes/deploy-your-node/submit-community-nodes/).
- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/), [provenance](https://docs.npmjs.com/generating-provenance-statements/) and [staged publishing](https://docs.npmjs.com/staged-publishing/).
- Official node CLI **0.46.4** stock lint/template interfaces and installed n8n **2.37.10** were inspected. The project workflows are purpose-written, not the CLI's tag-triggered release template. No upstream CLI runtime is copied into public source.
- Official actions/checkout v6 resolved to **d23441a48e516b6c34aea4fa41551a30e30af803**; actions/setup-node v6 to **249970729cb0ef3589644e2896645e5dc5ba9c38** on 2026-09-08. YAML pins those commits. Review newer revisions separately before adopting them.
- Retained starter MIT notice was checked at **6240cb49c06c41b6bc0b2c4c6fc28924ad3a4fbd**. Development dependency licenses remain upstream; the connector MIT grant does not relicense n8n itself.

No upload, account setup, token creation, publication, remote workflow dispatch or Creator Portal action occurred in this local milestone.

The pinned CredentialTestContext provides only its legacy request helper. One owner-approved inline lint compatibility directive covers that call; the stock configuration and strict mode remain intact. Local lint success includes this directive and does not establish n8n acceptance of the compatibility choice. Reassess against the then-current host and published-package review before verification.
