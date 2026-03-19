# W3 Actions

Runtime primitive actions for W3 workflows. These are the built-in
operations that every workflow can use — HTTP requests, JSON transforms,
encoding, event emission, and audit logging.

Each action is backed by a Rust crate compiled to WASM, ensuring
identical behavior on the W3 runtime (native Rust) and GitHub Actions
runners (WASM in Node.js).

## Actions

| Action | Description | Uses |
|--------|-------------|------|
| [http](http/) | HTTP requests with retry, timeout, auth | `w3-io/w3-actions/http@v0` |
| [json](json/) | Extract, merge, filter, map JSON data | `w3-io/w3-actions/json@v0` |
| [encode](encode/) | Base64, hex, URL, SHA-256, HMAC | `w3-io/w3-actions/encode@v0` |
| [emit](emit/) | Event emission + webhook delivery | `w3-io/w3-actions/emit@v0` |
| [audit](audit/) | Append-only audit trail | `w3-io/w3-actions/audit@v0` |

## Architecture

```
Protocol repo                      This repo
(Rust source of truth)             (JS + WASM packaging)
──────────────────                 ─────────────────────
src/lib/http-core/                 http/
  └── lib.rs (logic)                 ├── action.yml
                                     ├── src/index.js (loads WASM)
  cargo build --target wasm32        ├── wasm/*.wasm (from protocol CI)
         │                           └── dist/index.js (bundled)
         ▼
  CI uploads artifact ──────────►  CI downloads, bundles, tests
```

The Rust crates live in the protocol repo. Protocol CI builds WASM
and uploads artifacts. This repo's CI downloads the WASM and packages
it with thin JS wrappers for GHA compatibility.

## Development

### Local development (fast iteration)

Point the build script at your local protocol checkout:

```bash
./scripts/build-wasm.sh --from ../protocol
npm test
```

This builds WASM from whatever branch you have checked out in the
protocol repo. No CI, no artifacts, instant feedback.

### PR workflow (cross-repo testing)

When you have linked changes across protocol and w3-actions:

1. Push your protocol PR. CI builds WASM and uploads artifacts.
2. Note the CI run ID from the protocol PR's checks.
3. Update `.github/wasm-source.json` in your w3-actions PR:

```json
{
  "protocol-repo": "w3-io/protocol",
  "protocol-ref": "audie/w3-action-primitives",
  "protocol-run-id": 12345
}
```

4. Push the w3-actions PR. CI downloads WASM from that specific
   protocol run and tests against it.

5. Merge protocol PR first. Then update `wasm-source.json` to
   `"protocol-ref": "master", "protocol-run-id": null` and merge
   the w3-actions PR.

### Automatic updates

When the protocol merges changes to action crates on master, CI
dispatches to this repo. The CI job downloads the latest WASM
artifacts and runs tests. If tests pass and it's a master push,
a release is cut automatically.

### Build script reference

```bash
# Build from local checkout (development)
./scripts/build-wasm.sh --from ../protocol

# Download from a specific CI run (PR testing)
./scripts/build-wasm.sh --from-artifact 12345

# Download from the latest build on a branch (convenience)
./scripts/build-wasm.sh --from-ref master
./scripts/build-wasm.sh --from-ref audie/w3-action-primitives
```

## WASM artifact safety

- **Size limit:** Each .wasm file must be under 2MB. CI fails if exceeded.
- **Reproducibility:** Same protocol commit produces same WASM output.
- **Verification:** CI checks that all crates compile to `wasm32-unknown-unknown`
  on every protocol PR touching `src/lib/*-core/`.

## Setup (one-time, for repo admins)

### 1. Cross-repo dispatch token

When the protocol merges changes to action crates, its CI dispatches
to this repo to trigger a rebuild. This requires a GitHub PAT:

1. Go to https://github.com/settings/tokens?type=beta (fine-grained PAT)
2. Create a token with:
   - **Name:** `w3-actions-dispatch`
   - **Repository access:** `w3-io/w3-actions` only
   - **Permissions:** Contents (read/write), Metadata (read)
3. Go to https://github.com/w3-io/protocol/settings/secrets/actions
4. Add secret: **Name:** `W3_ACTIONS_DISPATCH_TOKEN`, **Value:** the PAT

To verify it works:

```bash
# Trigger a dispatch manually
gh api repos/w3-io/w3-actions/dispatches \
  -f event_type=wasm-updated \
  -f 'client_payload[run_id]=0' \
  -f 'client_payload[sha]=test'
```

Then check https://github.com/w3-io/w3-actions/actions for a triggered run.

### 2. After protocol PR merges

When `audie/w3-action-primitives` merges to master:

1. Update each `wasm-bridge/Cargo.toml` to use `branch = "master"`
   instead of `branch = "audie/w3-action-primitives"`
2. Run `cargo update` in each bridge crate
3. Verify local build: `./scripts/build-wasm.sh --from ../protocol`
4. Commit, push, tag `v0.1.0` + `v0`

### 3. Release checklist

- [ ] All five WASM bridges build cleanly
- [ ] CI passes (WASM build + inline tests)
- [ ] `W3_ACTIONS_DISPATCH_TOKEN` secret configured in protocol repo
- [ ] Bridge Cargo.toml references master (not feature branch)
- [ ] Tagged `v0.1.0` and `v0`

## Contributing

The Rust logic lives in the [protocol repo](https://github.com/w3-io/protocol)
under `src/lib/*-core/`. Changes to action behavior start there.

This repo contains:
- `{action}/action.yml` — GHA input/output contract
- `{action}/src/index.js` — JS wrapper that loads WASM
- `{action}/wasm-bridge/` — Rust cdylib that wraps the core crate via wasm-bindgen
- `scripts/` — build and download tooling
- `.github/wasm-source.json` — which protocol ref to use
