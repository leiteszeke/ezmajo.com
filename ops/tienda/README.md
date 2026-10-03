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

- [ ] Backup files + DB
- [ ] nginx: deploy `ops/nginx/ezmajo.com` (denies direct access to `woocommerce_uploads/`), `nginx -t`, reload;
      verify a PDF URL returns 403
- [ ] Deploy branch, install WooCommerce + `es_ES` translation, run `01-…`, `02-…`, `03-…`, `wp rewrite flush`
- [ ] Payments: SumUp (the shop already uses it in store) via the official plugin `sumup-payment-gateway-for-woocommerce`
      (block checkout OK; cards, Apple Pay, PayPal depending on the account; no Bizum). Tested in staging on
      2026-10-03 with a SumUp sandbox merchant ("Ezmajo Pruebas"; key in ezmajo-backups/sumup-sandbox.txt, set in the
      plugin settings + `Wc_Sumup_Credentials::validate()`): pay → order completed → downloads + emails OK.
      In production use **"Conectar cuenta"** in WooCommerce → Ajustes → Pagos → SumUp while logged in to the real
      SumUp account (it creates the key itself; it refuses non-public hosts, so it can't be done locally). No manual
      API key needed. Then a real purchase + refund.
      **Refunds are not automatic**: refund in the SumUp dashboard (Ventas), then a manual refund on the order
- [ ] Transactional email: sender is contacto@ezmajo.com, but ezmajo.com mail is ImprovMX (forwarding only;
      SPF allows only ImprovMX). Send through ImprovMX SMTP or a provider (e.g. Brevo) via an SMTP plugin, add its
      SPF include + DKIM, add a DMARC record; test with mail-tester.com. Order notifications → ezmajo.es@gmail.com
- [ ] Invoices plugin (Verifactu) agreed with the gestor
- [ ] Legal pages: Condiciones de venta, licencia de uso, privacy + cookie policy updates; set terms page in WooCommerce
- [ ] CookieYes: payment provider cookies categorised
- [ ] Cache: confirm cart/checkout/account are never cached (`01-…` sets the cookie exclusions)
