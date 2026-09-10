# Development and local preview

Community preview for self-hosted n8n. Not n8n-verified.
Paid SumWise Compute access is separately provisioned.

Use Node 24 compatible with the pinned dependencies (locally tested Node 24.19.0, npm 11.17.0). Reuse prepared dependencies when available. In a new authorized checkout, npm ci --ignore-scripts installs the lockfile; no global tooling is needed. Build/lint/tests need no service key. Development dependencies retain their own licenses.

From the source checkout:

~~~sh
npm run build
npm run lint
npm test
npm run check:package
npm run check:source
~~~

The stock n8n ESLint template is used with strict mode. One owner-approved inline compatibility directive covers only the legacy request call that n8n 2.37.10 exposes in CredentialTestContext; the modern helper is absent there. The five prior release exceptions are gone. The known verification rule rejects the remaining call when inline configuration is ignored; configured lint success is not scanner-clean status or an n8n waiver. Reassess this directive when the pinned host exposes a modern credential-test helper. Package checking runs installed npm offline with lifecycle scripts disabled. Source checking validates an explicit export inventory and its local imports/document links. Neither command publishes.

## Existing preview

On Windows, from the project directory, run **npm.cmd run preview** and open the printed literal-loopback URL. If a preview is already running, stop it yourself with Ctrl+C before rebuilding or starting another. The wrapper loads current built assets and updates only the synthetic mock credential's port. It preserves owner/database state and does not reimport workflows. Select the provisioned mock credential; no key entry is needed. Do not use real keys. Sign in normally or complete owner setup yourself if needed.

The exact-result example's sticky note now explains provisioned credentials. An existing imported workflow retains its old note: update that note manually or import a separate copy of the revised example after reviewing possible ID conflicts. Do not overwrite edited workflows merely to update text.

Fresh preview hosts need the pinned SQLite native binding. The optional npm run setup:preview checks it and may download its public prebuilt binary if absent; run that only with separate download authorization. Never reset/delete existing preview data to repair setup. The older npm run smoke:n8n command imports into default preview state and should not be used on an owner's existing database.

Default state/logs are project-local and ignored by Git. The release smoke command requires an explicit fresh output argument below the task's allowed release review child. It uses an isolated copy of package metadata/build assets and no owner account. Run npm run smoke:release -- <authorized-fresh-task-child> only after local checks and while no conflicting build is underway. The selector rejects owner/outside/traversal/symlink destinations; it does not copy the existing owner database or key. Task logs/results are local evidence and never exported.

For registry-installation qualification, the existing local-n8n environment helper copies development package/dist into its state. Running it unchanged is not proof of registry bytes. Use only a reviewed task-local adaptation that installs the exact registry tarball into fresh state, reuses the pinned host context, records loaded hashes and never overlays development files afterward. Close task mocks/processes and remove only that disposable installation/database/secret state after retaining sanitized results; never use the owner's existing state.

Mock fixtures are fixed, plainly synthetic responses. Native credential/tool-wrapper smoke needs no external model, account or live service. Public Linux CI has passed; each new release still needs CI for its exact public SHA. Prior owner-reported editor checks and bounded live results remain separate evidence. No automated browser walkthrough or external model is implied. Ctrl+C stops the preview and its own mock; do not leave it running as a persistent service.
