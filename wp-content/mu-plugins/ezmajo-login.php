<?php
/**
 * Plugin Name: Ezmajo Login
 * Description: Branded login screen (logo, colours and font of the site, no WordPress marks). The login URL itself
 *              is changed by WPS Hide Login (ezmajo.com/taller). Must-use plugin: always active.
 */

defined( 'ABSPATH' ) || exit;

add_filter( 'login_headerurl', function () {
	return home_url( '/' );
} );
add_filter( 'login_headertext', function () {
	return 'Ezmajo';
} );
add_filter( 'login_title', function () {
	return 'Acceso al taller · Ezmajo';
} );
add_filter( 'login_display_language_dropdown', '__return_false' );

add_action( 'login_enqueue_scripts', function () {
	$logo = wp_get_attachment_image_url( (int) get_option( 'site_logo' ), 'medium' );
	$font = get_theme_root_uri() . '/extendable/assets/fonts/inter/inter-variable.woff2';
	?>
	<style>
		@font-face { font-family: "Inter"; src: url(<?php echo esc_url( $font ); ?>) format("woff2"); font-weight: 100 900; font-display: swap; }
		:root { --ez-ink: #0b0620; --ez-muted: #6f6678; --ez-rose: #fff1f2; --ez-rose-line: #f7b6ba; }
		body.login { background: var(--ez-rose); color: var(--ez-ink); font-family: "Inter", system-ui, sans-serif; }
		body.login div#login h1 a {
			background: url(<?php echo esc_url( $logo ); ?>) center / contain no-repeat;
			width: 180px; height: 110px; margin-bottom: 8px;
		}
		body.login div#login h1::after { content: "Acceso al taller"; display: block; margin-top: 4px; font-size: 15px; font-weight: 500; color: var(--ez-muted); }
		.login form {
			border: 1px solid var(--ez-rose-line); border-radius: 18px; padding: 28px 28px 32px;
			box-shadow: 0 10px 30px rgba(11, 6, 32, .06);
		}
		.login label { font-size: 14px; color: var(--ez-ink); }
		.login form .input, .login input[type=text], .login input[type=password] {
			border: 1px solid #d9cfd6; border-radius: 10px; padding: 6px 12px; font-size: 18px; box-shadow: none;
		}
		.login form .input:focus, .login input[type=password]:focus {
			border-color: var(--ez-ink); box-shadow: 0 0 0 1px var(--ez-ink); outline: none;
		}
		.login .button.wp-hide-pw { color: var(--ez-muted); }
		.login .button.wp-hide-pw:focus { border-color: transparent; box-shadow: none; }
		body.login.wp-core-ui .button-primary {
			background: var(--ez-ink); border-color: var(--ez-ink); border-radius: 2rem;
			padding: 4px 22px; font-weight: 600; text-shadow: none; box-shadow: none;
		}
		body.login.wp-core-ui .button-primary:hover, body.login.wp-core-ui .button-primary:focus { background: #2a2140; border-color: #2a2140; box-shadow: none; }
		.login input[type=checkbox]:checked::before { filter: grayscale(1) brightness(.2); }
		.login #nav, .login #backtoblog { text-align: center; padding: 0; }
		.login #nav a, .login #backtoblog a, .login .privacy-policy-page-link a { color: var(--ez-muted); }
		.login #nav a:hover, .login #backtoblog a:hover { color: var(--ez-ink); }
		.login .message, .login .notice, .login .success, .login #login_error {
			border-left-color: var(--ez-ink); border-radius: 10px; box-shadow: none;
		}
	</style>
	<?php
} );
