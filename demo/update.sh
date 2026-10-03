#!/bin/sh
# Update the running demo to the latest theme.
#
# The demo serves the theme from this repository's working copy, so updating is
# "pull, then recreate": the seed step reinstalls the theme into all four sites
# and Ghost restarts to pick up the new templates. Post content is kept — only
# `docker compose down -v` wipes it.
#
#   ./update.sh              → latest commit on the current branch
#   ./update.sh --offline   → current checkout, cached Docker images
#   ./update.sh v0.2.0       → a specific released tag
set -eu

# Skip Git/network access when refreshing an already checked-out theme offline.
# Docker images (including the seed build) must already be cached.
offline=0
if [ "${1:-}" = "--offline" ]; then
  offline=1
  shift
  if [ $# -ne 0 ]; then
    echo "Usage: $0 [--offline | ref]" >&2
    exit 1
  fi
fi

cd "$(dirname "$0")/.."

if [ "$offline" -eq 1 ]; then
  echo "→ using the current checkout offline"
elif [ $# -ge 1 ]; then
  echo "→ fetching and checking out $1"
  git fetch --all --tags --quiet
  git checkout --quiet "$1"
else
  echo "→ pulling latest on $(git rev-parse --abbrev-ref HEAD)"
  git pull --quiet --ff-only
fi
echo "  now at $(git describe --tags --always) ($(git log -1 --format=%s | cut -c1-60))"

cd demo
echo "→ reinstalling the theme and restarting the sites"
if [ "$offline" -eq 1 ]; then
  docker compose up -d --force-recreate --pull never --no-build
else
  docker compose up -d --force-recreate
fi

echo "→ done. Content preserved; the four sites are serving the updated theme."
