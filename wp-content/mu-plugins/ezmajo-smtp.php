<?php
/**
 * Plugin Name: Ezmajo SMTP
 * Description: Sends all WordPress/WooCommerce email through Brevo SMTP as contacto@ezmajo.com. Must-use plugin: always active.
 *
 * Credentials live only in the server's wp-config.php (never in git):
 *   define( 'EZMAJO_SMTP_USER', '…@smtp-brevo.com' );
 *   define( 'EZMAJO_SMTP_PASS', '…' );  // Brevo SMTP key
 * Without them WordPress keeps its default mail (local staging uses Mailpit instead).
 */

defined( 'ABSPATH' ) || exit;

if ( ! defined( 'EZMAJO_SMTP_USER' ) || ! defined( 'EZMAJO_SMTP_PASS' ) || '' === EZMAJO_SMTP_USER || '' === EZMAJO_SMTP_PASS ) {
	return;
}

add_action( 'phpmailer_init', function ( $mailer ) {
	$mailer->isSMTP();
	$mailer->Host       = 'smtp-relay.brevo.com';
	$mailer->Port       = 587;
	$mailer->SMTPSecure = 'tls';
	$mailer->SMTPAuth   = true;
	$mailer->Username   = EZMAJO_SMTP_USER;
	$mailer->Password   = EZMAJO_SMTP_PASS;
	// Bounces go to the sending domain (SPF/DKIM aligned), not to the server's hostname.
	$mailer->Sender     = 'contacto@ezmajo.com';
} );

// WordPress' own default sender is wordpress@<host>; use the authenticated address instead.
add_filter( 'wp_mail_from', function ( $from ) {
	return 0 === strpos( $from, 'wordpress@' ) ? 'contacto@ezmajo.com' : $from;
} );
add_filter( 'wp_mail_from_name', function ( $name ) {
	return 'WordPress' === $name ? 'Ezmajo' : $name;
} );
