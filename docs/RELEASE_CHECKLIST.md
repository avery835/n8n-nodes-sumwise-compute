# Release readiness checklist

Approved and implemented locally:

- [x] Avery Wise author and intended avery835/n8n-nodes-sumwise-compute repository/homepage/issues metadata.
- [x] Connector-only MIT license, with retained third-party notices and service/engine/desktop/trademark exclusions.
- [x] Fixed Evaluate credential test requiring exact integer 2, with accepted-request consumption disclosed in UI/docs.
- [x] Public credential-documentation URL and guide in the intended source snapshot.
- [x] Supported usableAsTool declaration sharing the regular Evaluate behavior.
- [x] Official stock ESLint template with strict mode; the five former exceptions are removed. One separately approved inline compatibility directive applies only to CredentialTestContext request, because the pinned host exposes no modern helper there.
- [x] Separate explicit npm/public-source inventories and prepared manual provenance publishing workflow.

Pending execution/decisions:

- [ ] Targeted release review and Avery's editor walkthrough (including save/retest and generated tool fields).
- [ ] Separately authorized real-service smoke with provisioned paid-service/evaluation access and accepted-request expenditure.
- [ ] Confirm npm username, ownership, availability and approved authentication/bootstrap arrangement.
- [ ] Create the intended public repository, upload only the reviewed snapshot, and pass remote Linux CI.
- [ ] Configure trusted publishing or a separately approved short-lived first-publication token; revoke/remove bootstrap access afterward.
- [ ] Manually publish the reviewed public commit/version with GitHub Actions provenance, then inspect actual registry contents/provenance.
- [ ] Run published-package verification, arrange reviewer service access, and submit through Creator Portal.

The five former stock findings correspond to license, homepage, credential test, credential documentation and usableAsTool. Their implementations are locally testable; registry/repository/account and n8n review prerequisites are separate. No local lint or mock pass establishes verified-node status or backend production readiness.

See [controlled publishing](PUBLISHING.md) for exact sequencing and official sources, and [development](DEVELOPMENT.md) for local preview. Internal historical candidate/contract/review reports remain local and are not exported.
