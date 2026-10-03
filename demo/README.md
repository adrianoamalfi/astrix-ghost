# Astrix demo (Docker Compose + Cloudflare Tunnel)

Runs **all four demo publications at once** — each a full Ghost site with its own
content, images, tags, authors and membership tiers — and publishes them through
a single Cloudflare Tunnel.

| Service | Publication | Posts | Authors | Shows off |
|---|---|---|---|---|
| `meridian` | Travel & photography journal | 12 | 3 | Poster hero, Mosaic feed, multiple authors, gallery cards |
| `vellum` | Design & type journal | 12 | 3 | Editorial hero, Bold grid, **typography specimen** and an **every-card showcase** |
| `proof` | Corner-bakery food magazine | 11 | 2 | Split hero, List feed, membership + gated content, pricing page |
| `fieldnotes` | Personal blog | 10 | 1 | Personal hero, supporter tier |

Two pages in Vellum exist purely to prove the theme out: `/the-specimen/` sets
every prose element, and `/every-card/` renders every Ghost editor card —
callouts, buttons, toggles, bookmarks, galleries and images at three widths.
Every author has a generated avatar, so bylines and author pages are populated.

## Run it locally

```bash
cd demo
docker compose up -d meridian vellum proof fieldnotes
```

- Meridian → http://localhost:8081
- Vellum → http://localhost:8082
- The Proof → http://localhost:8083
- Field Notes → http://localhost:8084

Ports are published on `127.0.0.1` only, so they are never reachable from the
internet even when the host is a public server — nothing bypasses the tunnel.

On first boot, the `seed` service installs SQLite databases only into empty
content volumes. Database files are not committed to Git. Missing local files
are downloaded once from the dedicated `demo-seed-v1` release and verified
against the SHA-256 pinned in Compose and `.env.example`:

```text
https://github.com/adrianoamalfi/astrix-ghost/releases/download/demo-seed-v1/astrix-demo-seed.tar.gz
```

Theme releases do not change this URL. To use another seed release, override
**both** `ASTRIX_DEMO_SEED_URL` and `ASTRIX_DEMO_SEED_SHA256` in `.env`.
Downloaded archives require a checksum and exactly four regular database files
at the archive root. Local `demo/seed/*.db` files take priority.

For offline first boot, verify and unpack the release artifact beforehand:

```bash
# In the directory containing the downloaded archive and checksum:
sha256sum -c astrix-demo-seed.tar.gz.sha256 # macOS: shasum -a 256 -c ...
tar -xzf astrix-demo-seed.tar.gz -C /path/to/astrix-ghost/demo/seed
# While still online, cache Docker images and the seed tools:
cd /path/to/astrix-ghost/demo
docker compose build seed
docker compose pull meridian vellum proof fieldnotes cloudflared
# Then, offline (without the tunnel):
docker compose up -d --pull never --no-build meridian vellum proof fieldnotes
```

Populated volumes need no seed files or downloads on subsequent starts. The
seed image installs its tools at build time, so offline restarts also avoid
Alpine package downloads. Keep that image cached.

## Publish it through Cloudflare

**1. Create the tunnel.** In the Cloudflare dashboard: *Zero Trust → Networks →
Tunnels → Create a tunnel → Cloudflared → Docker*. Copy the token.

**2. Configure this stack.**

```bash
cp .env.example .env
```

Set `TUNNEL_TOKEN` and the four public URLs to the hostnames you are about to
map. Ghost renders absolute links and image URLs from these values, so they must
match the hostnames exactly:

```env
TUNNEL_TOKEN=eyJhIjoi...
MERIDIAN_URL=https://meridian.yourdomain.com
VELLUM_URL=https://vellum.yourdomain.com
PROOF_URL=https://proof.yourdomain.com
FIELDNOTES_URL=https://fieldnotes.yourdomain.com
```

**3. Map the hostnames.** Still in the tunnel's settings, add four *Public
Hostnames*, each pointing at the container by name on the Compose network:

| Public hostname | Service |
|---|---|
| `meridian.yourdomain.com` | `HTTP` → `meridian:2368` |
| `vellum.yourdomain.com` | `HTTP` → `vellum:2368` |
| `proof.yourdomain.com` | `HTTP` → `proof:2368` |
| `fieldnotes.yourdomain.com` | `HTTP` → `fieldnotes:2368` |

The origin is plain `HTTP` — Cloudflare terminates TLS at the edge, and the
tunnel reaches the containers over the private Compose network.

**4. Start everything.**

```bash
docker compose up -d
```

