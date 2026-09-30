#!/bin/sh
# Phase 1 DB changes (run on the server; `wpe` = WP-CLI as www-data on /var/www/sftp/web).
# Backup taken beforehand: ezmajo-db-2026-09-30-pre-phase1.sql.gz
set -e

# Let search engines index the site
wpe option update blog_public 1

# Serve everything from ezmajo.com (web.ezmajo.com now redirects)
wpe search-replace 'web.ezmajo.com' 'ezmajo.com' --skip-columns=guid --report-changed-only

# Remove WordPress sample content
wpe post delete 1 2 --force

# Close comments site-wide
wpe option update default_comment_status closed
wpe option update default_ping_status closed

# Date-free permalinks (pages are unaffected)
wpe rewrite structure '/%postname%/'
wpe rewrite flush

wpe cache flush

# Page cache (Cache Enabler writes WP_CACHE to wp-config.php and wp-content/advanced-cache.php).
# --url is required so the plugin creates its per-host settings file.
wpe --url=https://ezmajo.com plugin install cache-enabler --activate

# Images to WebP (see 2026-09-30-webp.php), then rebuild Yoast's og:image index and clear the cache
wpe eval-file /tmp/webp.php
wpe --url=https://ezmajo.com yoast index --reindex --skip-confirmation
wpe --url=https://ezmajo.com cache-enabler clear
