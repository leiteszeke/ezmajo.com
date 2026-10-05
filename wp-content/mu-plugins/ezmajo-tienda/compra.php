<?php
/**
 * Buying experience: clearer wording in the cart and checkout blocks, an order confirmation centred on the downloads
 * (or the pickup for garments), and branded pages for broken download links. Styles in tienda.css.
 */

defined( 'ABSPATH' ) || exit;

/*
 * Cart and checkout: these blocks are rendered in the browser, so their texts are changed through the JS i18n
 * filters (keys are WooCommerce's original English strings).
 */
function ezmajo_checkout_texts() {
	return array(
		'Billing address'                            => 'Tus datos',
		'Cart totals'                                => 'Tu pedido',
		'Estimated total'                            => 'Total',
		'Including <TaxAmount/> in taxes'            => 'IVA incluido: <TaxAmount/>',
		'Add coupons'                                => '¿Tienes un código de descuento?',
		'Contact information'                        => 'Tu email',
		'You are currently checking out as a guest.' => 'No hace falta crear una cuenta: te enviamos todo a este email.',
		'Create an account with %s'                  => 'Crear una cuenta en %s para ver tus pedidos y descargas',
		'Payment options'                            => 'Pago',
		'Additional order information'               => 'Antes de terminar',
		'Place Order'                                => 'Pagar',
		'Proceed to Checkout'                        => 'Continuar con la compra',
	);
}

add_action( 'wp_enqueue_scripts', function () {
	if ( ! is_cart() && ! is_checkout() ) {
		return;
	}
	wp_add_inline_script(
		'wp-i18n',
		sprintf(
			'( function () { var t = %s; wp.hooks.addFilter( "i18n.gettext_woocommerce", "ezmajo/textos", function ( translation, text ) { return t[ text ] || translation; } ); } )();',
			wp_json_encode( ezmajo_checkout_texts() )
		)
	);
}, 20 );

/** What the cart holds: patterns (PDF), garments or both. */
function ezmajo_cart_kinds() {
	$kinds = array();
	foreach ( WC()->cart ? WC()->cart->get_cart() : array() as $item ) {
		$kinds[ ezmajo_is_pattern( $item['data'] ) ? 'patrones' : 'prendas' ] = true;
	}
	return $kinds;
}

/** Reassurance line above the cart and the checkout: how the order arrives. */
function ezmajo_delivery_note() {
	$kinds = ezmajo_cart_kinds();
	$lines = array();
	if ( isset( $kinds['patrones'] ) ) {
		$lines[] = '<strong>Descarga inmediata.</strong> Al confirmarse el pago puedes descargar los patrones en PDF y te los enviamos por email.';
	}
	if ( isset( $kinds['prendas'] ) ) {
		$lines[] = ezmajo_ships_garments()
			? '<strong>Prendas:</strong> envío a península o recogida gratis en la tienda.'
			: '<strong>Prendas:</strong> recogida gratis en nuestra tienda (' . esc_html( ezmajo_business()['street'] ) . ', Barcelona); te avisamos cuando estén listas.';
	}
	return $lines ? '<div class="ezmajo-entrega"><p>' . implode( '</p><p>', $lines ) . '</p></div>' : '';
}
foreach ( array( 'cart', 'checkout' ) as $ezmajo_block ) {
	add_filter( "render_block_woocommerce/$ezmajo_block", function ( $html ) {
		return ezmajo_delivery_note() . $html;
	}, 5 );
}

/*
 * Order confirmation ("Pedido recibido"): a personal heading with the next step and the download buttons, instead of
 * the generic status line, the downloads table, the addresses of a digital order and the legal checkbox answer.
 */
function ezmajo_confirmed_order() {
	$order = wc_get_order( absint( get_query_var( 'order-received' ) ) );
	$key   = wc_clean( wp_unslash( $_GET['key'] ?? '' ) ); // phpcs:ignore WordPress.Security.NonceVerification -- the order key is the access check
	if ( ! $order || ! hash_equals( $order->get_order_key(), $key ) ) {
		return null;
	}
	// Orders of customers with an account: only for that customer (as WooCommerce's own blocks).
	if ( $order->get_customer_id() && $order->get_customer_id() !== get_current_user_id() ) {
		return null;
	}
	return $order;
}

function ezmajo_download_buttons( $order ) {
	$html = '';
	foreach ( $order->get_downloadable_items() as $item ) {
		$html .= sprintf(
			'<a class="ezmajo-boton" href="%s">Descargar %s</a>',
			esc_url( $item['download_url'] ),
			esc_html( count( $order->get_downloadable_items() ) > 1 ? $item['download_name'] . ' · ' . $item['product_name'] : $item['product_name'] )
		);
	}
	return $html ? '<div class="ezmajo-descargas">' . $html . '</div>' : '';
}

/** Whether our heading replaced WooCommerce's status block on this page (then the downloads table is redundant). */
function ezmajo_thanks_shown( $set = false ) {
	static $shown = false;
	return $shown = $shown || $set;
}

