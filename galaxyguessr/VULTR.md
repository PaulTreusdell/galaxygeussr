# Vultr deployment

Use a Linux Cloud Compute instance with Docker and Docker Compose. A small CPU server is sufficient for an initial demo; no GPU is needed. Confirm the selected server cost is covered by your event credits before creating it.

Point your domain's DNS A record at the server IPv4 address. Allow inbound TCP 80 and 443, and restrict SSH to your own IP where practical. Do not expose app port 3000. If using IPv6 DNS, it must also point to this server.

Once the repository containing these files is available on the server:

```sh
cd galaxygeussr/galaxyguessr
printf 'DOMAIN=your-domain.example\n' > .env.deploy
docker compose --env-file .env.deploy up -d --build
docker compose --env-file .env.deploy logs --tail=50
```

Replace the domain before running. Caddy obtains HTTPS certificates automatically once DNS and ports are correct. PUBLIC_ORIGIN makes origin validation and Secure login cookies work behind the proxy. Do not upload the ElevenLabs API key: generated audio is already included.

The database and HTTPS certificates live in named Docker volumes and survive app rebuilds. SQL migrations run automatically at startup. Never run `docker compose down -v` unless deliberately deleting accounts and scores. Back up the database before updates; stop the app while copying its data volume, or use a SQLite-aware online backup. Local browser accounts do not automatically transfer to a new server database.

## Local production verification

Node.js 22.13+ is required (Docker uses Node 24).

```sh
npm ci
npm run build:vultr
npm start
```

Open http://127.0.0.1:3000. This uses a separate `.local/production.sqlite` database. The original Worker build remains available through `npm run build`.

## Current live server (native Node deployment)

Public address: https://galaxyguessr.207.148.17.153.sslip.io
Server: 207.148.17.153 (Debian 13). The small-memory instance runs Node directly instead of Docker.

- App files: `/opt/galaxyguessr`
- Node runtime: `/opt/galaxyguessr-node/bin/node`
- Persistent database: `/var/lib/galaxyguessr/galaxyguessr.sqlite`
- App service: `galaxyguessr.service` (unprivileged galaxyguessr user)
- HTTPS proxy: `caddy.service`, configuration `/etc/caddy/Caddyfile`
- Public ports: TCP 80 and 443; app port 3000 is bound only to loopback.

Build updates locally with `npm run build:vultr`, upload `dist/client`, `dist/node`, and `drizzle` to the app directory, then restart `galaxyguessr.service`. Never overwrite the database directory with a release. Take a SQLite-consistent backup before migrations. View logs with `journalctl -u galaxyguessr -n 50` and `journalctl -u caddy -n 50`. The sslip.io address depends on this public IP and the external DNS service; switch to an owned domain for long-term use.
