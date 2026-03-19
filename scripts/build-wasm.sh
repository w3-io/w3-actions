#!/bin/bash
# Build WASM artifacts from the protocol repo.
#
# Usage:
#   Local:  ./scripts/build-wasm.sh --from ../protocol
#   CI:     ./scripts/build-wasm.sh --from-artifact <run-id>
#   CI:     ./scripts/build-wasm.sh --from-ref <branch-or-tag>

set -o errexit
set -o nounset
set -o pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE_CONFIG="$REPO_ROOT/.github/wasm-source.json"

# Parse crate list from config
CRATES=$(python3 -c "
import json
with open('$SOURCE_CONFIG') as f:
    config = json.load(f)
for c in config['crates']:
    print(f\"{c['name']}:{c['action']}\")
")

build_from_local() {
    local protocol_path="$1"

    if [ ! -f "$protocol_path/Cargo.toml" ]; then
        echo "Error: $protocol_path does not look like the protocol repo"
        exit 1
    fi

    echo "Building WASM from local checkout: $protocol_path"

    # Ensure wasm target is installed
    rustup target add wasm32-unknown-unknown 2>/dev/null || true

    for entry in $CRATES; do
        crate="${entry%%:*}"
        action="${entry##*:}"

        echo "  Building $crate -> $action/wasm/"

        (cd "$protocol_path" && cargo build \
            --target wasm32-unknown-unknown \
            --release \
            -p "$crate" 2>&1 | tail -1)

        # Find the .wasm file
        wasm_name="${crate//-/_}"
        wasm_file="$protocol_path/target/wasm32-unknown-unknown/release/$wasm_name.wasm"

        if [ ! -f "$wasm_file" ]; then
            echo "  Warning: $wasm_file not found, skipping"
            continue
        fi

        mkdir -p "$REPO_ROOT/$action/wasm"
        cp "$wasm_file" "$REPO_ROOT/$action/wasm/"

        size=$(wc -c < "$wasm_file" | tr -d ' ')
        echo "  Copied: $action/wasm/$wasm_name.wasm ($size bytes)"
    done

    echo "Done."
}

download_from_artifact() {
    local run_id="$1"
    local repo
    repo=$(python3 -c "import json; print(json.load(open('$SOURCE_CONFIG'))['protocol-repo'])")

    echo "Downloading WASM artifacts from run $run_id in $repo"

    # Download the artifact
    local tmpdir
    tmpdir=$(mktemp -d)
    gh run download "$run_id" \
        --repo "$repo" \
        --name "wasm-artifacts" \
        --dir "$tmpdir" 2>&1

    # Copy each wasm file to the right action directory
    for entry in $CRATES; do
        crate="${entry%%:*}"
        action="${entry##*:}"
        wasm_name="${crate//-/_}"

        if [ -f "$tmpdir/$wasm_name.wasm" ]; then
            mkdir -p "$REPO_ROOT/$action/wasm"
            cp "$tmpdir/$wasm_name.wasm" "$REPO_ROOT/$action/wasm/"
            echo "  Copied: $action/wasm/$wasm_name.wasm"
        else
            echo "  Warning: $wasm_name.wasm not found in artifact"
        fi
    done

    rm -rf "$tmpdir"
    echo "Done."
}

download_from_ref() {
    local ref="$1"
    local repo
    repo=$(python3 -c "import json; print(json.load(open('$SOURCE_CONFIG'))['protocol-repo'])")

    echo "Finding latest CI run for $ref in $repo"

    # Find the most recent successful run on that ref
    local run_id
    run_id=$(gh run list \
        --repo "$repo" \
        --branch "$ref" \
        --workflow "build-wasm.yml" \
        --status success \
        --limit 1 \
        --json databaseId \
        --jq '.[0].databaseId' 2>/dev/null)

    if [ -z "$run_id" ] || [ "$run_id" = "null" ]; then
        echo "Error: No successful WASM build found for ref '$ref'"
        echo "Make sure the protocol CI has a build-wasm job that uploads artifacts."
        exit 1
    fi

    echo "Found run $run_id"
    download_from_artifact "$run_id"
}

# --- Main ---

case "${1:-}" in
    --from)
        build_from_local "${2:?Usage: --from <protocol-path>}"
        ;;
    --from-artifact)
        download_from_artifact "${2:?Usage: --from-artifact <run-id>}"
        ;;
    --from-ref)
        download_from_ref "${2:?Usage: --from-ref <branch-or-tag>}"
        ;;
    --help|-h|"")
        echo "Usage:"
        echo "  $0 --from <protocol-path>       Build WASM from local checkout"
        echo "  $0 --from-artifact <run-id>      Download from GHA artifact"
        echo "  $0 --from-ref <branch-or-tag>    Find latest build for ref"
        ;;
    *)
        echo "Unknown option: $1"
        exit 1
        ;;
esac
