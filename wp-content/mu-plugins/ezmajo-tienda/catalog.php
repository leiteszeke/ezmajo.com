<?php
/**
 * Catalogue URLs and listing: /tienda/ (shop), /tienda/<seccion>/<tipo>/ (category), /tienda/<seccion>/<tipo>/<nombre>/ (product).
 */

defined( 'ABSPATH' ) || exit;

/*
 * Categories and products share the /tienda/ base (/tienda/patrones/blusas/ and /tienda/patrones/blusas/<nombre>/).
 * WooCommerce drops the category rewrite rules in that setup (wc_fix_rewrite_rules), so category URLs land on the
 * product rule (two or more segments) or the page rule (one segment): map them back to the category here.
 */
add_filter( 'request', function ( $vars ) {
	$path = trim( $GLOBALS['wp']->request ?? '', '/' );
	if ( 0 !== strpos( $path, 'tienda/' ) || 0 === strpos( $path, 'tienda/etiqueta/' ) ) {
		return $vars;
	}
	if ( ! empty( $vars['product'] ) && get_page_by_path( $vars['product'], OBJECT, 'product' ) ) {
		return $vars; // a real product
	}
	$paged = 0;
	if ( preg_match( '#^(.+)/page/(\d+)$#', $path, $m ) ) {
		list( , $path, $paged ) = $m;
	}
	$path = substr( $path, strlen( 'tienda/' ) );
	$term = get_term_by( 'slug', basename( $path ), 'product_cat' );
	if ( ! $term || $path !== trim( get_term_parents_list( $term->term_id, 'product_cat', array( 'format' => 'slug', 'separator' => '/', 'link' => false ) ), '/' ) ) {
		return $vars;
	}
	return array_filter( array( 'product_cat' => $term->slug, 'paged' => (int) $paged ) );
} );

// A PDF is bought once: no quantity selector on patterns (garments keep it).
add_filter( 'woocommerce_is_sold_individually', function ( $individually, $product ) {
	return $product->is_downloadable() ? true : $individually;
}, 10, 2 );

add_filter( 'woocommerce_product_single_add_to_cart_text', function ( $text, $product ) {
	return $product->is_downloadable() ? 'Comprar patrón' : $text;
}, 10, 2 );
add_filter( 'woocommerce_product_add_to_cart_text', function ( $text, $product ) {
	if ( $product->is_type( 'variable' ) ) {
		return 'Ver tallas';
	}
	return $product->is_purchasable() && $product->is_in_stock() ? 'Comprar' : $text;
}, 10, 2 );

/*
 * Filter chips above the catalogue (shop and category pages): section/subcategory, then the attributes of the
 * section (patrones: dificultad, talla; prendas: talla, color).
 * Plain links using WooCommerce's filter_<attribute> query args: no JavaScript, crawlable, one value per group.
 */
const EZMAJO_FILTERS = array(
	'patrones' => array( 'dificultad' => 'Dificultad', 'talla' => 'Talla' ),
	'prendas'  => array( 'talla' => 'Talla', 'color' => 'Color' ),
);

/** Root category (Patrones or Prendas) of a product category, or null. */
function ezmajo_section_root( $term ) {
	if ( ! $term ) {
		return null;
	}
	$ancestors = get_ancestors( $term->term_id, 'product_cat', 'taxonomy' );
	return $ancestors ? get_term( end( $ancestors ), 'product_cat' ) : $term;
}

function ezmajo_active_filters() {
	$active = array();
	foreach ( array( 'dificultad', 'talla', 'color' ) as $attr ) {
		if ( ! empty( $_GET[ "filter_$attr" ] ) ) {
			$active[ "filter_$attr" ] = sanitize_title( wp_unslash( $_GET[ "filter_$attr" ] ) );
		}
	}
	return $active;
}

function ezmajo_chip( $label, $url, $current ) {
	return sprintf(
		'<a class="ezmajo-chip%s" href="%s"%s>%s</a>',
		$current ? ' is-active' : '',
		esc_url( $url ),
		$current ? ' aria-current="true"' : '',
		esc_html( $label )
	);
}

