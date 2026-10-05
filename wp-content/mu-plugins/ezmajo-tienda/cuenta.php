<?php
/**
 * Mi cuenta (logged-in customers): a dashboard with the patterns to download and the last order, plainer menu and
 * page titles, and the order page without the legal checkbox answer or "order again". Styles in tienda.css.
 */

defined( 'ABSPATH' ) || exit;

/** Menu and page titles, in the shop's words. Addresses are filled in at checkout (patterns only need a country). */
function ezmajo_account_labels() {
	return array(
		'dashboard'       => 'Inicio',
		'orders'          => 'Mis pedidos',
		'downloads'       => 'Mis patrones',
		'edit-account'    => 'Mis datos',
		'customer-logout' => 'Cerrar sesión',
	);
}

add_filter( 'woocommerce_account_menu_items', function ( $items ) {
	$labels = ezmajo_account_labels();
	foreach ( $items as $endpoint => $label ) {
		if ( isset( $labels[ $endpoint ] ) ) {
			$items[ $endpoint ] = $labels[ $endpoint ];
		} elseif ( in_array( $endpoint, array( 'edit-address', 'payment-methods' ), true ) ) {
			unset( $items[ $endpoint ] );
		}
	}
	return $items;
}, 20 );

foreach ( array( 'orders', 'downloads', 'edit-account' ) as $ezmajo_endpoint ) {
	add_filter( "woocommerce_endpoint_{$ezmajo_endpoint}_title", function () use ( $ezmajo_endpoint ) {
		return ezmajo_account_labels()[ $ezmajo_endpoint ];
	} );
}

// Dashboard: our own template instead of WooCommerce's "From your account dashboard you can…" paragraph.
add_filter( 'wc_get_template', function ( $template, $template_name ) {
	return 'myaccount/dashboard.php' === $template_name ? __DIR__ . '/cuenta-inicio.php' : $template;
}, 10, 2 );

add_filter( 'woocommerce_account_downloads_columns', function () {
	return array(
		'download-product'   => 'Patrón',
		'download-remaining' => 'Descargas restantes',
		'download-expires'   => 'Disponible hasta',
		'download-file'      => 'Descarga',
	);
} );

/*
 * Order page: the withdrawal checkbox answer is proof for the shop (kept on the order and in the admin email), and
 * "Volver a pedirlo" makes no sense for a pattern already bought.
 */
add_action( 'wp', function () {
	global $wp_filter;
	if ( ! is_account_page() || empty( $wp_filter['woocommerce_order_details_after_customer_details'] ) ) {
		return;
	}
	foreach ( $wp_filter['woocommerce_order_details_after_customer_details']->callbacks as $priority => $callbacks ) {
		foreach ( $callbacks as $callback ) {
			if ( is_array( $callback['function'] ) && 'render_order_other_fields' === $callback['function'][1] ) {
				remove_action( 'woocommerce_order_details_after_customer_details', $callback['function'], $priority );
			}
		}
	}
	remove_action( 'woocommerce_order_details_after_order_table', 'woocommerce_order_again_button' );
} );
