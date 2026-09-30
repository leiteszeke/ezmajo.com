<?php
/**
 * Staging only: two sample pattern products + offline "cheque" payment to simulate purchases.
 * Run: ops/staging/wp --user=ezequiel eval-file /var/www/html/ops/staging/sample-products.php
 */
$file = content_url( 'uploads/woocommerce_uploads/patrones/patron-ejemplo.pdf' );

$cat = term_exists( 'Blusas', 'product_cat' ) ?: wp_insert_term( 'Blusas', 'product_cat' );
$cat2 = term_exists( 'Jerséis', 'product_cat' ) ?: wp_insert_term( 'Jerséis', 'product_cat' );

$samples = array(
	array( 'Blusa manga japonesa (ejemplo)', '8.50', 18, $cat['term_id'] ),
	array( 'Jersey con bordado de flores (ejemplo)', '12.00', 22, $cat2['term_id'] ),
);
foreach ( $samples as list( $name, $price, $image, $term ) ) {
	if ( get_posts( array( 'post_type' => 'product', 'title' => $name, 'post_status' => 'any', 'fields' => 'ids' ) ) ) {
		continue;
	}
	$p = new WC_Product_Simple();
	$p->set_name( $name );
	$p->set_status( 'publish' );
	$p->set_regular_price( $price );
	$p->set_virtual( true );
	$p->set_downloadable( true );
	$p->set_download_limit( 5 );
	$p->set_download_expiry( 30 );
	$p->set_image_id( $image );
	$p->set_category_ids( array( $term ) );
	$p->set_short_description( 'Patrón en PDF, formato A4. Producto de prueba.' );
	$d = new WC_Product_Download();
	$d->set_name( 'Patrón (PDF A4)' );
	$d->set_file( $file );
	$d->set_id( wp_generate_uuid4() );
	$p->set_downloads( array( $d ) );
	WP_CLI::log( "Created #" . $p->save() . " $name" );
}

update_option( 'woocommerce_cheque_settings', array( 'enabled' => 'yes', 'title' => 'Pago de prueba (solo staging)', 'description' => 'Simula un pago.', 'instructions' => '' ) );
WP_CLI::success( 'Samples ready' );
