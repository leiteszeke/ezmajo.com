<?php
/**
 * New logo (cloud, from Clientes/Ezmajo/Diseños/Logo/Logo.png, cropped):
 * - site logo (header/footer, Yoast schema logo): ezmajo-logo.webp
 * - site icon (favicon): ezmajo-icon.png (cloud centred on a transparent square)
 * - header/footer: logo no longer synced with the icon; site title text removed (the logo carries the name)
 *
 * Expects /tmp/ezmajo-logo.webp and /tmp/ezmajo-icon.png on the server.
 * Run as admin: wpe --url=https://ezmajo.com --user=1 eval-file ...
 * Previous values: site_logo = 48, site_icon = 48 (cropped-ezmajo_logo.jpg).
 */
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/image.php';

function ez_import( $path, $title ) {
	$existing = get_posts( array( 'post_type' => 'attachment', 'title' => $title, 'numberposts' => 1, 'fields' => 'ids' ) );
	if ( $existing ) {
		return $existing[0];
	}
	$tmp = wp_tempnam( basename( $path ) );
	copy( $path, $tmp );
	$id = media_handle_sideload( array( 'name' => basename( $path ), 'tmp_name' => $tmp ), 0, $title );
	if ( is_wp_error( $id ) ) {
		WP_CLI::error( $id->get_error_message() );
	}
	update_post_meta( $id, '_wp_attachment_image_alt', 'Ezmajo' );
	return $id;
}

$logo = ez_import( '/tmp/ezmajo-logo.webp', 'Ezmajo logo' );
$icon = ez_import( '/tmp/ezmajo-icon.png', 'Ezmajo icono' );
update_option( 'site_logo', $logo );
update_option( 'site_icon', $icon );
WP_CLI::log( "site_logo=$logo site_icon=$icon" );

$parts = array(
	59 => array( // header
		'<!-- wp:site-logo {"shouldSyncIcon":true} /-->

<!-- wp:group -->
<div class="wp-block-group"><!-- wp:site-title {"style":{"typography":{"textTransform":"uppercase"}},"fontSize":"medium"} /--></div>
<!-- /wp:group -->' => '<!-- wp:site-logo {"width":120} /-->',
	),
	50 => array( // footer
		'<!-- wp:site-logo /-->

<!-- wp:group -->
<div class="wp-block-group"><!-- wp:site-title {"fontSize":"medium"} /--></div>
<!-- /wp:group -->' => '<!-- wp:site-logo {"width":100} /-->',
	),
);
foreach ( $parts as $id => $map ) {
	$content = get_post_field( 'post_content', $id );
	foreach ( $map as $from => $to ) {
		if ( false !== strpos( $content, $to ) ) {
			continue;
		}
		if ( 1 !== substr_count( $content, $from ) ) {
			WP_CLI::error( "#$id: anchor not found exactly once" );
		}
		$content = str_replace( $from, $to, $content );
	}
	wp_update_post( array( 'ID' => $id, 'post_content' => wp_slash( $content ) ) );
	WP_CLI::log( "#$id updated" );
}
