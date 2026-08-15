#!/usr/bin/env bash
# Clone projects from repos.yaml into projects/
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p projects

if ! command -v yq >/dev/null 2>&1; then
  echo "Install yq or use scripts/setup.ps1 on Windows"
  exit 1
fi

count=$(yq '.projects | length' repos.yaml)
if [ "$count" = "0" ] || [ "$count" = "null" ]; then
  echo "No projects in repos.yaml — see docs/adding-a-project.md"
  exit 0
fi

yq -c '.projects[]' repos.yaml | while read -r row; do
  name=$(echo "$row" | jq -r '.name')
  repo=$(echo "$row" | jq -r '.repo')
  branch=$(echo "$row" | jq -r '.branch // "main"')
  dest="projects/$name"
  if [ -d "$dest/.git" ]; then
    echo "OK  $dest (exists)"
  else
    echo "->  Cloning $name..."
    git clone --branch "$branch" "$repo" "$dest" || echo "FAIL $dest"
  fi
done

echo "Setup complete."
