# content-studio

A desktop content studio for tech creators, based on the Semicolon Studio workflow.

Turn a topic into a researched short video, a matching Instagram feed graphic, captions and source evidence. Review the exact assets, request revisions and approve each destination before publication.

## Project status

Architecture approved on 7 October 2026. The first-build implementation plan below is ready for review; application code and integrations are not implemented.

## Proposed stack

- Electron: desktop shell and restricted access to local tools; macOS first.
- React, TypeScript and Vite: studio interface, with reusable components for a later web review interface.
- Node.js and TypeScript: local workflow runner and provider adapters.
- SQLite: local brands, content packs, revisions, durable jobs and approval records.
- Python, Pillow and FFmpeg: migrate the existing video and graphic rendering workflow behind a versioned structured interface.
- Codex App Server: first agent integration, via the installed Codex command-line executable. An installed desktop application alone is not sufficient.
- Claude Agent SDK: later provider adapter, with supported authentication.
- Vitest: workflow and boundary tests. Playwright: interface tests.
- GitHub Actions: automated checks and later packaged builds.
- Later commercial service: Next.js, PostgreSQL and a payment provider chosen after merchant-country and account eligibility checks.

## Architecture

```text
React studio interface
        |
Restricted, validated desktop bridge
        |
Local workflow runner ---- SQLite job and approval records
        |
        +-- Provider adapter ---- Codex / later Claude
        +-- Renderer worker ---- Python / Pillow / FFmpeg
        +-- Artifact store ----- Customer-owned local files
        +-- Publishing adapter - Later supported platform connections

Later account and billing service is separate from local creation.
```

The interface has no direct filesystem, credential or shell access. Desktop messages are explicitly allowed and validated. Provider credentials stay in their supported provider login flow; application-owned secrets use the operating system credential store. Each job is restricted to its own workspace. Arbitrary agent execution requires sandboxing and permission handling, not merely an isolated interface.

Core records: Brand, ContentPack, Revision, SourceClaim, Asset, Job, Approval and PublicationTarget. Each pack has separate YouTube Short, Instagram Reel and Instagram feed post targets. Approval records bind the exact asset hash, caption and destination. Any change invalidates that target's approval.

Jobs persist their stage, attempts and errors. Interrupted work resumes from verified completed stages. Rendering retries must not create duplicate packs. Publishing persists submission identity before sending and reconciles ambiguous results before any retry. A successful target is never repeated because another target failed.

## First implementation milestone

1. A runnable desktop shell with brand setup, creation and review screens.
2. Local brand and content-pack persistence.
3. Provider detection and explicit connection status.
4. A clearly labeled sample pack for exercising the review flow without AI credentials.
5. Revision tracking and exact-target approval rules, tested independently of AI.

This milestone does not promise live research, generated video, social publishing or billing. Subsequent milestones connect Codex, migrate rendering with actual media validation, and add publishing with independent verification for all targets.

## Commercial constraints

Subscription-backed third-party access is subject to each provider's current eligibility and terms. API access is a separately billed fallback. Do not copy private desktop credentials or assume tools from a personal Codex conversation are available to this product.

The existing workflow uses free local tools. Before distribution, audit renderer, font, voice-model and dependency licenses, including redistribution rights. Local work requires the customer's computer to be running. This repository is not granted an open-source license at this stage.

## Official integration references

