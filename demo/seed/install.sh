#!/bin/sh
# Seed empty volumes lazily; refresh the theme on every invocation.
set -eu

cache=/tmp/astrix-demo-seed
archive=/tmp/astrix-demo-seed.tar.gz
mkdir -p "$cache"

missing_seed=0
for d in meridian vellum proof fieldnotes; do
  if [ ! -f "/content/$d/data/ghost.db" ] && [ ! -f "/seed/$d.db" ]; then
    missing_seed=1
  fi
done

if [ "$missing_seed" -eq 1 ]; then
  if [ -z "${ASTRIX_DEMO_SEED_URL:-}" ]; then
    echo "Missing demo seed databases and ASTRIX_DEMO_SEED_URL is empty." >&2
    echo "Place meridian.db, vellum.db, proof.db and fieldnotes.db in demo/seed, or set ASTRIX_DEMO_SEED_URL." >&2
    exit 1
  fi
  echo "downloading demo seed databases"
  curl -fsSL "$ASTRIX_DEMO_SEED_URL" -o "$archive"
  if [ -z "${ASTRIX_DEMO_SEED_SHA256:-}" ]; then
    echo "ASTRIX_DEMO_SEED_SHA256 is required for downloaded seeds." >&2
    exit 1
  fi
  echo "$ASTRIX_DEMO_SEED_SHA256  $archive" | sha256sum -c -
  printf '%s\n' fieldnotes.db meridian.db proof.db vellum.db > "$cache/expected"
  tar -tzf "$archive" | sort > "$cache/actual"
  if ! cmp -s "$cache/expected" "$cache/actual"; then
    echo "Seed archive must contain exactly the four database files at its root." >&2
    exit 1
  fi
  tar -tvzf "$archive" | awk 'substr($0, 1, 1) != "-" { exit 1 }'
  tar -xzf "$archive" -C "$cache"
fi

for d in meridian vellum proof fieldnotes; do
  base=/content/$d
  mkdir -p "$base/data" "$base/images/demo" "$base/settings" "$base/logs"
  if [ ! -f "$base/data/ghost.db" ]; then
    seed_db=/seed/$d.db
    if [ ! -f "$seed_db" ]; then
      seed_db=$cache/$d.db
    fi
    if [ ! -f "$seed_db" ]; then
      echo "Seed database not found: $d.db" >&2
      exit 1
    fi
    cp "$seed_db" "$base/data/ghost.db"
    # The published seed databases are public, so every secret Ghost keeps
    # inside them is a throwaway placeholder. Replace them all now, so this
    # deployment never runs on a secret anyone can read on GitHub.
    sh /seed/rotate-secrets.sh "$base/data/ghost.db" >/dev/null
    echo "seeded $d (secrets rotated)"
  else
    echo "$d: existing content kept"
  fi
  # posts reference these as /content/images/demo/<file>
  cp -r /seed/images/. "$base/images/demo/" 2>/dev/null || true
  # the theme is always refreshed from the repo (runtime files only, as shipped in the zip)
  rm -rf "$base/themes/astrix"
  mkdir -p "$base/themes/astrix/assets"
  cp -r /repo/*.hbs /repo/partials /repo/locales /repo/package.json "$base/themes/astrix/"
  cp -r /repo/assets/built /repo/assets/fonts "$base/themes/astrix/assets/"
  # the Ghost image runs as uid 1000
  chown -R 1000:1000 "$base"
done
echo "theme installed into all four"
