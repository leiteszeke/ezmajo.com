# Local staging

Replica of ezmajo.com on this Mac: WordPress (PHP 8.1, Apache) + MariaDB 10.11 + Mailpit, serving this worktree.

- Site: http://localhost:8080 · Admin: http://localhost:8080/wp-admin (local user `ezequiel`)
- Emails (nothing leaves the machine): http://localhost:8025
- `ops/staging/wp …` — WP-CLI · `ops/staging/db` — MariaDB client (pipe SQL into it)

## Start / stop

    docker compose -f ops/staging/compose.yml up -d
    docker compose -f ops/staging/compose.yml down        # keeps the DB volume
    docker compose -f ops/staging/compose.yml down -v     # wipes the DB

## Refresh from production

1. Dump the production DB (see ../README.md, backups never go in git).
2. `gzcat dump.sql.gz | ops/staging/db`
3. `ops/staging/wp search-replace 'https://ezmajo.com' 'http://localhost:8080' --skip-columns=guid`
4. `ops/staging/wp option update blog_public 0 && ops/staging/wp plugin deactivate cache-enabler google-site-kit`

Staging-only pieces: `staging-mail.php` (all mail to Mailpit), `sample-products.php` (example patterns + offline
test payment), `.htaccess` (Apache; production runs nginx). None of them are deployed.
