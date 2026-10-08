# content-studio

A desktop content studio for tech creators, based on the Semicolon Studio workflow.

Turn a topic into a researched short video, a matching Instagram feed graphic, captions and source evidence. Review the exact assets, request revisions and approve each destination before publication.

## Project status

Desktop preview 0.3 is implemented. Save your brand, connect your signed-in local Codex account, and watch a live timeline while Codex searches, opens sources, checks evidence and writes the draft. Research produces a script, source links, platform captions and an original draft graphic. Video rendering, social publication and billing are not connected yet.

## Run locally

Use Node.js 24 (`nvm use` if you use Node Version Manager). Dependencies are pinned in package-lock.json.

```sh
npm ci
npm run dev
```

To verify or package the preview:

```sh
npm run typecheck
npm test
npm run test:desktop
npm run package:mac
```

The macOS app is created under release/mac-arm64 or release/mac depending on the build machine. This developer preview is unsigned; signing, notarization and automatic updates are required before selling a downloadable app. GitHub Actions runs the type checks, tests, desktop build and packaging; a local pass does not imply the remote checks have completed.

Data is kept in Electron's userData directory: studio.sqlite and an assets directory. CONTENT_STUDIO_DATA_DIR can select a separate local workspace. One app process owns the SQLite database, and saved changes use atomic file replacement. sql.js supplies SQLite through WebAssembly, avoiding native module version mismatches; the full database is held in memory, appropriate for this first small local library.

Sample graphics are real 1080×1350 SVG files. They are review samples, not researched content or publish-ready Instagram uploads. No video asset is created. Approval is recorded locally against the exact graphic bytes, caption and destination; it neither connects a social account nor publishes anything. Brand changes affect new packs, and existing packs keep their original brand. Revision history preserves previous captions and approvals. Refreshing or reopening the app rechecks approved assets; missing or changed files invalidate active approval and retain the old record in history.

There is no standalone browser mode in this build. Launch Electron for the restricted desktop bridge and durable local storage. Installation detection runs the installed command-line tool’s version command. Connections → Connect Codex checks sign-in through App Server without copying credentials. Research uses the supported default model returned by Codex, without changing personal settings. The app starts an ephemeral read-only session with live web search; shell, installed account tools, plugins, hooks and other agents are disabled. Every cited source must have an observed page-open event. This proves the page was opened, not that every generated claim is correct; drafts still need human review.

The Connections screen guides new users through the official macOS installer, opening Terminal, running Codex and signing in with ChatGPT. Installation and sign-in commands are fixed by the app; the renderer cannot submit arbitrary commands. Content Studio copies commands or opens the official guide only after a user clicks the matching button. It never runs the installer automatically.

## Proposed stack

- Electron: desktop shell and restricted access to local tools; macOS first.
- React, TypeScript and Vite: studio interface, with reusable components for a later web review interface.
- Node.js and TypeScript: local workflow runner and provider adapters.
- SQLite through sql.js: local brands, content packs, revisions, job records and approval records.
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

The first milestone established local sample creation. Version 0.2 adds live Codex research. Next milestones migrate video rendering with real media checks and add publishing with independent verification for each destination.

## Commercial constraints

Subscription-backed third-party access is subject to each provider's current eligibility and terms. API access is a separately billed fallback. Do not copy private desktop credentials or assume tools from a personal Codex conversation are available to this product.

The existing workflow uses free local tools. Before distribution, audit renderer, font, voice-model and dependency licenses, including redistribution rights. Local work requires the customer's computer to be running. This repository is not granted an open-source license at this stage.

## Dependency check

The runtime dependency audit reports no known vulnerabilities at verification time. The full development-tool audit reports eight moderate findings in the packaging tool chain, stemming from an older proxy logger dependency. Its affected formatting package has no patched version in the package registry at verification time. These remain a release-hardening item; no high or critical findings remain.

## Official integration references

