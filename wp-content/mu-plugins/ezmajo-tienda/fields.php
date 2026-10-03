<?php
/**
 * Pattern data on products: a "Patrón" tab in the product editor.
 *
 * Tables (metraje, medidas) are written one row per line with "|" between columns; the first line is the header:
 *   Talla | Tela principal | Forro
 *   S     | 1,40 m         | 0,80 m
 * The same meta keys can be filled from a CSV import ("Meta: _ezmajo_…" columns).
 */

defined( 'ABSPATH' ) || exit;

function ezmajo_pattern_fields() {
	return array(
		'_ezmajo_hojas_a4'   => array( 'label' => 'Hojas A4', 'type' => 'number', 'desc' => 'Páginas del PDF para imprimir en casa.' ),
		'_ezmajo_hojas_a0'   => array( 'label' => 'Hojas A0', 'type' => 'number', 'desc' => 'Solo si incluye versión para copistería.' ),
		'_ezmajo_materiales' => array( 'label' => 'Materiales', 'type' => 'textarea', 'desc' => 'Telas recomendadas y avíos. Una línea por elemento.' ),
		'_ezmajo_metraje'    => array( 'label' => 'Metraje por talla', 'type' => 'textarea', 'desc' => 'Tabla: "Talla | Tela principal | Forro", una fila por línea.' ),
		'_ezmajo_medidas'    => array( 'label' => 'Tabla de medidas', 'type' => 'textarea', 'desc' => 'Tabla: "Talla | Pecho | Cintura | Cadera", una fila por línea.' ),
		'_ezmajo_incluye'    => array( 'label' => 'Qué incluye', 'type' => 'textarea', 'desc' => 'Una línea por elemento (instrucciones, márgenes de costura...).' ),
	);
}

/*
 * Every product is a downloadable PDF: new products start virtual + downloadable with the same download
 * limits the importer sets (5 downloads / 30 days), so they don't have to be ticked by hand each time.
 * The catalogue attributes (filters) come pre-added too: only their values have to be picked.
 */
add_action( 'save_post_product', function ( $post_id, $post, $update ) {
	if ( $update || 'auto-draft' !== $post->post_status ) {
		return;
	}
	update_post_meta( $post_id, '_virtual', 'yes' );
	update_post_meta( $post_id, '_downloadable', 'yes' );
	update_post_meta( $post_id, '_download_limit', 5 );
	update_post_meta( $post_id, '_download_expiry', 30 );

	$attributes = array();
	foreach ( array( 'pa_dificultad', 'pa_talla', 'pa_formato' ) as $position => $taxonomy ) {
		if ( taxonomy_exists( $taxonomy ) ) {
			$attributes[ $taxonomy ] = array(
				'name'         => $taxonomy,
				'value'        => '',
				'position'     => $position,
				'is_visible'   => 1,
				'is_variation' => 0,
				'is_taxonomy'  => 1,
			);
		}
	}
	update_post_meta( $post_id, '_product_attributes', $attributes );
}, 10, 3 );

add_filter( 'woocommerce_product_data_tabs', function ( $tabs ) {
	$tabs['ezmajo_patron'] = array(
		'label'    => 'Patrón',
		'target'   => 'ezmajo_patron_data',
		'priority' => 15,
	);
	return $tabs;
} );

add_action( 'woocommerce_product_data_panels', function () {
	echo '<div id="ezmajo_patron_data" class="panel woocommerce_options_panel hidden"><div class="options_group">';
	foreach ( ezmajo_pattern_fields() as $key => $field ) {
		$args = array(
			'id'          => $key,
			'label'       => $field['label'],
			'description' => $field['desc'],
			'desc_tip'    => false,
		);
		if ( 'textarea' === $field['type'] ) {
			woocommerce_wp_textarea_input( $args + array( 'rows' => 5, 'style' => 'height:8em;font-family:monospace' ) );
		} else {
			woocommerce_wp_text_input( $args + array( 'type' => 'number', 'custom_attributes' => array( 'min' => 0, 'step' => 1 ) ) );
		}
	}
	echo '</div></div>';
} );

add_action( 'woocommerce_admin_process_product_object', function ( $product ) {
	foreach ( ezmajo_pattern_fields() as $key => $field ) {
		if ( ! isset( $_POST[ $key ] ) ) {
			continue;
		}
		$value = 'number' === $field['type'] ? absint( wp_unslash( $_POST[ $key ] ) ) : sanitize_textarea_field( wp_unslash( $_POST[ $key ] ) );
		$product->update_meta_data( $key, $value ?: '' );
	}
} );
