#!/usr/bin/env bash
# Generate languages/cookie-law-info.pot from the plugin root.
#
# WP-CLI only scans .js/.jsx for gettext — not .ts/.tsx (see wp-cli/i18n-command
# JsCodeExtractor extensions). So we merge a second POT from react-gettext-parser
# on lite/admin/dist/js/index.js (run `npm run dev:build` in lite/admin first if dist is missing).
#
# Minified JS and node_modules are excluded from the PHP run to avoid OOM in Peast.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

export WP_CLI_PHP_ARGS='-d memory_limit=2G'

EXCLUDE='node_modules,lite/admin/node_modules,lite/admin/dist,dist,vendor,.git,lite/frontend/js/script.min.js,lite/frontend/js/wca.min.js,lite/frontend/js/gcm.min.js,lite/admin/modules/dashboard-widget/assets/js/chart.min.js'

REACT_POT="$ROOT/languages/.tmp-admin-react.pot"
ADMIN_BUNDLE="$ROOT/lite/admin/dist/js/index.js"

if [[ -f "$ROOT/lite/admin/package.json" ]]; then
  if [[ ! -f "$ADMIN_BUNDLE" ]]; then
    echo "Error: $ADMIN_BUNDLE not found. Build the admin app first:" >&2
    echo "  cd lite/admin && npm run dev:build" >&2
    exit 1
  fi
  (cd "$ROOT/lite/admin" && npm run -s i18n:extract-react)
fi

if [[ -f "$REACT_POT" ]]; then
  wp i18n make-pot "$ROOT" "$ROOT/languages/cookie-law-info.pot" --exclude="$EXCLUDE" --merge="$REACT_POT" "$@"
  rm -f "$REACT_POT"
else
  echo "Warning: react POT not found at $REACT_POT (run: cd lite/admin && npm install). Running wp make-pot only." >&2
  wp i18n make-pot "$ROOT" "$ROOT/languages/cookie-law-info.pot" --exclude="$EXCLUDE" "$@"
fi
