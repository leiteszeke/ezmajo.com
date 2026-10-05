<?php
/**
 * Plugin Name: Ezmajo Fuentes
 * Description: Serves a fixed copy of the theme's Inter font (its "¡" lost the stem from semibold up). Must-use plugin.
 *
 * The fixed file is built by ops/fonts/fix-inter-exclamdown.py from the theme's own file; re-run it if the theme
 * updates Inter.
 */

defined( 'ABSPATH' ) || exit;

add_filter( 'wp_theme_json_data_theme', function ( $theme_json ) {
	$data     = $theme_json->get_data();
	$families = $data['settings']['typography']['fontFamilies']['theme'] ?? array(); // get_data() groups presets by origin
	$fixed    = content_url( 'mu-plugins/ezmajo-fuentes/inter-variable.woff2' );
	$changed  = false;
	foreach ( $families as $i => $family ) {
		foreach ( $family['fontFace'] ?? array() as $j => $face ) {
			foreach ( (array) $face['src'] as $k => $src ) {
				if ( false !== strpos( $src, 'fonts/inter/inter-variable.woff2' ) ) {
					$families[ $i ]['fontFace'][ $j ]['src'][ $k ] = $fixed;
					$changed = true;
				}
			}
		}
	}
	if ( ! $changed ) {
		return $theme_json;
	}
	return $theme_json->update_with(
		array(
			'version'  => $data['version'],
			'settings' => array( 'typography' => array( 'fontFamilies' => $families ) ),
		)
	);
} );
