<?php
// Staging only: a test garment (variable, Talla x Color, stock per variation). Run by seed-tienda.sh.
$existing = wc_get_products( array( 'sku' => 'PR-TEST-1', 'limit' => 1 ) );
if ( $existing ) { WP_CLI::log( 'exists ' . $existing[0]->get_id() ); return; }
$img = (int) ( get_posts( array( 'post_type' => 'attachment', 'name' => 'jersey-1', 'fields' => 'ids', 'numberposts' => 1 ) )[0] ?? 0 );
$p = new WC_Product_Variable();
$p->set_name( 'Jersey de punto trenzado' );
$p->set_sku( 'PR-TEST-1' );
$p->set_status( 'publish' );
$p->set_description( 'Jersey de punto trenzado cosido en nuestro taller. Corte recto y cuello redondo.' );
$p->set_short_description( 'Jersey de punto hecho en Barcelona.' );
$p->set_category_ids( array( get_term_by( 'slug', 'prendas', 'product_cat' )->term_id ) );
$p->set_weight( '0.5' );
if ( $img ) { $p->set_image_id( $img ); }
$attrs = array();
foreach ( array( 'pa_talla' => array( 's', 'm', 'l' ), 'pa_color' => array( 'gris', 'beige' ) ) as $tax => $slugs ) {
	$a = new WC_Product_Attribute();
	$a->set_id( wc_attribute_taxonomy_id_by_name( $tax ) );
	$a->set_name( $tax );
	$a->set_options( array_map( fn( $s ) => get_term_by( 'slug', $s, $tax )->term_id, $slugs ) );
	$a->set_visible( true );
	$a->set_variation( true );
	$attrs[] = $a;
}
$p->set_attributes( $attrs );
$p->update_meta_data( '_ezmajo_composicion', '70 % lana, 30 % poliamida' );
$p->update_meta_data( '_ezmajo_cuidados', "Lavar a mano en agua fría\nSecar en plano\nNo usar secadora" );
$p->update_meta_data( '_ezmajo_guia_tallas', "Talla | Pecho | Largo\nS | 96 cm | 60 cm\nM | 102 cm | 62 cm\nL | 108 cm | 64 cm" );
$id = $p->save();
$stock = array( 's-gris' => 2, 'm-gris' => 1, 'l-gris' => 0, 's-beige' => 1, 'm-beige' => 0, 'l-beige' => 3 );
foreach ( $stock as $key => $qty ) {
	list( $t, $c ) = explode( '-', $key );
	$v = new WC_Product_Variation();
	$v->set_parent_id( $id );
	$v->set_attributes( array( 'pa_talla' => $t, 'pa_color' => $c ) );
	$v->set_regular_price( '39.90' );
	$v->set_manage_stock( true );
	$v->set_stock_quantity( $qty );
	$v->save();
}
WC_Product_Variable::sync( $id );
WP_CLI::success( "Garment $id: " . get_permalink( $id ) );
