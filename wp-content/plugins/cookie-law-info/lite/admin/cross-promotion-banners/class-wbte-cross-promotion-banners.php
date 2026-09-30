<?php
/**
 * Loads the AccessYes cross-promotion banner for CookieYes (lite) admin.
 *
 * Shares the same option keys, CYA11Y_ACCESSYES_BANNER_DISPLAYED, and
 * Wbte_Accessibility_Banner class name as WebToffee cross-promo packages.
 * Whichever plugin loads first registers the banner; the other exits here or
 * skips its own require—no duplicate notices without patching Smart Coupons.
 *
 * @package CookieYes
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! is_admin() ) {
	return;
}

// Keep version gate aligned with WebToffee cross-promotion packages (shared option).
if ( ! defined( 'WBTE_SC_CROSS_PROMO_BANNER_VERSION' ) ) {
	define( 'WBTE_SC_CROSS_PROMO_BANNER_VERSION', '1.0.2' );
}

$wbte_cross_promo_version_ok = version_compare(
	WBTE_SC_CROSS_PROMO_BANNER_VERSION,
	get_option( 'wbfte_promotion_banner_version', WBTE_SC_CROSS_PROMO_BANNER_VERSION ),
	'=='
);

if ( ! $wbte_cross_promo_version_ok ) {
	return;
}

if ( get_option( 'cya11y_hide_accessyes_cta_banner' ) ) {
	return;
}

// Already bootstrapped by another plugin in this request (e.g. WT Smart Coupon).
if ( defined( 'CYA11Y_ACCESSYES_BANNER_DISPLAYED' ) || class_exists( 'Wbte_Accessibility_Banner' ) ) {
	return;
}

define( 'CYA11Y_ACCESSYES_BANNER_DISPLAYED', true );

require_once __DIR__ . '/class-wbte-accessibility-banner.php';
