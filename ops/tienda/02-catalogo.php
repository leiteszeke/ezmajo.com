<?php
/**
 * Pattern catalogue setup: Spanish URLs, global attributes (dificultad, talla, formato), SEO titles,
 * order notifications. Idempotent. Run after 01-woocommerce-setup.php, then `wp rewrite flush`
 * in a separate run (taxonomies register with the new slugs on the next request).
 */

// URLs: /patrones/ (shop page), /patrones/<tipo>/ (category), /patron/<nombre>/ (product)
$permalinks                   = (array) get_option( 'woocommerce_permalinks' );
$permalinks['product_base']   = '/patron';
$permalinks['category_base']  = 'patrones';
$permalinks['tag_base']       = 'etiqueta-patron';
$permalinks['attribute_base'] = '';
update_option( 'woocommerce_permalinks', $permalinks );

// Global attributes (filterable). Terms keep this order in filters and on the product page.
$attributes = array(
	'dificultad' => array( 'Dificultad', array( 'Principiante', 'Intermedio', 'Avanzado' ) ),
	'talla'      => array( 'Talla', array(
		'XS', 'S', 'M', 'L', 'XL', 'XXL',                                                   // adult, letters
		'34', '36', '38', '40', '42', '44', '46', '48', '50', '52',                          // adult, numbers
		'0-3 meses', '3-6 meses', '6-12 meses', '12-18 meses', '18-24 meses',                // baby
		'2 años', '3 años', '4 años', '5 años', '6 años', '8 años', '10 años', '12 años', '14 años', // kids
	) ),
	'formato'    => array( 'Formato', array( 'A4', 'A0' ) ),
);
foreach ( $attributes as $slug => list( $label, $terms ) ) {
	if ( ! wc_attribute_taxonomy_id_by_name( $slug ) ) {
		$id = wc_create_attribute( array( 'name' => $label, 'slug' => $slug, 'type' => 'select', 'order_by' => 'menu_order', 'has_archives' => false ) );
		if ( is_wp_error( $id ) ) {
			WP_CLI::error( $id->get_error_message() );
		}
	}
	$taxonomy = wc_attribute_taxonomy_name( $slug );
	if ( ! taxonomy_exists( $taxonomy ) ) {
		register_taxonomy( $taxonomy, 'product', array( 'hierarchical' => false ) );
	}
	foreach ( $terms as $order => $name ) {
		$term = term_exists( $name, $taxonomy ) ?: wp_insert_term( $name, $taxonomy, array( 'slug' => sanitize_title( $name ) ) );
		if ( is_wp_error( $term ) ) {
			WP_CLI::error( "$taxonomy/$name: " . $term->get_error_message() );
		}
		update_term_meta( (int) $term['term_id'], 'order', $order );
	}
	WP_CLI::log( sprintf( '%s: %d terms', $taxonomy, count( $terms ) ) );
}

// Categories that must exist even before they have patterns (others are created by the importer)
foreach ( array( 'Infantil' ) as $name ) {
	if ( ! term_exists( $name, 'product_cat' ) ) {
		wp_insert_term( $name, 'product_cat' );
	}
}

// Default category "Uncategorized" -> "Otros"
$default = (int) get_option( 'default_product_cat' );
if ( $default ) {
	wp_update_term( $default, 'product_cat', array( 'name' => 'Otros', 'slug' => 'otros' ) );
}

// SEO titles (Yoast): "Patrones de Blusas - Ezmajo", "Blusa manga japonesa - Patrón - Ezmajo"
$titles = get_option( 'wpseo_titles' );
if ( is_array( $titles ) ) {
	$titles['title-tax-product_cat'] = 'Patrones de %%term_title%% %%page%% %%sep%% %%sitename%%';
	$titles['title-product']         = '%%title%% %%sep%% Patrón %%sep%% %%sitename%%';
	update_option( 'wpseo_titles', $titles );
}

// Shop page title: "Patrones de costura en PDF - Ezmajo" (otherwise it takes the product title template)
update_post_meta( (int) get_option( 'woocommerce_shop_page_id' ), '_yoast_wpseo_title', 'Patrones de costura en PDF %%sep%% %%sitename%%' );
update_post_meta( (int) get_option( 'woocommerce_shop_page_id' ), '_yoast_wpseo_metadesc', 'Patrones de costura en PDF para imprimir en casa en A4: blusas, jerséis y más, con instrucciones paso a paso. Diseñados en nuestro taller de Barcelona.' );

// Order notifications to Ezmajo (not the agency)
$new_order              = (array) get_option( 'woocommerce_new_order_settings', array() );
$new_order['enabled']   = 'yes';
$new_order['recipient'] = 'ezmajo.es@gmail.com';
update_option( 'woocommerce_new_order_settings', $new_order );

WP_CLI::success( 'Catalogue setup done — now run: wp rewrite flush' );
