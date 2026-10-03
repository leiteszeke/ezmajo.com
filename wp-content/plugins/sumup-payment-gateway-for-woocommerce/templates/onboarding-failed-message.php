<?php
/**
 * SumUp onboarding failure message template.
 *
 * @package SumUp_WooCommerce
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

?>
<div class="notice notice-error inline">
	<p>
		<strong><?php esc_html_e( 'SumUp account not connected', 'sumup-payment-gateway-for-woocommerce' ); ?></strong>
	</p>
	<p>
		<?php esc_html_e( 'Credentials are not valid. Please try again.', 'sumup-payment-gateway-for-woocommerce' ); ?>
	</p>
</div>
