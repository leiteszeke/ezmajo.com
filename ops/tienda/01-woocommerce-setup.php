<?php
/**
 * WooCommerce base setup for selling PDF sewing patterns (digital only, worldwide, prices in EUR).
 * Idempotent. Run: wp --user=<admin> eval-file ops/tienda/01-woocommerce-setup.php
 *
 * Tax model (confirm with the gestor): EU cross-border digital B2C sales below the 10.000 € OSS threshold,
 * so every EU buyer pays Spanish IVA (21 %); buyers outside the EU pay no IVA. Prices are entered IVA included
 * and the same gross price is shown worldwide (see woocommerce_adjust_non_base_location_prices in
 * mu-plugins/ezmajo-tienda.php). Above the threshold, switch to per-country rates (OSS).
 */

$options = array(
	// Store
	'woocommerce_store_address'                      => 'Carrer del Rosselló, 64',
	'woocommerce_store_city'                         => 'Barcelona',
	'woocommerce_store_postcode'                     => '08029',
	'woocommerce_default_country'                    => 'ES:B',
	'woocommerce_allowed_countries'                  => 'all',
	'woocommerce_ship_to_countries'                  => 'disabled', // digital only
	'woocommerce_default_customer_address'           => 'base',

	// Currency: 12,50 €
	'woocommerce_currency'                           => 'EUR',
	'woocommerce_currency_pos'                       => 'right_space',
	'woocommerce_price_thousand_sep'                 => '.',
	'woocommerce_price_decimal_sep'                  => ',',
	'woocommerce_price_num_decimals'                 => 2,

	// Taxes
	'woocommerce_calc_taxes'                         => 'yes',
	'woocommerce_prices_include_tax'                 => 'yes',
	'woocommerce_tax_based_on'                       => 'billing',
	'woocommerce_tax_display_shop'                   => 'incl',
	'woocommerce_tax_display_cart'                   => 'incl',
	'woocommerce_tax_total_display'                  => 'single',
	'woocommerce_price_display_suffix'               => 'IVA incl.',

	// Products: virtual + downloadable, no stock
	'woocommerce_manage_stock'                       => 'no',
	'woocommerce_enable_reviews'                     => 'no', // revisit: site-wide comments are disabled in mu-plugins/ezmajo.php

	// Accounts: guest checkout; optional account to re-download later
	'woocommerce_enable_guest_checkout'              => 'yes',
	'woocommerce_enable_checkout_login_reminder'     => 'yes',
	'woocommerce_enable_signup_and_login_from_checkout' => 'yes',
	'woocommerce_enable_myaccount_registration'      => 'no',
	'woocommerce_registration_generate_password'     => 'yes',

	// Downloads: served through PHP, never a public file URL
	'woocommerce_file_download_method'               => 'force',
	'woocommerce_downloads_redirect_fallback_allowed' => 'no',
	'woocommerce_downloads_require_login'            => 'no',
	'woocommerce_downloads_grant_access_after_payment' => 'yes',
	'woocommerce_downloads_add_hash_to_filename'     => 'yes',

	// Coupons (launch discounts)
	'woocommerce_enable_coupons'                     => 'yes',

	// Emails
	'woocommerce_email_from_name'                    => 'Ezmajo',
	'woocommerce_email_from_address'                 => 'contacto@ezmajo.com', // needs an authorised sender for ezmajo.com (see README)

	// No tracking / upsell noise
	'woocommerce_allow_tracking'                     => 'no',
	'woocommerce_show_marketplace_suggestions'       => 'no',
	'woocommerce_merchant_email_notifications'       => 'no',
);
foreach ( $options as $name => $value ) {
	update_option( $name, $value );
}
WP_CLI::log( count( $options ) . ' options set' );

/*
 * IVA 21 % for every EU country; no rate (0 %) elsewhere.
 */
$eu = WC()->countries->get_european_union_countries( 'eu_vat' );
global $wpdb;
$existing = $wpdb->get_col( "SELECT tax_rate_country FROM {$wpdb->prefix}woocommerce_tax_rates WHERE tax_rate_class = ''" );
$added    = 0;
foreach ( $eu as $country ) {
	if ( in_array( $country, $existing, true ) ) {
		continue;
	}
	WC_Tax::_insert_tax_rate( array(
		'tax_rate_country'  => $country,
		'tax_rate_state'    => '',
		'tax_rate'          => '21.0000',
		'tax_rate_name'     => 'IVA',
		'tax_rate_priority' => 1,
		'tax_rate_compound' => 0,
		'tax_rate_shipping' => 0,
		'tax_rate_order'    => 0,
		'tax_rate_class'    => '',
	) );
	$added++;
}
WP_CLI::log( sprintf( 'IVA 21%%: %d EU countries (%d added)', count( $eu ), $added ) );

/*
 * Store pages in Spanish; the catalogue lives at /patrones/.
 */
$pages = array(
	'woocommerce_shop_page_id'      => array( 'Patrones', 'patrones' ),
	'woocommerce_cart_page_id'      => array( 'Carrito', 'carrito' ),
	'woocommerce_checkout_page_id'  => array( 'Finalizar compra', 'finalizar-compra' ),
	'woocommerce_myaccount_page_id' => array( 'Mi cuenta', 'mi-cuenta' ),
);
foreach ( $pages as $option => list( $title, $slug ) ) {
	$id = (int) get_option( $option );
	if ( $id ) {
		wp_update_post( array( 'ID' => $id, 'post_title' => $title, 'post_name' => $slug ) );
	}
}

// WooCommerce's English sample refund policy: our own sales conditions replace it.
$sample = get_page_by_path( 'refund_returns' );
if ( $sample ) {
	wp_delete_post( $sample->ID, true );
}
WP_CLI::log( 'Pages renamed' );

flush_rewrite_rules();
WP_CLI::success( 'WooCommerce base setup done' );

/*
 * Page cache (production): never serve cached pages to shoppers with a cart/session.
 * WooCommerce already sets DONOTCACHEPAGE on cart, checkout and account pages.
 */
$ce = get_option( 'cache_enabler' );
if ( is_array( $ce ) ) {
	$ce['excluded_cookies'] = '/^(wp-postpass|wordpress_logged_in|comment_author|woocommerce_items_in_cart|wp_woocommerce_session)_?/';
	update_option( 'cache_enabler', $ce );
	WP_CLI::log( 'Cache Enabler: WooCommerce cookies excluded' );
}
