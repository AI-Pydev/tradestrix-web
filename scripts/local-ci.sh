#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DOCKER=1

for arg in "$@"; do
  case "$arg" in
    --skip-docker)
      RUN_DOCKER=0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      echo "Usage: $0 [--skip-docker]" >&2
      exit 1
      ;;
  esac
done

echo "==> Frontend quality checks"
cd "$ROOT_DIR"
npm ci
npm run lint
npm run build

if [[ "$RUN_DOCKER" -eq 1 ]]; then
  if ! command -v docker >/dev/null 2>&1; then
    echo
    echo "Docker is not available on this machine."
    echo "Re-run with --skip-docker to execute only the non-container checks."
    exit 1
  fi

  echo
  echo "==> Build web image"
  docker build -t tradestrix-web:local .
fi

echo
echo "Local web CI completed."
