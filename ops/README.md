# ops

Operational notes for ezmajo.com (WordPress). Nothing in this folder is deployed to the web root.

## Server

- `ssh ezequielito` (root, key auth; 5.189.143.47, migrated from DonWeb 2026-10-21). Everything lives in `/var/www/ezmajo.com/`: web root `sftp/web`, git dir `ezmajo.git`.
- Agency access: SFTP `sftp.ezmajo.com:5920` (`kitdigital`, group `sftpusers`, chrooted to `/var/www/ezmajo.com/sftp`; ports in `/etc/ssh/sshd_config.d/10-ports.conf`). MySQL `db.ezmajo.com:3333` (`kitdigital`, only the `ezmajo` DB): nginx stream proxy `/etc/nginx/stream.d/ezmajo-db.conf` to the local MySQL, which stays bound to 127.0.0.1.
- `wpe …` — WP-CLI as `www-data` on the web root. Use `--url=https://ezmajo.com` for plugin (de)activation.
- `ezgit …` — git for the web root. The git dir lives outside the web root (`/var/www/ezmajo.com/ezmajo.git`); sparse-checkout keeps `ops/` and `.gitignore` off the live site.
- `nginx/` — copies of `/etc/nginx/sites-available/{ezmajo.com,web.ezmajo.com}`. Originals from before our changes: `/root/nginx-backup-2026-09-30/`.

## Performance (2026-10-05)

- Page cache: Cache Enabler serves normal pages (~0.05 s on the server; ~1 s from Spain, the server is in Argentina).
  It only serves browsers: requests without `Accept: text/html` (plain `curl`) always bypass it — measure with
  `curl -H "Accept: text/html"`. Store pages, cart and checkout are never page-cached (they vary by country/session).
- Object cache: Redis (`redis-server`, 64 MB, allkeys-lru, localhost only) + plugin Redis Object Cache;
  `WP_REDIS_PREFIX` / `WP_REDIS_MAXTTL` in the server's wp-config.php (backup: /root/wp-config-2026-10-05-pre-redis.php).
  The drop-in `wp-content/object-cache.php` is ignored (.gitignore + /var/www/ezmajo.com/ezmajo.git/info/exclude). Status:
  `wpe redis status`. On the old server every DB query went to db.ezmajo.com (~22 ms), so this took store pages from 3.5 s to 1.2 s; the DB is now local (`DB_HOST` localhost).
- UserWay (accessibility widget, installed by the agency) deactivated: it had no account linked, showed nothing and
  called api.userway.org on every page (+0.63 s). Reactivate only after linking a UserWay account.
- Store pages now ~0.6 s on the server, ~1.6 s from Spain. (A CDN was considered and dropped: not needed.)

## Login

- Admin login: **https://ezmajo.com/taller** (WPS Hide Login; `/wp-admin` and `/wp-login.php` answer 404 when logged
  out). Branded screen: `wp-content/mu-plugins/ezmajo-login.php`. nginx blocks `xmlrpc.php` and rate-limits the login
  (`nginx/conf.d-ezmajo-login.conf` -> `/etc/nginx/conf.d/ezmajo-login.conf`).
- Visitor country (shop's Argentina mode): nginx geoip2 with DB-IP Lite (`nginx/conf.d-ezmajo-geoip.conf` ->
  `/etc/nginx/conf.d/ezmajo-geoip.conf`), passed to PHP as `EZMAJO_COUNTRY`; monthly update `nginx/ezmajo-geoip.sh` ->
  `/usr/local/sbin/ezmajo-geoip` + `/etc/cron.d/ezmajo-geoip`. See `tienda/README.md` → Argentina.
- Locked out (plugin broken, slug forgotten)? `wpe option get whl_page`, or `wpe plugin deactivate wps-hide-login`
  to get `/wp-login.php` back.

## Workflow

1. Check for outside changes (agency edits, WP auto-updates): `ssh ezequielito ezgit status --short`.
   If anything shows up, pull it into the repo first (rsync server → worktree, commit, push), then on the server:
   `ezgit fetch origin main && ezgit reset --mixed origin/main && ezgit sparse-checkout reapply`.
2. Code changes: commit and push to `main`, then `ssh ezequielito ezdeploy` (aborts if the live site has changes not in git).
3. DB changes: run them with `wpe` and record them in a dated script here.
4. Before risky changes, back up files (rsync) and the DB (mysqldump on the server). Backups never go in this repo.
