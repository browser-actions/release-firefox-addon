# Agentic Coding Guide

This file provides guidance for AI coding agents working in this repository.

## Repository Purpose

`release-firefox-addon` is a GitHub Action that publishes a Firefox add-on to AMO (addons.mozilla.org) using the AMO API with JWT-based authentication.

## Commands

```bash
pnpm install --frozen-lockfile   # install dependencies
pnpm lint                        # lint with Biome (CI mode, no auto-fix)
pnpm lint:fix                    # lint with auto-fix
pnpm build                       # compile TypeScript → dist/index.js
pnpm package                     # copy action.yml + README.md into dist/
```

> ℹ️ There is no automated test suite in this repository. Verify behaviour manually or with integration tests against the AMO API.

## Project Layout

```
src/
  index.ts   # action entry point: reads inputs, calls AMO API, sets outputs
  amo.ts     # AMO API client (upload version, poll status, retrieve version info)
action.yml   # action metadata: inputs, outputs, runs.using: node24
biome.json   # linter/formatter config
```

## Architecture

The action flow is:

1. Read `addon-id`, `addon-path`, optional `source-path`, and JWT credentials from inputs.
2. Use `amo.ts` to upload the add-on zip (and optional source zip) to the AMO API.
3. Poll until the upload is processed, then set version outputs (`version`, `version-id`, `version-edit-url`).

`amo.ts` constructs signed JWT tokens from `auth-api-issuer` and `auth-api-secret` using the `jsonwebtoken` library. The `uuid` library is used for unique upload identifiers.

### Source code submission

If the add-on contains minified or transpiled files, AMO requires a source zip. Pass the `source-path` input and include an `approval-note` explaining how to build the project so reviewers can verify the code.

### Channel

The `channel` input controls whether the version is published publicly (`listed`) or unlisted (`unlisted`). Default is `listed`.

## Conventions

- **TypeScript strict mode** — all types must be explicit; avoid `any`.
- **Linter:** Biome — run `pnpm lint` before committing. `useLiteralKeys` and `noUselessElse` rules are disabled.
- **Formatter:** Biome with space indentation.
- **Node.js ≥ 24** is required.
- **Conventional Commits** are required for all commits (`feat:`, `fix:`, `chore:`, etc.).
- **Never commit `dist/`** — it is built by CI and deployed to the `latest` branch on release.
- **Never commit AMO API credentials** — always use GitHub Actions secrets.
- The `action.yml` `main` field points to `index.js` inside `dist/`, not the TypeScript source.
