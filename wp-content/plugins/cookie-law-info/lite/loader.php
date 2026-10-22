<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Initialize the plugin.
 */

if ( ! function_exists( 'cky_define_constants' ) ) {
	/**
	 * Return parsed URL
	 *
	 * @return void
	 */
	function cky_define_constants() {
		if ( ! defined( 'CKY_PLUGIN_URL' ) ) {
			$plugin_url  = plugin_dir_url( __FILE__ );
			// plugin_dir_url() uses is_ssl() for the scheme, which returns false on hosts that
			// terminate SSL at a reverse proxy without forwarding $_SERVER['HTTPS'] to PHP.
			// Use HTTPS if either signal says so: covers reverse-proxy setups (is_ssl false but
			// siteurl is https) and misconfigured siteurls (siteurl is http but is_ssl is true).
			$site_scheme     = wp_parse_url( get_option( 'siteurl' ), PHP_URL_SCHEME );
			$forwarded_https = isset( $_SERVER['HTTP_X_FORWARDED_PROTO'] ) && 'https' === $_SERVER['HTTP_X_FORWARDED_PROTO'];
			$scheme          = ( is_ssl() || 'https' === $site_scheme || $forwarded_https ) ? 'https' : 'http';
			$plugin_url  = set_url_scheme( $plugin_url, $scheme );
			define( 'CKY_PLUGIN_URL', $plugin_url );
		}
		if ( ! defined( 'CKY_APP_ASSETS_URL' ) ) {
			define( 'CKY_APP_ASSETS_URL', CKY_PLUGIN_URL . 'frontend/images/' );
		}
	}
}

cky_define_constants();

require_once CLI_PLUGIN_BASEPATH . 'class-autoloader.php';

$autoloader = new \CookieYes\Lite\Autoloader();
$autoloader->register();

register_activation_hook( __FILE__, array( \CookieYes\Lite\Includes\Activator::get_instance(), 'install' ) );

$cky_loader = new \CookieYes\Lite\Includes\CLI();
$cky_loader->run();


