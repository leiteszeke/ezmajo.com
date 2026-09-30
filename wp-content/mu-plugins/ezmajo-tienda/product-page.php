<?php
/**
 * Pattern product page (block theme): quick facts under the price, tabs with the pattern data,
 * "te lo cosemos" call to action under the buy button.
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

function ezmajo_quick_facts( $product ) {
	$a4    = (int) $product->get_meta( '_ezmajo_hojas_a4' );
	$a0    = (int) $product->get_meta( '_ezmajo_hojas_a0' );
	$sheet = array_filter( array( $a4 ? "$a4 hojas A4" : '', $a0 ? "$a0 hojas A0" : '' ) );
	$facts = array_filter( array(
		'Dificultad' => ezmajo_attribute_list( $product, 'pa_dificultad' ),
		'Tallas'     => ezmajo_attribute_list( $product, 'pa_talla' ),
		'Formato'    => trim( 'PDF ' . ezmajo_attribute_list( $product, 'pa_formato' ) ),
		'Impresión'  => implode( ' · ', $sheet ),
	) );
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
	if ( ! is_product() ) {
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

	$sections = array(
		'ezmajo_materiales' => array( 'Materiales y metraje', ezmajo_line_list( $product->get_meta( '_ezmajo_materiales' ) ) . ezmajo_pipe_table( $product->get_meta( '_ezmajo_metraje' ) ) ),
		'ezmajo_medidas'    => array( 'Tabla de medidas', ezmajo_pipe_table( $product->get_meta( '_ezmajo_medidas' ) ) ),
		'ezmajo_incluye'    => array( 'Qué incluye', ezmajo_line_list( $product->get_meta( '_ezmajo_incluye' ) ) . '<p class="ezmajo-licencia">' . esc_html( EZMAJO_LICENSE ) . '</p>' ),
	);
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

add_action( 'wp_enqueue_scripts', function () {
	if ( is_woocommerce() || is_cart() || is_checkout() || is_account_page() ) {
		wp_enqueue_style( 'ezmajo-tienda', plugins_url( 'tienda.css', __FILE__ ), array(), filemtime( __DIR__ . '/tienda.css' ) );
	}
} );
