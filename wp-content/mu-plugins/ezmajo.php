<?php
/**
 * Plugin Name: Ezmajo
 * Description: Site-specific tweaks for ezmajo.com (security, comments). Must-use plugin: always active.
 */

defined( 'ABSPATH' ) || exit;

/*
 * Security: don't expose user accounts to anonymous visitors.
 */

// Hide /wp-json/wp/v2/users for non-logged-in requests.
add_filter( 'rest_endpoints', function ( $endpoints ) {
	if ( is_user_logged_in() ) {
		return $endpoints;
	}
	unset( $endpoints['/wp/v2/users'], $endpoints['/wp/v2/users/(?P<id>[\d]+)'] );
	return $endpoints;
} );

// Block ?author=N enumeration and author archives (single-author business site).
// Priority 1: must run before redirect_canonical, which would reveal the username.
add_action( 'template_redirect', function () {
	if ( is_author() || isset( $_GET['author'] ) ) {
		wp_safe_redirect( home_url( '/' ), 301 );
		exit;
	}
}, 1 );

// No XML-RPC: nothing on this site uses it.
add_filter( 'xmlrpc_enabled', '__return_false' );

// Don't advertise the WordPress version.
remove_action( 'wp_head', 'wp_generator' );

/*
 * Comments: the site has no blog, keep them off everywhere.
 */
add_filter( 'comments_open', '__return_false', 20 );
add_filter( 'pings_open', '__return_false', 20 );
add_filter( 'comments_array', '__return_empty_array', 10 );
