#!/bin/sh
# Staging only: load the example rows of ops/tienda/plantilla-patrones.csv with placeholder photos/PDFs, a test garment,
# publish them and enable an offline test payment. Safe to re-run.
set -e
cd "$(dirname "$0")"
T=../..
I=import-test
mkdir -p "$I"

# Placeholder photos (existing site photos) and PDFs
cp "$T/wp-content/uploads/2026/06/Blusa-Manga-Japonesa.webp"          "$I/blusa-japonesa-1.webp"
cp "$T/wp-content/uploads/2026/06/jersey.webp"                        "$I/blusa-japonesa-2.webp"
cp "$T/wp-content/uploads/2026/06/Jersey-con-bordado-de-flores.webp"  "$I/jersey-flores.webp"
cp "$T/wp-content/uploads/2026/06/Rebeca-con-detalles-de-Flores.webp" "$I/vestido-infantil.webp"
for f in blusa-japonesa-a4 jersey-flores-a4 jersey-flores-a0 vestido-infantil-a4; do
	python3 - "$I/$f.pdf" "$f" <<'PY'
import sys
text = f"PATRON DE PRUEBA {sys.argv[2]} - solo staging"
c = f"BT /F1 16 Tf 60 780 Td ({text}) Tj ET".encode()
objs = [b"<< /Type /Catalog /Pages 2 0 R >>", b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length %d >>\nstream\n" % len(c) + c + b"\nendstream", b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"]
out, offs = b"%PDF-1.4\n", []
for i, o in enumerate(objs, 1):
    offs.append(len(out)); out += b"%d 0 obj\n" % i + o + b"\nendobj\n"
x = len(out)
out += b"xref\n0 6\n0000000000 65535 f \n" + b"".join(b"%010d 00000 n \n" % o for o in offs)
out += b"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % x
open(sys.argv[1], "wb").write(out)
PY
done

./wp --user=ezequiel eval-file /var/www/html/ops/tienda/importar-patrones.php \
	/var/www/html/ops/tienda/plantilla-patrones.csv /var/www/html/ops/staging/import-test
for sku in EZ-001 EZ-002 EZ-003; do
	./wp post update "$(./wp wc product list --user=ezequiel --sku=$sku --field=id)" --post_status=publish
done
./wp option update woocommerce_cheque_settings --format=json \
	'{"enabled":"yes","title":"Pago de prueba (solo staging)","description":"Simula un pago.","instructions":""}'

# Garments: shipping zone with a flat test rate + pickup, and one test garment with stock per size/colour
./wp --user=ezequiel eval-file /var/www/html/ops/tienda/04-envios.php staging
./wp --user=ezequiel eval-file /var/www/html/ops/staging/seed-prenda.php
