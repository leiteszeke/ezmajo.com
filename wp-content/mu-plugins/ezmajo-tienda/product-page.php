<?php
/**
 * Product page (block theme): quick facts under the price and tabs with the product data, for patterns (PDF) and
 * garments (variable products); "te lo cosemos" call to action under a pattern's buy button.
 */

defined( 'ABSPATH' ) || exit;

const EZMAJO_LICENSE = 'Licencia de uso personal: puedes coser las prendas para ti o para regalar. No está permitido revender, compartir ni distribuir el patrón, ni coser prendas para vender sin autorización de Ezmajo.';

/** Attribute values as a comma-separated list, in the attribute's term order. */
function ezmajo_attribute_list( $product, $taxonomy ) {
	$terms = wc_get_product_terms( $product->get_id(), $taxonomy, array( 'fields' => 'names' ) );
	return $terms ? implode( ', ', $terms ) : '';
}

/** "A | B" lines -> HTML table (first line is the header). */
function ezmajo_pipe_table( $text ) {
	$rows = array_filter( array_map( 'trim', preg_split( '/\R/', (string) $text ) ) );
	if ( ! $rows ) {
		return '';
	}
	$html = '<table class="ezmajo-tabla">';
	foreach ( array_values( $rows ) as $i => $row ) {
		$cells = array_map( 'trim', explode( '|', $row ) );
		$tag   = 0 === $i ? 'th' : 'td';
		$html .= ( 0 === $i ? '<thead>' : ( 1 === $i ? '<tbody>' : '' ) ) . '<tr>';
		foreach ( $cells as $cell ) {
			$html .= "<$tag>" . esc_html( $cell ) . "</$tag>";
		}
		$html .= '</tr>' . ( 0 === $i ? '</thead>' : '' );
	}
	return $html . ( count( $rows ) > 1 ? '</tbody>' : '' ) . '</table>';
}

/** One line per item -> <ul>. */
function ezmajo_line_list( $text ) {
	$items = array_filter( array_map( 'trim', preg_split( '/\R/', (string) $text ) ) );
	return $items ? '<ul><li>' . implode( '</li><li>', array_map( 'esc_html', $items ) ) . '</li></ul>' : '';
}

/** A pattern is the downloadable product; everything else on the shop is a garment. */
function ezmajo_is_pattern( $product ) {
	return $product && $product->is_downloadable();
}

/**
 * Garments are shipped only once a carrier (Correos) has methods in a shipping zone; until then they are picked up
 * at the shop. Product texts follow that, so nothing promises a delivery the checkout can't offer.
 */
function ezmajo_ships_garments() {
	static $ships = null;
	if ( null === $ships ) {
		$ships = false;
		foreach ( WC_Shipping_Zones::get_zones() as $zone ) {
			foreach ( $zone['shipping_methods'] as $method ) {
				$ships = $ships || 'yes' === $method->enabled;
			}
		}
	}
	return $ships;
}

/** Garment sizes/colours that are still in stock, in the attribute's term order. */
function ezmajo_available_terms( $product, $taxonomy ) {
	$slugs = array();
	foreach ( $product->get_available_variations( 'objects' ) as $variation ) {
		if ( $variation->is_in_stock() ) {
			$slugs[] = (string) ( $variation->get_attributes()[ $taxonomy ] ?? '' );
		}
	}
	$names = array();
	foreach ( wc_get_product_terms( $product->get_id(), $taxonomy ) as $term ) {
		if ( in_array( $term->slug, $slugs, true ) || in_array( '', $slugs, true ) ) { // '' = "any" value
			$names[] = $term->name;
		}
	}
	return implode( ', ', $names );
}

function ezmajo_quick_facts( $product ) {
	if ( ! ezmajo_is_pattern( $product ) ) {
		$facts = array_filter( array(
			'Tallas disponibles' => $product->is_type( 'variable' ) ? ezmajo_available_terms( $product, 'pa_talla' ) : '',
			'Colores'            => $product->is_type( 'variable' ) ? ezmajo_available_terms( $product, 'pa_color' ) : '',
			'Composición'        => $product->get_meta( '_ezmajo_composicion' ),
			'Entrega'            => ezmajo_ships_garments() ? 'Envío a península o recogida en la tienda' : 'Recogida en nuestra tienda de Barcelona',
		) );
		return ezmajo_facts_list( $facts );
	}
	$a4    = (int) $product->get_meta( '_ezmajo_hojas_a4' );
	$a0    = (int) $product->get_meta( '_ezmajo_hojas_a0' );
	$sheet = array_filter( array( $a4 ? "$a4 hojas A4" : '', $a0 ? "$a0 hojas A0" : '' ) );
	$facts = array_filter( array(
		'Dificultad' => ezmajo_attribute_list( $product, 'pa_dificultad' ),
		'Tallas'     => ezmajo_attribute_list( $product, 'pa_talla' ),
		'Formato'    => trim( 'PDF ' . ezmajo_attribute_list( $product, 'pa_formato' ) ),
		'Impresión'  => implode( ' · ', $sheet ),
	) );
	return ezmajo_facts_list( $facts );
}

function ezmajo_facts_list( $facts ) {
	$html = '';
	foreach ( $facts as $label => $value ) {
		$html .= sprintf( '<div><dt>%s</dt><dd>%s</dd></div>', esc_html( $label ), esc_html( $value ) );
	}
	return '<dl class="ezmajo-ficha">' . $html . '</dl>';
}

