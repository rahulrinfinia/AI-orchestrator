#!/bin/bash
# Update all cloned project repos
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Updating All Projects ==="

for dir in "$ROOT"/projects/*/; do
    [ -d "$dir/.git" ] || continue
    echo "  -> Updating $dir..."
    pushd "$dir" >/dev/null
    if [ -n "$(git status --porcelain)" ]; then
        git stash push -m "workspace-update-$(date +%Y%m%d)"
    fi
    git pull --ff-only || echo "  ! diverged — manual merge needed"
    popd >/dev/null
done

echo "=== Update complete ==="
