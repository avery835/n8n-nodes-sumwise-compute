# Stable release checklist

Community connector for self-hosted n8n. Not n8n-verified.
Paid SumWise Compute access is separately provisioned.

The stable target is 0.1.0 on latest. Preserve the existing next preview tag. This document is a procedure, not a release or verification receipt.

Approved scope includes connector-only MIT licensing and retained third-party/AI-assistance notices; one imperative Evaluate operation and its generated tool wrapper; and the supported credential-file request test. The credential check is status-based, while Evaluate and integration checks validate typed results. Tests may consume accepted-request allowance. The standard lint configuration has no compatibility directive.

For this candidate:

- [ ] Pass build, stock lint, complete tests, package/source checks and the applicable official scanner assessment. Record exact checker version/input; local static analysis is not the full registry scan.
- [ ] Inspect the actual stable tarball and run credential, Evaluate, both reconciliation branches and generated-tool mocks against its installed bytes in isolated n8n state.
- [ ] Review and commit explicit source paths; export selected public content while preserving separate private/public histories.
- [ ] Approve and upload the exact public commit; pass Linux CI and inspect its retained tarball/manifest.
- [ ] Confirm the existing npm trusted publisher's exact repository/workflow/direct-publish permissions. Do not recreate a bootstrap preview.
- [ ] Obtain exact approval to dispatch publish.yml for the reviewed public SHA, version 0.1.0 and reviewed CI package SHA-256, using latest and provenance.
- [ ] Verify the actual registry version/latest, unchanged next, registry tarball integrity/content, public source and signed provenance.
- [ ] Test the exact registry-installed package with mocks and run the full official scanner for 0.1.0.
- [ ] Perform any separately authorized live smoke within one explicit attempt budget, including credential tests and postpublication requests. Prior live evidence does not qualify the changed test path.
- [ ] Review the exact Creator Portal payload and any private reviewer-access arrangements; obtain submission approval and retain the receipt.

The n8n team's guidance supports the credential-file mechanism and keeping the imperative node; it is not verification approval or a scanner waiver. Public upload, Actions execution, npm publication, Creator Portal submission, actual approval/discovery and service access/deployment remain separate facts.

See [controlled publishing](PUBLISHING.md), [development](DEVELOPMENT.md), [credentials](CREDENTIALS.md) and [usage](USAGE.md). Historical private evidence is excluded from public source and npm.