add_filter( 'render_block', function ( $html, $block ) {
	if ( ! is_product() || empty( $block['attrs']['isDescendentOfSingleProductTemplate'] ) ) {
		return $html;
	}
	$product = wc_get_product( get_the_ID() );
	if ( ! $product ) {
		return $html;
	}
	switch ( $block['blockName'] ) {
		case 'woocommerce/product-price':
			return $html . ezmajo_quick_facts( $product );
	}
	return $html;
}, 10, 2 );

// "Category: …" line (English, and the breadcrumbs already show it). This block carries no template attribute.
add_filter( 'render_block_woocommerce/product-meta', function ( $html ) {
	return is_product() ? '' : $html;
} );

// The buy form block has no "descendant of single template" attribute; is_product() is enough there.
add_filter( 'render_block_woocommerce/add-to-cart-form', function ( $html ) {
	// Not from Argentina (argentina.php): the sewn garment would have to be picked up in Barcelona.
	if ( ! is_product() || ezmajo_in_argentina() || ! ezmajo_is_pattern( wc_get_product( get_the_ID() ) ) ) {
		return $html;
	}
	return $html . sprintf(
		'<p class="ezmajo-cosemos">¿No te animas a coserlo? <a href="%s" target="_blank" rel="noopener">Te lo hacemos en la tienda</a></p>',
		esc_url( 'https://wa.me/' . ezmajo_business()['whatsapp'] . '?text=' . rawurlencode( 'Hola, me interesa que me cosáis el patrón "' . get_the_title() . '".' ) )
	);
} );

add_filter( 'woocommerce_product_tabs', function ( $tabs ) {
	global $product;
	unset( $tabs['additional_information'], $tabs['reviews'] );

	if ( ezmajo_is_pattern( $product ) ) {
		$sections = array(
			'ezmajo_materiales' => array( 'Materiales y metraje', ezmajo_line_list( $product->get_meta( '_ezmajo_materiales' ) ) . ezmajo_pipe_table( $product->get_meta( '_ezmajo_metraje' ) ) ),
			'ezmajo_medidas'    => array( 'Tabla de medidas', ezmajo_pipe_table( $product->get_meta( '_ezmajo_medidas' ) ) ),
			'ezmajo_incluye'    => array( 'Qué incluye', ezmajo_line_list( $product->get_meta( '_ezmajo_incluye' ) ) . '<p class="ezmajo-licencia">' . esc_html( EZMAJO_LICENSE ) . '</p>' ),
		);
	} else {
		$composition = $product->get_meta( '_ezmajo_composicion' );
		$sections    = array(
			'ezmajo_guia'     => array( ezmajo_attribute_list( $product, 'pa_talla' ) ? 'Guía de tallas' : 'Medidas', ezmajo_pipe_table( $product->get_meta( '_ezmajo_guia_tallas' ) ) ),
			'ezmajo_cuidados' => array( 'Composición y cuidados', ( $composition ? '<p>' . esc_html( $composition ) . '</p>' : '' ) . ezmajo_line_list( $product->get_meta( '_ezmajo_cuidados' ) ) ),
			'ezmajo_envio'    => ezmajo_ships_garments()
				? array( 'Envío y devoluciones', '<p>Envío a España peninsular o recogida gratis en nuestra tienda de Barcelona. Tienes 14 días para devolver la prenda desde que la recibes.</p>' )
				: array( 'Recogida y devoluciones', '<p>Recógela gratis en nuestra tienda (' . esc_html( ezmajo_business()['street'] . ', ' . ezmajo_business()['city'] ) . '): te avisamos por email cuando esté lista. Tienes 14 días para devolverla desde que la recoges.</p>' ),
		);
	}
	$priority = 20;
	foreach ( $sections as $key => list( $title, $content ) ) {
		if ( '' === trim( wp_strip_all_tags( $content ) ) ) {
			continue;
		}
		$tabs[ $key ] = array(
			'title'    => $title,
			'priority' => $priority += 10,
			'callback' => function () use ( $content ) {
				echo wp_kses_post( $content );
			},
		);
	}
	if ( isset( $tabs['description'] ) ) {
		$tabs['description']['title'] = 'Descripción';
	}
	return $tabs;
}, 98 ); // after WooCommerce adds its default tabs (priority 10; mu-plugins load first)

add_filter( 'woocommerce_product_description_heading', '__return_empty_string' );

// A garment in one colour (or without sizes) has nothing to choose there: preselect the only option, so the buy
// button works straight away instead of asking to pick from a one-item list.
add_filter( 'woocommerce_dropdown_variation_attribute_options_args', function ( $args ) {
	if ( empty( $args['selected'] ) && 1 === count( (array) $args['options'] ) ) {
		$only             = reset( $args['options'] );
		$args['selected'] = $only instanceof WP_Term ? $only->slug : $only;
	}
	return $args;
} );

// "1 disponibles" (WooCommerce's Spanish) -> "Queda 1" / "Quedan 3".
add_filter( 'woocommerce_get_availability_text', function ( $text, $product ) {
	$qty = $product->managing_stock() ? (int) $product->get_stock_quantity() : 0;
	return $qty > 0 && $product->is_in_stock() ? sprintf( 1 === $qty ? 'Queda %d' : 'Quedan %d', $qty ) : $text;
}, 10, 2 );

add_action( 'wp_enqueue_scripts', function () {
	if ( is_woocommerce() || is_cart() || is_checkout() || is_account_page() ) {
		wp_enqueue_style( 'ezmajo-tienda', plugins_url( 'tienda.css', __FILE__ ), array(), filemtime( __DIR__ . '/tienda.css' ) );
	}
} );
