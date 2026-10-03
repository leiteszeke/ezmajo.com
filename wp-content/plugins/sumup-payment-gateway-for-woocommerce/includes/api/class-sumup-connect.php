<?php

if (! defined('ABSPATH')) {
	exit;
}

add_action('rest_api_init', function () {
	register_rest_route(
		'sumup_connection/v1',
		'connect',
		array(
			'methods'  => array('POST'),
			'callback' => 'sumup_connect',
			'permission_callback' => '__return_true',
		)
	);
});


/**
 * Connect endpoint
 */
function sumup_connect($request)
{
	$post_data = json_decode($request->get_body(), true);
	$connection_id = isset($post_data['id']) ? sanitize_text_field($post_data['id']) : '';

	WC_SUMUP_LOGGER::log("Receive connect data");

	if (empty($connection_id)) {
		WC_SUMUP_LOGGER::log('Rejecting connect callback: missing connection ID');
		$reponse_body = array('status' => 'error', 'message' => 'Invalid connection ID');
		$response = new WP_REST_Response($reponse_body);
		$response->set_status(400);
		return $response;
	}

	if (!sumup_has_pending_connection_id($connection_id)) {
		WC_SUMUP_LOGGER::log('Rejecting connect callback: unknown connection ID ' . $connection_id);
		$reponse_body = array('status' => 'error', 'message' => 'Invalid connection ID');
		$response = new WP_REST_Response($reponse_body);
		$response->set_status(400);
		return $response;
	}

	if (! isset($post_data['merchant']['email'])) {
		$reponse_body = array('status' => 'error', 'message' => 'Invalid merchant email');
		$response = new WP_REST_Response($reponse_body);
		$response->set_status(400);
		return $response;
	}

	if (! isset($post_data['merchant']['api_key'])) {
		$reponse_body = array('status' => 'error', 'message' => 'Invalid API key');
		$response = new WP_REST_Response($reponse_body);
		$response->set_status(400);
		return $response;
	}

	if (! isset($post_data['merchant']['merchant_code'])) {
		$reponse_body = array('status' => 'error', 'message' => 'Invalid merchant code');
		$response = new WP_REST_Response($reponse_body);
		$response->set_status(400);
		return $response;
	}

	$settings = get_option('woocommerce_sumup_settings');
	$settings['pay_to_email'] = $post_data['merchant']['email'];
	$settings['api_key'] = $post_data['merchant']['api_key'];
	$settings['merchant_id'] = $post_data['merchant']['merchant_code'];
	$settings['enabled'] = 'no';
	update_option('woocommerce_sumup_settings', $settings);
	update_option('sumup_connection_status', 'pending', false);

	sumup_delete_pending_connection_id($connection_id);

	$reponse_body = array('status' => 'connected');
	$response = new WP_REST_Response($reponse_body);
	$response->set_status(200);
	return $response;
}
