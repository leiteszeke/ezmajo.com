<?php
/**
 * Política de Cookies: add Google Maps to the third-party services and explain the consent-gated map.
 * Run as admin: wpe --url=https://ezmajo.com --user=1 eval-file ...
 */
$id      = 11;
$content = get_post_field( 'post_content', $id );
if ( false !== strpos( $content, 'GOOGLE MAPS' ) ) {
	WP_CLI::success( 'Already applied' );
	return;
}

$anchor = '<!-- wp:paragraph -->
<p><strong>Ley aplicable y jurisdicción</strong></p>';
if ( 1 !== substr_count( $content, $anchor ) ) {
	WP_CLI::error( 'Anchor not found exactly once' );
}

$insert = '<!-- wp:paragraph -->
<p>– GOOGLE MAPS –&nbsp;<a href="https://policies.google.com/privacy?hl=es" target="_blank" rel="noreferrer noopener">https://policies.google.com/privacy?hl=es</a></p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>El mapa de la página de Contacto lo proporciona Google Maps (Google Ireland Limited). Cuando el mapa se muestra, Google puede instalar <em>cookies</em> y recoger datos como la dirección IP. Por eso el mapa no se carga hasta que usted pulsa «Ver mapa» o acepta las <em>cookies</em> funcionales en el aviso de <em>cookies</em>.</p>
<!-- /wp:paragraph -->

';

wp_update_post( array( 'ID' => $id, 'post_content' => wp_slash( str_replace( $anchor, $insert . $anchor, $content ) ) ) );
WP_CLI::success( 'Política de Cookies: Google Maps added' );
