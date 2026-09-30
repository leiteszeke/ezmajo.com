<?php
/**
 * Convert attachments to WebP in place (same attachment ID, same dimensions),
 * regenerate sub-sizes and rewrite URLs in the database.
 *
 * Run on the server: wpe eval-file ops/2026-09-30-webp.php
 * Old files are left on disk; remove them once the site is verified.
 */

$ids     = array( 16, 17, 18, 19, 20, 21, 22, 49 ); // product photos + Kit Digital banner
$quality = 82;

$uploads = wp_get_upload_dir();

foreach ( $ids as $id ) {
	$file = get_attached_file( $id );
	if ( ! $file || 'image/webp' === get_post_mime_type( $id ) ) {
		WP_CLI::log( "#$id: skipped" );
		continue;
	}

	$old_url  = wp_get_attachment_url( $id );
	$old_size = filesize( $file );

	// "foo-scaled.png" -> "foo.webp"
	$name = preg_replace( '/-scaled$/', '', pathinfo( $file, PATHINFO_FILENAME ) );
	$new  = dirname( $file ) . "/$name.webp";

	$editor = wp_get_image_editor( $file );
	if ( is_wp_error( $editor ) ) {
		WP_CLI::error( "#$id: " . $editor->get_error_message() );
	}
	$editor->set_quality( $quality );
	$saved = $editor->save( $new, 'image/webp' );
	if ( is_wp_error( $saved ) ) {
		WP_CLI::error( "#$id: " . $saved->get_error_message() );
	}

	update_attached_file( $id, $new );
	wp_update_post( array( 'ID' => $id, 'post_mime_type' => 'image/webp' ) );
	wp_update_attachment_metadata( $id, wp_generate_attachment_metadata( $id, $new ) );

	$new_url = wp_get_attachment_url( $id );
	$from    = str_replace( $uploads['baseurl'] . '/', 'uploads/', $old_url );
	$to      = str_replace( $uploads['baseurl'] . '/', 'uploads/', $new_url );
	WP_CLI::runcommand( sprintf( "search-replace '%s' '%s' --skip-columns=guid --report-changed-only --format=count", $from, $to ), array( 'launch' => false ) );

	WP_CLI::log( sprintf( '#%d: %s (%dK) -> %s (%dK)', $id, basename( $file ), $old_size / 1024, basename( $new ), filesize( $new ) / 1024 ) );
}
