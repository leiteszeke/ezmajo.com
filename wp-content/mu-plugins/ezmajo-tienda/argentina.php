<?php
/**
 * Argentina: visitors from Argentina buy patterns only, in pesos (each pattern's own "Precio Argentina"), paid with
 * Mercado Pago; garments are shown without price or buy button. Everyone else: euros + SumUp, and Argentina is not a
 * billing country. Pesos sales are declared in Argentina (Mercado Pago account there), not in the Spanish books.
 *
 * Country: the "ezmajo_pais" cookie (set by ?pais=AR / ?pais=ES, e.g. the "¿No estás en Argentina?" link), else the
 * EZMAJO_COUNTRY fastcgi param that nginx sets from the visitor's IP (geoip2, see ops/nginx/). One currency per
 * visitor keeps cart and checkout consistent: the checkout country is fixed to the visitor's mode.
 */

defined( 'ABSPATH' ) || exit;

const EZMAJO_AR_COOKIE = 'ezmajo_pais';

function ezmajo_in_argentina() {
	static $ar = null;
	if ( null !== $ar ) {
		return $ar;
	}
	// Only shoppers: the admin, cron and WP-CLI work in the store currency (orders keep their own).
	if ( ( is_admin() && ! wp_doing_ajax() ) || wp_doing_cron() || ( defined( 'WP_CLI' ) && WP_CLI ) ) {
		return $ar = false;
	}
	$country = sanitize_key( $_COOKIE[ EZMAJO_AR_COOKIE ] ?? $_SERVER['EZMAJO_COUNTRY'] ?? '' );
	return $ar = ( 'ar' === $country );
}

/** Mercado Pago's payment methods (Checkout Pro and the rest of the official plugin's gateways). */
function ezmajo_is_mercadopago( $gateway_id ) {
	return 0 === strpos( $gateway_id, 'woo-mercado-pago' );
}

// ?pais=AR / ?pais=ES switches the mode for 30 days, then reloads the page without the parameter.
add_action( 'init', function () {
	$country = strtoupper( sanitize_key( $_GET['pais'] ?? '' ) ); // phpcs:ignore WordPress.Security.NonceVerification -- display preference only
	if ( 2 !== strlen( $country ) || is_admin() ) {
		return;
	}
	setcookie( EZMAJO_AR_COOKIE, $country, time() + 30 * DAY_IN_SECONDS, COOKIEPATH, COOKIE_DOMAIN, is_ssl(), true );
	wp_safe_redirect( remove_query_arg( 'pais' ) );
	exit;
}, 0 );

// Store pages vary by country: never page-cache them (cart/checkout are already excluded by cookie).
add_filter( 'cache_enabler_bypass_cache', function ( $bypass ) {
	return $bypass || ( function_exists( 'is_woocommerce' ) && ( is_woocommerce() || is_cart() || is_checkout() ) );
} );

/*
 * Pesos: currency, prices and display.
 */
add_filter( 'woocommerce_currency', function ( $currency ) {
	return ezmajo_in_argentina() ? 'ARS' : $currency;
} );
add_filter( 'wc_get_price_decimals', function ( $decimals ) {
	return ezmajo_in_argentina() ? 0 : $decimals;
} );
add_filter( 'pre_option_woocommerce_currency_pos', function ( $position ) {
	return ezmajo_in_argentina() ? 'left_space' : $position; // "$ 12.000"
} );
// "IVA incl.": no Spanish IVA outside the EU.
add_filter( 'woocommerce_get_price_suffix', function ( $suffix ) {
	return ezmajo_in_argentina() ? '' : $suffix;
} );

function ezmajo_ars_price( $price, $product ) {
	if ( ! ezmajo_in_argentina() ) {
		return $price;
	}
	return ezmajo_is_pattern( $product ) ? (string) $product->get_meta( '_ezmajo_precio_ars' ) : '';
}
add_filter( 'woocommerce_product_get_price', 'ezmajo_ars_price', 10, 2 );
add_filter( 'woocommerce_product_get_regular_price', 'ezmajo_ars_price', 10, 2 );
add_filter( 'woocommerce_product_get_sale_price', function ( $price ) {
	return ezmajo_in_argentina() ? '' : $price; // offers are set in euros
} );

// Garments: visible but not for sale (no price, no buy button). Patterns without a peso price can't be bought either.
add_filter( 'woocommerce_is_purchasable', function ( $purchasable, $product ) {
	return $purchasable && ( ! ezmajo_in_argentina() || ( ezmajo_is_pattern( $product ) && '' !== $product->get_price() ) );
}, 10, 2 );
add_filter( 'woocommerce_variation_is_purchasable', function ( $purchasable ) {
	return $purchasable && ! ezmajo_in_argentina();
} );
add_filter( 'woocommerce_get_price_html', function ( $html, $product ) {
	return ezmajo_in_argentina() && ! ezmajo_is_pattern( $product ) ? '' : $html;
}, 10, 2 );

