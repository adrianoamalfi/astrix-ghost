# Astrix demo (Docker Compose + Cloudflare Tunnel)

Runs **all four demo publications at once** — each a full Ghost site with its own
content, images, tags, authors and membership tiers — and publishes them through
a single Cloudflare Tunnel.

| Service | Publication | Shows off |
|---|---|---|
| `meridian` | Travel & photography journal | Poster hero, Mosaic feed, multiple authors |
| `vellum` | Design & type journal | Editorial hero, Bold grid, typography specimen |
| `proof` | Corner-bakery food magazine | Split hero, List feed, membership + gated content, pricing page |
| `fieldnotes` | Personal blog | Personal hero, supporter tier |

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

The theme is reinstalled from this repository on every start, so after editing
it locally:

```bash
cd .. && npm run build && cd demo && docker compose restart
```

## Notes

- **Resources.** Four Ghost containers need roughly 1–1.5 GB of RAM in total;
  a small VPS is enough, but a 512 MB box is not.
- **Database.** Each site uses SQLite in its own volume, which keeps the stack to
  one container per site and makes the demo content a file you can ship. That is
  right for a read-only showcase; a real publication should use MySQL 8.
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
