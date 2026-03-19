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

## Contributing

The Rust logic lives in the [protocol repo](https://github.com/w3-io/protocol)
under `src/lib/*-core/`. Changes to action behavior start there.

This repo contains:
- `{action}/action.yml` — GHA input/output contract
- `{action}/src/index.js` — JS wrapper that loads WASM
- `{action}/wasm/` — compiled WASM (from protocol CI, not hand-edited)
- `scripts/` — build and download tooling
- `.github/wasm-source.json` — which protocol build to use
