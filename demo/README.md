# Astrix demo (Docker Compose)

A one-command, publishable demo of the theme. It boots Ghost with the Astrix
theme installed from this repository and one of four ready-made demo
publications — content, images, tags, authors and membership tiers included.

| `DEMO` | Publication | Shows off |
|---|---|---|
| `meridian` *(default)* | Travel & photography journal | Poster hero, Mosaic feed, multiple authors |
| `vellum` | Design & type journal | Editorial hero, Bold grid, typography specimen |
| `proof` | Corner-bakery food magazine | Split hero, List feed, membership + gated content, pricing page |
| `fieldnotes` | Personal blog | Personal hero, supporter tier |

## Run it locally

```bash
cd demo
docker compose up -d
# → http://localhost:8080
```

Switch publication (a fresh volume is required, so wipe first):

```bash
docker compose down -v
DEMO=proof docker compose up -d
```

Stop, and reset to a clean slate:

```bash
docker compose down      # stop, keep content
docker compose down -v   # stop and wipe content
```

The theme is re-installed from the repository on every start, so rebuilding the
CSS/JS (`npm run build` in the repo root) and restarting is enough to see your
changes:

```bash
cd .. && npm run build && cd demo && docker compose restart
```

## Publish it

Copy `.env.example` to `.env` and set at least `GHOST_URL` to the public address
— Ghost renders every link and image against it:

```env
DEMO=meridian
PORT=8080
GHOST_URL=https://demo.example.com
```

Then run `docker compose up -d` behind a TLS-terminating reverse proxy
(Caddy, nginx, Traefik, or your platform's built-in ingress) pointing at the
published port. Any host that runs Docker Compose works — a small VPS is plenty.

## Notes

- **Database.** The demo uses SQLite, which keeps it to a single container and
  makes the content a file you can ship. That is ideal for a read-only showcase;
  a production publication should use MySQL 8 as Ghost recommends.
- **Secrets.** The seeded database ships with placeholder API keys, and the
  `seed` step regenerates Ghost's internal integration keys on first run, so
  every deployment gets its own.
- **Admin.** No admin account is provisioned — the demo owner has a fictional
  address and an unusable password, so `/ghost` cannot be signed into. That is
  deliberate for a public demo.
- **Mail.** Outbound mail is not configured; subscribe forms will accept input
  but send nothing.
- **Content.** Publications, authors and copy are fictional. Imagery is
  illustrative placeholder photography; publishers supply their own.
