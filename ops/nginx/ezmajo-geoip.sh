#!/bin/bash
# /usr/local/sbin/ezmajo-geoip — download this month's DB-IP Lite country database for nginx geoip2
# (conf.d-ezmajo-geoip.conf). Cron: /etc/cron.d/ezmajo-geoip -> "17 4 3 * * root /usr/local/sbin/ezmajo-geoip".
# Keeps the current file if the download fails (e.g. this month's file not published yet).
set -euo pipefail
dir=/var/lib/ezmajo-geoip
mkdir -p "$dir"
curl -fsSL "https://download.db-ip.com/free/dbip-country-lite-$(date +%Y-%m).mmdb.gz" | gunzip > "$dir/new.mmdb"
mv "$dir/new.mmdb" "$dir/dbip-country-lite.mmdb"
nginx -t -q && systemctl reload nginx