function ezmajo_filter_chips() {
	$active  = ezmajo_active_filters();
	$current = is_product_category() ? get_queried_object() : null;
	$root    = ezmajo_section_root( $current );
	$groups  = '';

	// Sections at /tienda/; inside a section, its subcategories (attribute filters are kept when switching)
	if ( ! $root ) {
		$chips = ezmajo_chip( 'Todo', wc_get_page_permalink( 'shop' ), true );
		foreach ( get_terms( array( 'taxonomy' => 'product_cat', 'parent' => 0, 'hide_empty' => true, 'orderby' => 'meta_value_num', 'meta_key' => 'order' ) ) as $term ) {
			$chips .= ezmajo_chip( $term->name, get_term_link( $term ), false );
		}
		return '<nav class="ezmajo-filtros alignwide" aria-label="Secciones de la tienda"><div class="ezmajo-filtro" role="group" aria-label="Sección">' . $chips . '</div></nav>';
	}
	$chips = ezmajo_chip( 'Todos', add_query_arg( $active, get_term_link( $root ) ), $current->term_id === $root->term_id );
	foreach ( get_terms( array( 'taxonomy' => 'product_cat', 'parent' => $root->term_id, 'hide_empty' => true ) ) as $term ) {
		$chips .= ezmajo_chip( $term->name, add_query_arg( $active, get_term_link( $term ) ), $current->term_id === $term->term_id );
	}
	$groups .= '<div class="ezmajo-filtro" role="group" aria-label="Tipo"><span class="ezmajo-filtro__titulo">Tipo</span>' . $chips . '</div>';

	// Attributes of this section (only values that have products)
	$base = get_term_link( $current );
	$in_section = get_posts( array(
		'post_type'   => 'product',
		'post_status' => 'publish',
		'numberposts' => -1,
		'fields'      => 'ids',
		'tax_query'   => array( array( 'taxonomy' => 'product_cat', 'terms' => $root->term_id ) ), // phpcs:ignore WordPress.DB.SlowDBQuery
	) );
	foreach ( EZMAJO_FILTERS[ $root->slug ] ?? array() as $attr => $label ) {
		// Only values used by this section's products (patterns and garments share Talla)
		$terms = $in_section ? wp_get_object_terms( $in_section, "pa_$attr", array( 'orderby' => 'meta_value_num', 'meta_key' => 'order' ) ) : array();
		if ( ! $terms || is_wp_error( $terms ) ) {
			continue;
		}
		$chips = '';
		foreach ( $terms as $term ) {
			$is_on  = ( $active[ "filter_$attr" ] ?? '' ) === $term->slug;
			$args   = $active;
			if ( $is_on ) {
				unset( $args[ "filter_$attr" ] );
			} else {
				$args[ "filter_$attr" ] = $term->slug;
			}
			$chips .= ezmajo_chip( $term->name, add_query_arg( $args, $base ), $is_on );
		}
		$groups .= sprintf( '<div class="ezmajo-filtro" role="group" aria-label="%1$s"><span class="ezmajo-filtro__titulo">%1$s</span>%2$s</div>', esc_html( $label ), $chips );
	}

	if ( $active ) {
		$groups .= '<a class="ezmajo-filtros__quitar" href="' . esc_url( $base ) . '">Quitar filtros</a>';
	}
	return '<nav class="ezmajo-filtros alignwide" aria-label="Filtrar ' . esc_attr( strtolower( $root->name ) ) . '">' . $groups . '</nav>';
}

add_filter( 'render_block_woocommerce/product-collection', function ( $html, $block ) {
	if ( ( is_shop() || is_product_taxonomy() ) && ! empty( $block['attrs']['query']['inherit'] ) ) {
		global $wp_query;
		$empty = 0 === (int) $wp_query->post_count ? '<p class="ezmajo-sin-resultados alignwide">No hay productos con estos filtros.</p>' : '';
		return ezmajo_filter_chips() . $empty . $html;
	}
	return $html;
}, 20, 2 ); // after WooCommerce injects its notices container into the block's first <div>

// The theme's catalogue template carries core's "no results" block, which runs its own (posts) query and showed
// "No se han encontrado productos..." under the products. The empty case is handled with the filter chips below.
add_filter( 'render_block_core/query-no-results', function ( $html ) {
	return is_shop() || is_product_taxonomy() ? '' : $html;
} );

// No mini cart on the cart and checkout pages: redundant there, and on checkout it requests the Store API
// with an undefined base URL (".../finalizar-compra/undefinedwc/store/v1/cart" 404s).
add_filter( 'render_block_woocommerce/mini-cart', function ( $html ) {
	return is_cart() || is_checkout() ? '' : $html;
} );
