# ops

Operational notes for ezmajo.com (WordPress). Nothing in this folder is deployed to the web root.

## Server

- `ssh ezmajo` (root, key auth). Web root: `/var/www/sftp/web`. The agency keeps SFTP access (`kitdigital`, group `sftpusers`).
- `wpe …` — WP-CLI as `www-data` on the web root. Use `--url=https://ezmajo.com` for plugin (de)activation.
- `ezgit …` — git for the web root. The git dir lives outside the web root (`/var/www/ezmajo.git`); sparse-checkout keeps `ops/` and `.gitignore` off the live site.
- `nginx/` — copies of `/etc/nginx/sites-available/{ezmajo.com,web.ezmajo.com}`. Originals from before our changes: `/root/nginx-backup-2026-09-30/`.

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

1. Check for outside changes (agency edits, WP auto-updates): `ssh ezmajo ezgit status --short`.
   If anything shows up, pull it into the repo first (rsync server → worktree, commit, push), then on the server:
   `ezgit fetch origin main && ezgit reset --mixed origin/main && ezgit sparse-checkout reapply`.
2. Code changes: commit and push to `main`, then `ssh ezmajo ezdeploy` (aborts if the live site has changes not in git).
3. DB changes: run them with `wpe` and record them in a dated script here.
4. Before risky changes, back up files (rsync) and the DB (mysqldump from outside; the server has no mysql client). Backups never go in this repo.
