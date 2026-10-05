<?php
/**
 * Política de cookies: list the site's own cookies (the intro announced a list that was missing), describe the real
 * CookieYes banner instead of "seguir navegando = aceptar" (not valid consent), and add the payment providers.
 * wpe --url=https://ezmajo.com --user=2 eval-file ...
 */
$id      = 11;
$content = get_post_field( 'post_content', $id );
if ( false !== strpos( $content, 'ezmajo_pais' ) ) {
	WP_CLI::success( 'Already applied' );
	return;
}

function ezmajo_cookie_replace_once( $search, $replace, $content, $what ) {
	$pos = strpos( $content, $search );
	if ( false === $pos ) {
		WP_CLI::error( "Not found: $what" );
	}
	return substr_replace( $content, $replace, $pos, strlen( $search ) );
}

function ezmajo_cookie_list( $items ) {
	$html = '<!-- wp:list -->' . "\n" . '<ul class="wp-block-list">';
	foreach ( $items as $item ) {
		$html .= '<!-- wp:list-item -->' . "\n<li>$item</li>\n" . '<!-- /wp:list-item -->' . "\n\n";
	}
	return rtrim( $html ) . '</ul>' . "\n" . '<!-- /wp:list -->';
}

function ezmajo_cookie_paragraph( $html ) {
	return "<!-- wp:paragraph -->\n<p>$html</p>\n<!-- /wp:paragraph -->";
}

// 1. The list of own cookies, right after the intro that announces it.
$intro_end = 'En concreto, se utilizan las siguientes&nbsp;<em>Cookies</em>:<strong></strong></p>' . "\n" . '<!-- /wp:paragraph -->';
$own       = "\n\n" . ezmajo_cookie_paragraph( '<strong><em>Cookies</em> propias técnicas</strong> (necesarias para que la web funcione; no requieren consentimiento):' ) . "\n\n" . ezmajo_cookie_list( array(
	'<strong>cookieyes-consent</strong>: guarda la elección que usted hace en el aviso de <em>cookies</em>. Duración: 1 año.',
	'<strong>woocommerce_cart_hash</strong>, <strong>woocommerce_items_in_cart</strong> y <strong>wp_woocommerce_session_*</strong>: mantienen el carrito de la tienda mientras compra. Duración: la sesión o hasta 2 días.',
	'<strong>ezmajo_pais</strong>: recuerda el país elegido en la tienda («¿Estás en Argentina?») para mostrar los precios, la moneda y las formas de pago que corresponden. Solo se instala si usted cambia de país. Duración: 30 días.',
	'<strong>wordpress_logged_in_*</strong>, <strong>wordpress_sec_*</strong> y <strong>wordpress_test_cookie</strong>: solo para el personal de Ezmajo que accede al panel de administración.',
) );
$content = ezmajo_cookie_replace_once( $intro_end, $intro_end . $own, $content, 'intro paragraph' );

// 2. Consent: the banner's real options (continuing to browse is not consent).
$old_list_start = strpos( $content, '<li><strong>Aceptar</strong>' );
$old_list_end   = strpos( $content, '<!-- /wp:list -->', (int) $old_list_start );
$list_open      = strrpos( substr( $content, 0, (int) $old_list_start ), '<!-- wp:list -->' );
if ( false === $old_list_start || false === $old_list_end || false === $list_open ) {
	WP_CLI::error( 'Not found: consent options list' );
}
$consent = ezmajo_cookie_list( array(
	'<strong>Aceptar todo</strong>: acepta todas las <em>cookies</em>, también las de terceros.',
	'<strong>Rechazar todo</strong>: solo se usan las <em>cookies</em> técnicas necesarias.',
	'<strong>Personalizar</strong>: elija qué categorías de <em>cookies</em> acepta.',
) ) . "\n\n" . ezmajo_cookie_paragraph( 'Mientras no elija una opción, solo se usan las <em>cookies</em> técnicas. Puede cambiar o retirar su consentimiento en cualquier momento con el botón «Preferencias de consentimiento» que aparece en la esquina de la pantalla.' );
$content = substr_replace( $content, $consent, $list_open, $old_list_end + strlen( '<!-- /wp:list -->' ) - $list_open );

// 3. Payment providers, after the Google Maps explanation.
$maps_end = 'acepta las <em>cookies</em> funcionales en el aviso de <em>cookies</em>.</p>' . "\n" . '<!-- /wp:paragraph -->';
$payments = "\n\n" . ezmajo_cookie_paragraph( 'Al pagar un pedido de la tienda, el pago lo procesa <strong>SumUp</strong> (<a href="https://www.sumup.com/es-es/privacidad/" target="_blank" rel="noreferrer noopener">política de privacidad</a>) o, en las compras en pesos argentinos, <strong>Mercado Pago</strong> (<a href="https://www.mercadopago.com.ar/privacidad" target="_blank" rel="noreferrer noopener">política de privacidad</a>). Estos servicios pueden instalar sus propias <em>cookies</em>, necesarias para completar el pago de forma segura y prevenir el fraude, solo en el formulario o la página de pago.' );
$content  = ezmajo_cookie_replace_once( $maps_end, $maps_end . $payments, $content, 'Google Maps paragraph' );

wp_update_post( array( 'ID' => $id, 'post_content' => wp_slash( $content ) ) );
WP_CLI::success( 'Política de cookies: own cookies listed, consent options, payment providers' );
