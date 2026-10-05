<?php
/**
 * Política de privacidad: country detection for the shop (Argentina mode, mu-plugins/ezmajo-tienda/argentina.php)
 * and the attribution DB-IP Lite requires (CC BY 4.0). wpe --url=https://ezmajo.com --user=2 eval-file ...
 */
$id      = (int) get_option( 'wp_page_for_privacy_policy' );
$content = get_post_field( 'post_content', $id );
if ( false !== strpos( $content, 'db-ip.com' ) ) {
	WP_CLI::success( 'Already applied' );
	return;
}
$section = '

<!-- wp:paragraph -->
<p><strong>6. Ubicación aproximada en la tienda</strong><br>Para mostrar los precios, la moneda y las formas de pago que corresponden a tu país, nuestro servidor deduce el país desde el que visitas la tienda a partir de tu dirección IP, con una base de datos que consultamos en nuestro propio servidor: tu dirección IP no se envía a terceros ni se guarda con este fin. Solo se obtiene el país, no tu ubicación exacta. Si cambias de país con el enlace de la tienda («¿Estás en Argentina?»), guardamos tu elección durante 30 días en la cookie técnica <code>ezmajo_pais</code>. Las compras pagadas en pesos argentinos se procesan con Mercado Pago, que trata los datos del pago según su propia política de privacidad.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p><a href="https://db-ip.com" target="_blank" rel="noopener">IP Geolocation by DB-IP</a></p>
<!-- /wp:paragraph -->';
wp_update_post( array( 'ID' => $id, 'post_content' => wp_slash( rtrim( $content ) . $section ) ) );
WP_CLI::success( "Política de privacidad ($id): section 6 + DB-IP attribution added" );