- [Codex App Server](https://learn.chatgpt.com/docs/app-server)
- [ChatGPT plan integration eligibility](https://developers.openai.com/siwc/token-sharing-open-source)
- [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview)
- [Electron security](https://www.electronjs.org/docs/latest/tutorial/security)

## First-build implementation plan

**Goal:** Run a macOS desktop studio that saves a brand, creates a clearly labeled sample pack, supports revisions and records approval for exact targets.

**Execution:** Use superpowers:executing-plans for inline implementation, or superpowers:subagent-driven-development if the owner selects helper-based execution. Selection and plan review precede product code.

**Architecture:** React runs in a sandboxed Electron renderer. A narrow preload bridge sends validated requests to the main process. The main process owns SQLite persistence and provider detection. No network account or AI credential is required for the sample flow.

**Spec:** The proposed stack, architecture and first implementation milestone above, now approved.

**Global constraints:** macOS first; TypeScript for app code; no direct Node.js access in the renderer; persist data under Electron's userData directory; do not copy personal account identifiers or credentials into the product; no publishing or simulated claims of real AI generation; one separate target for each destination.

**Review focus:** Saved work survives restart; malformed bridge requests fail safely; changing a caption or asset invalidates approval; missing Codex is an actionable disconnected state; repeated create clicks cannot create duplicate packs.

### Task 1: Runnable desktop shell and restricted bridge

Files: package.json, package-lock.json, tsconfig.json, electron.vite.config.ts, src/main/index.ts, src/main/bridge.ts, src/preload/index.ts, src/shared/contracts.ts, src/renderer/index.html, src/renderer/main.tsx, src/renderer/App.tsx, src/renderer/styles.css, tests/bridge.test.ts, .gitignore.

Interfaces: StudioBridge exposes getState(), saveBrand(input), createSamplePack(input), reviseTarget(input), approveTarget(input), and detectProvider(). All return promises with typed records; no generic filesystem or command method.

- [ ] Install a compatible, pinned Electron/React/TypeScript toolchain with electron-vite, Zod, Vitest and Playwright. Add dev, build, typecheck and test scripts.
- [ ] Write bridge validation tests rejecting an unknown destination and empty topic; run them before the handler implementation.
- [ ] Implement window creation with nodeIntegration false, contextIsolation true and sandbox true. Load only the app's local production entry or explicit development server. Deny new windows and unexpected navigation. Reject requests from unexpected frames.
- [ ] Expose each named operation separately through contextBridge and parse every request in the main process. Return user-safe errors without leaking paths or secrets.
- [ ] Run type checks, bridge tests and the production build; confirm the shell launches before committing.

### Task 2: Durable brands, packs and approval rules

Files: src/shared/models.ts, src/main/storage.ts, src/main/workflow.ts, tests/storage.test.ts, tests/approval.test.ts.

Interfaces: Brand contains id, name, colors and voice. ContentPack contains id, topic, sample flag, revision, sources and three targets. Target contains id, destination, assetHash, caption and approval status. Job contains id, packId, stage and error. Approval contains targetId, revision, assetHash, caption, destination and approvedAt. StudioState contains brand, packs and provider status.

- [ ] Add tests that write a brand to a temporary SQLite database, close it, reopen it and recover the identical record. Add duplicate-request tests using a requestId.
- [ ] Add approval tests that reject missing assets and invalidate approval after caption, asset or destination changes. An unchanged target may keep its approval when another target changes.
- [ ] Implement versioned SQLite migrations and transactional repository methods. Use a desktop-compatible SQLite package and verify native module packaging if one is selected.
- [ ] Implement createSamplePack({topic, requestId}), reviseTarget({packId, targetId, caption}) and approveTarget({packId, targetId, expectedRevision}). Approval uses the stored target snapshot; stale revision requests fail.
- [ ] Generate original sample graphics locally, hash the real bytes and show that sample video generation is unavailable. Do not approve a video target without a real video asset. Register samples with an explicit label and no fabricated research sources.
- [ ] Run storage, duplicate-request and approval tests; commit the passing implementation.

### Task 3: Brand, creation and review interface

Files: src/renderer/components/BrandSetup.tsx, src/renderer/components/CreatePack.tsx, src/renderer/components/PackReview.tsx, src/renderer/components/ProviderStatus.tsx, src/renderer/styles.css, tests/studio.spec.ts.

Interfaces: Components call StudioBridge methods and display StudioState. Review actions send expectedRevision from the visible snapshot. Browser preview uses an explicitly labeled in-memory demo bridge; only Electron uses durable SQLite.

- [ ] Write a user-flow test covering saved brand setup, sample pack creation, editing its caption and approval of the existing graphic only. Add a failure-path check that a missing video target cannot be approved.
- [ ] Build a charcoal and cobalt studio with lime and cream preview graphics, readable type, keyboard focus and reduced-motion support. Keep sources, captions and each destination visible during review.
- [ ] Add empty states, validation errors, disabled pending actions and honest connection labels. Display sample status beside sample assets. Show unavailable generation and publication actions as unavailable.
- [ ] Detect Codex through a fixed executable lookup and a version command with a timeout. Never accept executable text from the renderer. Detection means installed, not authenticated. Show a clear install/connect instruction if absent.
- [ ] Run the user-flow tests and manually inspect the desktop window at normal and narrow sizes. Confirm data survives a desktop restart.
- [ ] Commit the reviewed interface.

### Task 4: Verification and delivery

Files: .github/workflows/checks.yml, README.md and the dependency lockfile.

- [ ] Add automated checks for installation from the lockfile, type checks, unit tests and build on macOS. Keep signing, publishing and payment credentials out of this milestone.
- [ ] Run all checks locally. Check git diff for personal identifiers, secrets, temporary assets and unrelated files.
- [ ] Review approval invalidation, bridge restrictions, duplicate creation and restart recovery against the approved requirements.
- [ ] Update README with exact run commands and implemented limitations. Push the verified implementation to main and show the running app.

Completion requires a working desktop build and demonstrated local persistence. Browser-only tests do not prove the Electron bridge or packaged runtime works. Codex generation, renderer migration, live publishing and billing are separate follow-on milestones.