If you change a `*_URL` later, recreate that site so Ghost picks it up:
`docker compose up -d --force-recreate meridian`.

## Everyday commands

```bash
docker compose ps                       # what's running
docker compose logs -f cloudflared      # tunnel connection status
docker compose down                     # stop, keep content
docker compose down -v                  # stop and wipe all four sites
```

## Updating the demo to a new theme version

The sites serve the theme from this repository's working copy, and the seed step
reinstalls it whenever containers are recreated. A plain `docker compose up -d`
is **not** enough — the seed has already completed, so nothing is copied. Use:

```bash
./update.sh            # pull the latest commit, reinstall, restart
./update.sh v0.2.0     # or pin the demo to a released tag
```

Which is just shorthand for:

```bash
git pull && docker compose up -d --force-recreate
```

Post content, members and images survive; only `docker compose down -v` wipes
them. To update on every release without logging in, run `update.sh` from cron:

```cron
0 4 * * * /srv/astrix-ghost/demo/update.sh >> /var/log/astrix-demo.log 2>&1
```

When developing the theme locally, rebuild the assets first — `assets/built/` is
what the demo copies:

```bash
cd .. && npm run build && cd demo && docker compose up -d --force-recreate
```

To refresh the current checkout without Git or Docker downloads:

```bash
./update.sh --offline
```

This recreates the configured services using cached images; it does not fetch a
new theme revision. For a local demo without Cloudflare, use the explicit four
service names in the offline Compose command above, adding `--force-recreate`.

## Publishing seed databases

Seed databases live outside the repository to keep clones small, but the demo
expects a tarball with the four database files at the archive root. From a
working tree that already has local `demo/seed/*.db` files:

```bash
cd demo/seed
./package.sh
```

The package command uses `sha256sum`, or `shasum -a 256` on macOS. Its checksum
file names only the archive, so it can be verified from any download directory.

Publication requires explicit maintainer approval. Upload
`dist/astrix-demo-seed.tar.gz` and `dist/astrix-demo-seed.tar.gz.sha256` to the
dedicated `demo-seed-v1` GitHub release (not a `v*` theme release). Do not replace
an existing seed artifact: use a new seed tag for changes, then update the URL
and checksum together in Compose and `.env.example`. Before merging, verify the
public download and start a fresh demo with no local DB files.

## Repository size and history

Removing the four current seed DB files saves 5.19 MiB of tracked checkout data.
The showcase screenshots are already WebP; their conversion is retained.
Local offline DB copies, downloaded archives and development dependencies are
excluded from this tracked-checkout measurement.

This change leaves Git history intact, so historical seed blobs still travel
with full clones. `git gc` can compact loose objects but cannot remove reachable
DB versions; `git gc --aggressive` is not justified for this small repository
and adds CPU cost without solving that cause. No history rewrite is performed:
it needs explicit approval and coordination with existing forks and branches.
Use a shallow clone (`git clone --depth 1`) when only the current theme is needed.
Future seed revisions go to dedicated assets rather than Git.

## Notes

- **Resources.** Four Ghost containers need roughly 1–1.5 GB of RAM in total;
  a small VPS is enough, but a 512 MB box is not.
- **Database.** Each site uses SQLite in its own volume, which keeps the stack to
  one container per site. The seed databases are shipped as a release artifact,
  not as Git-tracked files. That is right for a read-only showcase; a real
  publication should use MySQL 8.
- **Secrets.** The demo databases are public, so every secret Ghost keeps inside
  them — session secrets, the members/Ghost RSA keypairs, magic-link secrets and
  the internal integration API keys — is a throwaway placeholder. On first boot
  [`seed/rotate-secrets.sh`](seed/rotate-secrets.sh) replaces all of them, so a
  deployment never runs on a secret anyone can read on GitHub. Ghost does not
  regenerate these itself, which is why the script exists.
- **Admin.** No admin account is provisioned — each demo owner has a fictional
  address and an unusable password, so `/ghost` cannot be signed into. It is
  still served, though: on a public demo, put the admin behind Cloudflare Access
  (or block `/ghost*` with a WAF rule) so the login and admin API are not
  reachable at all.
- **Updates.** The stack tracks `ghost:6-alpine`, but a running container keeps
  the image it started with. Refresh it periodically — a public Ghost that never
  gets patched is a liability:
  ```bash
  docker compose pull && docker compose up -d
  ```
- **Mail.** Outbound mail is not configured; subscribe forms accept input but
  send nothing.
- **Content.** Publications, authors and copy are fictional. Imagery is
  illustrative placeholder photography; publishers supply their own.