add_filter( 'render_block_woocommerce/add-to-cart-form', function ( $html ) {
	if ( ! is_product() || ! ezmajo_in_argentina() ) {
		return $html;
	}
	$product = wc_get_product( get_the_ID() );
	if ( ezmajo_is_pattern( $product ) && $product->is_purchasable() ) {
		return $html;
	}
	$text = ezmajo_is_pattern( $product )
		? 'Este patrón todavía no está a la venta para Argentina.'
		: 'Las prendas solo se venden en nuestra tienda de Barcelona. Desde Argentina puedes comprar nuestros patrones en PDF.';
	return sprintf(
		'<p class="ezmajo-aviso-ar">%s <a href="%s">Ver patrones</a></p>',
		esc_html( $text ),
		esc_url( get_term_link( 'patrones', 'product_cat' ) )
	);
}, 20 ); // after product-page.php adds "te lo cosemos"

/*
 * Checkout: the billing country is the visitor's mode (Argentina only, or anywhere but Argentina), and each mode has
 * its own payment provider.
 */
function ezmajo_mode_countries( $countries ) {
	if ( ezmajo_in_argentina() ) {
		return array_intersect_key( WC()->countries->get_countries(), array( 'AR' => true ) );
	}
	unset( $countries['AR'] );
	return $countries;
}
add_filter( 'woocommerce_countries_allowed_countries', 'ezmajo_mode_countries' );
// The block checkout lists billing + shipping countries in the same selector (nothing ships from Argentina mode).
add_filter( 'woocommerce_countries_shipping_countries', 'ezmajo_mode_countries' );
add_filter( 'woocommerce_customer_default_location_array', function ( $location ) {
	return ezmajo_in_argentina() ? array( 'country' => 'AR', 'state' => '' ) : $location;
} );
// A session started in the other mode (country already chosen) follows the switch.
add_action( 'woocommerce_load_cart_from_session', function () {
	$customer = WC()->customer;
	if ( ! $customer || ezmajo_in_argentina() === ( 'AR' === $customer->get_billing_country() ) ) {
		return;
	}
	$country = ezmajo_in_argentina() ? 'AR' : WC()->countries->get_base_country();
	$customer->set_billing_country( $country );
	$customer->set_shipping_country( $country );
} );

add_filter( 'woocommerce_available_payment_gateways', function ( $gateways ) {
	if ( is_admin() && ! wp_doing_ajax() ) {
		return $gateways;
	}
	foreach ( array_keys( $gateways ) as $id ) {
		if ( ezmajo_in_argentina() !== ezmajo_is_mercadopago( $id ) ) {
			unset( $gateways[ $id ] );
		}
	}
	return $gateways;
} );

/*
 * Outside Argentina mode, none of Mercado Pago's scripts: the plugin loads them on every checkout, including
 * MercadoLibre's tracking (behavior-tracking, melidata), which sets the _wcmpid cookie for a year before any consent.
 * Removed at print time, since plugin scripts may depend on them.
 */
add_filter( 'script_loader_tag', function ( $tag, $handle ) {
	if ( is_admin() || ezmajo_in_argentina() || ! preg_match( '/mercadopago|melidata|^mp_/', $handle ) ) { // the plugin's settings need them
		return $tag;
	}
	return '';
}, 10, 2 );

// "¿No estás en Argentina?" / "¿Estás en Argentina?" once per shop page: after the catalogue, the buy form, cart or checkout.
function ezmajo_country_switch( $html ) {
	static $done = false;
	if ( $done || ! ( is_woocommerce() || is_cart() || is_checkout() ) ) {
		return $html;
	}
	$done = true;
	return $html . ( ezmajo_in_argentina()
		? '<p class="ezmajo-pais">Estás viendo los precios para Argentina, en pesos. <a href="' . esc_url( add_query_arg( 'pais', 'ES' ) ) . '" rel="nofollow">¿No estás en Argentina?</a></p>'
		: '<p class="ezmajo-pais"><a href="' . esc_url( add_query_arg( 'pais', 'AR' ) ) . '" rel="nofollow">¿Estás en Argentina? Compra los patrones en pesos</a></p>' );
}
foreach ( array( 'product-collection', 'add-to-cart-form', 'cart', 'checkout' ) as $ezmajo_block ) {
	add_filter( "render_block_woocommerce/$ezmajo_block", 'ezmajo_country_switch', 30 ); // after the Argentina notice and "te lo cosemos"
}