- [Codex App Server](https://learn.chatgpt.com/docs/app-server)
- [ChatGPT plan integration eligibility](https://developers.openai.com/siwc/token-sharing-open-source)
- [Claude Agent SDK](https://code.claude.com/docs/en/agent-sdk/overview)
- [Electron security](https://www.electronjs.org/docs/latest/tutorial/security)

## First-build implementation plan

**Goal:** Run a macOS desktop studio that saves a brand, creates a clearly labeled sample pack, supports revisions and records approval for exact targets.

**Execution:** Approved for inline implementation on 7 October 2026. A separate reviewer checked the completed branch; its approval-invalidation finding was fixed with a failing-then-passing regression test.

**Architecture:** React runs in a sandboxed Electron renderer. A narrow preload bridge sends validated requests to the main process. The main process owns SQLite persistence and provider detection. No network account or AI credential is required for the sample flow.

**Spec:** The proposed stack, architecture and first implementation milestone above, now approved.

**Global constraints:** macOS first; TypeScript for app code; no direct Node.js access in the renderer; persist data under Electron's userData directory; do not copy personal account identifiers or credentials into the product; no publishing or simulated claims of real AI generation; one separate target for each destination.

**Review focus:** Saved work survives restart; malformed bridge requests fail safely; changing a caption or asset invalidates approval; missing Codex is an actionable disconnected state; repeated create clicks cannot create duplicate packs.

### Task 1: Runnable desktop shell and restricted bridge

Files: package.json, package-lock.json, tsconfig.json, electron.vite.config.ts, src/main/index.ts, src/main/bridge.ts, src/preload/index.ts, src/shared/contracts.ts, src/renderer/index.html, src/renderer/main.tsx, src/renderer/App.tsx, src/renderer/styles.css, tests/bridge.test.ts, .gitignore.

Interfaces: StudioBridge exposes getState(), saveBrand(input), createSamplePack(input), reviseTarget(input), approveTarget(input), and detectProvider(). All return promises with typed records; no generic filesystem or command method.

- [x] Install a compatible, pinned Electron/React/TypeScript toolchain with electron-vite, Zod, Vitest and Playwright. Add dev, build, typecheck and test scripts.
- [x] Write bridge validation tests rejecting an unknown destination and empty topic; run them before the handler implementation.
- [x] Implement window creation with nodeIntegration false, contextIsolation true and sandbox true. Load only the app's local production entry or explicit development server. Deny new windows and unexpected navigation. Reject requests from unexpected frames.
- [x] Expose each named operation separately through contextBridge and parse every request in the main process. Return user-safe errors without leaking paths or secrets.
- [x] Run type checks, bridge tests and the production build; confirm the shell launches before committing.

### Task 2: Durable brands, packs and approval rules

Files: src/shared/models.ts, src/main/storage.ts, src/main/workflow.ts, tests/storage.test.ts, tests/approval.test.ts.

Interfaces: Brand contains id, name, colors and voice. ContentPack contains id, topic, sample flag, revision, sources and three targets. Target contains id, destination, assetHash, caption and approval status. Job contains id, packId, stage and error. Approval contains targetId, revision, assetHash, caption, destination and approvedAt. StudioState contains brand, packs and provider status.

- [x] Add tests that write a brand to a temporary SQLite database, close it, reopen it and recover the identical record. Add duplicate-request tests using a requestId.
- [x] Add approval tests that reject missing assets and invalidate approval after caption, asset or destination changes. An unchanged target may keep its approval when another target changes.
- [x] Implement versioned SQLite migrations and transactional repository methods. Use a desktop-compatible SQLite package and verify native module packaging if one is selected.
- [x] Implement createSamplePack({topic, requestId}), reviseTarget({packId, targetId, caption}) and approveTarget({packId, targetId, expectedRevision}). Approval uses the stored target snapshot; stale revision requests fail.
- [x] Generate original sample graphics locally, hash the real bytes and show that sample video generation is unavailable. Do not approve a video target without a real video asset. Register samples with an explicit label and no fabricated research sources.
- [x] Run storage, duplicate-request and approval tests; commit the passing implementation.

### Task 3: Brand, creation and review interface

Files: src/renderer/components/BrandSetup.tsx, src/renderer/components/CreatePack.tsx, src/renderer/components/PackReview.tsx, src/renderer/components/ProviderStatus.tsx, src/renderer/styles.css, tests/studio.spec.ts.

Interfaces: Components call StudioBridge methods and display StudioState. Review actions send expectedRevision from the visible snapshot. This milestone uses Electron and durable SQLite only; a standalone browser demo was deferred to avoid a second persistence implementation.

- [x] Write a user-flow test covering saved brand setup, sample pack creation, editing its caption and approval of the existing graphic only. Add a failure-path check that a missing video target cannot be approved.
- [x] Build a charcoal and cobalt studio with lime and cream preview graphics, readable type, keyboard focus and reduced-motion support. Keep sources, captions and each destination visible during review.
- [x] Add empty states, validation errors, disabled pending actions and honest connection labels. Display sample status beside sample assets. Show unavailable generation and publication actions as unavailable.
- [x] Detect Codex through a fixed executable lookup and a version command with a timeout. Never accept executable text from the renderer. Detection means installed, not authenticated. Show a clear install/connect instruction if absent.
- [x] Run the user-flow tests and manually inspect the desktop window at normal and narrow sizes. Confirm data survives a desktop restart.
- [x] Commit the reviewed interface.

### Task 4: Verification and delivery

Files: .github/workflows/checks.yml, README.md and the dependency lockfile.

- [x] Add automated checks for installation from the lockfile, type checks, unit tests and build on macOS. Keep signing, publishing and payment credentials out of this milestone.
- [x] Run all checks locally. Check git diff for personal identifiers, secrets, temporary assets and unrelated files.
- [x] Review approval invalidation, bridge restrictions, duplicate creation and restart recovery against the approved requirements.
- [x] Update README with exact run commands and implemented limitations. Push the verified implementation to main and show the running app.

Completion requires a working desktop build and demonstrated local persistence. Browser-only tests do not prove the Electron bridge or packaged runtime works. The Codex research continuation is described below; video rendering, live publishing and billing remain follow-on milestones.

## Verified preview

Verified on macOS Apple silicon with Node.js 24: clean installation from the public-registry lockfile, type checking, 36 unit tests, the real Electron creation/review/restart flow, unsigned macOS packaging and the same user flow in the packaged application. The desktop test also verifies that malformed bridge requests do not save data, that Node.js globals are unavailable in the interface, and that installation detection does not claim an authenticated AI connection.

## Codex research milestone

Approved continuation: connect the existing local Codex command-line tool through App Server. The studio checks authentication without handling credentials. A topic and brand voice produce a structured research draft: a short narration script, evidence links with claim mappings, limitations, platform captions and an original draft graphic. The draft needs human review; no video or publication is created.

Implementation: add a bounded JSON-line App Server client with handshake, request timeouts, safe denial of unsupported tool requests, cancellation and child-process cleanup; persist research jobs before starting; restore interrupted jobs as interrupted rather than silently rerunning paid work; validate structured results and require observed live web research; extend existing creation/review/connection screens; keep old sample packs readable. Verify transport failure/cancellation, malformed research, duplicate requests, restart state, approval rules, desktop behavior and one real signed-in research run. Existing user authorization selects inline execution and pushing verified work to main.

Research jobs are saved before generation starts. The app shows progress and supports cancellation. Interrupted work never reruns automatically; Research again starts a new request using the connected account allowance. Completed packs are recovered even if the app closed before recording completion. Old sample packs remain readable. A failed disk write keeps the current job status visible and asks the user to check disk space.

Each job also keeps a bounded activity timeline with safe, human-readable events: connection, web search, opened source hostnames, writing, evidence checks, cancellation and completion. Source-opening events may link to public HTTPS pages. Raw model reasoning, credentials, local paths, personal configuration and untrusted tool output are never shown in this timeline.

Live verification: the installed Codex 0.157.1 produced a Python dictionary.get draft and opened the cited official Python documentation. The opt-in live test requires STUDIO_LIVE_CODEX=1; routine checks use a local protocol fixture and do not spend account allowance. SVG graphics remain review drafts; Instagram export and rendered video are separate work.

If the first response omits observed source opens, the same research session gets one bounded request to open and verify those links. This uses additional account allowance. If evidence is still missing, the job fails and no pack is saved. There is no automatic retry after a crash or cancelled job.

Version 0.2 verification also covers local protocol failure/denial/cancellation, malformed and oversized server output, missing evidence, request deduplication, brand snapshots, disk-write failure and research-job recovery. Both desktop flows passed in development and the unsigned packaged app. The real signed-in research test passed with the final tool restrictions; other live attempts correctly rejected drafts with missing source opens.

Version 0.3 adds the live activity timeline and guided Codex setup. Verification covers fixed setup actions, the standalone installer path, safe activity persistence, validated source links, the desktop flows in development and the packaged app, and a real signed-in run that showed search, source-opening, writing and evidence-check activity.
