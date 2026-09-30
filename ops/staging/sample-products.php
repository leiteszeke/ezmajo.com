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

/*
 * Pattern data for the samples (attributes + "Patrón" tab fields).
 */
function ezmajo_sample_attr( $taxonomy, $names ) {
	$a = new WC_Product_Attribute();
	$a->set_id( wc_attribute_taxonomy_id_by_name( $taxonomy ) );
	$a->set_name( $taxonomy );
	$a->set_options( array_map( fn( $n ) => get_term_by( 'name', $n, $taxonomy )->term_id, $names ) );
	$a->set_visible( true );
	return $a;
}
$data = array(
	'Blusa manga japonesa (ejemplo)' => array(
		'dificultad' => array( 'Principiante' ), 'talla' => array( 'XS', 'S', 'M', 'L', 'XL' ), 'hojas' => 18,
		'materiales' => "Tela fluida: viscosa, lino o algodón ligero\nEntretela para el cuello\nHilo a tono",
		'metraje'    => "Talla | Tela (140 cm de ancho)\nXS–S | 1,20 m\nM–L | 1,40 m\nXL | 1,60 m",
		'medidas'    => "Talla | Pecho | Cintura | Cadera\nXS | 82 cm | 64 cm | 88 cm\nS | 86 cm | 68 cm | 92 cm\nM | 92 cm | 74 cm | 98 cm\nL | 98 cm | 80 cm | 104 cm\nXL | 104 cm | 86 cm | 110 cm",
		'incluye'    => "Patrón en PDF para imprimir en A4, con cuadro de prueba\nInstrucciones de montaje paso a paso con ilustraciones\nMárgenes de costura incluidos (1 cm)",
	),
	'Jersey con bordado de flores (ejemplo)' => array(
		'dificultad' => array( 'Intermedio' ), 'talla' => array( '36', '38', '40', '42', '44', '46' ), 'hojas' => 24,
		'materiales' => "Punto medio con algo de elasticidad\nLana o mouliné para el bordado",
		'metraje'    => "Talla | Tela (150 cm de ancho)\n36–40 | 1,30 m\n42–46 | 1,60 m",
		'medidas'    => "Talla | Pecho | Cadera\n36 | 84 cm | 90 cm\n38 | 88 cm | 94 cm\n40 | 92 cm | 98 cm\n42 | 96 cm | 102 cm\n44 | 102 cm | 108 cm\n46 | 108 cm | 114 cm",
		'incluye'    => "Patrón en PDF A4\nPlantilla del bordado a tamaño real\nInstrucciones paso a paso",
	),
);
foreach ( $data as $name => $d ) {
	$ids = get_posts( array( 'post_type' => 'product', 'title' => $name, 'post_status' => 'any', 'fields' => 'ids' ) );
	if ( ! $ids ) {
		continue;
	}
	$p = wc_get_product( $ids[0] );
	$p->set_attributes( array(
		ezmajo_sample_attr( 'pa_dificultad', $d['dificultad'] ),
		ezmajo_sample_attr( 'pa_talla', $d['talla'] ),
		ezmajo_sample_attr( 'pa_formato', array( 'A4' ) ),
	) );
	$p->set_description( 'Descripción de ejemplo del patrón: qué prenda es, para qué tipo de tela está pensado y qué la hace especial.' );
	$p->set_short_description( 'Patrón en PDF para imprimir en casa en A4.' );
	$p->update_meta_data( '_ezmajo_hojas_a4', $d['hojas'] );
	foreach ( array( 'materiales', 'metraje', 'medidas', 'incluye' ) as $k ) {
		$p->update_meta_data( "_ezmajo_$k", $d[ $k ] );
	}
	$p->save();
	WP_CLI::log( "Pattern data: $name" );
}
