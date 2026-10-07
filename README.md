# content-studio

A desktop content studio for tech creators, based on the Semicolon Studio workflow.

Turn a topic into a researched short video, a matching Instagram feed graphic, captions and source evidence. Review the exact assets, request revisions and approve each destination before publication.

## Project status

Repository initialized. The architecture below is proposed for review; application code and integrations are not implemented.

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
