# Tienda (PDF patterns, WooCommerce)

Code: `wp-content/mu-plugins/ezmajo-tienda.php` (checkout consent, digital-only checkout fields, pricing) and
`wp-content/mu-plugins/ezmajo-tienda/` (catalogue URLs + filter chips, "Patrón" product fields, product page, CSS).

Config scripts (idempotent; run with `--user=<admin>`, then `wp rewrite flush` in a separate run):
1. `01-woocommerce-setup.php` — store, currency, IVA, checkout, downloads, emails, pages
2. `02-catalogo.php` — URLs (/patrones/, /patron/…), attributes (dificultad, talla, formato), SEO titles, order emails
3. `03-menu.php` — "Patrones" in the menu, mini cart in the header

## Loading patterns

Fill `plantilla-patrones.csv` (Google Sheets → Download → CSV), one row per pattern; `codigo` identifies it.
Put the photos and PDFs named in the sheet in one folder, then:

    wp --user=<admin> eval-file ops/tienda/importar-patrones.php patrones.csv carpeta/ validar   # check only
    wp --user=<admin> eval-file ops/tienda/importar-patrones.php patrones.csv carpeta/           # create/update

Tables (metraje, medidas) use one row per line and `|` between columns, first line = header.
Dificultad/tallas/formatos must be existing values (see `02-catalogo.php`); `publicado` = sí/no.

Decisions (confirm with the gestor before launch):
- Prices entered IVA included; same gross price worldwide.
- IVA 21 % for all EU buyers (below the 10.000 € OSS threshold), 0 % outside the EU.
- Checkout asks email, name and country only (factura simplificada, B2C < 400 €).
- Withdrawal-right waiver checkbox is required and stored on each order (`_wc_other/ezmajo/desistimiento`).
- Downloads: served through PHP, 5 downloads / 30 days per purchase.

**Paid PDFs live in `wp-content/uploads/woocommerce_uploads/` and must never be committed (public repo).**

## Launch checklist (production)

Status 2026-10-03: deployed **hidden** (`woocommerce_coming_soon=yes` + `woocommerce_store_pages_only=yes`: store
pages show "Próximamente", rest of the site unchanged). `03-menu.php` not run yet. To open: run 03, set
`woocommerce_coming_soon` to `no`, flush Cache Enabler.


- [x] Backup files + DB (2026-10-03, ezmajo-backups/*-2026-10-03-pre-tienda*)
- [x] nginx: deploy `ops/nginx/ezmajo.com` (denies direct access to `woocommerce_uploads/`), `nginx -t`, reload;
      verify a PDF URL returns 403
- [x] Deploy branch, install WooCommerce + `es_ES` translation, run `01-…`, `02-…`, `03-…`, `wp rewrite flush`
- [x] Payments: SumUp (the shop already uses it in store) via the official plugin `sumup-payment-gateway-for-woocommerce`
      (block checkout OK; cards, Apple Pay, PayPal depending on the account; no Bizum). Tested in staging on
      2026-10-03 with a SumUp sandbox merchant ("Ezmajo Pruebas"; key in ezmajo-backups/sumup-sandbox.txt, set in the
      plugin settings + `Wc_Sumup_Credentials::validate()`): pay → order completed → downloads + emails OK.
      In production use **"Conectar cuenta"** in WooCommerce → Ajustes → Pagos → SumUp while logged in to the real
      SumUp account (it creates the key itself; it refuses non-public hosts, so it can't be done locally). No manual
      API key needed. **Connected 2026-10-03** to the real account (MDE44M46). Still to do: a real purchase + refund.
      **Refunds are not automatic**: refund in the SumUp dashboard (Ventas), then a manual refund on the order
- [x] Transactional email (2026-10-04): Brevo SMTP via `wp-content/mu-plugins/ezmajo-smtp.php`; credentials only in the
      server's wp-config.php (`EZMAJO_SMTP_USER` / `EZMAJO_SMTP_PASS`). ezmajo.com authenticated in Brevo; Route 53 has
      brevo-code TXT, DKIM CNAMEs brevo1/brevo2, `_dmarc` (p=none) and SPF `include:spf.improvmx.com include:spf.brevo.com`.
      Brevo only accepts SMTP from authorised IPs (Settings → Seguridad): server 66.97.39.108 and 2800:6c0:3::659 added
      — a new server IP needs adding there. mail-tester.com: 9.3/10, SPF/DKIM/DMARC pass. Later: DMARC to p=quarantine.
- [ ] Invoices plugin (Verifactu) agreed with the gestor
- [ ] Legal pages: Condiciones de venta, licencia de uso, privacy + cookie policy updates; set terms page in WooCommerce
- [ ] CookieYes: payment provider cookies categorised
- [ ] Cache: confirm cart/checkout/account are never cached (`01-…` sets the cookie exclusions)
