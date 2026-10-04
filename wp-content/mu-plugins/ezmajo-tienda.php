<?php
/**
 * Plugin Name: Ezmajo Tienda
 * Description: Store tweaks for selling PDF patterns with WooCommerce (checkout consent, pricing). Must-use plugin: always active.
 */

defined( 'ABSPATH' ) || exit;

// Everything below needs WooCommerce (mu-plugins load before plugins, so check the active list, not the class).
if ( ! in_array( 'woocommerce/woocommerce.php', (array) get_option( 'active_plugins', array() ), true ) ) {
	return;
}

/*
 * Same gross price worldwide: prices are entered IVA included and buyers outside the EU pay that same
 * price (IVA 0 %), instead of WooCommerce deducting the Spanish IVA for them.
 */
add_filter( 'woocommerce_adjust_non_base_location_prices', '__return_false' );

/*
 * Right of withdrawal for digital content (art. 103.m TRLGDCU): the buyer must expressly request immediate
 * delivery and acknowledge losing the 14-day withdrawal right. Required checkbox, stored on the order as proof.
 */
add_action( 'woocommerce_init', function () {
	if ( ! function_exists( 'woocommerce_register_additional_checkout_field' ) ) {
		return;
	}
	woocommerce_register_additional_checkout_field( array(
		'id'       => 'ezmajo/desistimiento',
		'label'    => 'Quiero recibir los patrones ahora y acepto que, al tratarse de contenido digital, pierdo el derecho de desistimiento una vez iniciada la descarga.',
		'location' => 'order',
		'type'     => 'checkbox',
		// Only for digital content: patterns are the shop's simple products, garments are variable (variations).
		'required' => array( 'cart' => array( 'properties' => array( 'items_type' => array( 'contains' => array( 'enum' => array( 'simple' ) ) ) ) ) ),
		'hidden'   => array( 'cart' => array( 'properties' => array( 'items_type' => array( 'not' => array( 'contains' => array( 'enum' => array( 'simple' ) ) ) ) ) ) ),
	) );
} );

/*
 * Patterns only: ask for email, name and country only. The country sets the IVA rate and is the buyer-location
 * evidence for EU digital sales; B2C invoices under 400 € (factura simplificada) need no address.
 * A cart with garments needs shipping: then WooCommerce's normal address form (and phone) is used.
 */
function ezmajo_cart_is_digital() {
	return ! function_exists( 'WC' ) || ! WC()->cart || ! WC()->cart->needs_shipping();
}

function ezmajo_hide_address_fields( $fields ) {
	if ( ! ezmajo_cart_is_digital() ) {
		return $fields;
	}
	foreach ( array( 'company', 'address_1', 'address_2', 'city', 'state', 'postcode', 'phone' ) as $key ) {
		$fields[ $key ]['required'] = false;
		$fields[ $key ]['hidden']   = true;
	}
	return $fields;
}
add_filter( 'woocommerce_get_country_locale_default', 'ezmajo_hide_address_fields' );
// Every country, not only those with their own address rules: the block checkout falls back to its
// built-in defaults (address required) for countries missing from this list.
add_filter( 'woocommerce_get_country_locale', function ( $locales ) {
	foreach ( array_keys( WC()->countries->get_countries() ) as $code ) {
		$locales[ $code ] = ezmajo_hide_address_fields( $locales[ $code ] ?? array() );
	}
	return $locales;
} );
add_filter( 'woocommerce_default_address_fields', 'ezmajo_hide_address_fields' );
add_filter( 'pre_option_woocommerce_checkout_phone_field', function () {
	return ezmajo_cart_is_digital() ? 'hidden' : 'required'; // the carrier needs it
} );
add_filter( 'pre_option_woocommerce_checkout_company_field', function () {
	return 'hidden';
} );
add_filter( 'pre_option_woocommerce_checkout_address_2_field', function () {
	return 'hidden';
} );

/*
 * Pattern catalogue: URLs and listing, product fields, product page, styles.
 */
foreach ( array( 'catalog', 'fields', 'product-page' ) as $ezmajo_part ) {
	require __DIR__ . "/ezmajo-tienda/$ezmajo_part.php";
}

// Typo in the Extendable theme's es_ES translation ("Destalles del pedido" on the order confirmation).
add_filter( 'gettext_with_context_extendable', function ( $translation ) {
	return 'Destalles del pedido' === $translation ? 'Detalles del pedido' : $translation;
} );

/*
 * Order screen: show the download permissions box by default (where a customer who used up the downloads gets
 * more) and hide "Campos personalizados" (internal data only). Users can still change both in Screen Options.
 */
add_filter( 'default_hidden_meta_boxes', function ( $hidden, $screen ) {
	if ( function_exists( 'wc_get_page_screen_id' ) && wc_get_page_screen_id( 'shop-order' ) === $screen->id ) {
		$hidden   = array_values( array_diff( $hidden, array( 'woocommerce-order-downloads' ) ) );
		$hidden[] = 'postcustom';
	}
	return $hidden;
}, 20, 2 );

/*
 * "Pedido completado" email: its subject/heading (set in 01-woocommerce-setup.php) talk about downloads. An order
 * with garments is completed when it is shipped or ready to collect, so say that instead.
 */
function ezmajo_completed_order_kind( $order ) {
	if ( ! $order || ! $order->get_shipping_methods() ) {
		return 'patrones';
	}
	foreach ( $order->get_shipping_methods() as $method ) {
		if ( in_array( $method->get_method_id(), array( 'pickup_location', 'local_pickup' ), true ) ) {
			return 'recogida';
		}
	}
	return 'envio';
}
add_filter( 'woocommerce_email_subject_customer_completed_order', function ( $subject, $order ) {
	switch ( ezmajo_completed_order_kind( $order ) ) {
		case 'recogida':
			return 'Tu pedido de Ezmajo ya está listo para recoger';
		case 'envio':
			return 'Tu pedido de Ezmajo está en camino';
	}
	return $subject;
}, 10, 2 );
add_filter( 'woocommerce_email_heading_customer_completed_order', function ( $heading, $order ) {
	switch ( ezmajo_completed_order_kind( $order ) ) {
		case 'recogida':
			return '¡Tu pedido te espera en la tienda!';
		case 'envio':
			return '¡Tu pedido va en camino!';
	}
	return $heading;
}, 10, 2 );
