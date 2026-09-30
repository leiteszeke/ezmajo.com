<?php
/**
 * Contacto: replace the always-on Google Maps iframe with [ezmajo_mapa] (loads only after consent).
 * Run as admin so KSES keeps the page's <style>: wpe --url=https://ezmajo.com --user=1 eval-file ...
 */
$id      = 44;
$content = get_post_field( 'post_content', $id );
if ( false !== strpos( $content, '[ezmajo_mapa]' ) ) {
	WP_CLI::success( 'Already applied' );
	return;
}
$new = preg_replace( '#<iframe\b[^>]*google\.com/maps[^>]*>\s*</iframe>#s', '[ezmajo_mapa]', $content, -1, $count );
if ( 1 !== $count ) {
	WP_CLI::error( "Expected 1 map iframe, found $count" );
}
wp_update_post( array( 'ID' => $id, 'post_content' => wp_slash( $new ) ) );
WP_CLI::success( 'Contacto: map iframe replaced by [ezmajo_mapa]' );
