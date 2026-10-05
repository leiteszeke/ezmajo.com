<?php
/**
 * Product editor: "Patrón" tab (patterns) and "Prenda" tab (garments), and the "Añadir patrón" / "Añadir prenda"
 * entries that preset each kind of product.
 *
 * Tables (metraje, medidas) are written one row per line with "|" between columns; the first line is the header:
 *   Talla | Tela principal | Forro
 *   S     | 1,40 m         | 0,80 m
 * The same meta keys can be filled from a CSV import ("Meta: _ezmajo_…" columns).
 */

defined( 'ABSPATH' ) || exit;

function ezmajo_pattern_fields() {
	return array(
		'_ezmajo_precio_ars' => array( 'label' => 'Precio Argentina ($)', 'type' => 'ars', 'desc' => 'En pesos, para quien compra desde Argentina (paga con Mercado Pago). Vacío: no se vende en Argentina.' ),
		'_ezmajo_hojas_a4'   => array( 'label' => 'Hojas A4', 'type' => 'number', 'desc' => 'Páginas del PDF para imprimir en casa.' ),
		'_ezmajo_hojas_a0'   => array( 'label' => 'Hojas A0', 'type' => 'number', 'desc' => 'Solo si incluye versión para copistería.' ),
		'_ezmajo_materiales' => array( 'label' => 'Materiales', 'type' => 'textarea', 'desc' => 'Telas recomendadas y avíos. Una línea por elemento.' ),
		'_ezmajo_metraje'    => array( 'label' => 'Metraje por talla', 'type' => 'textarea', 'desc' => 'Tabla: "Talla | Tela principal | Forro", una fila por línea.' ),
		'_ezmajo_medidas'    => array( 'label' => 'Tabla de medidas', 'type' => 'textarea', 'desc' => 'Tabla: "Talla | Pecho | Cintura | Cadera", una fila por línea.' ),
		'_ezmajo_incluye'    => array( 'label' => 'Qué incluye', 'type' => 'textarea', 'desc' => 'Una línea por elemento (instrucciones, márgenes de costura...).' ),
	);
}

function ezmajo_garment_fields() {
	return array(
		'_ezmajo_precio_base' => array( 'label' => 'Precio (€)', 'type' => 'price', 'desc' => 'IVA incluido. Al guardar se aplica a todas las tallas y colores; después puedes cambiar alguna en Variaciones.' ),
		'_ezmajo_composicion' => array( 'label' => 'Composición', 'type' => 'text', 'desc' => 'Por ejemplo: 70 % lana, 30 % poliamida.' ),
		'_ezmajo_cuidados'    => array( 'label' => 'Cuidados', 'type' => 'textarea', 'desc' => 'Una línea por indicación (lavado, planchado...).' ),
		'_ezmajo_guia_tallas' => array( 'label' => 'Guía de tallas', 'type' => 'textarea', 'desc' => 'Tabla: "Talla | Pecho | Largo", una fila por línea. Sin tallas (un set, una pieza única): "Pieza | Medidas".' ),
	);
}

/** Global attributes pre-added to a new product: only their values have to be picked. */
function ezmajo_preset_attributes( $taxonomies, $for_variations ) {
	$attributes = array();
	foreach ( $taxonomies as $position => $taxonomy ) {
		if ( taxonomy_exists( $taxonomy ) ) {
			$attributes[ $taxonomy ] = array(
				'name'         => $taxonomy,
				'value'        => '',
				'position'     => $position,
				'is_visible'   => 1,
				'is_variation' => (int) $for_variations,
				'is_taxonomy'  => 1,
			);
		}
	}
	return $attributes;
}

/*
 * "Añadir patrón" and "Añadir prenda" (Productos menu) open the editor already set up for each kind, so the
 * WooCommerce product types never have to be chosen by hand:
 * - patrón: simple, virtual + downloadable, 5 downloads / 30 days (as the importer), Dificultad/Talla/Formato.
 * - prenda: variable (Talla x Color variations with their own stock), category Prendas, default parcel weight.
 */
add_action( 'save_post_product', function ( $post_id, $post, $update ) {
	if ( $update || 'auto-draft' !== $post->post_status ) {
		return;
	}
	if ( 'prenda' === ( $_GET['ezmajo'] ?? '' ) ) { // phpcs:ignore WordPress.Security.NonceVerification -- only presets an empty draft
		wp_set_object_terms( $post_id, 'variable', 'product_type' );
		$prendas = get_term_by( 'slug', 'prendas', 'product_cat' );
		if ( $prendas ) {
			wp_set_object_terms( $post_id, array( (int) $prendas->term_id ), 'product_cat' );
		}
		update_post_meta( $post_id, '_weight', '0.5' );
		update_post_meta( $post_id, '_product_attributes', ezmajo_preset_attributes( array( 'pa_talla', 'pa_color' ), true ) );
		return;
	}
	update_post_meta( $post_id, '_virtual', 'yes' );
	update_post_meta( $post_id, '_downloadable', 'yes' );
	update_post_meta( $post_id, '_download_limit', 5 );
	update_post_meta( $post_id, '_download_expiry', 30 );
	update_post_meta( $post_id, '_product_attributes', ezmajo_preset_attributes( array( 'pa_dificultad', 'pa_talla', 'pa_formato' ), false ) );
}, 10, 3 );

