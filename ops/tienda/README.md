# Tienda (PDF patterns, WooCommerce)

Code: `wp-content/mu-plugins/ezmajo-tienda.php` (checkout consent, digital-only checkout fields, pricing).
Config: `01-woocommerce-setup.php` (idempotent; run with `--user=<admin>`).

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
- [ ] Deploy branch, install WooCommerce + `es_ES` translation, run `01-woocommerce-setup.php`
- [ ] Payment gateway(s) live (Stripe / PayPal / Redsys-Bizum), test purchase with a real card, refund it
- [ ] Transactional email deliverability (SMTP/provider, SPF/DKIM for ezmajo.com); order notification recipient
- [ ] Invoices plugin (Verifactu) agreed with the gestor
- [ ] Legal pages: Condiciones de venta, licencia de uso, privacy + cookie policy updates; set terms page in WooCommerce
- [ ] CookieYes: payment provider cookies categorised
- [ ] Cache: confirm cart/checkout/account are never cached (`01-…` sets the cookie exclusions)