add_filter( 'render_block_woocommerce/order-confirmation-status', function ( $html ) {
	$order = ezmajo_confirmed_order();
	// WooCommerce only renders its <h1> when the visitor may see the order details (session, account or verified
	// email); otherwise keep its short line and email check. Cancelled/refunded orders keep WooCommerce's wording.
	if ( ! $order || false === strpos( $html, '<h1' ) || $order->has_status( array( 'cancelled', 'refunded' ) ) ) {
		return $html;
	}
	ezmajo_thanks_shown( true );
	$name    = $order->get_billing_first_name();
	$email   = '<strong>' . esc_html( $order->get_billing_email() ) . '</strong>';
	$garment = (bool) $order->get_shipping_methods();
	$paid    = $order->is_paid();
	$lines   = array();

	if ( $order->has_status( 'failed' ) ) {
		$lines[] = 'El pago no se pudo completar y no se ha cobrado nada. <a href="' . esc_url( $order->get_checkout_payment_url() ) . '">Volver a intentarlo</a>';
	} elseif ( ! $paid ) {
		$lines[] = "Estamos esperando la confirmación del pago. En cuanto llegue te escribimos a $email.";
	} else {
		if ( $order->get_downloadable_items() ) {
			$lines[] = "Pago confirmado. Ya puedes descargar tus patrones; también te los enviamos a $email.";
		}
		if ( $garment ) {
			$lines[] = 'Preparamos tu pedido y te avisamos por email cuando esté listo para recoger en la tienda (' . esc_html( ezmajo_business()['street'] . ', ' . ezmajo_business()['city'] ) . ').';
		}
	}

	return sprintf(
		'<div class="ezmajo-gracias"><h1>%s</h1><p>%s</p>%s</div>',
		str_replace( '¡', '<span class="ezmajo-abre">¡</span>', esc_html( $name ? "¡Gracias, $name!" : '¡Gracias por tu compra!' ) ),
		implode( '</p><p>', $lines ),
		$paid ? ezmajo_download_buttons( $order ) : ''
	);
} );

// Already shown as buttons above.
add_filter( 'render_block_woocommerce/order-confirmation-downloads-wrapper', function ( $html ) {
	return ezmajo_thanks_shown() ? '' : $html;
} );

// The withdrawal checkbox answer is kept on the order as proof; the customer doesn't need it repeated here.
add_filter( 'render_block_woocommerce/order-confirmation-additional-fields-wrapper', '__return_empty_string' );

// Addresses: a digital order only has a name and a country.
add_filter( 'render_block_core/columns', function ( $html, $block ) {
	if ( false === strpos( $block['attrs']['className'] ?? '', 'wc-block-order-confirmation-address-wrapper' ) ) {
		return $html;
	}
	$order = ezmajo_confirmed_order();
	return $order && ! $order->get_shipping_methods() ? '' : $html;
}, 10, 2 );

/*
 * Download links that fail (expired, used up, mistyped): a page with the logo and a way to ask for a new link,
 * instead of WordPress's grey error box.
 */
add_filter( 'wp_die_handler', function ( $handler ) {
	return isset( $_GET['download_file'] ) ? 'ezmajo_download_error_page' : $handler; // phpcs:ignore WordPress.Security.NonceVerification
} );

function ezmajo_download_error_page( $message, $title = '', $args = array() ) {
	$text = wp_strip_all_tags( is_wp_error( $message ) ? $message->get_error_message() : (string) $message );
	if ( false !== stripos( $text, 'límite' ) || false !== stripos( $text, 'limit' ) ) {
		$reason = 'Ya usaste todas las descargas de este enlace.';
	} elseif ( false !== stripos( $text, 'caducado' ) || false !== stripos( $text, 'expired' ) ) {
		$reason = 'Este enlace de descarga ha caducado.';
	} else {
		$reason = 'Este enlace de descarga no es válido. Prueba con el botón del último email que te enviamos.';
	}
	$business = ezmajo_business();
	$whatsapp = 'https://wa.me/' . $business['whatsapp'] . '?text=' . rawurlencode( 'Hola, necesito un nuevo enlace para descargar mi patrón.' );
	$logo     = wp_get_attachment_image_url( (int) get_option( 'site_logo' ), 'medium' );

	status_header( (int) ( $args['response'] ?? 404 ) );
	nocache_headers();
	header( 'Content-Type: text/html; charset=utf-8' );
	?>
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Descarga · Ezmajo</title>
<link rel="stylesheet" href="<?php echo esc_url( plugins_url( 'tienda.css', __FILE__ ) . '?ver=' . filemtime( __DIR__ . '/tienda.css' ) ); ?>">
</head>
<body class="ezmajo-error">
<main class="ezmajo-error__caja">
	<a href="<?php echo esc_url( home_url( '/' ) ); ?>"><img src="<?php echo esc_url( $logo ); ?>" alt="Ezmajo" width="150"></a>
	<h1>No pudimos descargar el patrón</h1>
	<p><?php echo esc_html( $reason ); ?></p>
	<p>Escríbenos y te mandamos un enlace nuevo, sin coste.</p>
	<p class="ezmajo-error__acciones">
		<a class="ezmajo-boton" href="<?php echo esc_url( $whatsapp ); ?>">Escribir por WhatsApp</a>
		<a class="ezmajo-boton ezmajo-boton--claro" href="mailto:contacto@ezmajo.com?subject=<?php echo rawurlencode( 'Enlace de descarga' ); ?>">contacto@ezmajo.com</a>
	</p>
	<p><a href="<?php echo esc_url( wc_get_page_permalink( 'shop' ) ); ?>">Volver a la tienda</a></p>
</main>
</body>
</html>
	<?php
	exit;
}
