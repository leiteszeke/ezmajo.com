<?php
/**
 * Order emails: Ezmajo's logo and colours, plainer wording (what happens next) and the download links as buttons.
 * Look settings are forced here instead of WooCommerce → Ajustes → Correos electrónicos, so they live in git.
 */

defined( 'ABSPATH' ) || exit;

foreach ( array(
	'woocommerce_email_header_image'        => plugins_url( 'logo-email.png', __FILE__ ), // PNG: Outlook shows no WebP
	'woocommerce_email_header_image_width'  => 160,
	'woocommerce_email_header_alignment'    => 'center',
	'woocommerce_email_base_color'          => '#100820', // buttons, links, headings: the site's dark
	'woocommerce_email_background_color'    => '#fff1f2', // soft pink around the card
	'woocommerce_email_body_background_color' => '#ffffff',
	'woocommerce_email_text_color'          => '#100820',
	'woocommerce_email_footer_text_color'   => '#6f6678',
	'woocommerce_email_auto_sync_with_theme' => 'no', // the theme's accent is purple
) as $ezmajo_option => $ezmajo_value ) {
	add_filter( "pre_option_$ezmajo_option", function () use ( $ezmajo_value ) {
		return $ezmajo_value;
	} );
}

add_filter( 'woocommerce_email_styles', function ( $css ) {
	return $css . '
		.button, a.button { display: inline-block; white-space: nowrap; padding: 10px 22px !important; border-radius: 999px; background: #100820; color: #ffffff !important; font-weight: bold; text-decoration: none; }
		.ezmajo-mail-aviso { margin: 0 0 24px; padding: 14px 18px; border-radius: 12px; background: #fff1f2; }
	';
} );

/** The order of the email being rendered (null outside emails), for wording that depends on it. */
function ezmajo_email_order( $set = false, $order = null ) {
	static $current = null;
	if ( $set ) {
		$current = $order;
	}
	return $current;
}
add_action( 'woocommerce_email_header', function ( $heading, $email ) {
	ezmajo_email_order( true, $email && $email->object instanceof WC_Order ? $email->object : null );
}, 1, 2 );
add_action( 'woocommerce_email_footer', function () {
	ezmajo_email_order( true, null );
}, 99 );

add_filter( 'gettext_woocommerce', function ( $translation, $text ) {
	$order = ezmajo_email_order();
	if ( ! $order ) {
		return $translation; // only inside order emails
	}
	switch ( $text ) {
		case 'We’ve received your order and it’s currently on hold until we can confirm your payment has been processed.':
			return 'Hemos recibido tu pedido. Estamos esperando la confirmación del pago; en cuanto llegue te escribimos de nuevo.';
		case 'Just to let you know &mdash; we’ve received your order, and it is now being processed.':
			return 'Hemos recibido tu pedido y lo estamos preparando.';
		case 'We have finished processing your order.':
			if ( $order->get_shipping_methods() && ! $order->get_downloadable_items() ) {
				return 'Tu pedido ya está listo. Puedes pasar a recogerlo por la tienda (' . ezmajo_business()['street'] . ', ' . ezmajo_business()['city'] . ') en nuestro horario de apertura.';
			}
			return 'Tu pago está confirmado. Aquí tienes tus patrones: pulsa el botón para descargar cada PDF.';
		case 'Here’s a reminder of what you’ve ordered:':
			return 'Este es el resumen de tu pedido:';
		case 'Downloads':
			return 'Tus descargas';
	}
	return $translation;
}, 10, 2 );

// Download table: file button (the product name links to the shop page) and the expiry date, no extra columns.
add_filter( 'woocommerce_email_downloads_columns', function ( $columns ) {
	return array(
		'download-product' => 'Patrón',
		'download-expires' => 'Disponible hasta',
		'download-file'    => 'Descarga',
	);
} );

// The withdrawal checkbox answer: only in the store's own notifications (proof), not in the customer's emails.
add_action( 'woocommerce_email', function ( $emails ) {
	remove_action( 'woocommerce_email_customer_details', array( $emails, 'additional_checkout_fields' ), 30 );
	add_action( 'woocommerce_email_customer_details', function ( $order, $sent_to_admin, $plain_text ) use ( $emails ) {
		if ( $sent_to_admin ) {
			$emails->additional_checkout_fields( $order, $sent_to_admin, $plain_text );
		}
	}, 30, 3 );
} );

// Closing line of the customer emails (WooCommerce's default talks about "ayuda para hacer el pedido").
foreach ( array( 'customer_on_hold_order', 'customer_processing_order', 'customer_completed_order', 'customer_refunded_order', 'customer_invoice', 'customer_note' ) as $ezmajo_email_id ) {
	add_filter( "woocommerce_email_additional_content_$ezmajo_email_id", function () {
		return '¿Alguna duda? Responde a este email o escríbenos por WhatsApp al ' . ezmajo_business()['phone_display'] . '.';
	} );
}
