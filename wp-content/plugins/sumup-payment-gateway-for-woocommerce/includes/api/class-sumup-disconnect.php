<?php

if (!defined('ABSPATH')) {
	exit;
}
/**
 * @since 2.7.0
 * @autor Sumup
 */

add_action('rest_api_init', function () {
	register_rest_route(
		'sumup_disconnection/v1',
		'disconnect',
		array(
			'methods' => array('POST'),
			'callback' => 'sumup_disconnect',
			'permission_callback' => function () {
				return current_user_can('manage_woocommerce') || current_user_can('manage_options');
			},
		)
	);
});


/**
 * Disconnect endpoint
 */
function sumup_disconnect(): WP_REST_Response
{

	$settings = get_option('woocommerce_sumup_settings', array());
	if (!is_array($settings)) {
		$settings = array();
	}

	/**
	 * Verify if already excluded the credentials
	 */
	if (empty($settings['api_key']) && empty($settings['client_id']) && empty($settings['client_secret'])) {
		return new WP_REST_Response(
			array(
				'status' => 'error',
				'message' => __('Account already disconnected', 'sumup-payment-gateway-for-woocommerce'),
			),
			400
		);
	}

	/**
	 * Delete the credentials
	 */
	if (isset($settings['api_key'])) {
		$settings['api_key'] = null;
	}
	if (isset($settings['client_id']) && isset($settings['client_secret'])) {
		$settings['client_id'] = null;
		$settings['client_secret'] = null;
	}
	if (isset($settings['merchant_id'])) {
		$settings['merchant_id'] = null;
	}
	if (isset($settings['pay_to_email'])) {
		$settings['pay_to_email'] = null;
	}
	$settings['enabled'] = 'no';

	update_option('woocommerce_sumup_settings', $settings);
	update_option('sumup_connection_status', 'not_connected', false);
	delete_option('sumup_valid_credentials');

	/*
	 * Redirect to sumup payment admin page
	 */
	return new WP_REST_Response(
		array(
			'status' => 'disconnected',
			'redirect_url' => admin_url('admin.php?page=wc-settings&tab=checkout&section=sumup'),
		),
		200
	);
}