// Garment variations track their own stock from the start (0 = agotada until a quantity is entered).
add_action( 'woocommerce_new_product_variation', function ( $variation_id ) {
	$variation = wc_get_product( $variation_id );
	if ( $variation && ! $variation->get_manage_stock() ) {
		$variation->set_manage_stock( true );
		$variation->set_stock_quantity( 0 );
		$variation->save();
	}
} );

add_action( 'admin_menu', function () {
	global $submenu;
	remove_submenu_page( 'edit.php?post_type=product', 'post-new.php?post_type=product' );
	add_submenu_page( 'edit.php?post_type=product', 'Añadir patrón', 'Añadir patrón', 'edit_products', 'post-new.php?post_type=product' );
	add_submenu_page( 'edit.php?post_type=product', 'Añadir prenda', 'Añadir prenda', 'edit_products', 'post-new.php?post_type=product&ezmajo=prenda' );
	// Right after "Todos los productos"
	$items = $submenu['edit.php?post_type=product'] ?? array();
	$added = array_splice( $items, -2 );
	array_splice( $items, 1, 0, $added );
	$submenu['edit.php?post_type=product'] = $items; // phpcs:ignore WordPress.WP.GlobalVariablesOverride
}, 99 );

add_filter( 'woocommerce_product_data_tabs', function ( $tabs ) {
	$tabs['ezmajo_patron'] = array(
		'label'    => 'Patrón',
		'target'   => 'ezmajo_patron_data',
		'class'    => array( 'hide_if_variable' ),
		'priority' => 15,
	);
	$tabs['ezmajo_prenda'] = array(
		'label'    => 'Prenda',
		'target'   => 'ezmajo_prenda_data',
		'class'    => array( 'show_if_variable' ),
		'priority' => 15,
	);
	return $tabs;
} );

function ezmajo_render_fields( $panel_id, $fields ) {
	echo '<div id="' . esc_attr( $panel_id ) . '" class="panel woocommerce_options_panel hidden"><div class="options_group">';
	foreach ( $fields as $key => $field ) {
		$args = array(
			'id'          => $key,
			'label'       => $field['label'],
			'description' => $field['desc'],
			'desc_tip'    => false,
		);
		if ( 'textarea' === $field['type'] ) {
			woocommerce_wp_textarea_input( $args + array( 'rows' => 5, 'style' => 'height:8em;font-family:monospace' ) );
		} elseif ( in_array( $field['type'], array( 'price', 'ars' ), true ) ) {
			woocommerce_wp_text_input( $args + array( 'data_type' => 'price' ) );
		} elseif ( 'number' === $field['type'] ) {
			woocommerce_wp_text_input( $args + array( 'type' => 'number', 'custom_attributes' => array( 'min' => 0, 'step' => 1 ) ) );
		} else {
			woocommerce_wp_text_input( $args );
		}
	}
	echo '</div></div>';
}

add_action( 'woocommerce_product_data_panels', function () {
	ezmajo_render_fields( 'ezmajo_patron_data', ezmajo_pattern_fields() );
	ezmajo_render_fields( 'ezmajo_prenda_data', ezmajo_garment_fields() );
} );

add_action( 'woocommerce_admin_process_product_object', function ( $product ) {
	foreach ( ezmajo_pattern_fields() + ezmajo_garment_fields() as $key => $field ) {
		if ( ! isset( $_POST[ $key ] ) ) { // phpcs:ignore WordPress.Security.NonceVerification -- WooCommerce checked the product nonce
			continue;
		}
		$raw = wp_unslash( $_POST[ $key ] ); // phpcs:ignore WordPress.Security.NonceVerification
		if ( 'price' === $field['type'] ) {
			$value = wc_format_decimal( $raw );
			if ( '' !== $value && $value !== $product->get_meta( $key ) ) {
				ezmajo_apply_price_to_variations( $product, $value );
			}
		} elseif ( 'ars' === $field['type'] ) {
			$value = wc_format_decimal( $raw, 0 );
		} elseif ( 'number' === $field['type'] ) {
			$value = absint( $raw );
		} elseif ( 'textarea' === $field['type'] ) {
			$value = sanitize_textarea_field( $raw );
		} else {
			$value = sanitize_text_field( $raw );
		}
		$product->update_meta_data( $key, $value ?: '' );
	}
} );

/** Garment base price -> every variation (the variations' own prices can still be edited afterwards). */
function ezmajo_apply_price_to_variations( $product, $price ) {
	foreach ( $product->get_children() as $variation_id ) {
		$variation = wc_get_product( $variation_id );
		if ( $variation ) {
			$variation->set_regular_price( $price );
			$variation->save();
		}
	}
}

// Variations created after the base price was set get it too.
add_action( 'woocommerce_new_product_variation', function ( $variation_id ) {
	$variation = wc_get_product( $variation_id );
	$price     = $variation ? get_post_meta( $variation->get_parent_id(), '_ezmajo_precio_base', true ) : '';
	if ( '' !== $price && '' === $variation->get_regular_price() ) {
		$variation->set_regular_price( $price );
		$variation->save();
	}
}, 20 );

// Highlight "Añadir prenda" (not "Añadir patrón") in the menu while adding a garment.
add_filter( 'submenu_file', function ( $submenu_file ) {
	return 'prenda' === ( $_GET['ezmajo'] ?? '' ) ? 'post-new.php?post_type=product&ezmajo=prenda' : $submenu_file; // phpcs:ignore WordPress.Security.NonceVerification
} );
