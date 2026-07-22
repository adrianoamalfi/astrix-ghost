#!/bin/sh
# Update the running demo to the latest theme.
#
# The demo serves the theme from this repository's working copy, so updating is
# "pull, then recreate": the seed step reinstalls the theme into all four sites
# and Ghost restarts to pick up the new templates. Post content is kept — only
# `docker compose down -v` wipes it.
#
#   ./update.sh              → latest commit on the current branch
#   ./update.sh v0.2.0       → a specific released tag
set -eu

cd "$(dirname "$0")/.."

if [ $# -ge 1 ]; then
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
docker compose up -d --force-recreate

echo "→ done. Content preserved; the four sites are serving the updated theme."
