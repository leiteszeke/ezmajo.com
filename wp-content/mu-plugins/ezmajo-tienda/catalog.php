<?php
/**
 * Catalogue URLs and listing: /patrones/ (shop), /patrones/<tipo>/ (category), /patron/<nombre>/ (product).
 */

defined( 'ABSPATH' ) || exit;

// A PDF is bought once: no quantity selector anywhere.
add_filter( 'woocommerce_is_sold_individually', '__return_true' );

add_filter( 'woocommerce_product_single_add_to_cart_text', function () {
	return 'Comprar patrón';
} );
add_filter( 'woocommerce_product_add_to_cart_text', function ( $text, $product ) {
	return $product->is_purchasable() && $product->is_in_stock() ? 'Comprar' : $text;
}, 10, 2 );

/*
 * Filter chips above the catalogue (shop and category pages): tipo de prenda, dificultad, talla.
 * Plain links using WooCommerce's filter_<attribute> query args: no JavaScript, crawlable, one value per group.
 */
const EZMAJO_FILTERS = array( 'dificultad' => 'Dificultad', 'talla' => 'Talla' );

function ezmajo_active_filters() {
	$active = array();
	foreach ( array_keys( EZMAJO_FILTERS ) as $attr ) {
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
	$groups  = '';

	// Tipo de prenda (categories keep the attribute filters)
	$chips = ezmajo_chip( 'Todos', add_query_arg( $active, wc_get_page_permalink( 'shop' ) ), ! $current );
	foreach ( get_terms( array( 'taxonomy' => 'product_cat', 'hide_empty' => true ) ) as $term ) {
		$chips .= ezmajo_chip( $term->name, add_query_arg( $active, get_term_link( $term ) ), $current && $current->term_id === $term->term_id );
	}
	$groups .= '<div class="ezmajo-filtro" role="group" aria-label="Tipo de prenda"><span class="ezmajo-filtro__titulo">Tipo</span>' . $chips . '</div>';

	// Attributes (only values that have patterns)
	$base = $current ? get_term_link( $current ) : wc_get_page_permalink( 'shop' );
	foreach ( EZMAJO_FILTERS as $attr => $label ) {
		$terms = get_terms( array( 'taxonomy' => "pa_$attr", 'hide_empty' => true, 'orderby' => 'meta_value_num', 'meta_key' => 'order' ) );
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
	return '<nav class="ezmajo-filtros alignwide" aria-label="Filtrar patrones">' . $groups . '</nav>';
}

add_filter( 'render_block_woocommerce/product-collection', function ( $html, $block ) {
	if ( ( is_shop() || is_product_taxonomy() ) && ! empty( $block['attrs']['query']['inherit'] ) ) {
		return ezmajo_filter_chips() . $html;
	}
	return $html;
}, 20, 2 ); // after WooCommerce injects its notices container into the block's first <div>

// No mini cart on the cart and checkout pages: redundant there, and on checkout it requests the Store API
// with an undefined base URL (".../finalizar-compra/undefinedwc/store/v1/cart" 404s).
add_filter( 'render_block_woocommerce/mini-cart', function ( $html ) {
	return is_cart() || is_checkout() ? '' : $html;
} );
