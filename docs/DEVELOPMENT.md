# Development and local preview

Use Node 24 compatible with the pinned dependencies (locally tested Node 24.19.0, npm 11.17.0). Reuse prepared dependencies when available. In a new authorized checkout, npm ci --ignore-scripts installs the lockfile; no global tooling is needed. Build/lint/tests need no service key. Development dependencies retain their own licenses.

From the source checkout:

~~~sh
npm run build
npm run lint
npm test
npm run check:package
npm run check:source
~~~

The stock n8n ESLint template is used with strict mode. One owner-approved inline compatibility directive covers only the legacy request call that n8n 2.37.10 exposes in CredentialTestContext; the modern helper is absent there. The five prior release exceptions are gone. Reassess this directive when the pinned host exposes a modern credential-test helper. Package checking runs installed npm offline with lifecycle scripts disabled. Source checking validates an explicit export inventory and its local imports/document links. Neither command publishes.

## Existing preview

On Windows, from the project directory, run **npm.cmd run preview** and open the printed literal-loopback URL. If a preview is already running, stop it yourself with Ctrl+C before rebuilding or starting another. The wrapper loads current built assets and updates only the synthetic mock credential's port. It preserves owner/database state and does not reimport workflows. Select the provisioned mock credential; no key entry is needed. Do not use real keys. Sign in normally or complete owner setup yourself if needed.

The exact-result example's sticky note now explains provisioned credentials. An existing imported workflow retains its old note: update that note manually or import a separate copy of the revised example after reviewing possible ID conflicts. Do not overwrite edited workflows merely to update text.

Fresh preview hosts need the pinned SQLite native binding. The optional npm run setup:preview checks it and may download its public prebuilt binary if absent; run that only with separate download authorization. Never reset/delete existing preview data to repair setup. The older npm run smoke:n8n command imports into default preview state and should not be used on an owner's existing database.

Default state/logs are project-local and ignored by Git. The release smoke command requires an explicit fresh output argument below the task's allowed release review child. It uses an isolated copy of package metadata/build assets and no owner account. Run npm run smoke:release -- <authorized-fresh-task-child> only after local checks and while no conflicting build is underway. The selector rejects owner/outside/traversal/symlink destinations; it does not copy the existing owner database or key. Task logs/results are local evidence and never exported.

Mock fixtures are fixed, plainly synthetic responses. Native credential/tool-wrapper smoke needs no external model, account or live service. Browser/editor interaction and remote Linux CI remain separate checks. Ctrl+C stops the preview and its own mock; do not leave it running as a persistent service.
