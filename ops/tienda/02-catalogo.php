<?php
/**
 * Catalogue setup (patrones + prendas): Spanish URLs, global attributes (dificultad, talla, formato, color),
 * the two root categories, SEO titles,
 * order notifications. Idempotent. Run after 01-woocommerce-setup.php, then `wp rewrite flush`
 * in a separate run (taxonomies register with the new slugs on the next request).
 */

// URLs: /tienda/ (shop page), /tienda/patrones/blusas/ (category), /tienda/patrones/blusas/<nombre>/ (product)
$permalinks                   = (array) get_option( 'woocommerce_permalinks' );
$permalinks['product_base']   = '/tienda/%product_cat%';
$permalinks['category_base']  = 'tienda';
$permalinks['tag_base']       = 'tienda/etiqueta';
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
	// Garments. A starting list: more colours are added from Productos -> Atributos.
	'color'      => array( 'Color', array( 'Negro', 'Blanco', 'Gris', 'Beige', 'Marrón', 'Azul', 'Rojo', 'Rosa', 'Verde', 'Estampado' ) ),
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

// Two root categories; every pattern subcategory (Blusas, Jerséis, Infantil, Otros...) hangs from Patrones.
$roots = array();
foreach ( array( 'patrones' => 'Patrones', 'prendas' => 'Prendas' ) as $slug => $name ) {
	$term = get_term_by( 'slug', $slug, 'product_cat' );
	$roots[ $slug ] = $term ? (int) $term->term_id : (int) wp_insert_term( $name, 'product_cat', array( 'slug' => $slug ) )['term_id'];
}
update_term_meta( $roots['patrones'], 'order', 0 );
update_term_meta( $roots['prendas'], 'order', 1 );

// Default category "Uncategorized" -> "Otros"
$default = (int) get_option( 'default_product_cat' );
if ( $default ) {
	wp_update_term( $default, 'product_cat', array( 'name' => 'Otros', 'slug' => 'otros' ) );
}
if ( ! term_exists( 'infantil', 'product_cat' ) ) {
	wp_insert_term( 'Infantil', 'product_cat', array( 'slug' => 'infantil' ) );
}
foreach ( get_terms( array( 'taxonomy' => 'product_cat', 'hide_empty' => false, 'parent' => 0 ) ) as $term ) {
	if ( ! in_array( (int) $term->term_id, $roots, true ) ) {
		wp_update_term( $term->term_id, 'product_cat', array( 'parent' => $roots['patrones'] ) );
		WP_CLI::log( "Category {$term->name} -> Patrones" );
	}
}

// SEO titles (Yoast): "Blusas - Ezmajo", "Blusa manga japonesa - Ezmajo"
$titles = get_option( 'wpseo_titles' );
if ( is_array( $titles ) ) {
	$titles['title-tax-product_cat'] = '%%term_title%% %%page%% %%sep%% %%sitename%%';
	$titles['title-product']         = '%%title%% %%sep%% %%sitename%%';
	update_option( 'wpseo_titles', $titles );
}
$seo = (array) get_option( 'wpseo_taxonomy_meta', array() );
$seo['product_cat'][ $roots['patrones'] ] = array_merge( $seo['product_cat'][ $roots['patrones'] ] ?? array(), array(
	'wpseo_title' => 'Patrones de costura en PDF %%sep%% %%sitename%%',
	'wpseo_desc'  => 'Patrones de costura en PDF para imprimir en casa en A4: blusas, jerséis y más, con instrucciones paso a paso. Diseñados en nuestro taller de Barcelona.',
) );
$seo['product_cat'][ $roots['prendas'] ] = array_merge( $seo['product_cat'][ $roots['prendas'] ] ?? array(), array(
	'wpseo_title' => 'Prendas hechas en nuestro taller %%sep%% %%sitename%%',
	'wpseo_desc'  => 'Prendas cosidas en nuestro taller de Barcelona, en varias tallas y colores.',
) );
update_option( 'wpseo_taxonomy_meta', $seo );

// Shop page title (otherwise it takes the product title template)
update_post_meta( (int) get_option( 'woocommerce_shop_page_id' ), '_yoast_wpseo_title', 'Tienda: patrones de costura y prendas %%sep%% %%sitename%%' );
update_post_meta( (int) get_option( 'woocommerce_shop_page_id' ), '_yoast_wpseo_metadesc', 'Patrones de costura en PDF para imprimir en casa y prendas hechas en nuestro taller de Barcelona.' );

// Order notifications to Ezmajo (not the agency)
$new_order              = (array) get_option( 'woocommerce_new_order_settings', array() );
$new_order['enabled']   = 'yes';
$new_order['recipient'] = 'ezmajo.es@gmail.com';
update_option( 'woocommerce_new_order_settings', $new_order );

WP_CLI::success( 'Catalogue setup done — now run: wp rewrite flush' );
