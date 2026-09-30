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
